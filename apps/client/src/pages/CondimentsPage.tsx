import { FormEvent, useMemo, useState } from 'react';
import { useFridgeStore, type Condiment } from '../stores/fridgeStore';

const CATEGORY_OPTIONS: Condiment['category'][] = ['酱油/醋', '香料', '油/脂', '其他'];
const STOCK_OPTIONS: Condiment['stockLevel'][] = ['充足', '缺货', '临期'];

type CondimentFormState = {
  name: string;
  category: Condiment['category'];
  stockLevel: Condiment['stockLevel'];
  note: string;
};

const initialFormState: CondimentFormState = {
  name: '',
  category: '酱油/醋',
  stockLevel: '充足',
  note: ''
};

export const CondimentsPage = () => {
  const [formState, setFormState] = useState<CondimentFormState>(initialFormState);
  const condiments = useFridgeStore((state) => state.condiments);
  const addCondiment = useFridgeStore((state) => state.addCondiment);
  const updateCondiment = useFridgeStore((state) => state.updateCondiment);
  const removeCondiment = useFridgeStore((state) => state.removeCondiment);

  const groupedCondiments = useMemo(() => {
    return CATEGORY_OPTIONS.map((category) => ({
      category,
      items: condiments.filter((condiment) => condiment.category === category)
    }));
  }, [condiments]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.name.trim()) {
      return;
    }

    addCondiment({
      name: formState.name.trim(),
      category: formState.category,
      stockLevel: formState.stockLevel,
      note: formState.note.trim() || undefined
    });

    setFormState(initialFormState);
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="rounded-3xl border border-white/10 bg-white/10 p-5 shadow-glass backdrop-blur-xl">
        <h1 className="text-xl font-semibold text-white">小料管理</h1>
        <p className="mt-1 text-sm text-slate-200/80">
          管理烹饪所需的调味料与辅料；合理标记库存状态以便菜谱计算使用。
        </p>
      </header>

      <section className="rounded-3xl border border-white/10 bg-white/10 p-5 shadow-glass backdrop-blur-xl">
        <h2 className="text-lg font-semibold text-white">新增小料</h2>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2 text-sm">
            名称
            <input
              className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-brand-400 focus:outline-none"
              value={formState.name}
              onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="如：蒜蓉、十三香"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            分类
            <select
              className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-brand-400 focus:outline-none"
              value={formState.category}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  category: event.target.value as Condiment['category']
                }))
              }
            >
              {CATEGORY_OPTIONS.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm">
            库存状态
            <select
              className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-brand-400 focus:outline-none"
              value={formState.stockLevel}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  stockLevel: event.target.value as Condiment['stockLevel']
                }))
              }
            >
              {STOCK_OPTIONS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm md:col-span-2">
            备注
            <textarea
              className="min-h-[96px] rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-brand-400 focus:outline-none"
              value={formState.note}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  note: event.target.value
                }))
              }
              placeholder="例如：预计下周补货"
            />
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-full border border-brand-400 bg-gradient-to-r from-brand-500/70 to-accent-500/70 px-4 py-2 text-sm font-medium text-brand-100 transition-colors hover:from-brand-500 hover:to-accent-500"
            >
              添加小料
            </button>
          </div>
        </form>
      </section>

      <section className="flex flex-col gap-4">
        {groupedCondiments.map(({ category, items }) => (
          <div
            key={category}
            className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-glass backdrop-blur-xl"
          >
            <header className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{category}</h3>
              <span className="text-xs text-slate-200/80">
                {items.length ? `${items.length} 项` : '暂无记录'}
              </span>
            </header>
            <div className="mt-4 space-y-3">
              {items.length === 0 && (
                <p className="rounded-xl border border-dashed border-white/10 bg-black/30 px-4 py-6 text-center text-sm text-slate-200/70">
                  还没有记录此分类的小料。
                </p>
              )}
              {items.map((item) => (
                <article
                  key={item.id}
                  className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-200/80 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-base font-medium text-white">{item.name}</p>
                    <p className="text-xs text-slate-200/70">{item.note ?? '暂无备注'}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs text-slate-200/80 focus:border-brand-400 focus:outline-none"
                      value={item.stockLevel}
                      onChange={(event) =>
                        updateCondiment(item.id, {
                          stockLevel: event.target.value as Condiment['stockLevel']
                        })
                      }
                    >
                      {STOCK_OPTIONS.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeCondiment(item.id)}
                      className="rounded-full border border-red-500/40 bg-red-500/15 px-3 py-1 text-xs font-medium text-red-200 transition-colors hover:bg-red-500/20"
                    >
                      移除
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
};
