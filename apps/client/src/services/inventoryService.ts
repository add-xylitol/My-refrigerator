import { useFridgeStore, type Item, type Shelf, type AddItemInput, type UpdateItemChanges } from '../stores/fridgeStore';

/**
 * Local-first API gateway placeholder，后续可替换为 Supabase / FastAPI 接口调用。
 */
export const inventoryService = {
  getShelves(): Shelf[] {
    return useFridgeStore.getState().shelves;
  },
  setShelves(next: Shelf[]) {
    useFridgeStore.getState().setShelves(next);
    return useFridgeStore.getState().shelves;
  },
  getItems(): Item[] {
    return useFridgeStore.getState().items;
  },
  addItem(payload: AddItemInput) {
    useFridgeStore.getState().addItem(payload);
    return useFridgeStore.getState().items;
  },
  updateItem(itemId: string, changes: UpdateItemChanges) {
    useFridgeStore.getState().updateItem(itemId, changes);
    return useFridgeStore.getState().items;
  },
  removeItem(itemId: string) {
    useFridgeStore.getState().removeItem(itemId);
    return useFridgeStore.getState().items;
  }
};
