import { Route, Routes } from 'react-router-dom';
import { DashboardPage } from '../pages/DashboardPage';
import { RecipesPage } from '../pages/RecipesPage';
import { SettingsPage } from '../pages/SettingsPage';
import { CondimentsPage } from '../pages/CondimentsPage';

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/recipes" element={<RecipesPage />} />
      <Route path="/condiments" element={<CondimentsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<DashboardPage />} />
    </Routes>
  );
};
