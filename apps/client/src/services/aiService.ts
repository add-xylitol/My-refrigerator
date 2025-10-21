import { nanoid } from '../utils/nanoid';
import type { Item, Condiment } from '../stores/fridgeStore';

type VisionCandidate = {
  id: string;
  name: string;
  qty: number;
  unit: Item['unit'];
  expDate: string | null;
  confidence: number;
};

type VisionResponse = {
  candidates: VisionCandidate[];
  note: string;
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

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sampleVisionCandidates: VisionCandidate[] = [
  {
    id: nanoid(),
    name: '鸡胸肉',
    qty: 2,
    unit: '个',
    expDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    confidence: 0.92
  },
  {
    id: nanoid(),
    name: '上海青',
    qty: 1,
    unit: '把',
    expDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    confidence: 0.87
  },
  {
    id: nanoid(),
    name: '鲜奶油',
    qty: 200,
    unit: '毫升',
    expDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    confidence: 0.73
  }
];

const sampleQuickPrompts = ['瘦身菜谱', '暖胃汤品', '快速早餐', '无糖晚餐'];

const buildRecipeSuggestions = (
  message: string,
  items: Item[],
  condiments: Condiment[]
): RecipeSuggestion[] => {
  if (!items.length) {
    return [];
  }

  const diffDays = (value?: string | null) => {
    if (!value) {
      return Number.POSITIVE_INFINITY;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return Number.POSITIVE_INFINITY;
    }
    const diff = date.getTime() - Date.now();
    return Math.floor(diff / (24 * 60 * 60 * 1000));
  };

  const itemsByShelf = (shelfIds: string[]) =>
    items.filter((item) => shelfIds.includes(item.shelfId)).sort((a, b) => diffDays(a.expDate) - diffDays(b.expDate));

  const nearExpiry = items
    .filter((item) => diffDays(item.expDate) <= 2)
    .sort((a, b) => diffDays(a.expDate) - diffDays(b.expDate))
    .slice(0, 3);

  const produceItems = itemsByShelf(['shelf-5']);
  const chillItems = itemsByShelf(['shelf-1', 'shelf-2', 'shelf-3']);
  const freezeItems = itemsByShelf(['shelf-4']);

  const availableCondiments = condiments.filter((condiment) => condiment.stockLevel !== '缺货');

  const results: RecipeSuggestion[] = [];

  if (nearExpiry.length) {
    results.push({
      id: nanoid(),
      title: `${nearExpiry.map((item) => item.name).join(' + ')} 临期快炒`,
      minutes: 18,
      type: '临期优先',
      summary: `优先消耗 ${nearExpiry.map((item) => item.name).join('、')}，搭配简单调味即可。`,
      usage: nearExpiry.map((item) => ({
        itemId: item.id,
        name: item.name,
        unit: item.unit,
        qty: item.unit === '个' ? 1 : Math.min(item.qty, item.unit === '克' ? 250 : item.qty)
      })),
      condiments: availableCondiments.slice(0, 3).map((condiment) => condiment.name)
    });
  }

  if (chillItems.length) {
    results.push({
      id: nanoid(),
      title: `${chillItems[0].name} 快速轻食`,
      minutes: 15,
      type: message.includes('瘦') ? '定制' : '快速上桌',
      summary: `${chillItems[0].name} 配上果蔬层的清爽搭档，满足 ${message || '快手餐'} 的需求。`,
      usage: [
        {
          itemId: chillItems[0].id,
          name: chillItems[0].name,
          unit: chillItems[0].unit,
          qty: chillItems[0].unit === '个' ? 1 : Math.min(chillItems[0].qty, 200)
        },
        ...(produceItems[0]
          ? [
              {
                itemId: produceItems[0].id,
                name: produceItems[0].name,
                unit: produceItems[0].unit,
                qty: produceItems[0].unit === '个' ? 1 : Math.min(produceItems[0].qty, 1)
              }
            ]
          : [])
      ],
      condiments: availableCondiments.slice(0, 2).map((condiment) => condiment.name)
    });
  }

  if (freezeItems.length) {
    results.push({
      id: nanoid(),
      title: `${freezeItems[0].name} 解冻慢炖`,
      minutes: 35,
      type: '冷冻解压',
      summary: `解冻 ${freezeItems[0].name} 与香料慢炖，适合需要暖胃的夜晚。`,
      usage: [
        {
          itemId: freezeItems[0].id,
          name: freezeItems[0].name,
          unit: freezeItems[0].unit,
          qty: freezeItems[0].unit === '袋' ? 1 : Math.min(freezeItems[0].qty, 300)
        }
      ],
      condiments: availableCondiments.slice(1, 4).map((condiment) => condiment.name)
    });
  }

  return results;
};

export const aiService = {
  quickPrompts: sampleQuickPrompts,
  async recognize(_payload: { shelfId: string; fileName: string }): Promise<VisionResponse> {
    await delay(800);
    return {
      candidates: sampleVisionCandidates,
      note: '识别结果来自占位服务，后续会接入真实模型能力。'
    };
  },
  async chatRecipes(payload: { message: string; items: Item[]; condiments: Condiment[] }): Promise<RecipeChatResponse> {
    await delay(600);
    const suggestions = buildRecipeSuggestions(payload.message, payload.items, payload.condiments);
    if (!suggestions.length) {
      return {
        reply: '当前冰箱里暂未检测到可以生成菜谱的食材哦，先去入库几样吧。',
        suggestions: []
      };
    }
    return {
      reply: `已根据「${payload.message || '系统推荐'}」生成 ${suggestions.length} 个菜谱提案。`,
      suggestions
    };
  }
};

export type { VisionCandidate, VisionResponse, RecipeSuggestion, RecipeChatResponse };
