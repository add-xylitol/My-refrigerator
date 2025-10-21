import { ChangeEvent, FormEvent, useMemo, useRef, useState } from 'react';
import { QUANTITY_UNITS } from '@smart-fridge/shared';
import { FridgeViewer } from '../components/fridge/FridgeViewer';
import { useFridgeStore, type Item } from '../stores/fridgeStore';
import { aiService, type VisionCandidate } from '../services';

const formatDate = (value?: string | null) => {
  if (!value) {
    return '未设置';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
};

const diffDays = (value?: string | null) => {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return Number.POSITIVE_INFINITY;
  }
  const diff = date.getTime() - Date.now();
  return Math.floor(diff / (24 * 60 * 60 * 1000));
};

type EntryFormState = {
  name: string;
  qty: number;
  unit: (typeof QUANTITY_UNITS)[number];
  expDate: string;
  photoName: string | null;
};

type VisionState = {
  loading: boolean;
  candidates: VisionCandidate[];
  note: string | null;
  error: string | null;
};

type InventoryItemProps = {
  item: Item;
  onMinusOne: () => void;
  onClear: () => void;
  onEdit: (changes: Partial<Item>) => void;
};

const initialEntryState: EntryFormState = {
  name: '',
  qty: 1,
  unit: QUANTITY_UNITS[0],
  expDate: '',
  photoName: null
};

const quickItems = [
  { name: '鸡蛋', qty: 6, unit: '个' as const },
  { name: '牛奶', qty: 1, unit: '袋' as const },
  { name: '上海青', qty: 1, unit: '把' as const },
  { name: '牛肉', qty: 300, unit: '克' as const }
];

const InventoryItem = ({ item, onMinusOne, onClear, onEdit }: InventoryItemProps) => {
  const [editing, setEditing] = useState(false);
  const [draftQty, setDraftQty] = useState(item.qty);
  const [draftExp, setDraftExp] = useState(item.expDate ? item.expDate.slice(0, 10) : '');

  const commitEdit = () => {
    onEdit({
      qty: Number.isFinite(draftQty) ? draftQty : item.qty,
      expDate: draftExp ? new Date(draftExp).toISOString() : null
    });
    setEditing(false);
  };

  const statusColor = (() => {
    const days = diffDays(item.expDate);
    if (days <= 2) return 'text-amber-200';
    if (days <= 5) return 'text-accent-200';
    return 'text-slate-300';
  })();

  return (
    <article className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-glass backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-base font-semibold text-white">{item.name}</p>
          <div className="mt-1 space-y-1 text-xs text-slate-200/80">
            <p>
              数量：{' '}
              {editing ? (
                <input
                  type="number"
                  min={0}
                  className="w-20 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-right text-sm text-white focus:border-accent-300 focus:outline-none"
                  value={draftQty}
                  onChange={(event) => setDraftQty(Number(event.target.value))}
                />
              ) : (
                <span className="font-medium text-white/90">
                  {item.qty}
                  {item.unit}
                </span>
              )}
            </p>
            <p>
              到期：{' '}
              {editing ? (
                <input
                  type="date"
                  className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-sm text-white focus:border-accent-300 focus:outline-none"
                  value={draftExp}
                  onChange={(event) => setDraftExp(event.target.value)}
                />
              ) : (
                <span className={statusColor}>{formatDate(item.expDate)}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 text-xs text-slate-200/80">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => (editing ? commitEdit() : setEditing(true))}
              className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-slate-100 transition-colors hover:border-accent-300/60 hover:text-white"
            >
              {editing ? '保存' : '编辑'}
            </button>
            <button
              type="button"
              onClick={onClear}
              className="rounded-full border border-white/10 bg-red-500/15 px-3 py-1 text-xs font-medium text-red-200 transition-colors hover:border-red-300/70 hover:bg-red-500/25"
            >
              清空
            </button>
          </div>
          <button
            type="button"
            onClick={onMinusOne}
            className="rounded-full border border-accent-300/40 bg-accent-500/20 px-3 py-1 text-[11px] text-accent-100 transition-colors hover:bg-accent-500/30"
          >
            减一份
          </button>
        </div>
      </div>
    </article>
  );
};

export const DashboardPage = () => {
  const [filterMode, setFilterMode] = useState<'current' | 'all' | 'expiring'>('current');
  const [searchTerm, setSearchTerm] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [entryForm, setEntryForm] = useState<EntryFormState>(initialEntryState);
  const [visionState, setVisionState] = useState<VisionState>({
    loading: false,
    candidates: [],
    note: null,
    error: null
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    shelves,
    selectedShelfId,
    setSelectedShelf,
    items,
    addItem,
    updateItem,
    removeItem,
    condiments
  } = useFridgeStore((state) => ({
    shelves: state.shelves,
    selectedShelfId: state.selectedShelfId,
    setSelectedShelf: state.setSelectedShelf,
    items: state.items,
    addItem: state.addItem,
    updateItem: state.updateItem,
    removeItem: state.removeItem,
    condiments: state.condiments
  }));

  const resetEntry = () => {
    setEntryForm(initialEntryState);
    setVisionState({ loading: false, candidates: [], note: null, error: null });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const selectedShelf = shelves.find((shelf) => shelf.id === selectedShelfId) ?? shelves[0] ?? null;

  const filteredItems = useMemo(() => {
    const base = items.filter((item) =>
      filterMode === 'all'
        ? true
        : filterMode === 'expiring'
        ? diffDays(item.expDate) <= 2
        : selectedShelfId
        ? item.shelfId === selectedShelfId
        : true
    );
    if (!searchTerm.trim()) {
      return base;
    }
    return base.filter((item) =>
      item.name.toLowerCase().includes(searchTerm.trim().toLowerCase())
    );
  }, [items, filterMode, selectedShelfId, searchTerm]);

  const itemsToShow = filteredItems.sort((a, b) => diffDays(a.expDate) - diffDays(b.expDate));

  const nearExpiry = useMemo(
    () =>
      items
        .filter((item) => diffDays(item.expDate) <= 2)
        .sort((a, b) => diffDays(a.expDate) - diffDays(b.expDate)),
    [items]
  );

  const missingCondiments = condiments.filter((condiment) => condiment.stockLevel === '缺货');

  const handleMinusOne = (item: Item) => {
    const next = Math.max(item.qty - 1, 0);
    if (next <= 0) {
      removeItem(item.id);
    } else {
      updateItem(item.id, { qty: next });
    }
  };

  const handleClear = (item: Item) => removeItem(item.id);

  const handleManualSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedShelfId || !entryForm.name.trim()) {
      return;
    }
    addItem({
      shelfId: selectedShelfId,
      name: entryForm.name.trim(),
      unit: entryForm.unit,
      qty: entryForm.qty,
      expDate: entryForm.expDate ? new Date(entryForm.expDate).toISOString() : null,
      barcode: null,
      photoUrl: entryForm.photoName ?? null
    });
    resetEntry();
    setShowQuickAdd(false);
  };

  const applyCandidate = (candidate: VisionCandidate) => {
    addItem({
      shelfId: selectedShelfId ?? shelves[0]?.id ?? 'shelf-1',
      name: candidate.name,
      unit: candidate.unit,
      qty: candidate.qty,
      expDate: candidate.expDate,
      barcode: null,
      photoUrl: null
    });
    setVisionState((prev) => ({
      ...prev,
      candidates: prev.candidates.filter((item) => item.id !== candidate.id)
    }));
  };

  const runVisionRecognition = async (fileName: string) => {
    if (!selectedShelfId) {
      setVisionState({
        loading: false,
        candidates: [],
        note: null,
        error: '请先选择层位再进行识别。'
      });
      return;
    }
    setVisionState({ loading: true, candidates: [], note: null, error: null });
    try {
      const result = await aiService.recognize({ shelfId: selectedShelfId, fileName });
      setVisionState({
        loading: false,
        candidates: result.candidates,
        note: result.note ?? null,
        error: null
      });
    } catch (error) {
      setVisionState({
        loading: false,
        candidates: [],
        note: null,
        error: '识别失败，请稍后重试或直接填写。'
      });
    }
  };

  const handlePhotoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }
    const [file] = files;
    setEntryForm((prev) => ({
      ...prev,
      name: prev.name || file.name.replace(/\.[^/.]+$/, ''),
      photoName: file.name
    }));
    await runVisionRecognition(file.name);
  };

  const summaryCards = [
    {
      title: '库存总数',
      value: items.length,
      subtitle: '含所有层位',
      accent: 'bg-brand-500/40 text-white'
    },
    {
      title: '临期提醒',
      value: nearExpiry.length,
      subtitle: '≤2天内到期',
      accent: 'bg-amber-400/40 text-amber-100'
    },
    {
      title: '缺货小料',
      value: missingCondiments.length,
      subtitle: '建议补充',
      accent: 'bg-accent-500/30 text-accent-100'
    }
  ];

  const isShelfSelectable = Boolean(selectedShelfId);

  return (
    <div className="flex flex-col gap-6 pb-20">
      <section className="rounded-3xl border border-white/10 bg-white/10 p-5 shadow-glass backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-accent-200/80">
              快捷录入
            </p>
            <h1 className="mt-1 text-xl font-semibold text-white">
              {selectedShelf ? `当前层位：${selectedShelf.name}` : '请选择层位'}
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full border border-accent-300/60 bg-accent-500/20 px-4 py-2 text-sm font-medium text-accent-100 transition-transform hover:scale-[1.02]"
            >
              📷 拍照识别
            </button>
            <button
              type="button"
              onClick={() => {
                resetEntry();
                setShowQuickAdd((prev) => !prev);
              }}
              className="rounded-full border border-brand-300/60 bg-brand-500/20 px-4 py-2 text-sm font-medium text-white transition-transform hover:scale-[1.02]"
            >
              ➕ 快速录入
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
          />
        </div>
      </section>

      {visionState.loading && (
        <div className="rounded-3xl border border-accent-400/30 bg-accent-500/15 px-4 py-3 text-sm text-accent-100 shadow-glass backdrop-blur-xl">
          正在识别食材，请稍候…
        </div>
      )}

      {visionState.error && (
        <div className="rounded-3xl border border-red-500/30 bg-red-500/15 px-4 py-3 text-sm text-red-200 shadow-glass backdrop-blur-xl">
          {visionState.error}
        </div>
      )}

      {visionState.candidates.length > 0 && (
        <section className="space-y-3 rounded-3xl border border-white/10 bg-white/10 p-5 shadow-glass backdrop-blur-xl">
          <header className="flex items-center justify-between text-sm text-slate-200/80">
            <span>识别到 {visionState.candidates.length} 个候选，请确认加入库存。</span>
            <button
              type="button"
              className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-slate-300 hover:text-white"
              onClick={resetEntry}
            >
              清空候选
            </button>
          </header>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {visionState.candidates.map((candidate) => (
              <div
                key={candidate.id}
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-200/80"
              >
                <p className="text-base font-semibold text-white">{candidate.name}</p>
                <p className="text-xs">
                  建议：{candidate.qty}
                  {candidate.unit} · 置信度 {(candidate.confidence * 100).toFixed(0)}%
                </p>
                {candidate.expDate && (
                  <p className="text-xs text-slate-200/70">
                    预估到期：{candidate.expDate.slice(0, 10)}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => applyCandidate(candidate)}
                  className="mt-3 w-full rounded-full border border-brand-400/40 bg-brand-500/20 px-3 py-2 text-xs font-semibold text-white transition-transform hover:scale-[1.02]"
                >
                  加入库存
                </button>
              </div>
            ))}
          </div>
          {visionState.note && (
            <p className="text-[11px] text-slate-300/70">提示：{visionState.note}</p>
          )}
        </section>
      )}

      {showQuickAdd && (
        <form
          className="space-y-3 rounded-3xl border border-white/10 bg-white/10 p-5 shadow-glass backdrop-blur-xl text-sm"
          onSubmit={handleManualSubmit}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">快速录入</h2>
            <button
              type="button"
              className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-slate-300 hover:text-white"
              onClick={() => {
                resetEntry();
                setShowQuickAdd(false);
              }}
            >
              关闭
            </button>
          </div>
          {!isShelfSelectable && (
            <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              请先在上方选择层位。
            </p>
          )}
          <label className="flex flex-col gap-2">
            名称
            <input
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-accent-300 focus:outline-none"
              value={entryForm.name}
              onChange={(event) =>
                setEntryForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="例如：牛排、胡萝卜"
              required
            />
          </label>
          <div className="grid grid-cols-[1fr_120px] gap-2">
            <label className="flex flex-col gap-2">
              数量
              <input
                type="number"
                min={0}
                className="rounded-xl border border白"""
