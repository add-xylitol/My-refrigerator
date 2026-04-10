import { useRef, useState } from 'react';
import { QUANTITY_UNITS } from '@smart-fridge/shared';
import { type MealType, type MealRecord } from '../../stores/fridgeStore';
import type { MealRecordState } from '../../hooks/useMealRecord';

const MEAL_TYPES: MealType[] = ['早餐', '中餐', '晚餐', '加餐', '练前餐', '练后餐'];

const mealTypeIcon: Record<MealType, string> = {
  '早餐': '🌅', '中餐': '☀️', '晚餐': '🌙', '加餐': '🍎', '练前餐': '💪', '练后餐': '🥤',
};

type RecordMealSheetProps = {
  state: MealRecordState;
  onSetMealType: (type: MealType) => void;
  onSetDescription: (desc: string) => void;
  onSetNotes: (notes: string) => void;
  onSetEatenAt: (iso: string) => void;
  onAddItem: (item: { name: string; qty: number; unit: string }) => void;
  onRemoveItem: (index: number) => void;
  onSetPhoto: (file: File, url: string) => void;
  onConfirm: () => void;
  onClose: () => void;
};

export const RecordMealSheet = ({
  state, onSetMealType, onSetDescription, onSetNotes, onSetEatenAt,
  onAddItem, onRemoveItem, onSetPhoto, onConfirm, onClose,
}: RecordMealSheetProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemUnit, setNewItemUnit] = useState(QUANTITY_UNITS[0]);

  if (!state.sheetOpen) return null;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onSetPhoto(file, url);
      e.target.value = '';
    }
  };

  const handleAddItem = () => {
    if (!newItemName.trim()) return;
    onAddItem({ name: newItemName.trim(), qty: newItemQty, unit: newItemUnit });
    setNewItemName('');
    setNewItemQty(1);
  };

  const canConfirm = state.description.trim() || state.items.length > 0;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col" onClick={(e) => e.stopPropagation()}>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 max-h-[80vh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-surface-900/95 backdrop-blur-xl shadow-glass">
        <div className="flex justify-center py-3">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        <div className="px-5 pb-6">
          <div className="flex items-center justify-between">
            <p className="text-base font-semibold text-white">记录一餐</p>
            <button onClick={onClose} className="text-xs text-slate-400 hover:text-white">关闭</button>
          </div>

          {/* Meal type selector */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {MEAL_TYPES.map((type) => (
              <button key={type} type="button" onClick={() => onSetMealType(type)}
                className={[
                  'rounded-xl border py-2 text-xs font-medium transition-colors',
                  state.mealType === type
                    ? 'border-brand-300/70 bg-brand-500/40 text-white'
                    : 'border-white/10 bg-white/5 text-slate-200 hover:border-brand-300/60'
                ].join(' ')}>
                {mealTypeIcon[type]} {type}
              </button>
            ))}
          </div>

          {/* Photo */}
          <div className="mt-4">
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
            {state.photoUrl ? (
              <div className="relative rounded-2xl overflow-hidden">
                <img src={state.photoUrl} alt="meal" className="h-32 w-full object-cover" />
                <button onClick={() => fileInputRef.current?.click()}
                  className="absolute right-2 bottom-2 rounded-full border border-white/20 bg-black/50 px-2 py-1 text-[10px] text-white">
                  重拍
                </button>
              </div>
            ) : (
              <button onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-2xl border border-dashed border-white/15 bg-white/5 py-6 text-sm text-slate-300 hover:text-white hover:border-brand-300/60 transition-colors">
                📷 拍照或选择图片
              </button>
            )}
          </div>

          {/* Description */}
          <input type="text" placeholder="描述这顿饭（如：番茄炒蛋+米饭）"
            value={state.description} onChange={(e) => onSetDescription(e.target.value)}
            className="mt-4 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-accent-300 focus:outline-none" />

          {/* Items */}
          <div className="mt-3">
            <p className="text-xs font-medium text-slate-300/80 mb-2">食材用量</p>
            {state.items.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {state.items.map((item, i) => (
                  <span key={i}
                    className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200">
                    {item.name} {item.qty}{item.unit}
                    <button onClick={() => onRemoveItem(i)} className="text-slate-500 hover:text-red-300 ml-0.5">×</button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input type="text" placeholder="食材名" value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="flex-1 rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-sm text-white focus:border-accent-300 focus:outline-none" />
              <input type="number" min={0} value={newItemQty || ''} placeholder="量"
                onChange={(e) => setNewItemQty(Number(e.target.value))}
                className="w-14 rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-sm text-white focus:border-accent-300 focus:outline-none" />
              <select value={newItemUnit} onChange={(e) => setNewItemUnit(e.target.value as typeof newItemUnit)}
                className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-sm text-white focus:border-accent-300 focus:outline-none">
                {QUANTITY_UNITS.map((u) => <option key={u} value={u} className="bg-slate-900">{u}</option>)}
              </select>
              <button onClick={handleAddItem} disabled={!newItemName.trim()}
                className="shrink-0 rounded-lg border border-brand-300/60 bg-brand-500/50 px-3 py-1 text-xs text-white hover:bg-brand-500/70 disabled:opacity-40">
                添加
              </button>
            </div>
          </div>

          {/* Time */}
          <div className="mt-3">
            <input type="datetime-local"
              value={state.eatenAt.slice(0, 16)}
              onChange={(e) => onSetEatenAt(new Date(e.target.value).toISOString())}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:border-accent-300 focus:outline-none" />
          </div>

          {/* Notes */}
          <input type="text" placeholder="备注（可选）"
            value={state.notes} onChange={(e) => onSetNotes(e.target.value)}
            className="mt-3 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-accent-300 focus:outline-none" />

          {/* Confirm */}
          <button onClick={onConfirm} disabled={!canConfirm}
            className="mt-4 w-full rounded-2xl border border-brand-300/70 bg-brand-500/70 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-500/90 disabled:opacity-40 disabled:cursor-not-allowed">
            保存记录
          </button>
        </div>
      </div>
    </div>
  );
};
