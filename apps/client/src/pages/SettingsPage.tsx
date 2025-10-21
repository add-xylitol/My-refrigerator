import { useFridgeStore } from '../stores/fridgeStore';

export const SettingsPage = () => {
  const resetShelves = useFridgeStore((state) => state.resetShelves);
  const shelves = useFridgeStore((state) => state.shelves);

  return (
    <div className="flex flex-col gap-6">
      <header className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <h1 className="text-xl font-semibold text-slate-50">设置</h1>
        <p className="mt-1 text-sm text-slate-400">
          后续将在此配置层位、识别参数、Supabase 连接等。当前展示默认层位结构。
        </p>
      </header>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">层位管理</h2>
            <p className="text-sm text-slate-400">MVP 默认 5 层，可在后续版本中自由排序与编辑。</p>
          </div>
          <button
            type="button"
            onClick={resetShelves}
            className="rounded-full border border-slate-700 bg-slate-950/60 px-4 py-2 text-sm text-slate-300 transition-colors hover:border-brand-400 hover:text-brand-100"
          >
            恢复默认
          </button>
        </div>

        <ul className="mt-4 space-y-3">
          {shelves.map((shelf, index) => (
            <li
              key={shelf.id}
              className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-200"
            >
              <span>
                #{index + 1} {shelf.name}
              </span>
              <span className="text-xs uppercase tracking-wide text-slate-500">{shelf.type}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};
