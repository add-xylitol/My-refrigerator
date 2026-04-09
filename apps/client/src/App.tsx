import { useEffect } from 'react';
import { AppShell } from './components/layout/AppShell';
import { AppRoutes } from './routes/AppRoutes';
import { useFridgeStore } from './stores/fridgeStore';

const App = () => {
  const loginAndSync = useFridgeStore((s) => s.loginAndSync);

  useEffect(() => {
    loginAndSync();
  }, [loginAndSync]);

  return (
    <AppShell>
      <AppRoutes />
    </AppShell>
  );
};

export default App;
