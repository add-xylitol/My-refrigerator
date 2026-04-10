import { Route, Routes } from 'react-router-dom';
import { FridgePage } from '../pages/FridgePage';
import { DiscoverPage } from '../pages/DiscoverPage';
import { MealsPage } from '../pages/MealsPage';
import { ProfilePage } from '../pages/ProfilePage';

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<FridgePage />} />
      <Route path="/discover" element={<DiscoverPage />} />
      <Route path="/meals" element={<MealsPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="*" element={<FridgePage />} />
    </Routes>
  );
};
