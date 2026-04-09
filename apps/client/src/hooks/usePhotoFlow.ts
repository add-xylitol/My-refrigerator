import { useCallback, useRef, useState } from 'react';
import { aiService, type VisionCandidate } from '../services';
import { useFridgeStore } from '../stores/fridgeStore';

export type PhotoFlowState = {
  modalOpen: boolean;
  sheetOpen: boolean;
  loading: boolean;
  candidates: VisionCandidate[];
  error: string | null;
};

export function usePhotoFlow(onSuccess?: (count: number) => void) {
  const [state, setState] = useState<PhotoFlowState>({
    modalOpen: false,
    sheetOpen: false,
    loading: false,
    candidates: [],
    error: null,
  });

  const lastFileRef = useRef<File | null>(null);
  const addItem = useFridgeStore((s) => s.addItem);
  const shelves = useFridgeStore((s) => s.shelves);

  const startFlow = useCallback(() => {
    setState({ modalOpen: true, sheetOpen: false, loading: false, candidates: [], error: null });
  }, []);

  const closeModal = useCallback(() => {
    setState((s) => ({ ...s, modalOpen: false }));
  }, []);

  const closeSheet = useCallback(() => {
    setState((s) => ({ ...s, sheetOpen: false }));
  }, []);

  const handleImage = useCallback(
    async (file: File) => {
      lastFileRef.current = file;
      setState({ modalOpen: false, sheetOpen: true, loading: true, candidates: [], error: null });

      try {
        const result = await aiService.recognize({
          shelfId: shelves[0]?.id ?? 'auto',
          shelfName: shelves[0]?.name ?? '默认层',
          file,
        });
        setState((s) => ({
          ...s,
          loading: false,
          candidates: result.candidates,
          error: result.candidates.length === 0 ? '未识别到食材' : null,
        }));
      } catch (err) {
        setState((s) => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : '识别失败，请重试',
        }));
      }
    },
    [shelves]
  );

  const confirmOne = useCallback(
    (candidate: VisionCandidate, shelfId: string) => {
      addItem({
        shelfId,
        name: candidate.name,
        unit: candidate.unit,
        qty: candidate.qty,
        expDate: candidate.expDate ?? null,
        barcode: candidate.barcode ?? null,
        photoUrl: null,
      });
    },
    [addItem]
  );

  const confirmAll = useCallback(() => {
    const remaining = state.candidates;
    let count = 0;
    for (const c of remaining) {
      addItem({
        shelfId: shelves[0]?.id ?? 'auto',
        name: c.name,
        unit: c.unit,
        qty: c.qty,
        expDate: c.expDate ?? null,
        barcode: c.barcode ?? null,
        photoUrl: null,
      });
      count++;
    }
    setState((s) => ({ ...s, candidates: [], sheetOpen: false }));
    onSuccess?.(count);
  }, [state.candidates, addItem, shelves, onSuccess]);

  const retry = useCallback(async () => {
    if (lastFileRef.current) {
      handleImage(lastFileRef.current);
    } else {
      setState({ modalOpen: true, sheetOpen: false, loading: false, candidates: [], error: null });
    }
  }, [handleImage]);

  return { state, startFlow, handleImage, confirmOne, confirmAll, retry, closeModal, closeSheet };
}
