import { useEffect, useMemo, useState } from 'react';
import { getFoodEmoji } from '@smart-fridge/shared';
import { aiService, type RecipeSuggestion } from '../services';
import { useFridgeStore } from '../stores/fridgeStore';
import { diffDays } from '../utils/dateUtils';

type SubTab = 'recipes' | 'shopping' | 'meals';
type FilterTag = '全部' | '临期优先' | '快手菜';

export const DiscoverPage = () => {
  const [subTab, setSubTab] = useState<SubTab>('recipes');
  const [filter, setFilter] = useState<FilterTag>('全部');
  const [suggestions, setSuggestions] = useState<RecipeSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seed, setSeed] = useState(0);

  const { items, condiments } = useFridgeStore((s) => ({
    items: s.items,
    condiments: s.condiments,
  }));

  const nearExpiry = useMemo(
    () => items.filter((i) => diffDays(i.expDate) <= 3),
    [items]
  );

  // auto-select filter based on expiry status
  useEffect(() => {
    if (nearExpiry.length > 0 && filter === '全部') {
      setFilter('临期优先');
    }
  }, [nearExpiry.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // fetch recipes
  const fetchRecipes = async (currentSeed: number) => {
    if (items.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const prompt = filter === '临期优先'
        ? `优先用掉临期食材：${nearExpiry.map((i) => i.name).join('、')}。${currentSeed > 0 ? '请给出不同的推荐。' : ''}`
        : filter === '快手菜'
          ? `推荐快速简单的菜谱，15分钟内能完成。${currentSeed > 0 ? '请给出不同的推荐。' : ''}`
          : `根据现有库存推荐菜谱。${currentSeed > 0 ? '请给出不同的推荐。' : ''}`;

      const result = await aiService.chatRecipes({
        message: prompt,
        items,
        condiments,
      });
      setSuggestions(result.suggestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : '菜谱生成失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (subTab === 'recipes') {
      fetchRecipes(seed);
    }
  }, [subTab, filter, seed]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = () => setSeed((s) => s + 1);

  const filteredSuggestions = useMemo(() => {
    if (filter === '临期优先') {
      return suggestions.filter((s) => s.type === '临期优先' || s.type === '定制');
    }
    if (filter === '快手菜') {
      return suggestions.filter((s) => s.minutes <= 15);
    }
    return suggestions;
  }, [suggestions, filter]);

  const filterTags: FilterTag[] = ['全部', '临期优先', '快手菜'];

  return (
    <div className="flex flex-col gap-5 pb-4">
      {/* Header */}
      <section className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-glass backdrop-blur-xl">
        <p className="text-lg font-semibold text-white">今天吃什么？</p>
        <p className="mt-1 text-sm text-slate-300/80">
          基于 {items.length} 样食材 + {condiments.length} 样调料
        </p>
      </section>

      {/* Filter Tags */}
      <div className="flex gap-2 overflow-x-auto">
        {filterTags.map((tag) => (
          <button key={tag} type="button" onClick={() => { setFilter(tag); setSeed(0); }}
            className={[
              'shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors',
              filter === tag
                ? 'border-brand-300/70 bg-brand-500/40 text-white shadow-glow'
                : 'border-white/10 bg-white/5 text-slate-200 hover:border-brand-300/60 hover:text-white'
            ].join(' ')}>
            {tag === '临期优先' && nearExpiry.length > 0 && <span className="mr-1">⚠</span>}
            {tag}
          </button>
        ))}
      </div>

      {/* Sub tab content */}
      {subTab === 'recipes' && (
        <>
          {loading && (
            <div className="flex flex-col items-center gap-3 py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-300 border-t-transparent" />
              <p className="text-sm text-slate-300/80">正在生成菜谱...</p>
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-center">
              <p className="text-sm text-red-200">{error}</p>
              <button onClick={handleRefresh} className="mt-2 text-xs text-brand-200 hover:text-white">重试</button>
            </div>
          )}

          {!loading && !error && filteredSuggestions.length > 0 && (
            <div className="flex flex-col gap-4">
              {filteredSuggestions.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} items={items} />
              ))}
              <button onClick={handleRefresh}
                className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 text-sm text-slate-200 transition-colors hover:bg-white/10 hover:text-white">
                换一批推荐
              </button>
            </div>
          )}

          {!loading && !error && filteredSuggestions.length === 0 && items.length > 0 && (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-8 text-center">
              <p className="text-3xl">🍳</p>
              <p className="mt-3 text-sm text-white/80">没有找到推荐菜谱</p>
              <p className="mt-1 text-xs text-slate-300/70">换个筛选条件试试，或点击"换一批推荐"</p>
              <button onClick={handleRefresh} className="mt-3 rounded-full border border-brand-300/60 bg-brand-500/50 px-4 py-1.5 text-xs text-white hover:bg-brand-500/70">
                换一批
              </button>
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-8 text-center">
              <p className="text-3xl">🧊</p>
              <p className="mt-3 text-sm text-white/80">先录入一些食材</p>
              <p className="mt-1 text-xs text-slate-300/70">有食材后我来推荐菜谱</p>
            </div>
          )}
        </>
      )}

      {subTab === 'shopping' && (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-8 text-center">
          <p className="text-3xl">🛒</p>
          <p className="mt-3 text-sm text-white/80">购物清单功能即将上线</p>
        </div>
      )}

      {subTab === 'meals' && (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-8 text-center">
          <p className="text-3xl">📋</p>
          <p className="mt-3 text-sm text-white/80">饮食记录功能即将上线</p>
        </div>
      )}

      {/* Sub tab bar */}
      <div className="flex gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
        {([
          { id: 'recipes' as SubTab, label: '菜谱推荐' },
          { id: 'shopping' as SubTab, label: '购物清单' },
          { id: 'meals' as SubTab, label: '饮食记录' },
        ]).map((tab) => (
          <button key={tab.id} type="button" onClick={() => setSubTab(tab.id)}
            className={[
              'flex-1 rounded-xl px-3 py-2 text-xs font-medium transition-all',
              subTab === tab.id ? 'bg-brand-500/40 text-white shadow-glow' : 'text-slate-300 hover:text-white'
            ].join(' ')}>
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};

// RecipeCard sub-component
type RecipeCardProps = {
  recipe: RecipeSuggestion;
  items: Array<{ id: string; name: string; qty: number; unit: string }>;
};

const RecipeCard = ({ recipe, items }: RecipeCardProps) => {
  const removeItem = useFridgeStore((s) => s.removeItem);
  const updateItem = useFridgeStore((s) => s.updateItem);

  const handleCook = () => {
    for (const u of recipe.usage) {
      const match = items.find((i) => i.name === u.name);
      if (match) {
        const remaining = match.qty - u.qty;
        if (remaining <= 0) removeItem(match.id);
        else updateItem(match.id, { qty: remaining });
      }
    }
    alert('开始烹饪！已扣减食材');
  };

  // Build emoji cover from ingredients
  const coverEmojis = recipe.usage
    .slice(0, 3)
    .map((u) => getFoodEmoji(u.name))
    .join('');

  const typeColors: Record<string, string> = {
    '临期优先': 'bg-amber-500/30 text-amber-200',
    '快速上桌': 'bg-emerald-500/30 text-emerald-200',
    '冷冻解压': 'bg-sky-500/30 text-sky-200',
    '定制': 'bg-brand-500/30 text-brand-200',
  };

  return (
    <article className="rounded-3xl border border-white/10 bg-white/10 shadow-glass backdrop-blur-xl overflow-hidden">
      {/* Emoji cover */}
      <div className="flex h-24 items-center justify-center bg-gradient-to-br from-brand-500/20 to-accent-500/20">
        <span className="text-4xl">{coverEmojis || '🍳'}</span>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-base font-semibold text-white">{recipe.title}</p>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${typeColors[recipe.type] ?? typeColors['定制']}`}>
            {recipe.type}
          </span>
        </div>

        <div className="mt-2 flex items-center gap-2 text-xs text-slate-300/80">
          <span>⏱ {recipe.minutes}分钟</span>
          {recipe.usage.length > 0 && (
            <span>· {recipe.usage.map((u) => u.name).join('、')}</span>
          )}
        </div>

        <p className="mt-2 text-xs text-slate-200/70 line-clamp-2">{recipe.summary}</p>

        {recipe.condiments.length > 0 && (
          <p className="mt-2 text-xs text-slate-400/80">
            调料：{recipe.condiments.join('、')}
          </p>
        )}

        <button onClick={handleCook}
          className="mt-3 w-full rounded-xl border border-brand-300/60 bg-brand-500/40 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-500/60">
          开始烹饪
        </button>
      </div>
    </article>
  );
};
