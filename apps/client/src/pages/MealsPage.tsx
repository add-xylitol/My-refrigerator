import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFoodEmoji } from '@smart-fridge/shared';
import { useFridgeStore, type MealRecord } from '../stores/fridgeStore';
import { formatDate, relativeTime } from '../utils/dateUtils';
import { EmptyState } from '../components/ui/EmptyState';

// Group meals by date
type DayGroup = {
  dateKey: string;   // YYYY-MM-DD
  label: string;     // "4月8日 周二"
  meals: MealRecord[];
};

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const mealTypeIcon: Record<string, string> = {
  '早餐': '🌅', '中餐': '☀️', '晚餐': '🌙', '加餐': '🍎', '练前餐': '💪', '练后餐': '🥤',
};

function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);

  if (diff === 0) return '今天';
  if (diff === 1) return '昨天';
  if (diff < 7) return `${diff}天前`;

  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekday = WEEKDAYS[d.getDay()];
  return `${month}月${day}日 ${weekday}`;
}

export const MealsPage = () => {
  const navigate = useNavigate();
  const meals = useFridgeStore((s) => s.meals);
  const removeMeal = useFridgeStore((s) => s.removeMeal);

  // Sort by eatenAt descending, group by date
  const dayGroups = useMemo(() => {
    const sorted = [...meals].sort(
      (a, b) => new Date(b.eatenAt).getTime() - new Date(a.eatenAt).getTime()
    );
    const groups: DayGroup[] = [];
    const map = new Map<string, MealRecord[]>();

    for (const meal of sorted) {
      const d = new Date(meal.eatenAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(meal);
    }

    for (const [dateKey, dateMeals] of map) {
      groups.push({
        dateKey,
        label: formatDayLabel(dateMeals[0].eatenAt),
        meals: dateMeals,
      });
    }

    return groups;
  }, [meals]);

  const totalMeals = meals.length;
  const weekAgo = Date.now() - 7 * 86400000;
  const weekCount = meals.filter((m) => new Date(m.eatenAt).getTime() >= weekAgo).length;

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-semibold text-white">饮食记录</p>
          <p className="text-xs text-slate-300/70">共 {totalMeals} 餐 · 本周 {weekCount} 餐</p>
        </div>
      </div>

      {/* Timeline */}
      {dayGroups.length > 0 ? (
        <div className="relative pl-6">
          {/* Left vertical line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-white/10" />

          {dayGroups.map((group) => (
            <div key={group.dateKey} className="mb-6">
              {/* Date divider */}
              <div className="relative mb-3 flex items-center gap-2">
                <div className="absolute -left-6 top-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-brand-300/60 bg-surface-900" />
                <span className="text-xs font-medium text-slate-400">
                  ── {group.label} ──
                </span>
              </div>

              {/* Meal cards for this day */}
              <div className="space-y-3">
                {group.meals.map((meal) => (
                  <TimelineMealCard key={meal.id} meal={meal} onDelete={() => removeMeal(meal.id)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="📖"
          title="还没有记录"
          description="做第一道菜或手动记录开始吧"
          actionLabel="去推荐页"
          onAction={() => navigate('/discover')}
        />
      )}

      {/* Manual record button */}
      <button onClick={() => document.dispatchEvent(new CustomEvent('start-meal-record'))}
        className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 text-sm text-slate-200 transition-colors hover:bg-white/10 hover:text-white active:scale-[0.98]">
        + 手动记录
      </button>
    </div>
  );
};

// Meal card in timeline
const TimelineMealCard = ({ meal, onDelete }: { meal: MealRecord; onDelete: () => void }) => {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const time = new Date(meal.eatenAt);
  const timeStr = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;

  return (
    <div className="relative rounded-2xl border border-white/10 bg-white/8 p-3">
      {/* Timeline dot */}
      <div className="absolute -left-[21px] top-4 h-2 w-2 rounded-full bg-brand-400/70" />

      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">{mealTypeIcon[meal.type] ?? '🍽'}</span>
          <span className="text-xs font-medium text-white/80">{meal.type}</span>
          <span className="text-[10px] text-slate-400">{timeStr}</span>
        </div>
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)}
            className="text-[10px] text-slate-500 hover:text-red-300 transition-colors">删除</button>
        ) : (
          <div className="flex gap-1.5">
            <button onClick={() => setConfirmDelete(false)} className="text-[10px] text-slate-400 hover:text-white">取消</button>
            <button onClick={onDelete} className="text-[10px] text-red-300 hover:text-red-200">确认</button>
          </div>
        )}
      </div>

      <p className="mt-1.5 text-sm font-medium text-white/90">{meal.description}</p>

      {/* Photo area */}
      {meal.photoUrl && (
        <div className="mt-2">
          <img src={meal.photoUrl} alt={meal.description}
            className="h-24 w-24 rounded-xl border border-white/10 object-cover" />
        </div>
      )}

      {/* Ingredient tags */}
      {meal.items.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {meal.items.map((item, i) => (
            <span key={i}
              className="inline-flex items-center gap-0.5 rounded-full border border-white/8 bg-white/5 px-2 py-0.5 text-[10px] text-slate-300">
              {getFoodEmoji(item.name)} {item.name} {item.qty}{item.unit}
            </span>
          ))}
        </div>
      )}

      {meal.notes && (
        <p className="mt-1.5 text-[10px] text-slate-400/70">{meal.notes}</p>
      )}
    </div>
  );
};
