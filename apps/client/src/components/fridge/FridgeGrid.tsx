import { useMemo } from 'react';
import { useFridgeStore } from '../../stores/fridgeStore';

export const FridgeGrid = () => {
  const { shelves, selectedShelfId, setSelectedShelf, items } = useFridgeStore((state) => ({
    shelves: state.shelves,
    selectedShelfId: state.selectedShelfId,
    setSelectedShelf: state.setSelectedShelf,
    items: state.items
  }));

  const itemCounts = useMemo(() => {
    const counts: Record<string, { total: number; nearExpiry: number }> = {};
    for (const shelf of shelves) {
      counts[shelf.id] = { total: 0, nearExpiry: 0 };
    }
    items.forEach((item) => {
      if (!counts[item.shelfId]) {
        counts[item.shelfId] = { total: 0, nearExpiry: 0 };
      }
      counts[item.shelfId].total += 1;
      if (item.expDate) {
        const diff = Math.floor(
          (new Date(item.expDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
        );
        if (diff <= 2) {
          counts[item.shelfId].nearExpiry += 1;
        }
      }
    });
    return counts;
  }, [items, shelves]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {shelves.map((shelf) => (
        <button
          key={shelf.id}
          type="button"
          onClick={() => setSelectedShelf(shelf.id)}
          className={[
            'flex flex-col gap-2 rounded-2xl border border-white/10 bg-gradient-to-br from-surface-900/70 via-surface-800/70 to-brand-900/40 p-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40',
            selectedShelfId === shelf.id
              ? 'shadow-glow border-brand-400/70 from-brand-700/70'
              : 'hover:border-brand-300/60 hover:shadow-glow'
          ].join(' ')}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.25em] text-accent-200/80">
              {shelf.type === 'freeze' ? '冷冻' : shelf.type === 'produce' ? '果蔬' : '冷藏'}
            </span>
            <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[10px] text-accent-100/80">
              {itemCounts[shelf.id]?.total ?? 0} 件
            </span>
          </div>
          <p className="text-lg font-semibold leading-tight text-white">{shelf.name}</p>
          {itemCounts[shelf.id]?.nearExpiry ? (
            <span className="text-[11px] text-amber-300">
              临期 {itemCounts[shelf.id].nearExpiry} 件
            </span>
          ) : (
            <span className="text-[11px] text-slate-400/80">状态良好</span>
          )}
        </button>
      ))}
    </div>
  );
};
