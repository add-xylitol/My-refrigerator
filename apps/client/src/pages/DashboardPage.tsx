import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { QUANTITY_UNITS } from '@smart-fridge/shared';
import { FridgeViewer } from '../components/fridge/FridgeViewer';
import { useFridgeStore, type Item, type Shelf } from '../stores/fridgeStore';
import {
  aiService,
  VisionRecognitionError,
  type VisionCandidate,
  type VisionDebugInfo
} from '../services';

const jsonStringifyPretty = (value: unknown) =>
  JSON.stringify(value, null, 2)
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t');

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
  debug: VisionDebugInfo | null;
};

type InventoryItemCardProps = {
  item: Item;
  onMinusOne: () => void;
  onClear: () => void;
  onSave: (changes: Partial<Item>) => void;
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
  { name: '牛肉', qty: 300, unit: '克' as const },
  { name: '西红柿', qty: 2, unit: '个' as const }
];

const viewModeOptions: Array<{ id: 'entry' | 'overview'; label: string }> = [
  { id: 'entry', label: '快速录入' },
  { id: 'overview', label: '库存概览' }
];

const shelfTypeLabel: Record<Shelf['type'], string> = {
  chill: '冷藏',
  freeze: '冷冻',
  produce: '果蔬'
};

const summaryCardBaseClasses =
  'rounded-3xl border border-white/10 bg-white/10 p-4 shadow-glass backdrop-blur-xl';

const InventoryItemCard = ({ item, onMinusOne, onClear, onSave }: InventoryItemCardProps) => {
  const [editing, setEditing] = useState(false);
  const [draftQty, setDraftQty] = useState(item.qty);
  const [draftExp, setDraftExp] = useState(item.expDate ? item.expDate.slice(0, 10) : '');

  useEffect(() => {
    setDraftQty(item.qty);
    setDraftExp(item.expDate ? item.expDate.slice(0, 10) : '');
  }, [item.qty, item.expDate]);

  const statusColor = (() => {
    const days = diffDays(item.expDate);
    if (days <= 2) return 'text-amber-200';
    if (days <= 5) return 'text-accent-200';
    return 'text-slate-300';
  })();

  const commitEdit = () => {
    onSave({
      qty: Number.isFinite(draftQty) ? draftQty : item.qty,
      expDate: draftExp ? new Date(draftExp).toISOString() : null
    });
    setEditing(false);
  };

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

type VisionDebugPanelProps = {
  debug: VisionDebugInfo;
  error: string | null;
};

const VisionDebugPanel = ({ debug, error }: VisionDebugPanelProps) => {
  return (
    <details
      className="rounded-3xl border border-white/10 bg-slate-900/70 p-4 shadow-inner backdrop-blur-xl"
      open={Boolean(error)}
    >
      <summary className="cursor-pointer select-none text-sm font-semibold text-accent-100 outline-none">
        调试信息（点击展开）
        {error ? (
          <span className="ml-2 rounded-full border border-red-400/60 bg-red-500/20 px-2 py-0.5 text-xs text-red-200">
            {error}
          </span>
        ) : (
          <span className="ml-2 text-xs text-slate-300/80">模型交互详情</span>
        )}
      </summary>
      <div className="mt-4 space-y-4 text-xs text-slate-200/80">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="sm:w-48">
            <p className="font-semibold text-white">识别输入</p>
            <p className="mt-1 text-slate-300/70">当前上传的图片预览：</p>
          </div>
          <div className="flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-2">
            <img
              src={debug.imageDataUrl}
              alt="识别图片预览"
              className="max-h-60 w-full rounded-xl object-contain"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="sm:w-48">
            <p className="font-semibold text-white">提示词 Prompt</p>
            <p className="mt-1 text-slate-300/70">传给模型的文字指令。</p>
          </div>
          <pre className="flex-1 overflow-auto rounded-2xl border border-white/10 bg-black/30 p-3 text-left leading-relaxed text-accent-100/80">
            {debug.prompt}
          </pre>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="sm:w-48">
            <p className="font-semibold text-white">请求 Payload</p>
            <p className="mt-1 text-slate-300/70">模型请求体（已隐藏 base64 图片）。</p>
          </div>
          <pre className="flex-1 overflow-auto rounded-2xl border border-white/10 bg-black/30 p-3 text-left leading-relaxed text-emerald-100/80">
            {jsonStringifyPretty(debug.requestPayload)}
          </pre>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="sm:w-48">
            <p className="font-semibold text-white">模型返回 JSON</p>
            <p className="mt-1 text-slate-300/70">原始响应内容，便于排查格式问题。</p>
          </div>
          <pre className="flex-1 overflow-auto rounded-2xl border border-white/10 bg-black/30 p-3 text-left leading-relaxed text-sky-100/90">
            {debug.responseText ?? '（暂无返回数据）'}
          </pre>
        </div>
      </div>
    </details>
  );
};

type ShelfSelectorProps = {
  shelves: Shelf[];
  selectedShelfId: string | null;
  onSelect: (shelfId: string) => void;
};

const ShelfSelector = ({ shelves, selectedShelfId, onSelect }: ShelfSelectorProps) => {
  if (!shelves.length) {
    return null;
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {shelves.map((shelf) => {
        const isActive = selectedShelfId === shelf.id;
        return (
          <button
            key={shelf.id}
            type="button"
            onClick={() => onSelect(shelf.id)}
            className={[
              'flex min-w-[120px] flex-col gap-1 rounded-2xl border px-3 py-2 text-left transition-colors',
              isActive
                ? 'border-brand-300/80 bg-brand-500/30 text-white shadow-glow'
                : 'border-white/10 bg-white/5 text-slate-200 hover:border-brand-300/50 hover:text-white'
            ].join(' ')}
          >
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

export const DashboardPage = () => {
  const [viewMode, setViewMode] = useState<'entry' | 'overview'>('entry');
  const [filterMode, setFilterMode] = useState<'current' | 'all' | 'expiring'>('current');
  const [searchTerm, setSearchTerm] = useState('');
  const [entryForm, setEntryForm] = useState<EntryFormState>(initialEntryState);
  const [visionState, setVisionState] = useState<VisionState>({
    loading: false,
    candidates: [],
    note: null,
    error: null,
    debug: null
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastPhotoFileRef = useRef<File | null>(null);

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

  const selectedShelf =
    shelves.find((shelf) => shelf.id === selectedShelfId) ?? shelves[0] ?? null;

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

  const resetEntry = () => {
    setEntryForm(initialEntryState);
    setVisionState({ loading: false, candidates: [], note: null, error: null, debug: null });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    lastPhotoFileRef.current = null;
  };

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
  };

  const handleQuickFill = (preset: (typeof quickItems)[number]) => {
    setEntryForm({
      name: preset.name,
      qty: preset.qty,
      unit: preset.unit,
      expDate: '',
      photoName: null
    });
  };

  const applyCandidate = (candidate: VisionCandidate) => {
    addItem({
      shelfId: selectedShelfId ?? shelves[0]?.id ?? 'shelf-1',
      name: candidate.name,
      unit: candidate.unit,
      qty: candidate.qty,
      expDate: candidate.expDate,
      barcode: candidate.barcode ?? null,
      photoUrl: null
    });
    setVisionState((prev) => ({
      ...prev,
      candidates: prev.candidates.filter((item) => item.id !== candidate.id)
    }));
  };

  const runVisionRecognition = async (file: File | null) => {
    if (!file) {
      setVisionState({
        loading: false,
        candidates: [],
        note: null,
        error: '未获取到图片，请重新拍照或上传。',
        debug: null
      });
      return;
    }
    if (!selectedShelfId) {
      setVisionState({
        loading: false,
        candidates: [],
        note: null,
        error: '请先选择层位再进行识别。',
        debug: null
      });
      return;
    }
    setVisionState({ loading: true, candidates: [], note: null, error: null, debug: null });
    try {
      const result = await aiService.recognize({
        shelfId: selectedShelfId,
        shelfName: selectedShelf?.name ?? '默认层',
        file
      });
      setVisionState({
        loading: false,
        candidates: result.candidates,
        note: result.note ?? null,
        error: null,
        debug: result.debug
      });
    } catch (error) {
      if (error instanceof VisionRecognitionError) {
        setVisionState({
          loading: false,
          candidates: [],
          note: null,
          error: error.message,
          debug: error.debug
        });
      } else {
        setVisionState({
          loading: false,
          candidates: [],
          note: null,
          error:
            error instanceof Error ? error.message : '识别失败，请稍后重试或直接填写。',
          debug: null
        });
      }
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
    lastPhotoFileRef.current = file;
    await runVisionRecognition(file);
    // 清空 input 值，避免选择同一张图片无法重新触发 change 事件
    // eslint-disable-next-line no-param-reassign
    event.target.value = '';
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

  const filterLabels = [
    { id: 'current', label: selectedShelf ? `仅 ${selectedShelf.name}` : '按层位' },
    { id: 'expiring', label: '临期优先' },
    { id: 'all', label: '全部库存' }
  ] as const;

  const manualSubmitDisabled = !selectedShelfId || !entryForm.name.trim();

  return (
    <div className="flex flex-col gap-6 pb-24">
      <section className="rounded-3xl border border-white/10 bg-white/10 p-3 shadow-glass backdrop-blur-xl">
        <div className="flex items-center justify-between gap-2 rounded-2xl bg-white/5 p-1 text-xs font-medium text-slate-200/90">
          {viewModeOptions.map((option) => {
            const isActive = option.id === viewMode;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setViewMode(option.id)}
                className={[
                  'flex-1 rounded-2xl px-3 py-2 transition-all duration-150',
                  isActive ? 'bg-brand-500/40 text-white shadow-glow' : 'hover:text-white/90'
                ].join(' ')}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </section>

      {viewMode === 'entry' ? (
        <>
          <section className="rounded-3xl border border-white/10 bg-white/10 p-5 shadow-glass backdrop-blur-xl">
            <header className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-accent-200/80">
                选择层位
              </p>
              <h1 className="text-xl font-semibold text-white">
                {selectedShelf ? `当前层位：${selectedShelf.name}` : '请先选择层位'}
              </h1>
            </header>
            <div className="mt-4">
              <ShelfSelector
                shelves={shelves}
                selectedShelfId={selectedShelfId}
                onSelect={setSelectedShelf}
              />
            </div>
            {visionState.debug ? (
              <div className="mt-6">
                <VisionDebugPanel debug={visionState.debug} error={visionState.error} />
              </div>
            ) : null}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/10 p-5 shadow-glass backdrop-blur-xl">
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.3em] text-accent-200/80">
                  快速录入
                </p>
                <h2 className="mt-1 text-lg font-semibold text-white">手速模式 · 三步完成</h2>
                <p className="mt-1 text-xs text-slate-300/80">
                  先点快捷食材或直接输入名称，数量与到期日随手补充，点击“确认入库”即可。
                </p>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {quickItems.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleQuickFill(preset)}
                    className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 transition-colors hover:border-brand-300/60 hover:text-white"
                  >
                    {preset.name}
                    <span className="ml-1 text-xs text-slate-300/80">
                      {preset.qty}
                      {preset.unit}
                    </span>
                  </button>
                ))}
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-2 text-xs text-slate-300/80">
                    食材名称
                    <input
                      type="text"
                      className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:border-accent-300 focus:outline-none"
                      placeholder="例如：鸡胸肉"
                      value={entryForm.name}
                      onChange={(event) =>
                        setEntryForm((prev) => ({ ...prev, name: event.target.value }))
                      }
                    />
                  </label>
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <label className="flex flex-col gap-2 text-xs text-slate-300/80">
                      数量
                      <input
                        type="number"
                        min={0}
                        className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:border-accent-300 focus:outline-none"
                        value={Number.isFinite(entryForm.qty) ? entryForm.qty : ''}
                        onChange={(event) =>
                          setEntryForm((prev) => ({ ...prev, qty: Number(event.target.value) }))
                        }
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-xs text-slate-300/80">
                      单位
                      <select
                        className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:border-accent-300 focus:outline-none"
                        value={entryForm.unit}
                        onChange={(event) =>
                          setEntryForm((prev) => ({ ...prev, unit: event.target.value as EntryFormState['unit'] }))
                        }
                      >
                        {QUANTITY_UNITS.map((unit) => (
                          <option key={unit} value={unit} className="bg-slate-900 text-slate-100">
                            {unit}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-2 text-xs text-slate-300/80">
                    到期日期（可选）
                    <input
                      type="date"
                      className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:border-accent-300 focus:outline-none"
                      value={entryForm.expDate}
                      onChange={(event) =>
                        setEntryForm((prev) => ({ ...prev, expDate: event.target.value }))
                      }
                    />
                  </label>
                  <div className="flex flex-col gap-2 text-xs text-slate-300/80">
                    备注
                    <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-400">
                      {entryForm.photoName ? `已关联照片：${entryForm.photoName}` : '可先拍照识别再微调'}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={resetEntry}
                    className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm text-slate-200 transition-colors hover:border-white/20 hover:text-white"
                  >
                    重置表单
                  </button>
                  <button
                    type="submit"
                    disabled={manualSubmitDisabled}
                    className="rounded-full border border-brand-300/70 bg-brand-500/70 px-6 py-2 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-slate-400"
                  >
                    确认入库
                  </button>
                </div>
              </form>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/10 p-5 shadow-glass backdrop-blur-xl">
            <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.3em] text-accent-200/80">
                  拍照识别
                </p>
                <h2 className="mt-1 text-lg font-semibold text-white">拍一张，候选一键入库</h2>
                <p className="mt-1 text-xs text-slate-300/80">
                  支持相册或现场拍摄，识别结果会列出候选，点选即可放入当前层位。
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-full border border-accent-300/60 bg-accent-500/20 px-4 py-2 text-sm font-medium text-accent-100 transition-transform hover:scale-[1.02]"
                >
                  📷 拍照/上传
                </button>
                <button
                  type="button"
                  onClick={() => lastPhotoFileRef.current && runVisionRecognition(lastPhotoFileRef.current)}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition-colors hover:border-white/20 hover:text-white disabled:opacity-60"
                  disabled={!lastPhotoFileRef.current}
                >
                  重新识别
                </button>
              </div>
            </header>

            <div className="mt-4 space-y-3">
              {visionState.loading ? (
                <p className="text-sm text-slate-300/80">识别中，请稍候...</p>
              ) : null}
              {visionState.error ? (
                <p className="text-sm text-red-200">{visionState.error}</p>
              ) : null}
              {visionState.note ? (
                <p className="text-sm text-accent-100/80">{visionState.note}</p>
              ) : null}

              {visionState.candidates.length ? (
                <div className="space-y-3">
                  {visionState.candidates.map((candidate) => (
                    <div
                      key={candidate.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">{candidate.name}</p>
                        <p className="text-xs text-slate-300/80">
                          {candidate.qty}
                          {candidate.unit} · 到期：{formatDate(candidate.expDate)} · 置信度{' '}
                          {Math.round(candidate.confidence * 100)}%
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => applyCandidate(candidate)}
                        className="rounded-full border border-brand-300/70 bg-brand-500/60 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-500/80"
                      >
                        放入 {selectedShelf?.name ?? '默认层'}
                      </button>
                    </div>
                  ))}
                </div>
              ) : !visionState.loading ? (
                <p className="text-sm text-slate-300/80">
                  上传照片后即可看到候选清单，或继续使用上方的快速录入。
                </p>
              ) : null}
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            {summaryCards.map((card) => (
              <div
                key={card.title}
                className={`${summaryCardBaseClasses} ${card.accent} border-white/10 text-sm text-slate-100`}
              >
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">
                  {card.subtitle}
                </p>
                <p className="mt-2 text-3xl font-semibold text-white">{card.value}</p>
                <p className="mt-1 text-sm text-slate-100/80">{card.title}</p>
              </div>
            ))}
          </section>

          <FridgeViewer />

          <section className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/10 p-4 shadow-glass backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2 text-xs">
                {filterLabels.map((option) => {
                  const isActive = filterMode === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setFilterMode(option.id)}
                      className={[
                        'rounded-full border px-4 py-1.5 transition-colors',
                        isActive
                          ? 'border-brand-300/70 bg-brand-500/40 text-white shadow-glow'
                          : 'border-white/10 bg-white/5 text-slate-200 hover:border-brand-300/60 hover:text-white'
                      ].join(' ')}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="search"
                  placeholder="搜索食材名称"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:border-accent-300 focus:outline-none sm:w-64"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {itemsToShow.length ? (
                itemsToShow.map((item) => (
                  <InventoryItemCard
                    key={item.id}
                    item={item}
                    onMinusOne={() => handleMinusOne(item)}
                    onClear={() => handleClear(item)}
                    onSave={(changes) => updateItem(item.id, changes)}
                  />
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-slate-300/80">
                  暂无符合条件的食材，试试调整筛选或回到录入页添加几样吧。
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
};
