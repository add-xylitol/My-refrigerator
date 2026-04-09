import { useState } from 'react';
import { getFoodEmoji } from '@smart-fridge/shared';
import { QUANTITY_UNITS } from '@smart-fridge/shared';
import { useFridgeStore, type Condiment } from '../stores/fridgeStore';
import { shelfTypeLabel } from '../utils/dateUtils';

type Section = 'condiments' | 'shelves' | 'settings' | null;

export const ProfilePage = () => {
  const [expanded, setExpanded] = useState<Section>(null);

  const {
    shelves, items, condiments,
    addCondiment, updateCondiment, removeCondiment, resetShelves,
  } = useFridgeStore((s) => ({
    shelves: s.shelves,
    items: s.items,
    condiments: s.condiments,
    addCondiment: s.addCondiment,
    updateCondiment: s.updateCondiment,
    removeCondiment: s.removeCondiment,
    resetShelves: s.resetShelves,
  }));

  const toggle = (section: Section) => setExpanded(expanded === section ? null : section);

  const stats = {
    totalItems: items.length,
    totalCondiments: condiments.length,
    shelfCount: shelves.length,
  };

  const menuItems: Array<{ id: Section; icon: string; label: string; badge?: string }> = [
    { id: 'condiments', icon: '🌶️', label: '调料管理', badge: `${condiments.length}样` },
    { id: 'shelves', icon: '🗄️', label: '层架管理', badge: `${shelves.length}层` },
    { id: 'settings', icon: '⚙️', label: '设置' },
  ];

  return (
    <div className="flex flex-col gap-5 pb-4">
      {/* Profile Card */}
      <section className="rounded-3xl border border-white/10 bg-white/10 p-5 shadow-glass backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-brand-300/40 bg-brand-500/30 text-3xl">
            🧊
          </div>
          <div>
            <p className="text-lg font-semibold text-white">我的冰箱</p>
            <div className="mt-1 flex gap-3 text-xs text-slate-300/80">
              <span>{stats.totalItems} 样食材</span>
              <span>{stats.totalCondiments} 样调料</span>
              <span>{stats.shelfCount} 个层架</span>
            </div>
          </div>
        </div>
      </section>

      {/* Menu Sections */}
      {menuItems.map((item) => (
        <section key={item.id} className="rounded-3xl border border-white/10 bg-white/10 shadow-glass backdrop-blur-xl overflow-hidden">
          <button onClick={() => toggle(item.id)}
            className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-white/5">
            <div className="flex items-center gap-3">
              <span className="text-xl">{item.icon}</span>
              <span className="text-sm font-medium text-white">{item.label}</span>
              {item.badge && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-300">{item.badge}</span>}
            </div>
            <span className={`text-xs text-slate-400 transition-transform ${expanded === item.id ? 'rotate-180' : ''}`}>▼</span>
          </button>

          {expanded === item.id && (
            <div className="border-t border-white/5 p-4">
              {item.id === 'condiments' && <CondimentsSection condiments={condiments} addCondiment={addCondiment} updateCondiment={updateCondiment} removeCondiment={removeCondiment} />}
              {item.id === 'shelves' && <ShelvesSection shelves={shelves} itemCount={items.length} resetShelves={resetShelves} />}
              {item.id === 'settings' && <SettingsSection />}
            </div>
          )}
        </section>
      ))}
    </div>
  );
};

// --- Sub-sections ---

type CondimentsSectionProps = {
  condiments: Condiment[];
  addCondiment: (input: Omit<Condiment, 'id'>) => void;
  updateCondiment: (id: string, changes: Partial<Omit<Condiment, 'id'>>) => void;
  removeCondiment: (id: string) => void;
};

const CondimentsSection = ({ condiments, addCondiment, updateCondiment, removeCondiment }: CondimentsSectionProps) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Condiment['category']>('酱油/醋');
  const [stockLevel, setStockLevel] = useState<Condiment['stockLevel']>('充足');

  const categories: Condiment['category'][] = ['酱油/醋', '香料', '油/脂', '其他'];
  const stockLevels: Condiment['stockLevel'][] = ['充足', '缺货', '临期'];

  const handleAdd = () => {
    if (!name.trim()) return;
    addCondiment({ name: name.trim(), category, stockLevel });
    setName('');
  };

  return (
    <div className="space-y-4">
      {/* Add form */}
      <div className="flex gap-2">
        <input type="text" placeholder="调料名称" value={name} onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-accent-300 focus:outline-none" />
        <select value={category} onChange={(e) => setCategory(e.target.value as Condiment['category'])}
          className="rounded-xl border border-white/10 bg-black/20 px-2 py-2 text-sm text-white">
          {categories.map((c) => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
        </select>
        <button onClick={handleAdd}
          className="rounded-xl border border-brand-300/60 bg-brand-500/40 px-4 py-2 text-xs font-medium text-white hover:bg-brand-500/60">
          添加
        </button>
      </div>

      {/* List */}
      {condiments.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-400">还没有记录调料，添加第一个吧</p>
      ) : (
        <div className="space-y-2">
          {condiments.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-black/15 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">{getFoodEmoji(c.name, '🧂')}</span>
                <span className="text-sm text-white">{c.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <select value={c.stockLevel} onChange={(e) => updateCondiment(c.id, { stockLevel: e.target.value as Condiment['stockLevel'] })}
                  className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-xs text-white">
                  {stockLevels.map((s) => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
                </select>
                <button onClick={() => removeCondiment(c.id)} className="text-xs text-red-300 hover:text-red-200">移除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

type ShelvesSectionProps = {
  shelves: Array<{ id: string; name: string; type: 'chill' | 'freeze' | 'produce' }>;
  itemCount: number;
  resetShelves: () => void;
};

const ShelvesSection = ({ shelves, itemCount, resetShelves }: ShelvesSectionProps) => {
  return (
    <div className="space-y-3">
      {shelves.map((s) => (
        <div key={s.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-black/15 px-3 py-2">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-accent-200/70">{shelfTypeLabel[s.type]}</span>
            <p className="text-sm text-white">{s.name}</p>
          </div>
        </div>
      ))}
      <button onClick={() => { if (confirm('恢复默认层架？自定义的层架会被重置。')) resetShelves(); }}
        className="w-full rounded-xl border border-white/10 bg-white/5 py-2 text-xs text-slate-300 hover:text-white">
        恢复默认层架
      </button>
    </div>
  );
};

const SettingsSection = () => (
  <div className="space-y-3 text-sm text-slate-300/80">
    <p>版本：v0.1.0 (MVP)</p>
    <p>数据存储：本地 + 服务端同步</p>
    <p className="text-xs text-slate-400/60">更多设置开发中...</p>
  </div>
);
