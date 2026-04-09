import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFoodEmoji } from '@smart-fridge/shared';
import { FridgeViewer } from '../components/fridge/FridgeViewer';
import { ShelfSelector } from '../components/fridge/ShelfSelector';
import { InventoryItemCard } from '../components/fridge/InventoryItemCard';
import { useFridgeStore, type Item } from '../stores/fridgeStore';
import { diffDays, formatDate } from '../utils/dateUtils';

export const FridgePage = () => {
  const navigate = useNavigate();
  const [filterMode, setFilterMode] = useState<'current' | 'all' | 'expiring'>('current');
  const [searchTerm, setSearchTerm] = useState('');
  const [detailShelfId, setDetailShelfId] = useState<string | null>(null);

  const { shelves, selectedShelfId, setSelectedShelf, items, updateItem, removeItem, condiments } =
    useFridgeStore((s) => ({
      shelves: s.shelves,
      selectedShelfId: s.selectedShelfId,
      setSelectedShelf: s.setSelectedShelf,
      items: s.items,
      updateItem: s.updateItem,
      removeItem: s.removeItem,
      condiments: s.condiments,
    }));

  const selectedShelf = shelves.find((s) => s.id === selectedShelfId) ?? shelves[0] ?? null;
  const detailShelf = detailShelfId ? shelves.find((s) => s.id === detailShelfId) ?? null : null;

  // derived data
  const nearExpiry = useMemo(
    () => items.filter((i) => diffDays(i.expDate) <= 3).sort((a, b) => diffDays(a.expDate) - diffDays(b.expDate)),
    [items]
  );

  const missingCondiments = condiments.filter((c) => c.stockLevel === '缺货');

  const todaySuggestions = useMemo(() => {
    const suggestions: Array<{ text: string; action: string; actionLabel: string }> = [];
    if (nearExpiry.length > 0) {
      const top = nearExpiry[0];
      const days = diffDays(top.expDate);
      suggestions.push({
        text: `${top.name} ${days <= 0 ? '已过期' : days === 1 ? '明天到期' : `${days}天后到期`}，建议尽快使用`,
        action: '/discover',
        actionLabel: '查看菜谱',
      });
    }
    if (missingCondiments.length > 0) {
      suggestions.push({
        text: `缺 ${missingCondiments.map((c) => c.name).join('、')}`,
        action: '/profile',
        actionLabel: '去补充',
      });
    }
    if (items.length === 0) {
      suggestions.push({
        text: '冰箱还是空的，拍张照或手动添加第一批食材吧',
        action: '',
        actionLabel: '',
      });
    } else if (suggestions.length === 0) {
      suggestions.push({
        text: `冰箱里有 ${items.length} 样食材，状态良好`,
        action: '/discover',
        actionLabel: '看看做什么',
      });
    }
    return suggestions.slice(0, 3);
  }, [nearExpiry, missingCondiments, items]);

  // filtered items for detail view
  const filteredItems = useMemo(() => {
    const base = items.filter((i) =>
      filterMode === 'all'
        ? true
        : filterMode === 'expiring'
          ? diffDays(i.expDate) <= 3
          : detailShelfId
            ? i.shelfId === detailShelfId
            : true
    );
    if (!searchTerm.trim()) return base;
    return base.filter((i) => i.name.toLowerCase().includes(searchTerm.trim().toLowerCase()));
  }, [items, filterMode, detailShelfId, searchTerm]);

  const itemsToShow = filteredItems.sort((a, b) => diffDays(a.expDate) - diffDays(b.expDate));

  const handleMinusOne = (item: Item) => {
    const next = Math.max(item.qty - 1, 0);
    if (next <= 0) removeItem(item.id);
    else updateItem(item.id, { qty: next });
  };

  const summaryCards = [
    { title: '库存总数', value: items.length, subtitle: '样食材', accent: 'bg-brand-500/40 text-white' },
    { title: '临期提醒', value: nearExpiry.length, subtitle: '≤3天到期', accent: 'bg-amber-400/40 text-amber-100' },
    { title: '缺货调料', value: missingCondiments.length, subtitle: '建议补充', accent: 'bg-accent-500/30 text-accent-100' },
  ];

  const filterLabels = [
    { id: 'current' as const, label: detailShelf ? `仅 ${detailShelf.name}` : '按层位' },
    { id: 'expiring' as const, label: '临期优先' },
    { id: 'all' as const, label: '全部库存' },
  ];

  return (
    <div className="flex flex-col gap-5 pb-4">
      {/* Today Suggestions */}
      {todaySuggestions.length > 0 && (
        <section className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-glass backdrop-blur-xl">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-accent-200/80">今日建议</p>
          <div className="mt-3 space-y-2">
            {todaySuggestions.map((s, i) => (
              <div key={i} className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-black/20 px-3 py-2.5">
                <p className="text-sm text-white/90 flex-1">{s.text}</p>
                {s.action && s.actionLabel && (
                  <button onClick={() => navigate(s.action)}
                    className="shrink-0 rounded-full border border-brand-300/60 bg-brand-500/50 px-3 py-1 text-xs font-medium text-white hover:bg-brand-500/70">
                    {s.actionLabel}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Status Summary Cards */}
      <section className="grid gap-3 grid-cols-3">
        {summaryCards.map((card) => (
          <div key={card.title} className={`rounded-2xl border border-white/10 ${card.accent} p-3 text-center`}>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="mt-1 text-[11px] text-white/70">{card.subtitle}</p>
          </div>
        ))}
      </section>

      {/* Fridge Grid */}
      <section>
        <FridgeViewer />
      </section>

      {/* Shelf Detail - when a shelf is selected via FridgeGrid */}
      <section className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-glass backdrop-blur-xl">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-accent-200/80">层架详情</p>
            <p className="mt-1 text-sm font-medium text-white">
              {detailShelf ? detailShelf.name : selectedShelf?.name ?? '全部食材'}
            </p>
          </div>
        </div>
        <div className="mt-3">
          <ShelfSelector
            shelves={shelves}
            selectedShelfId={detailShelfId ?? selectedShelfId}
            onSelect={setDetailShelfId}
          />
        </div>
      </section>

      {/* Filter + Search */}
      <section className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/10 p-4 shadow-glass backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2 text-xs">
          {filterLabels.map((opt) => (
            <button key={opt.id} type="button" onClick={() => setFilterMode(opt.id)}
              className={[
                'rounded-full border px-3 py-1.5 transition-colors',
                filterMode === opt.id
                  ? 'border-brand-300/70 bg-brand-500/40 text-white shadow-glow'
                  : 'border-white/10 bg-white/5 text-slate-200 hover:border-brand-300/60 hover:text-white'
              ].join(' ')}>
              {opt.label}
            </button>
          ))}
        </div>
        <input type="search" placeholder="搜索食材" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:border-accent-300 focus:outline-none sm:w-48" />
      </section>

      {/* Item List */}
      <section className="flex flex-col gap-3">
        {itemsToShow.length > 0 ? (
          itemsToShow.map((item) => (
            <InventoryItemCard key={item.id} item={item}
              onMinusOne={() => handleMinusOne(item)}
              onClear={() => removeItem(item.id)}
              onSave={(changes) => updateItem(item.id, changes)} />
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-8 text-center">
            <p className="text-4xl">🧊</p>
            <p className="mt-3 text-sm font-medium text-white/80">
              {items.length === 0 ? '冰箱还是空的' : '没有符合条件的食材'}
            </p>
            <p className="mt-1 text-xs text-slate-300/70">
              {items.length === 0 ? '点击右下角拍照按钮，或手动添加第一批食材' : '试试调整筛选条件'}
            </p>
          </div>
        )}
      </section>

      {/* Near-expiry items (bottom section) */}
      {nearExpiry.length > 0 && (
        <section className="rounded-3xl border border-amber-400/20 bg-amber-500/10 p-4 backdrop-blur-xl">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-amber-200/80">临期食材</p>
          <div className="mt-3 space-y-2">
            {nearExpiry.slice(0, 3).map((item) => {
              const days = diffDays(item.expDate);
              return (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-amber-400/15 bg-black/20 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span>{getFoodEmoji(item.name)}</span>
                    <span className="text-sm text-white">{item.name}</span>
                  </div>
                  <span className={`text-xs font-medium ${days <= 0 ? 'text-red-300' : 'text-amber-200'}`}>
                    {days <= 0 ? '已过期' : days === 1 ? '明天到期' : `${days}天后到期`}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
