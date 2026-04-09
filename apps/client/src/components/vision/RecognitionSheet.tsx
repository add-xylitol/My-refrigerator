import { useState } from 'react';
import { QUANTITY_UNITS } from '@smart-fridge/shared';
import { getFoodEmoji } from '@smart-fridge/shared';
import { shelfTypeLabel } from '../../utils/dateUtils';
import type { Shelf } from '../../stores/fridgeStore';
import type { VisionCandidate } from '../../services';

type RecognitionSheetProps = {
  open: boolean;
  candidates: VisionCandidate[];
  loading: boolean;
  error: string | null;
  shelves: Shelf[];
  onConfirmOne: (candidate: VisionCandidate, shelfId: string) => void;
  onConfirmAll: () => void;
  onRetry: () => void;
  onClose: () => void;
};

export const RecognitionSheet = ({
  open, candidates, loading, error, shelves,
  onConfirmOne, onConfirmAll, onRetry, onClose,
}: RecognitionSheetProps) => {
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());
  const [editedCandidates, setEditedCandidates] = useState<Map<string, { name: string; qty: number; unit: string; shelfId: string }>>(new Map());

  if (!open) return null;

  const remaining = candidates.filter((c) => !confirmedIds.has(c.id));

  const getCandidateEdit = (c: VisionCandidate) => {
    const edited = editedCandidates.get(c.id);
    return {
      name: edited?.name ?? c.name,
      qty: edited?.qty ?? c.qty,
      unit: edited?.unit ?? c.unit,
      shelfId: edited?.shelfId ?? shelves[0]?.id ?? '',
    };
  };

  const updateEdit = (id: string, field: string, value: string | number) => {
    setEditedCandidates((prev) => {
      const next = new Map(prev);
      const existing = next.get(id) ?? { name: '', qty: 0, unit: '', shelfId: '' };
      next.set(id, { ...existing, [field]: value });
      return next;
    });
  };

  const handleConfirmOne = (c: VisionCandidate) => {
    const edit = getCandidateEdit(c);
    onConfirmOne(
      { ...c, name: edit.name, qty: edit.qty, unit: edit.unit as VisionCandidate['unit'] },
      edit.shelfId
    );
    setConfirmedIds((prev) => new Set(prev).add(c.id));
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col" onClick={(e) => e.stopPropagation()}>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative z-10 max-h-[70vh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-surface-900/98 backdrop-blur-xl shadow-glass">
        {/* Drag handle */}
        <div className="flex justify-center py-3">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        <div className="px-5 pb-6">
          <div className="flex items-center justify-between">
            <p className="text-base font-semibold text-white">
              {loading ? '识别中...' : error ? '识别失败' : `识别结果 (${candidates.length}样)`}
            </p>
            <button onClick={onClose} className="text-xs text-slate-400 hover:text-white">关闭</button>
          </div>

          {loading && (
            <div className="mt-6 flex flex-col items-center gap-3 py-8">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-300 border-t-transparent" />
              <p className="text-sm text-slate-300/80">AI 正在识别食材...</p>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-center">
              <p className="text-sm text-red-200">{error}</p>
              <div className="mt-3 flex justify-center gap-3">
                <button onClick={onRetry} className="rounded-full border border-brand-300/60 bg-brand-500/50 px-4 py-1.5 text-xs text-white hover:bg-brand-500/70">
                  重新拍照
                </button>
              </div>
            </div>
          )}

          {!loading && !error && candidates.length > 0 && (
            <div className="mt-4 space-y-3">
              {candidates.map((c) => {
                const edit = getCandidateEdit(c);
                const confirmed = confirmedIds.has(c.id);
                return (
                  <div key={c.id}
                    className={`rounded-2xl border p-3 ${confirmed ? 'border-emerald-400/30 bg-emerald-500/10 opacity-60' : 'border-white/10 bg-white/5'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getFoodEmoji(c.name)}</span>
                      <div className="flex-1 space-y-2">
                        <input type="text" value={edit.name} disabled={confirmed}
                          onChange={(e) => updateEdit(c.id, 'name', e.target.value)}
                          className="w-full rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-sm text-white focus:border-accent-300 focus:outline-none disabled:opacity-50" />
                        <div className="flex gap-2">
                          <input type="number" min={0} value={edit.qty} disabled={confirmed}
                            onChange={(e) => updateEdit(c.id, 'qty', Number(e.target.value))}
                            className="w-16 rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-sm text-white focus:border-accent-300 focus:outline-none disabled:opacity-50" />
                          <select value={edit.unit} disabled={confirmed}
                            onChange={(e) => updateEdit(c.id, 'unit', e.target.value)}
                            className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-sm text-white focus:border-accent-300 focus:outline-none disabled:opacity-50">
                            {QUANTITY_UNITS.map((u) => <option key={u} value={u} className="bg-slate-900">{u}</option>)}
                          </select>
                          <select value={edit.shelfId} disabled={confirmed}
                            onChange={(e) => updateEdit(c.id, 'shelfId', e.target.value)}
                            className="flex-1 rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-sm text-white focus:border-accent-300 focus:outline-none disabled:opacity-50">
                            {shelves.map((s) => (
                              <option key={s.id} value={s.id} className="bg-slate-900">
                                {shelfTypeLabel[s.type]} · {s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {!confirmed && (
                        <button onClick={() => handleConfirmOne(c)}
                          className="shrink-0 rounded-full border border-brand-300/60 bg-brand-500/50 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-500/70">
                          确认
                        </button>
                      )}
                      {confirmed && <span className="text-xs text-emerald-300">✓</span>}
                    </div>
                  </div>
                );
              })}

              {remaining.length > 1 && (
                <button onClick={onConfirmAll}
                  className="w-full rounded-2xl border border-brand-300/60 bg-brand-500/50 py-3 text-sm font-semibold text-white hover:bg-brand-500/70">
                  一键全部入库 ({remaining.length}样)
                </button>
              )}
            </div>
          )}

          {!loading && !error && candidates.length === 0 && (
            <p className="mt-4 text-center text-sm text-slate-300/70">未识别到食材，试试拍得更清楚些</p>
          )}
        </div>
      </div>
    </div>
  );
};
