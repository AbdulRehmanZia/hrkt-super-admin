import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MainLayout } from './components/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { FacilitiesListPage } from './pages/FacilitiesListPage';
import { FacilityDetailPage } from './pages/FacilityDetailPage';
import { InvoicesPage } from './pages/InvoicesPage';

export const App: React.FC = () => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#00c27a',
          borderRadius: 8,
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        },
      }}
    >
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected routes — all wrapped in ProtectedRoute */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="facilities" element={<FacilitiesListPage />} />
              <Route path="facilities/:id" element={<FacilityDetailPage />} />
              <Route path="invoices" element={<InvoicesPage />} />
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
