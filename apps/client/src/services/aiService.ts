import { QUANTITY_UNITS } from '@smart-fridge/shared';
import { nanoid } from '../utils/nanoid';
import type { Item, Condiment } from '../stores/fridgeStore';

type VisionCandidate = {
  id: string;
  name: string;
  qty: number;
  unit: Item['unit'];
  expDate: string | null;
  confidence: number;
  barcode: string | null;
};

type VisionResponse = {
  candidates: VisionCandidate[];
  note: string;
  debug: VisionDebugInfo;
};

type RecipeSuggestion = {
  id: string;
  title: string;
  minutes: number;
  summary: string;
  type: '临期优先' | '快速上桌' | '冷冻解压' | '定制';
  usage: Array<{
    itemId: string;
    name: string;
    qty: number;
    unit: Item['unit'];
  }>;
  condiments: string[];
};

type RecipeChatResponse = {
  reply: string;
  suggestions: RecipeSuggestion[];
};

type VisionDebugInfo = {
  prompt: string;
  imageDataUrl: string;
  requestPayload: {
    model: string;
    messages: ChatCompletionPayload['messages'];
    temperature?: number;
    max_tokens?: number;
  };
  responseText: string | null;
  parsedJson: VisionModelRaw | null;
};

class VisionRecognitionError extends Error {
  debug: VisionDebugInfo;

  constructor(message: string, debug: VisionDebugInfo) {
    super(message);
    this.name = 'VisionRecognitionError';
    this.debug = debug;
  }
}

const sampleQuickPrompts = ['瘦身菜谱', '暖胃汤品', '快速早餐', '无糖晚餐'];

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY ?? '';
const OPENAI_API_URL =
  import.meta.env.VITE_OPENAI_API_URL ?? 'https://api.qnaigc.com/v1/chat/completions';
const OPENAI_VISION_MODEL =
  import.meta.env.VITE_OPENAI_VISION_MODEL ??
  import.meta.env.VITE_OPENAI_MODEL ??
  'doubao-1.5-vision-pro';
const OPENAI_CHAT_MODEL =
  import.meta.env.VITE_OPENAI_CHAT_MODEL ?? import.meta.env.VITE_OPENAI_MODEL ?? 'deepseek-v3';
const MAX_UPLOAD_SIZE_BYTES = 1.2 * 1024 * 1024; // ~1.2MB
const allowedUnits = new Set(QUANTITY_UNITS);
const allowedRecipeTypes = ['临期优先', '快速上桌', '冷冻解压', '定制'] as const;

type AllowedRecipeType = (typeof allowedRecipeTypes)[number];

type ChatCompletionPayload = {
  model: string;
  messages: unknown[];
  response_format: { type: 'json_object' };
  temperature?: number;
  max_tokens?: number;
};

type ChatCompletionChoice = {
  message?: {
    content?: string | Array<{ type?: string; text?: string }>;
  };
};

type ChatCompletionResponse = {
  choices?: ChatCompletionChoice[];
};

type VisionModelRaw = {
  note?: string;
  items?: Array<{
    name?: string;
    quantity?: number | string;
    unit?: string;
    confidence?: number;
    expiry?: string | null;
    barcode?: string | null;
  }>;
};

type RecipeModelRaw = {
  reply?: string;
  suggestions?: Array<{
    title?: string;
    minutes?: number;
    type?: string;
    summary?: string;
    usage?: Array<{
      itemId?: string;
      name?: string;
      qty?: number | string;
      unit?: string;
    }>;
    condiments?: string[];
  }>;
};

const extractContent = (response: ChatCompletionResponse): string => {
  const [choice] = response.choices ?? [];
  const content = choice?.message?.content;
  if (typeof content === 'string') {
    return content.trim();
  }
  if (Array.isArray(content)) {
    const text = content
      .map((part) => (part?.type === 'text' ? part.text ?? '' : part?.text ?? ''))
      .join('\n')
      .trim();
    if (text) {
      return text;
    }
  }
  throw new Error('AI 响应缺少文本内容，请稍后重试。');
};

const requireApiKey = () => {
  if (!OPENAI_API_KEY) {
    throw new Error('缺少 AI API Key，请在环境变量 VITE_OPENAI_API_KEY 中配置。');
  }
  return OPENAI_API_KEY;
};

const requestAI = async (payload: ChatCompletionPayload) => {
  const apiKey = requireApiKey();
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `AI 请求失败（${response.status}）`);
  }

  const json = (await response.json()) as ChatCompletionResponse;
  return extractContent(json);
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('图片读取失败，请重试。'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });

const parseQuantity = (value: number | string | undefined): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const numeric = Number.parseFloat(value.replace(/[^\d.-]/g, ''));
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }
  return 1;
};

const parseConfidence = (value: number | string | undefined): number => {
  const numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
      ? Number.parseFloat(value.replace(/[^\d.-]/g, ''))
      : NaN;
  if (!Number.isFinite(numeric)) {
    return 0.6;
  }
  if (numeric > 1 && numeric <= 100) {
    return numeric / 100;
  }
  return Math.min(Math.max(numeric, 0), 1);
};

const normalizeUnit = (value?: string | null): Item['unit'] => {
  if (value && allowedUnits.has(value as Item['unit'])) {
    return value as Item['unit'];
  }
  return '个';
};

const normalizeExpiry = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
};

const normalizeRecipeType = (value?: string | null): AllowedRecipeType => {
  if (value && allowedRecipeTypes.includes(value as AllowedRecipeType)) {
    return value as AllowedRecipeType;
  }
  return '定制';
};

const safeJsonParse = <T>(input: string): T => {
  try {
    return JSON.parse(input) as T;
  } catch (error) {
    throw new Error('模型返回内容无法解析为 JSON，请重试。');
  }
};

const normalizeNameKey = (value: string) => value.replace(/\s+/g, '').toLowerCase();

export const aiService = {
  quickPrompts: sampleQuickPrompts,
  async recognize(payload: { shelfId: string; shelfName: string; file: File }): Promise<VisionResponse> {
    if (!payload.file) {
      throw new Error('未找到有效的图片文件，请重新拍照或选择图片。');
    }
    if (payload.file.size > MAX_UPLOAD_SIZE_BYTES) {
      throw new Error('图片超过 1MB，请压缩或降低分辨率后再试。');
    }

    const dataUrl = await readFileAsDataUrl(payload.file);

    const prompt = [
      '你是一名冰箱食材识别助手，需要根据照片返回清晰的候选清单。',
      '请只返回 JSON 对象，字段说明：',
      '- note: 对识别的总体说明，可为空字符串；',
      '- items: 数组，每个元素包含 name (食材中文名称)、quantity (数字)、unit (从以下列表选择：个/克/毫升/把/袋)、confidence (0-1)、expiry (可选 ISO 日期或字符串)、barcode (可选)。',
      '识别失败或不确定时依然返回合理估计，避免出现 null。',
      `当前层位：${payload.shelfName} (id: ${payload.shelfId})。`,
      '如果图中没有食材，请返回空数组。',
      'JSON 示例：{"note":"","items":[{"name":"鸡蛋","quantity":6,"unit":"个","confidence":0.9,"expiry":"2024-06-30","barcode":null}]}' // keep simple sample
    ].join('\n');

    const payloadForAI: ChatCompletionPayload = {
      model: OPENAI_VISION_MODEL,
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 900,
      messages: [
        {
          role: 'system',
          content: 'You are a bilingual fridge inventory vision assistant. Respond in Chinese JSON.'
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: dataUrl } }
          ]
        }
      ]
    };

    const debugBase: VisionDebugInfo = {
      prompt,
      imageDataUrl: dataUrl,
      requestPayload: sanitizePayload(payloadForAI),
      responseText: null,
      parsedJson: null
    };

    let responseText: string;
    try {
      responseText = await requestAI(payloadForAI);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI 请求失败，请稍后重试。';
      debugBase.responseText = message;
      throw new VisionRecognitionError(message, debugBase);
    }

    debugBase.responseText = responseText;

    const parsed = safeJsonParse<VisionModelRaw>(responseText);
    debugBase.parsedJson = parsed;

    const candidates = (parsed.items ?? [])
      .map((item): VisionCandidate | null => {
        const name = item.name?.trim();
        if (!name) {
          return null;
        }

        return {
          id: nanoid(),
          name,
          qty: Math.max(0.1, parseQuantity(item.quantity)),
          unit: normalizeUnit(item.unit),
          expDate: normalizeExpiry(item.expiry),
          confidence: parseConfidence(item.confidence),
          // barcode currently unused in UI but we keep for future
          // If missing, return null
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          barcode: item.barcode ?? null
        };
      })
      .filter((candidate): candidate is VisionCandidate => candidate !== null);

    return {
      candidates,
      note: parsed.note?.trim() || '识别结果由 doubao-1.5-vision-pro 提供，请核对后入库。',
      debug: debugBase
    };
  },
  async chatRecipes(payload: { message: string; items: Item[]; condiments: Condiment[] }): Promise<RecipeChatResponse> {
    const basePrompt = [
      '你是一位智能菜谱助手，需要依据提供的库存食材与调料生成个性化建议。',
      '请只输出 JSON 对象，字段说明：',
      '- reply: 对用户问题的简短回应（中文）;',
      '- suggestions: 数组，元素包含 title、minutes（整数，烹饪时间）、type（必须为 临期优先/快速上桌/冷冻解压/定制 之一）、summary、usage（数组，字段 itemId/name/qty/unit）、condiments（调料名称数组）。',
      'usage.itemId 必须来自给定的 items.id，若缺少则根据 name 尽量匹配；qty 为数字，unit 从个/克/毫升/把/袋中选择。',
      '如库存不足以推荐，请返回空数组并在 reply 里说明。'
    ].join('\n');

    const itemsSnapshot = JSON.stringify(payload.items, null, 2);
    const condimentsSnapshot = JSON.stringify(payload.condiments, null, 2);

    const userPrompt = [
      `用户输入: ${payload.message || '无特别说明'}`,
      '当前库存 items JSON:',
      itemsSnapshot,
      '常备小料 condiments JSON:',
      condimentsSnapshot
    ].join('\n');

    const responseText = await requestAI({
      model: OPENAI_CHAT_MODEL,
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 1400,
      messages: [
        {
          role: 'system',
          content: basePrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ]
    });

    const parsed = safeJsonParse<RecipeModelRaw>(responseText);

    const itemIndexById = new Map(payload.items.map((item) => [item.id, item]));
    const itemIndexByName = new Map(
      payload.items.map((item) => [normalizeNameKey(item.name), item])
    );
    const availableCondiments = new Set(
      payload.condiments.map((condiment) => condiment.name.trim()).filter(Boolean)
    );

    const suggestions = (parsed.suggestions ?? []).map((suggestion): RecipeSuggestion => {
      const usage = (suggestion.usage ?? [])
        .map((usageItem) => {
          const qty = parseQuantity(usageItem.qty);
          const providedName = usageItem.name?.trim() ?? '';
          const providedId = usageItem.itemId ?? '';
          const resolvedItem =
            (providedId && itemIndexById.get(providedId)) ||
            (providedName ? itemIndexByName.get(normalizeNameKey(providedName)) : undefined);
          const resolvedUnit = normalizeUnit(usageItem.unit ?? resolvedItem?.unit);
          const resolvedId = resolvedItem?.id ?? providedId ?? '';
          const fallbackName = resolvedItem?.name ?? providedName;
          if (!fallbackName) {
            return null;
          }
          const normalizedQty = qty > 0 ? qty : 1;
          return {
            itemId: resolvedId,
            name: fallbackName,
            qty: normalizedQty,
            unit: resolvedUnit
          };
        })
        .filter((usageItem): usageItem is RecipeSuggestion['usage'][number] => Boolean(usageItem));

      return {
        id: nanoid(),
        title: suggestion.title?.trim() || '创意菜谱',
        minutes: Math.max(5, Math.round(parseQuantity(suggestion.minutes))),
        summary: suggestion.summary?.trim() || '根据当前库存生成的建议，请按需调整。',
        type: normalizeRecipeType(suggestion.type),
        usage,
        condiments: (suggestion.condiments ?? [])
          .map((name) => name.trim())
          .filter((name) => name && availableCondiments.has(name))
      };
    });

    return {
      reply:
        parsed.reply?.trim() ||
        (suggestions.length
          ? `已生成 ${suggestions.length} 个菜谱提案，请查看详细用量。`
          : '当前库存暂不足以生成菜谱，请补充食材后再试。'),
      suggestions
    };
  }
};

const sanitizePayload = (
  payload: ChatCompletionPayload
): VisionDebugInfo['requestPayload'] => {
  const sanitizedMessages = (payload.messages ?? []).map((message) => {
    if (
      typeof message === 'object' &&
      message !== null &&
      'content' in message &&
      Array.isArray((message as { content: unknown }).content)
    ) {
      const contentArray = (message as { content: Array<Record<string, unknown>> }).content.map(
        (part) => {
          if (part?.type === 'image_url') {
            return {
              ...part,
              image_url: {
                ...(part.image_url as Record<string, unknown>),
                url: '[base64 omitted]'
              }
            };
          }
          return part;
        }
      );
      return { ...message, content: contentArray };
    }
    return message;
  });
  return {
    model: payload.model,
    messages: sanitizedMessages,
    temperature: payload.temperature,
    max_tokens: payload.max_tokens
  };
};

export type { VisionCandidate, VisionResponse, RecipeSuggestion, RecipeChatResponse, VisionDebugInfo };
export { VisionRecognitionError };
