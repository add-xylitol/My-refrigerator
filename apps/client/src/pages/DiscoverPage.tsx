import { useEffect, useMemo, useRef, useState } from 'react';
import { getFoodEmoji } from '@smart-fridge/shared';
import { aiService, type RecipeSuggestion } from '../services';
import { useFridgeStore } from '../stores/fridgeStore';
import { diffDays } from '../utils/dateUtils';

type ChatMessage = {
  id: string;
  role: 'ai' | 'user';
  text: string;
  recipes?: RecipeSuggestion[];
};

const quickPrompts = ['临期优先', '10分钟快手', '低脂', '暖胃汤', '家常菜', '再来一批'];

export const DiscoverPage = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialFetchDone = useRef(false);

  const { items, condiments, nearExpiryNames } = useFridgeStore((s) => {
    const nearExpiry = s.items.filter((i) => diffDays(i.expDate) <= 3);
    return {
      items: s.items,
      condiments: s.condiments,
      nearExpiryNames: nearExpiry.map((i) => i.name),
    };
  });

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 100);
  };

  // Auto-trigger first recommendation on mount
  useEffect(() => {
    if (initialFetchDone.current) return;
    initialFetchDone.current = true;

    if (items.length === 0) {
      setMessages([{
        id: 'welcome-empty',
        role: 'ai',
        text: '冰箱还是空的，先去冰箱页录入一些食材吧！有了食材我就能帮你推荐今晚吃什么了 😊',
      }]);
      return;
    }

    const autoPrompt = nearExpiryNames.length > 0
      ? `冰箱里有${nearExpiryNames.join('、')}快到期了，优先用掉它们，推荐几道菜。`
      : '根据当前库存推荐几道菜。';

    fetchRecipes(autoPrompt, true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRecipes = async (message: string, isAuto = false) => {
    setLoading(true);
    if (!isAuto) {
      setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: 'user', text: message }]);
    }

    try {
      const result = await aiService.chatRecipes({ message, items, condiments });
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'ai',
          text: result.reply,
          recipes: result.suggestions,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'ai',
          text: `出了点问题：${err instanceof Error ? err.message : '请稍后重试'}`,
        },
      ]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  const handleSend = () => {
    if (!input.trim() || loading) return;
    fetchRecipes(input.trim());
    setInput('');
  };

  const handleQuickPrompt = (prompt: string) => {
    if (loading) return;
    const actualPrompt = prompt === '再来一批'
      ? '请换一批不同的推荐菜谱。'
      : prompt === '临期优先'
        ? '优先推荐能用掉临期食材的菜谱。'
        : prompt === '10分钟快手'
          ? '推荐10分钟内能搞定的快手菜。'
          : prompt === '低脂'
            ? '推荐低脂健康的菜谱。'
            : prompt === '暖胃汤'
              ? '推荐暖胃汤品。'
              : '推荐家常菜。';
    fetchRecipes(actualPrompt);
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 180px)' }}>
      {/* Header */}
      <div className="shrink-0 rounded-2xl border border-white/10 bg-white/10 p-3 shadow-glass backdrop-blur-xl">
        <p className="text-sm font-semibold text-white">今天吃什么？</p>
        <p className="text-xs text-slate-300/70">
          基于 {items.length} 样食材 + {condiments.length} 样调料
        </p>
      </div>

      {/* Chat area */}
      <div ref={scrollRef} className="mt-3 flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-2' : ''}`}>
              {/* Bubble */}
              <div className={`rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'rounded-br-md border border-brand-300/30 bg-brand-500/30 text-white'
                  : 'rounded-bl-md border border-white/10 bg-white/8 text-slate-100'
              }`}>
                {msg.role === 'ai' && <p className="mb-1 text-[10px] font-medium text-accent-200/70">🤖 小冰</p>}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              </div>

              {/* Recipe cards inside AI bubble */}
              {msg.recipes && msg.recipes.length > 0 && (
                <div className="mt-2 space-y-2">
                  {msg.recipes.map((recipe) => (
                    <RecipeChatCard key={recipe.id} recipe={recipe} items={items} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md border border-white/10 bg-white/8 px-4 py-3">
              <p className="mb-1 text-[10px] font-medium text-accent-200/70">🤖 小冰</p>
              <div className="flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-brand-300" style={{ animationDelay: '0ms' }} />
                <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-brand-300" style={{ animationDelay: '150ms' }} />
                <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-brand-300" style={{ animationDelay: '300ms' }} />
                <span className="ml-2 text-xs text-slate-300/70">正在想...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick prompts */}
      <div className="mt-3 flex shrink-0 gap-2 overflow-x-auto pb-1">
        {quickPrompts.map((prompt) => (
          <button key={prompt} type="button" onClick={() => handleQuickPrompt(prompt)} disabled={loading}
            className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200 transition-colors hover:border-brand-300/60 hover:text-white disabled:opacity-40 active:scale-95">
            {prompt}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="mt-2 flex shrink-0 gap-2">
        <input type="text" placeholder="问问小冰..."
          value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
          className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder-slate-400 focus:border-accent-300 focus:outline-none" />
        <button onClick={handleSend} disabled={loading || !input.trim()}
          className="shrink-0 rounded-xl border border-brand-300/60 bg-brand-500/50 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-500/70 disabled:opacity-40 active:scale-95">
          发送
        </button>
      </div>
    </div>
  );
};

// Recipe card embedded in chat
const RecipeChatCard = ({ recipe, items }: { recipe: RecipeSuggestion; items: Array<{ id: string; name: string; qty: number; unit: string }> }) => {
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const removeItem = useFridgeStore((s) => s.removeItem);
  const updateItem = useFridgeStore((s) => s.updateItem);
  const addMeal = useFridgeStore((s) => s.addMeal);

  // Check if all ingredients are available
  const allAvailable = recipe.usage.every((u) => {
    const match = items.find((i) => i.name === u.name || i.id === u.itemId);
    return match && match.qty >= u.qty;
  });

  const handleCook = () => {
    for (const u of recipe.usage) {
      const match = items.find((i) => i.name === u.name || i.id === u.itemId);
      if (match) {
        const remaining = match.qty - u.qty;
        if (remaining <= 0) removeItem(match.id);
        else updateItem(match.id, { qty: remaining });
      }
    }
    // Auto-record to meals
    addMeal({
      type: '晚餐',
      photoUrl: null,
      description: recipe.title,
      items: recipe.usage.map((u) => ({ name: u.name, qty: u.qty, unit: u.unit })),
      notes: recipe.summary,
      eatenAt: new Date().toISOString(),
    });
    setConfirming(false);
    // Show toast via custom event
    document.dispatchEvent(new CustomEvent('toast', { detail: '烹饪愉快！已扣减食材 🎉' }));
  };

  const coverEmojis = recipe.usage.slice(0, 3).map((u) => getFoodEmoji(u.name)).join('');

  const typeBadge: Record<string, string> = {
    '临期优先': 'bg-amber-500/30 text-amber-200',
    '快速上桌': 'bg-emerald-500/30 text-emerald-200',
    '冷冻解压': 'bg-sky-500/30 text-sky-200',
    '定制': 'bg-brand-500/30 text-brand-200',
  };

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full p-3 text-left">
        <div className="flex items-center gap-3">
          <span className="text-xl">{coverEmojis || '🍳'}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white truncate">{recipe.title}</span>
              <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${typeBadge[recipe.type] ?? typeBadge['定制']}`}>
                {recipe.type}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-300/80">
              <span>⏱ {recipe.minutes}分钟</span>
              <span>· {recipe.usage.map((u) => u.name).join('、')}</span>
            </div>
            <div className="mt-0.5 flex items-center gap-1">
              {allAvailable ? (
                <span className="text-[10px] text-emerald-300">食材齐全 ✓</span>
              ) : (
                <span className="text-[10px] text-amber-300">部分不足</span>
              )}
            </div>
          </div>
          <span className="text-xs text-slate-400">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/5 px-3 py-3">
          <p className="text-xs text-slate-200/70 mb-2">{recipe.summary}</p>
          {recipe.usage.length > 0 && (
            <div className="mb-2">
              <p className="text-[10px] font-medium text-slate-400 mb-1">食材用量</p>
              <div className="flex flex-wrap gap-1">
                {recipe.usage.map((u, i) => {
                  const match = items.find((it) => it.name === u.name || it.id === u.itemId);
                  const enough = match && match.qty >= u.qty;
                  return (
                    <span key={i} className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] ${enough ? 'border-white/10 text-slate-300' : 'border-amber-400/30 text-amber-300'}`}>
                      {getFoodEmoji(u.name)} {u.name}×{u.qty}{u.unit} {!enough && '(缺)'}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          {recipe.condiments.length > 0 && (
            <p className="text-[10px] text-slate-400/80 mb-3">调料：{recipe.condiments.join('、')}</p>
          )}

          {!confirming ? (
            <button onClick={() => setConfirming(true)}
              className="w-full rounded-lg border border-brand-300/60 bg-brand-500/40 py-2 text-xs font-medium text-white hover:bg-brand-500/60 active:scale-[0.98]">
              开始烹饪
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-slate-300/80">将扣减：{recipe.usage.map((u) => `${u.name}×${u.qty}${u.unit}`).join('、')}</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirming(false)}
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 py-2 text-xs text-slate-300 hover:text-white">取消</button>
                <button onClick={handleCook}
                  className="flex-1 rounded-lg border border-brand-300/70 bg-brand-500/70 py-2 text-xs font-semibold text-white hover:bg-brand-500/90">确认烹饪</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
