import { AppShell } from './components/layout/AppShell';
import { AppRoutes } from './routes/AppRoutes';

const App = () => {
  return (
    <AppShell>
      <AppRoutes />
    </AppShell>
  );
};

export default App;
