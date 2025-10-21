import type { QuantityUnit } from '../types/fridge';

export const QUANTITY_UNITS: QuantityUnit[] = ['个', '克', '毫升', '把', '袋'];

export const DEFAULT_SHELVES = [
  { id: 'shelf-1', name: '冷藏层 1', sort: 1, type: 'chill' as const },
  { id: 'shelf-2', name: '冷藏层 2', sort: 2, type: 'chill' as const },
  { id: 'shelf-3', name: '冷藏层 3', sort: 3, type: 'chill' as const },
  { id: 'shelf-4', name: '冷冻层', sort: 4, type: 'freeze' as const },
  { id: 'shelf-5', name: '果蔬盒', sort: 5, type: 'produce' as const }
];
