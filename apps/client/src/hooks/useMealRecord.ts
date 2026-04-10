import { useCallback, useState } from 'react';
import { useFridgeStore, type MealType, type MealRecord } from '../stores/fridgeStore';

export type MealRecordState = {
  sheetOpen: boolean;
  photoUrl: string | null;
  photoFile: File | null;
  recognizing: boolean;
  description: string;
  items: Array<{ name: string; qty: number; unit: string }>;
  mealType: MealType;
  eatenAt: string;
  notes: string;
};

const initialState: MealRecordState = {
  sheetOpen: false,
  photoUrl: null,
  photoFile: null,
  recognizing: false,
  description: '',
  items: [],
  mealType: '中餐',
  eatenAt: new Date().toISOString(),
  notes: '',
};

export const useMealRecord = (onSuccess?: () => void) => {
  const addMeal = useFridgeStore((s) => s.addMeal);
  const [state, setState] = useState<MealRecordState>({ ...initialState });

  const startRecord = useCallback(() => {
    setState({
      ...initialState,
      sheetOpen: true,
      eatenAt: new Date().toISOString(),
    });
  }, []);

  const closeSheet = useCallback(() => {
    setState((prev) => ({ ...prev, sheetOpen: false }));
  }, []);

  const setMealType = useCallback((type: MealType) => {
    setState((prev) => ({ ...prev, mealType: type }));
  }, []);

  const setDescription = useCallback((desc: string) => {
    setState((prev) => ({ ...prev, description: desc }));
  }, []);

  const setNotes = useCallback((notes: string) => {
    setState((prev) => ({ ...prev, notes }));
  }, []);

  const setEatenAt = useCallback((iso: string) => {
    setState((prev) => ({ ...prev, eatenAt: iso }));
  }, []);

  const addItem = useCallback((item: { name: string; qty: number; unit: string }) => {
    setState((prev) => ({ ...prev, items: [...prev.items, item] }));
  }, []);

  const removeItem = useCallback((index: number) => {
    setState((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  }, []);

  const setPhoto = useCallback((file: File, url: string) => {
    setState((prev) => ({ ...prev, photoFile: file, photoUrl: url }));
  }, []);

  const confirmRecord = useCallback(() => {
    if (!state.description.trim() && state.items.length === 0) return;

    addMeal({
      type: state.mealType,
      photoUrl: state.photoUrl,
      description: state.description.trim() || state.items.map((i) => i.name).join('、'),
      items: state.items,
      notes: state.notes,
      eatenAt: state.eatenAt,
    });

    setState({ ...initialState });
    onSuccess?.();
  }, [state, addMeal, onSuccess]);

  return {
    state,
    startRecord,
    closeSheet,
    setMealType,
    setDescription,
    setNotes,
    setEatenAt,
    addItem,
    removeItem,
    setPhoto,
    confirmRecord,
  };
};
