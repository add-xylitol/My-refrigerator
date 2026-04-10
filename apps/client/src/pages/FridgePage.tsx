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
  const [showItems, setShowItems] = useState(false);
  const [detailShelfId, setDetailShelfId] = useState<string | null>(null);

  // Quick entry form state
  const [entryName, setEntryName] = useState('');
  const [entryQty, setEntryQty] = useState(1);
  const [entryUnit, setEntryUnit] = useState<(typeof QUANTITY_UNITS)[number]>(QUANTITY_UNITS[0]);
  const [entryExpDate, setEntryExpDate] = useState('');

  // Quick add modal
  const [quickAdd, setQuickAdd] = useState<typeof quickItems[number] | null>(null);
  const [quickQty, setQuickQty] = useState(1);

  const { shelves, selectedShelfId, setSelectedShelf, items, addItem, updateItem, removeItem } =
    useFridgeStore((s) => ({
      shelves: s.shelves,
      selectedShelfId: s.selectedShelfId,
      setSelectedShelf: s.setSelectedShelf,
      items: s.items,
      addItem: s.addItem,
      updateItem: s.updateItem,
      removeItem: s.removeItem,
    }));

  const targetShelfId = selectedShelfId ?? shelves[0]?.id ?? '';

  // derived data
  const nearExpiry = useMemo(
    () => items.filter((i) => diffDays(i.expDate) <= 3).sort((a, b) => diffDays(a.expDate) - diffDays(b.expDate)),
    [items]
  );

  const shelfItemCount = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of items) {
      map[item.shelfId] = (map[item.shelfId] || 0) + 1;
    }
    return map;
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!detailShelfId) return items;
    return items.filter((i) => i.shelfId === detailShelfId);
  }, [items, detailShelfId]);

  const handleQuickFill = (preset: typeof quickItems[number]) => {
    setQuickAdd(preset);
    setQuickQty(preset.qty);
  };

  const handleQuickConfirm = () => {
    if (!quickAdd || !targetShelfId) return;
    addItem({
      shelfId: targetShelfId,
      name: quickAdd.name,
      unit: quickAdd.unit,
      qty: quickQty,
      expDate: null,
      barcode: null,
      photoUrl: null,
    });
    setQuickAdd(null);
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

  const handleMinusOne = (item: Item) => {
    const next = Math.max(item.qty - 1, 0);
    if (next <= 0) removeItem(item.id);
    else updateItem(item.id, { qty: next });
  };

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Three compact cards */}
      <section className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/10 p-3 text-center">
          <p className="text-2xl font-bold text-white">{items.length}</p>
          <p className="mt-1 text-[11px] text-white/70">样库存</p>
        </div>
        <div className={`rounded-2xl border p-3 text-center ${nearExpiry.length > 0 ? 'border-amber-400/20 bg-amber-500/15' : 'border-white/10 bg-white/10'}`}>
          <p className={`text-2xl font-bold ${nearExpiry.length > 0 ? 'text-amber-200' : 'text-emerald-300'}`}>
            {nearExpiry.length > 0 ? `⚠ ${nearExpiry.length}` : '✓'}
          </p>
          <p className="mt-1 text-[11px] text-white/70">{nearExpiry.length > 0 ? '样临期' : '全部新鲜'}</p>
        </div>
        <button onClick={() => document.dispatchEvent(new CustomEvent('start-photo-flow'))}
          className="rounded-2xl border border-brand-300/30 bg-brand-500/20 p-3 text-center transition-colors hover:bg-brand-500/30 active:scale-95">
          <p className="text-2xl">📷</p>
          <p className="mt-1 text-[11px] text-brand-200">拍照录入</p>
        </button>
      </section>

      {/* Expiry alerts (only show if there are expiring items) */}
      {nearExpiry.length > 0 && (
        <section className="rounded-2xl border border-amber-400/15 bg-amber-500/8 p-3">
          <p className="text-xs font-medium text-amber-200/80 mb-2">⚠ 临期提醒</p>
          <div className="space-y-1.5">
            {nearExpiry.slice(0, 3).map((item) => {
              const days = diffDays(item.expDate);
              return (
                <button key={item.id} onClick={() => navigate('/discover')}
                  className="flex w-full items-center justify-between rounded-xl bg-black/15 px-3 py-2 text-left transition-colors hover:bg-black/25">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{getFoodEmoji(item.name)}</span>
                    <span className="text-sm text-white">{item.name}</span>
                  </div>
                  <span className={`text-xs font-medium ${days <= 0 ? 'text-red-300' : 'text-amber-200'}`}>
                    {days <= 0 ? '已过期' : days === 1 ? '明天到期' : `${days}天后到期`}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Shelf viewer */}
      <section>
        <FridgeViewer />
      </section>

      {/* Expandable shelf item list */}
      <section className="flex flex-col gap-2">
        <ShelfSelector
          shelves={shelves}
          selectedShelfId={detailShelfId ?? selectedShelfId ?? shelves[0]?.id ?? ''}
          onSelect={(id) => { setDetailShelfId(id); setSelectedShelf(id); }}
        />
        {detailShelfId && (
          <div className="flex flex-col gap-2">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <InventoryItemCard key={item.id} item={item}
                  onMinusOne={() => handleMinusOne(item)}
                  onClear={() => removeItem(item.id)}
                  onSave={(changes) => updateItem(item.id, changes)} />
              ))
            ) : (
              <p className="py-4 text-center text-xs text-slate-400">这层没有食材</p>
            )}
          </div>
        )}
      </section>

      {/* Quick entry area */}
      <section className="rounded-2xl border border-white/10 bg-white/10 p-4 shadow-glass backdrop-blur-xl">
        <p className="text-xs font-medium text-slate-300/80 mb-3">快捷录入</p>

        {/* Quick-fill buttons */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {quickItems.map((preset) => (
            <button key={preset.name} type="button" onClick={() => handleQuickFill(preset)}
              className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 transition-colors hover:border-brand-300/60 hover:text-white active:scale-95">
              {preset.name} <span className="text-xs text-slate-300/80">{preset.qty}{preset.unit}</span>
            </button>
          ))}
        </div>

        {/* Manual entry row */}
        <form onSubmit={handleManualSubmit} className="mt-3 flex items-center gap-2">
          <input type="text" placeholder="输入食材名称..." value={entryName}
            onChange={(e) => setEntryName(e.target.value)}
            className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-accent-300 focus:outline-none" />
          <input type="number" min={0} value={entryQty || ''}
            onChange={(e) => setEntryQty(Number(e.target.value))}
            placeholder="量"
            className="w-14 rounded-xl border border-white/10 bg-black/30 px-2 py-2 text-sm text-white focus:border-accent-300 focus:outline-none" />
          <select value={entryUnit} onChange={(e) => setEntryUnit(e.target.value as typeof entryUnit)}
            className="rounded-xl border border-white/10 bg-black/30 px-2 py-2 text-sm text-white focus:border-accent-300 focus:outline-none">
            {QUANTITY_UNITS.map((u) => <option key={u} value={u} className="bg-slate-900">{u}</option>)}
          </select>
          <button type="submit" disabled={!targetShelfId || !entryName.trim()}
            className="shrink-0 rounded-xl border border-brand-300/70 bg-brand-500/70 px-4 py-2 text-sm font-semibold text-white transition-all disabled:opacity-30 active:scale-95">
            +
          </button>
        </form>
      </section>

      {/* Quick add modal (for preset items) */}
      {quickAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setQuickAdd(null)}>
          <div className="mx-6 w-full max-w-xs rounded-2xl border border-white/10 bg-surface-800/95 p-5 shadow-glass backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-base font-semibold text-white">{getFoodEmoji(quickAdd.name)} {quickAdd.name}</p>
            <div className="mt-4 flex items-center gap-3">
              <span className="text-sm text-slate-300">数量</span>
              <button onClick={() => setQuickQty((q) => Math.max(1, q - 1))} className="h-8 w-8 rounded-lg border border-white/10 bg-white/5 text-white">-</button>
              <span className="text-lg font-bold text-white">{quickQty}</span>
              <button onClick={() => setQuickQty((q) => q + 1)} className="h-8 w-8 rounded-lg border border-white/10 bg-white/5 text-white">+</button>
              <span className="text-sm text-slate-400">{quickAdd.unit}</span>
            </div>
            <div className="mt-4 flex gap-3">
              <button onClick={() => setQuickAdd(null)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2 text-sm text-slate-300 hover:text-white">取消</button>
              <button onClick={handleQuickConfirm}
                className="flex-1 rounded-xl border border-brand-300/70 bg-brand-500/70 py-2 text-sm font-semibold text-white hover:bg-brand-500/90">入库</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
