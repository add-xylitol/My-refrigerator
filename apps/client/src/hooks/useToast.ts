import { useCallback, useState } from 'react';

export function useToast(defaultDuration = 3000) {
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });

  const showToast = useCallback(
    (message: string, duration = defaultDuration) => {
      setToast({ message, visible: true });
      setTimeout(() => setToast((t) => ({ ...t, visible: false })), duration);
    },
    [defaultDuration]
  );

  const hideToast = useCallback(() => setToast((t) => ({ ...t, visible: false })), []);

  return { toast, showToast, hideToast };
}
