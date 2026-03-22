import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider, useApp } from './context/AppContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Entry from './pages/Entry';
import Exit from './pages/Exit';
import Yard from './pages/Yard';
import Admin from './pages/Admin';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useApp();
  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <div style={{
          width: '60px', height: '60px', borderRadius: '18px',
          background: 'linear-gradient(135deg, #1a6af5, #1251c1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(26,106,245,0.4)',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}>
          <span style={{ fontSize: '28px' }}>🅿</span>
        </div>
        <style>{`@keyframes pulse { 0%,100%{transform:scale(1)}50%{transform:scale(1.08)} }`}</style>
        <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Carregando G7 Park...</div>
      </div>
    );
  }
  return isAuthenticated ? children : <Navigate to="/" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/entry" element={<ProtectedRoute><Entry /></ProtectedRoute>} />
      <Route path="/exit" element={<ProtectedRoute><Exit /></ProtectedRoute>} />
      <Route path="/yard" element={<ProtectedRoute><Yard /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#0d1a2e',
              color: '#e8edf8',
              border: '1px solid #1e3a5f',
              borderRadius: '12px',
              fontSize: '14px',
              fontFamily: 'Inter, sans-serif',
              maxWidth: '360px',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#0d1a2e' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#0d1a2e' } },
          }}
        />
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  );
}
