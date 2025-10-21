import { DEFAULT_SHELVES, type QuantityUnit } from '@smart-fridge/shared';
import { create } from 'zustand';
import { devtools, persist, createJSONStorage, type StateStorage } from 'zustand/middleware';

export type Shelf = {
  id: string;
  name: string;
  sort: number;
  type: 'chill' | 'freeze' | 'produce';
};

export type Item = {
  id: string;
  shelfId: string;
  name: string;
  unit: QuantityUnit;
  qty: number;
  expDate?: string | null;
  barcode?: string | null;
  photoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Condiment = {
  id: string;
  name: string;
  category: '酱油/醋' | '香料' | '油/脂' | '其他';
  stockLevel: '充足' | '缺货' | '临期';
  note?: string;
};

type FridgeState = {
  shelves: Shelf[];
  selectedShelfId: string | null;
  items: Item[];
  condiments: Condiment[];
  lastSyncAt: string | null;
};

export type FridgeActions = {
  setSelectedShelf: (shelfId: string) => void;
  setShelves: (shelves: Shelf[]) => void;
  resetShelves: () => void;
  addItem: (
    input: Pick<Item, 'shelfId' | 'name' | 'unit' | 'qty' | 'expDate' | 'barcode' | 'photoUrl'>
  ) => void;
  updateItem: (itemId: string, changes: Partial<Omit<Item, 'id' | 'shelfId'>>) => void;
  removeItem: (itemId: string) => void;
  addCondiment: (input: Omit<Condiment, 'id'>) => void;
  updateCondiment: (id: string, changes: Partial<Omit<Condiment, 'id'>>) => void;
  removeCondiment: (id: string) => void;
};

export type AddItemInput = Parameters<FridgeActions['addItem']>[0];
export type UpdateItemChanges = Parameters<FridgeActions['updateItem']>[1];
export type AddCondimentInput = Parameters<FridgeActions['addCondiment']>[0];
export type UpdateCondimentChanges = Parameters<FridgeActions['updateCondiment']>[1];

const createId = (prefix: string) => {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${random}`;
};

const mapSharedShelves = () =>
  DEFAULT_SHELVES.map((shelf) => ({
    id: shelf.id,
    name: shelf.name,
    sort: shelf.sort,
    type: shelf.type
  }));

const defaultShelves: Shelf[] = mapSharedShelves();

const defaultItems: Item[] = [
  {
    id: createId('item'),
    shelfId: 'shelf-1',
    name: '鸡胸肉',
    unit: '克',
    qty: 450,
    expDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: createId('item'),
    shelfId: 'shelf-2',
    name: '酸奶',
    unit: '个',
    qty: 3,
    expDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: createId('item'),
    shelfId: 'shelf-5',
    name: '小白菜',
    unit: '把',
    qty: 2,
    expDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: createId('item'),
    shelfId: 'shelf-4',
    name: '冰冻虾仁',
    unit: '袋',
    qty: 1,
    expDate: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const defaultCondiments: Condiment[] = [
  {
    id: createId('condiment'),
    name: '生抽',
    category: '酱油/醋',
    stockLevel: '充足'
  },
  {
    id: createId('condiment'),
    name: '蚝油',
    category: '酱油/醋',
    stockLevel: '临期',
    note: '预计一周内用完'
  },
  {
    id: createId('condiment'),
    name: '黑胡椒碎',
    category: '香料',
    stockLevel: '充足'
  },
  {
    id: createId('condiment'),
    name: '花生油',
    category: '油/脂',
    stockLevel: '缺货'
  }
];

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined
};

export const useFridgeStore = create<FridgeState & FridgeActions>()(
  devtools(
    persist(
      (set) => ({
        shelves: defaultShelves,
        selectedShelfId: defaultShelves[0]?.id ?? null,
        items: defaultItems,
        condiments: defaultCondiments,
        lastSyncAt: null,
        setSelectedShelf: (shelfId) =>
          set({
            selectedShelfId: shelfId
          }),
        setShelves: (shelves) =>
          set((state) => ({
            shelves: [...shelves].sort((a, b) => a.sort - b.sort),
            selectedShelfId:
              state.selectedShelfId && shelves.some((shelf) => shelf.id === state.selectedShelfId)
                ? state.selectedShelfId
                : shelves[0]?.id ?? null
          })),
        resetShelves: () =>
          set({
            shelves: mapSharedShelves(),
            selectedShelfId: defaultShelves[0]?.id ?? null
          }),
        addItem: (input) =>
          set((state) => {
            const id = createId('item');
            const timestamp = new Date().toISOString();
            return {
              items: [
                ...state.items,
                {
                  id,
                  shelfId: input.shelfId,
                  name: input.name,
                  unit: input.unit,
                  qty: input.qty,
                  expDate: input.expDate ?? null,
                  barcode: input.barcode ?? null,
                  photoUrl: input.photoUrl ?? null,
                  createdAt: timestamp,
                  updatedAt: timestamp
                }
              ]
            };
          }),
        updateItem: (itemId, changes) =>
          set((state) => ({
            items: state.items.map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    ...changes,
                    updatedAt: new Date().toISOString()
                  }
                : item
            )
          })),
        removeItem: (itemId) =>
          set((state) => ({
            items: state.items.filter((item) => item.id !== itemId)
          })),
        addCondiment: (input) =>
          set((state) => ({
            condiments: [
              ...state.condiments,
              {
                id: createId('condiment'),
                ...input
              }
            ]
          })),
        updateCondiment: (id, changes) =>
          set((state) => ({
            condiments: state.condiments.map((condiment) =>
              condiment.id === id
                ? {
                    ...condiment,
                    ...changes
                  }
                : condiment
            )
          })),
        removeCondiment: (id) =>
          set((state) => ({
            condiments: state.condiments.filter((condiment) => condiment.id !== id)
          }))
      }),
      {
        name: 'smart-fridge-store',
        storage: createJSONStorage(() =>
          typeof window !== 'undefined' && window.localStorage ? window.localStorage : noopStorage
        ),
        partialize: (state) => ({
          shelves: state.shelves,
          selectedShelfId: state.selectedShelfId,
          items: state.items,
          condiments: state.condiments,
          lastSyncAt: state.lastSyncAt
        })
      }
    ),
    { name: 'FridgeStore' }
  )
);
