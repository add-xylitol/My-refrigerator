import { useEffect, useCallback, useRef } from 'react';
import { AppShell } from './components/layout/AppShell';
import { AppRoutes } from './routes/AppRoutes';
import { useFridgeStore } from './stores/fridgeStore';
import { usePhotoFlow } from './hooks/usePhotoFlow';
import { useMealRecord } from './hooks/useMealRecord';
import { useToast } from './hooks/useToast';
import { PhotoModal } from './components/vision/PhotoModal';
import { RecognitionSheet } from './components/vision/RecognitionSheet';
import { RecordMealSheet } from './components/meals/RecordMealSheet';
import { Toast } from './components/ui/Toast';

const App = () => {
  const loginAndSync = useFridgeStore((s) => s.loginAndSync);
  const shelves = useFridgeStore((s) => s.shelves);
  const { toast, showToast } = useToast();

  const onPhotoSuccess = useCallback((count: number) => {
    showToast(`已录入 ${count} 样食材 🎉`);
  }, [showToast]);

  const onMealSuccess = useCallback(() => {
    showToast('已记录一餐');
  }, [showToast]);

  const { state: photoState, startFlow, handleImage, confirmOne, confirmAll, retry, closeModal, closeSheet } = usePhotoFlow(onPhotoSuccess);
  const mealRecord = useMealRecord(onMealSuccess);

  useEffect(() => {
    loginAndSync();
  }, [loginAndSync]);

  // Global custom event listeners
  useEffect(() => {
    const handleStartPhoto = () => startFlow();
    const handleStartMealRecord = () => mealRecord.startRecord();
    const handleToast = (e: Event) => showToast((e as CustomEvent).detail);

    document.addEventListener('start-photo-flow', handleStartPhoto);
    document.addEventListener('start-meal-record', handleStartMealRecord);
    document.addEventListener('toast', handleToast);
    return () => {
      document.removeEventListener('start-photo-flow', handleStartPhoto);
      document.removeEventListener('start-meal-record', handleStartMealRecord);
      document.removeEventListener('toast', handleToast);
    };
  }, [startFlow, mealRecord.startRecord, showToast]);

  return (
    <AppShell>
      <AppRoutes />
      <PhotoModal open={photoState.modalOpen} onClose={closeModal} onImageSelected={handleImage} />
      <RecognitionSheet
        open={photoState.sheetOpen}
        candidates={photoState.candidates}
        loading={photoState.loading}
        error={photoState.error}
        shelves={shelves}
        onConfirmOne={confirmOne}
        onConfirmAll={confirmAll}
        onRetry={retry}
        onClose={closeSheet}
      />
      <RecordMealSheet
        state={mealRecord.state}
        onSetMealType={mealRecord.setMealType}
        onSetDescription={mealRecord.setDescription}
        onSetNotes={mealRecord.setNotes}
        onSetEatenAt={mealRecord.setEatenAt}
        onAddItem={mealRecord.addItem}
        onRemoveItem={mealRecord.removeItem}
        onSetPhoto={mealRecord.setPhoto}
        onConfirm={mealRecord.confirmRecord}
        onClose={mealRecord.closeSheet}
      />
      <Toast message={toast.message} visible={toast.visible} />
    </AppShell>
  );
};

export default App;
