import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFoodEmoji, QUANTITY_UNITS } from '@smart-fridge/shared';
import { FridgeViewer } from '../components/fridge/FridgeViewer';
import { ShelfSelector } from '../components/fridge/ShelfSelector';
import { InventoryItemCard } from '../components/fridge/InventoryItemCard';
import { useFridgeStore, type Item } from '../stores/fridgeStore';
import { diffDays } from '../utils/dateUtils';

const quickItems = [
  { name: '鸡蛋', qty: 6, unit: '个' as const },
  { name: '牛奶', qty: 1, unit: '袋' as const },
  { name: '上海青', qty: 1, unit: '把' as const },
  { name: '牛肉', qty: 300, unit: '克' as const },
  { name: '西红柿', qty: 2, unit: '个' as const },
];

export const FridgePage = () => {
  const navigate = useNavigate();
  const [filterMode, setFilterMode] = useState<'current' | 'all' | 'expiring'>('current');
  const [searchTerm, setSearchTerm] = useState('');
  const [detailShelfId, setDetailShelfId] = useState<string | null>(null);

  // Quick entry form state
  const [entryName, setEntryName] = useState('');
  const [entryQty, setEntryQty] = useState(1);
  const [entryUnit, setEntryUnit] = useState<(typeof QUANTITY_UNITS)[number]>(QUANTITY_UNITS[0]);
  const [entryExpDate, setEntryExpDate] = useState('');

  const { shelves, selectedShelfId, setSelectedShelf, items, addItem, updateItem, removeItem, condiments } =
    useFridgeStore((s) => ({
      shelves: s.shelves,
      selectedShelfId: s.selectedShelfId,
      setSelectedShelf: s.setSelectedShelf,
      items: s.items,
      addItem: s.addItem,
      updateItem: s.updateItem,
      removeItem: s.removeItem,
      condiments: s.condiments,
    }));

  const selectedShelf = shelves.find((s) => s.id === selectedShelfId) ?? shelves[0] ?? null;
  const detailShelf = detailShelfId ? shelves.find((s) => s.id === detailShelfId) ?? null : null;
  const targetShelfId = detailShelfId ?? selectedShelfId ?? shelves[0]?.id ?? '';

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
      suggestions.push({ text: '冰箱还是空的，拍张照或手动添加第一批食材吧', action: '', actionLabel: '' });
    } else if (suggestions.length === 0) {
      suggestions.push({ text: `冰箱里有 ${items.length} 样食材，状态良好`, action: '/discover', actionLabel: '看看做什么' });
    }
    return suggestions.slice(0, 3);
  }, [nearExpiry, missingCondiments, items]);

  const filteredItems = useMemo(() => {
    const base = items.filter((i) =>
      filterMode === 'all' ? true
      : filterMode === 'expiring' ? diffDays(i.expDate) <= 3
      : detailShelfId ? i.shelfId === detailShelfId
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

  const handleQuickFill = (preset: (typeof quickItems)[number]) => {
    setEntryName(preset.name);
    setEntryQty(preset.qty);
    setEntryUnit(preset.unit);
  };

  const handleManualSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!targetShelfId || !entryName.trim()) return;
    addItem({
      shelfId: targetShelfId,
      name: entryName.trim(),
      unit: entryUnit,
      qty: entryQty,
      expDate: entryExpDate ? new Date(entryExpDate).toISOString() : null,
      barcode: null,
      photoUrl: null,
    });
    setEntryName('');
    setEntryQty(1);
    setEntryUnit(QUANTITY_UNITS[0]);
    setEntryExpDate('');
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

      {/* === 快速录入区 === */}
      <section className="rounded-3xl border border-white/10 bg-white/10 p-5 shadow-glass backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-accent-200/80">快速录入</p>
            <p className="mt-1 text-sm text-white">选层位 → 填名称 → 入库</p>
          </div>
          <button onClick={() => navigate('/discover')}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:text-white">
            菜谱提问 →
          </button>
        </div>

        {/* Shelf selector */}
        <div className="mt-4">
          <ShelfSelector shelves={shelves} selectedShelfId={targetShelfId} onSelect={(id) => { setDetailShelfId(id); setSelectedShelf(id); }} />
        </div>

        {/* Quick-fill buttons */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {quickItems.map((preset) => (
            <button key={preset.name} type="button" onClick={() => handleQuickFill(preset)}
              className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 transition-colors hover:border-brand-300/60 hover:text-white">
              {preset.name} <span className="text-xs text-slate-300/80">{preset.qty}{preset.unit}</span>
            </button>
          ))}
        </div>

        {/* Entry form */}
        <form onSubmit={handleManualSubmit} className="mt-4 space-y-3">
          <div className="grid gap-3 grid-cols-[1fr_auto]">
            <input type="text" placeholder="食材名称" value={entryName} onChange={(e) => setEntryName(e.target.value)}
              className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:border-accent-300 focus:outline-none" />
            <div className="flex gap-2">
              <input type="number" min={0} value={entryQty || ''} onChange={(e) => setEntryQty(Number(e.target.value))}
                className="w-16 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:border-accent-300 focus:outline-none" />
              <select value={entryUnit} onChange={(e) => setEntryUnit(e.target.value as typeof entryUnit)}
                className="rounded-2xl border border-white/10 bg-black/30 px-2 py-2 text-sm text-white focus:border-accent-300 focus:outline-none">
                {QUANTITY_UNITS.map((u) => <option key={u} value={u} className="bg-slate-900">{u}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input type="date" value={entryExpDate} onChange={(e) => setEntryExpDate(e.target.value)}
              className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:border-accent-300 focus:outline-none" />
            <button type="submit" disabled={!targetShelfId || !entryName.trim()}
              className="ml-auto rounded-full border border-brand-300/70 bg-brand-500/70 px-6 py-2 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-slate-400">
              确认入库
            </button>
          </div>
        </form>
      </section>

      {/* Fridge Grid */}
      <section>
        <FridgeViewer />
      </section>

      {/* Filter + Search + Item List */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/10 p-4 shadow-glass backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
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
        </div>

        <div className="flex flex-col gap-3">
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
                {items.length === 0 ? '用上方表单或右下角拍照按钮添加食材' : '试试调整筛选条件'}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Near-expiry items */}
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
