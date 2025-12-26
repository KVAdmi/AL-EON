import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { UserProfileProvider } from '@/contexts/UserProfileContext';
import MainLayout from '@/components/MainLayout';
import ChatPage from '@/features/chat/pages/ChatPage';
import LoginPage from '@/pages/auth/LoginPage';
import SignupPage from '@/pages/auth/SignupPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ProfilePage from '@/pages/ProfilePage';
import SettingsPage from '@/pages/SettingsPage';
import SecurityPage from '@/pages/SecurityPage';
import IntegrationsPage from '@/pages/IntegrationsPage';
import PlatformsPage from '@/pages/PlatformsPage';
import HistoryPage from '@/pages/HistoryPage';

// ✅ GLOBAL: AbortController para cancelar requests pendientes
let globalAbortController = null;

export function abortAllPendingRequests() {
  if (globalAbortController) {
    console.log('🛑 Aborting all pending requests');
    globalAbortController.abort();
  }
  globalAbortController = new AbortController();
}

export function getGlobalAbortSignal() {
  if (!globalAbortController) {
    globalAbortController = new AbortController();
  }
  return globalAbortController.signal;
}

// Componente para proteger rutas que requieren autenticación
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div style={{ color: 'var(--color-text-primary)' }}>Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <UserProfileProvider>
      <MainLayout>{children}</MainLayout>
    </UserProfileProvider>
  );
}

// Componente para rutas públicas (redirige a / si ya está autenticado)
function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div style={{ color: 'var(--color-text-primary)' }}>Cargando...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  const location = useLocation();

  // ✅ SOLUCIÓN 1: Reset de loading en cada cambio de ruta
  useEffect(() => {
    console.log('🔄 Route changed to:', location.pathname);
    
    // Abortar todos los requests pendientes
    abortAllPendingRequests();
    
    // Limpiar estados globales que puedan quedar colgados
    // (loading, modals, etc. se limpian en cada componente)
    
  }, [location.pathname, location.search]);

  // ✅ SOLUCIÓN 3: Manejo explícito de popstate (botón BACK)
  useEffect(() => {
    const handlePopState = () => {
      console.log('⬅️ BACK button pressed - cleaning up');
      abortAllPendingRequests();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <Routes>
        {/* Rutas protegidas */}
        <Route 
          path="/chat" 
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          } 
        />
          <Route 
            path="/history" 
            element={
              <ProtectedRoute>
                <HistoryPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/security" 
            element={
              <ProtectedRoute>
                <SecurityPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/integrations" 
            element={
              <ProtectedRoute>
                <IntegrationsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/platforms" 
            element={
              <ProtectedRoute>
                <PlatformsPage />
              </ProtectedRoute>
            } 
          />

          {/* Rutas públicas */}
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            } 
          />
          <Route 
            path="/signup" 
            element={
              <PublicRoute>
                <SignupPage />
              </PublicRoute>
            } 
          />
          <Route 
            path="/forgot-password" 
            element={
              <PublicRoute>
                <ForgotPasswordPage />
              </PublicRoute>
            } 
          />

          {/* Fallback */}
          <Route path="/" element={<Navigate to="/chat" replace />} />
          <Route path="*" element={<Navigate to="/chat" replace />} />
        </Routes>
  );
}

// Wrapper con AuthProvider
export default function AppWrapper() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}
