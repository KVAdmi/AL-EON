import React, { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { UserProfileProvider } from '@/contexts/UserProfileContext';
import { CapabilitiesProvider } from '@/contexts/CapabilitiesContext';
import MainLayout from '@/components/MainLayout';
import ErrorBoundary from '@/components/ErrorBoundary';

// ✅ LAZY LOADING: Solo cargar páginas cuando se necesitan
const LandingPage = lazy(() => import('@/pages/LandingPage'));
const ChatPage = lazy(() => import('@/features/chat/pages/ChatPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const SignupPage = lazy(() => import('@/pages/SignupPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const SecurityPage = lazy(() => import('@/pages/SecurityPage'));
const IntegrationsPage = lazy(() => import('@/pages/IntegrationsPage'));
const PlatformsPage = lazy(() => import('@/pages/PlatformsPage'));
const HistoryPage = lazy(() => import('@/pages/HistoryPage'));
const PrivacyPolicyPage = lazy(() => import('@/pages/PrivacyPolicyPage'));
const TermsOfServicePage = lazy(() => import('@/pages/TermsOfServicePage'));
const UserIntegrationsPage = lazy(() => import('@/pages/UserIntegrationsPage'));
const EmailSettingsPage = lazy(() => import('@/pages/EmailSettingsPage'));
const EmailPageOutlook = lazy(() => import('@/pages/EmailPageOutlook'));
const DraftsPage = lazy(() => import('@/pages/DraftsPage'));
const CalendarPage = lazy(() => import('@/pages/CalendarPage'));
const TelegramSettingsPage = lazy(() => import('@/pages/TelegramSettingsPage'));
const TelegramPage = lazy(() => import('@/pages/TelegramPage'));
const EmailModulePage = lazy(() => import('@/pages/EmailModulePage'));
const MeetingsPage = lazy(() => import('@/pages/MeetingsPage'));
const MeetingDetailPage = lazy(() => import('@/pages/MeetingDetailPage'));

// Loading component
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" style={{ color: 'var(--color-primary)' }} />
        <p className="mt-4" style={{ color: 'var(--color-text-secondary)' }}>Cargando...</p>
      </div>
    </div>
  );
}

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
  const { user, loading, bootError, retryBoot } = useAuth();

  // 🔥 PANTALLA DE ERROR CON REINTENTAR
  if (bootError) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        <div 
          className="max-w-md w-full p-8 rounded-2xl text-center space-y-6"
          style={{ 
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)'
          }}
        >
          <div className="text-6xl mb-4">⚠️</div>
          <h2 
            className="text-2xl font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Error de Conexión
          </h2>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            No se pudo inicializar la aplicación.
          </p>
          <p 
            className="text-sm font-mono p-3 rounded"
            style={{ 
              backgroundColor: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-tertiary)'
            }}
          >
            {bootError}
          </p>
          <button
            onClick={retryBoot}
            className="w-full py-3 px-6 rounded-xl font-medium transition-all hover:opacity-90"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-text-primary)'
            }}
          >
            🔄 Reintentar
          </button>
          <button
            onClick={() => window.location.href = '/login'}
            className="w-full py-2 px-6 rounded-xl font-medium transition-all"
            style={{
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)'
            }}
          >
            Ir al Login
          </button>
        </div>
      </div>
    );
  }

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
  const { user, loading, bootError, retryBoot } = useAuth();

  // 🔥 PANTALLA DE ERROR CON REINTENTAR
  if (bootError) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        <div 
          className="max-w-md w-full p-8 rounded-2xl text-center space-y-6"
          style={{ 
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)'
          }}
        >
          <div className="text-6xl mb-4">⚠️</div>
          <h2 
            className="text-2xl font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Error de Conexión
          </h2>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            No se pudo inicializar la aplicación.
          </p>
          <p 
            className="text-sm font-mono p-3 rounded"
            style={{ 
              backgroundColor: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-tertiary)'
            }}
          >
            {bootError}
          </p>
          <button
            onClick={retryBoot}
            className="w-full py-3 px-6 rounded-xl font-medium transition-all hover:opacity-90"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-text-primary)'
            }}
          >
            🔄 Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div style={{ color: 'var(--color-text-primary)' }}>Cargando...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/chat" replace />;
  }

  return children;
}

function App() {
  const location = useLocation();

  // ✅ SOLUCIÓN 1: Reset de loading en cada cambio de ruta
  useEffect(() => {
    console.log('[APP] 🔄 Route changed to:', location.pathname);
    
    // Abortar todos los requests pendientes
    abortAllPendingRequests();
    
    // Limpiar estados globales que puedan quedar colgados
    // (loading, modals, etc. se limpian en cada componente)
    
  }, [location.pathname, location.search]);

  // ✅ SOLUCIÓN 3: Manejo explícito de popstate (botón BACK)
  useEffect(() => {
    const handlePopState = () => {
      console.log('[APP] ⬅️ BACK button pressed - cleaning up');
      abortAllPendingRequests();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <Suspense fallback={<PageLoader />}>
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
          path="/settings/integrations" 
          element={
            <ProtectedRoute>
              <UserIntegrationsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings/email" 
          element={
            <ProtectedRoute>
              <EmailSettingsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings/telegram" 
          element={
            <ProtectedRoute>
              <TelegramSettingsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/correo" 
          element={
            <ProtectedRoute>
              <EmailPageOutlook />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/drafts" 
          element={
            <ProtectedRoute>
              <DraftsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/calendar" 
          element={
            <ProtectedRoute>
              <CalendarPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/telegram" 
          element={
            <ProtectedRoute>
              <TelegramPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/reuniones" 
          element={
            <ProtectedRoute>
              <MeetingsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/reuniones/:id" 
          element={
            <ProtectedRoute>
              <MeetingDetailPage />
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

        {/* Páginas legales (públicas) */}
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />

        {/* Landing Page (pública) */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

// Wrapper con Providers
export default function AppWrapper() {
  return (
    <ErrorBoundary resetOnError={false}>
      <CapabilitiesProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </CapabilitiesProvider>
    </ErrorBoundary>
  );
}
