import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { FacilitiesListPage } from './pages/FacilitiesListPage';
import { FacilityDetailPage } from './pages/FacilityDetailPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<MainLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="facilities" element={<FacilitiesListPage />} />
          <Route path="facilities/:id" element={<FacilityDetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
