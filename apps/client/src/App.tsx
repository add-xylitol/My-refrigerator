import { useEffect, useCallback } from 'react';
import { AppShell } from './components/layout/AppShell';
import { AppRoutes } from './routes/AppRoutes';
import { useFridgeStore } from './stores/fridgeStore';
import { usePhotoFlow } from './hooks/usePhotoFlow';
import { useToast } from './hooks/useToast';
import { PhotoModal } from './components/vision/PhotoModal';
import { RecognitionSheet } from './components/vision/RecognitionSheet';
import { Toast } from './components/ui/Toast';

const App = () => {
  const loginAndSync = useFridgeStore((s) => s.loginAndSync);
  const shelves = useFridgeStore((s) => s.shelves);
  const { toast, showToast } = useToast();

  const onSuccess = useCallback((count: number) => {
    showToast(`已录入 ${count} 样食材`);
  }, [showToast]);

  const { state: photoState, startFlow, handleImage, confirmOne, confirmAll, retry, closeModal, closeSheet } = usePhotoFlow(onSuccess);

  useEffect(() => {
    loginAndSync();
  }, [loginAndSync]);

  return (
    <AppShell onFABClick={startFlow}>
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
      <Toast message={toast.message} visible={toast.visible} />
    </AppShell>
  );
};

export default App;
