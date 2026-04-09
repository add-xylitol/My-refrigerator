import { useEffect, useState } from 'react';
import { getFoodEmoji } from '@smart-fridge/shared';
import { formatDate, diffDays } from '../../utils/dateUtils';
import type { Item } from '../../stores/fridgeStore';

type InventoryItemCardProps = {
  item: Item;
  onMinusOne: () => void;
  onClear: () => void;
  onSave: (changes: Partial<Item>) => void;
};

export const InventoryItemCard = ({ item, onMinusOne, onClear, onSave }: InventoryItemCardProps) => {
  const [editing, setEditing] = useState(false);
  const [draftQty, setDraftQty] = useState(item.qty);
  const [draftExp, setDraftExp] = useState(item.expDate ? item.expDate.slice(0, 10) : '');

  useEffect(() => {
    setDraftQty(item.qty);
    setDraftExp(item.expDate ? item.expDate.slice(0, 10) : '');
  }, [item.qty, item.expDate]);

  const daysLeft = diffDays(item.expDate);
  const statusColor = daysLeft <= 2 ? 'text-amber-200' : daysLeft <= 5 ? 'text-accent-200' : 'text-slate-300';
  const borderAccent = daysLeft <= 2 ? 'border-l-amber-400' : daysLeft <= 5 ? 'border-l-accent-400' : 'border-l-transparent';

  const commitEdit = () => {
    onSave({
      qty: Number.isFinite(draftQty) ? draftQty : item.qty,
      expDate: draftExp ? new Date(draftExp).toISOString() : null,
    });
    setEditing(false);
  };

  return (
    <article className={`rounded-3xl border border-white/10 border-l-4 ${borderAccent} bg-white/10 p-4 shadow-glass backdrop-blur-xl`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <span className="text-2xl mt-0.5">{getFoodEmoji(item.name)}</span>
          <div className="flex-1">
            <p className="text-base font-semibold text-white">{item.name}</p>
            <div className="mt-1 space-y-1 text-xs text-slate-200/80">
              <p>
                数量：{' '}
                {editing ? (
                  <input type="number" min={0}
                    className="w-20 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-right text-sm text-white focus:border-accent-300 focus:outline-none"
                    value={draftQty} onChange={(e) => setDraftQty(Number(e.target.value))} />
                ) : (
                  <span className="font-medium text-white/90">{item.qty}{item.unit}</span>
                )}
              </p>
              <p>
                到期：{' '}
                {editing ? (
                  <input type="date"
                    className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-sm text-white focus:border-accent-300 focus:outline-none"
                    value={draftExp} onChange={(e) => setDraftExp(e.target.value)} />
                ) : (
                  <span className={statusColor}>{formatDate(item.expDate)}</span>
                )}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 text-xs text-slate-200/80">
          <div className="flex gap-2">
            <button type="button" onClick={() => (editing ? commitEdit() : setEditing(true))}
              className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-slate-100 transition-colors hover:border-accent-300/60 hover:text-white">
              {editing ? '保存' : '编辑'}
            </button>
            <button type="button" onClick={onClear}
              className="rounded-full border border-white/10 bg-red-500/15 px-3 py-1 text-xs font-medium text-red-200 transition-colors hover:border-red-300/70 hover:bg-red-500/25">
              清空
            </button>
          </div>
          <button type="button" onClick={onMinusOne}
            className="rounded-full border border-accent-300/40 bg-accent-500/20 px-3 py-1 text-[11px] text-accent-100 transition-colors hover:bg-accent-500/30">
            减一份
          </button>
        </div>
      </div>
    </article>
  );
};
