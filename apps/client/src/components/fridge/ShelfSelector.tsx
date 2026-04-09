import { shelfTypeLabel } from '../../utils/dateUtils';
import type { Shelf } from '../../stores/fridgeStore';

type ShelfSelectorProps = {
  shelves: Shelf[];
  selectedShelfId: string | null;
  onSelect: (shelfId: string) => void;
};

export const ShelfSelector = ({ shelves, selectedShelfId, onSelect }: ShelfSelectorProps) => {
  if (!shelves.length) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {shelves.map((shelf) => {
        const isActive = selectedShelfId === shelf.id;
        return (
          <button key={shelf.id} type="button" onClick={() => onSelect(shelf.id)}
            className={[
              'flex min-w-[120px] flex-col gap-1 rounded-2xl border px-3 py-2 text-left transition-colors',
              isActive
                ? 'border-brand-300/80 bg-brand-500/30 text-white shadow-glow'
                : 'border-white/10 bg-white/5 text-slate-200 hover:border-brand-300/50 hover:text-white'
            ].join(' ')}>
            <span className="text-[10px] uppercase tracking-[0.3em] text-accent-200/80">
              {shelfTypeLabel[shelf.type]}
            </span>
            <span className="text-sm font-medium">{shelf.name}</span>
          </button>
        );
      })}
    </div>
  );
};
