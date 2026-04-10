import { useState } from 'react';
import { getFoodEmoji } from '@smart-fridge/shared';
import { useFridgeStore, type Condiment, type Shelf } from '../stores/fridgeStore';
import { shelfTypeLabel } from '../utils/dateUtils';

type Section = 'condiments' | 'shelves' | 'settings' | null;

export const ProfilePage = () => {
  const [expanded, setExpanded] = useState<Section>(null);

  const {
    shelves, items, condiments,
    setShelves, addCondiment, updateCondiment, removeCondiment, resetShelves,
  } = useFridgeStore((s) => ({
    shelves: s.shelves,
    items: s.items,
    condiments: s.condiments,
    setShelves: s.setShelves,
    addCondiment: s.addCondiment,
    updateCondiment: s.updateCondiment,
    removeCondiment: s.removeCondiment,
    resetShelves: s.resetShelves,
  }));

  const toggle = (section: Section) => setExpanded(expanded === section ? null : section);

  const missingCount = condiments.filter((c) => c.stockLevel === '缺货').length;

  const menuItems: Array<{ id: Section; icon: string; label: string; subtitle: string }> = [
    { id: 'shelves', icon: '🗄️', label: '冰箱设置', subtitle: `${shelves.length}层 · 可编辑名称和排序` },
    { id: 'condiments', icon: '🧂', label: '调料管理', subtitle: `${condiments.length}样${missingCount > 0 ? ` · 缺货${missingCount}样` : ''}` },
    { id: 'settings', icon: '🔔', label: '提醒设置', subtitle: '临期提醒 开/关' },
  ];

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Profile Card */}
      <section className="rounded-2xl border border-white/10 bg-white/10 p-4 shadow-glass backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-brand-300/40 bg-brand-500/30 text-2xl">
            🧊
          </div>
          <div>
            <p className="text-base font-semibold text-white">小冰</p>
            <p className="mt-0.5 text-xs text-slate-300/70">
              管理 {items.length} 样食材 · {condiments.length} 样调料
            </p>
          </div>
        </div>
      </section>

      {/* Menu Sections */}
      {menuItems.map((item) => (
        <section key={item.id} className="rounded-2xl border border-white/10 bg-white/8 shadow-glass backdrop-blur-xl overflow-hidden">
          <button onClick={() => toggle(item.id)}
            className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-white/5">
            <div className="flex items-center gap-3">
              <span className="text-lg">{item.icon}</span>
              <div>
                <span className="text-sm font-medium text-white">{item.label}</span>
                <p className="text-[11px] text-slate-400">{item.subtitle}</p>
              </div>
            </div>
            <span className={`text-xs text-slate-400 transition-transform ${expanded === item.id ? 'rotate-180' : ''}`}>▼</span>
          </button>

          {expanded === item.id && (
            <div className="border-t border-white/5 p-4">
              {item.id === 'shelves' && <ShelvesSection shelves={shelves} setShelves={setShelves} resetShelves={resetShelves} />}
              {item.id === 'condiments' && <CondimentsSection condiments={condiments} addCondiment={addCondiment} updateCondiment={updateCondiment} removeCondiment={removeCondiment} />}
              {item.id === 'settings' && <SettingsSection />}
            </div>
          )}
        </section>
      ))}

      {/* Danger zone */}
      <button onClick={() => { if (confirm('重置所有数据？这将清空食材、调料和记录。')) { localStorage.removeItem('smart-fridge-store'); location.reload(); } }}
        className="w-full rounded-2xl border border-red-400/15 bg-red-500/5 py-3 text-xs text-red-300/60 transition-colors hover:bg-red-500/10 hover:text-red-300">
        🧹 重置所有数据
      </button>
    </div>
  );
};

// --- Shelves Section with edit/reorder ---
type ShelvesSectionProps = {
  shelves: Shelf[];
  setShelves: (shelves: Shelf[]) => void;
  resetShelves: () => void;
};

const ShelvesSection = ({ shelves, setShelves, resetShelves }: ShelvesSectionProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<Shelf['type']>('chill');

  const startEdit = (shelf: Shelf) => {
    setEditingId(shelf.id);
    setEditName(shelf.name);
    setEditType(shelf.type);
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim()) return;
    setShelves(shelves.map((s) =>
      s.id === editingId ? { ...s, name: editName.trim(), type: editType } : s
    ));
    setEditingId(null);
  };

  const moveShelf = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= shelves.length) return;
    const newShelves = [...shelves];
    const temp = newShelves[index];
    newShelves[index] = newShelves[newIndex];
    newShelves[newIndex] = temp;
    setShelves(newShelves.map((s, i) => ({ ...s, sort: i })));
  };

  const addShelf = () => {
    const newShelf: Shelf = {
      id: `shelf-${Date.now()}`,
      name: `新层架`,
      sort: shelves.length,
      type: 'chill',
    };
    setShelves([...shelves, newShelf]);
  };

  const removeShelf = (id: string) => {
    if (shelves.length <= 1) return;
    setShelves(shelves.filter((s) => s.id !== id).map((s, i) => ({ ...s, sort: i })));
  };

  const typeOptions: Shelf['type'][] = ['chill', 'freeze', 'produce'];

  return (
    <div className="space-y-3">
      {shelves.map((shelf, index) => (
        <div key={shelf.id} className="rounded-xl border border-white/5 bg-black/15 overflow-hidden">
          {editingId === shelf.id ? (
            <div className="p-3 space-y-2">
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-white focus:border-accent-300 focus:outline-none" />
              <div className="flex gap-2">
                {typeOptions.map((t) => (
                  <button key={t} onClick={() => setEditType(t)}
                    className={`rounded-lg border px-2 py-1 text-[10px] transition-colors ${editType === t ? 'border-brand-300/60 bg-brand-500/30 text-white' : 'border-white/10 text-slate-300'}`}>
                    {shelfTypeLabel[t]}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditingId(null)} className="flex-1 rounded-lg border border-white/10 py-1 text-xs text-slate-300 hover:text-white">取消</button>
                <button onClick={saveEdit} className="flex-1 rounded-lg border border-brand-300/60 bg-brand-500/50 py-1 text-xs text-white hover:bg-brand-500/70">保存</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between px-3 py-2.5">
              <div className="flex items-center gap-2">
                <button onClick={() => moveShelf(index, 'up')} disabled={index === 0}
                  className="text-[10px] text-slate-500 hover:text-white disabled:opacity-20">▲</button>
                <button onClick={() => moveShelf(index, 'down')} disabled={index === shelves.length - 1}
                  className="text-[10px] text-slate-500 hover:text-white disabled:opacity-20">▼</button>
                <div>
                  <span className="text-[9px] uppercase tracking-widest text-accent-200/60">{shelfTypeLabel[shelf.type]}</span>
                  <p className="text-sm text-white">{shelf.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => startEdit(shelf)} className="text-[10px] text-slate-400 hover:text-white">编辑</button>
                <button onClick={() => removeShelf(shelf.id)} disabled={shelves.length <= 1}
                  className="text-[10px] text-red-400/60 hover:text-red-300 disabled:opacity-20">删除</button>
              </div>
            </div>
          )}
        </div>
      ))}

      <div className="flex gap-2">
        <button onClick={addShelf}
          className="flex-1 rounded-xl border border-dashed border-white/15 bg-white/3 py-2 text-xs text-slate-300 hover:text-white hover:border-brand-300/40">
          + 添加层架
        </button>
        <button onClick={() => { if (confirm('恢复默认层架？')) resetShelves(); }}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 hover:text-white">
          恢复默认
        </button>
      </div>
    </div>
  );
};

// --- Condiments Section ---
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
    <div className="space-y-3">
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

      {condiments.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-400">还没有记录调料</p>
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
                <button onClick={() => removeCondiment(c.id)} className="text-xs text-red-300/60 hover:text-red-300">移除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Settings Section ---
const SettingsSection = () => {
  const [expiryAlert, setExpiryAlert] = useState(true);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/15 px-3 py-2.5">
        <span className="text-sm text-white">临期提醒</span>
        <button onClick={() => setExpiryAlert(!expiryAlert)}
          className={`relative h-6 w-10 rounded-full transition-colors ${expiryAlert ? 'bg-brand-500/70' : 'bg-white/10'}`}>
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${expiryAlert ? 'left-[18px]' : 'left-0.5'}`} />
        </button>
      </div>
      <p className="text-xs text-slate-400/60">版本 v0.2.0 · 数据存储在本地</p>
    </div>
  );
};
