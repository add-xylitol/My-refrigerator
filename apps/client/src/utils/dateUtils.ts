export const formatDate = (value?: string | null) => {
  if (!value) return '未设置';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const diffDays = (value?: string | null) => {
  if (!value) return Number.POSITIVE_INFINITY;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY;
  return Math.floor((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
};

export const shelfTypeLabel: Record<'chill' | 'freeze' | 'produce', string> = {
  chill: '冷藏',
  freeze: '冷冻',
  produce: '果蔬',
};
