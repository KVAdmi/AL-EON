/**
 * OAuthCallbackPage.jsx
 * 
 * ✅ FLUJO CORRECTO:
 * 1. Recibe 'code' de Google OAuth
 * 2. Envía code al backend: POST /api/auth/google/callback
 * 3. Backend intercambia tokens y los guarda
 * 4. Frontend solo muestra resultado
 * 
 * ❌ NO hace el frontend:
 * - Intercambiar code por tokens
 * - Usar client_secret
 * - Llamar a Google OAuth directamente
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader, CheckCircle, XCircle } from 'lucide-react';

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const [status, setStatus] = useState('processing'); // 'processing' | 'success' | 'error'
  const [message, setMessage] = useState('Procesando autorización...');

  useEffect(() => {
    if (user && accessToken) {
      handleOAuthCallback();
    }
  }, [searchParams, user, accessToken]);

  async function handleOAuthCallback() {
    try {
      // 1️⃣ Obtener parámetros de la URL
      const code = searchParams.get('code');
      const stateStr = searchParams.get('state');
      const error = searchParams.get('error');

      // Verificar si hubo error en la autorización
      if (error) {
        throw new Error(`Error de autorización: ${error}`);
      }

      if (!code) {
        throw new Error('No se recibió código de autorización');
      }

      if (!stateStr) {
        throw new Error('No se recibió información de estado');
      }

      // Parsear state
      const state = JSON.parse(stateStr);
      const { integration_type, user_id } = state;

      if (!user || user.id !== user_id) {
        throw new Error('Usuario no autorizado');
      }

      // 2️⃣ Enviar code al backend para que intercambie tokens
      setMessage('Conectando con AL-E Core...');

      const BACKEND_URL = import.meta.env.VITE_ALE_CORE_BASE || import.meta.env.VITE_ALE_CORE_URL?.replace('/api/ai/chat', '');
      
      if (!BACKEND_URL) {
        throw new Error('Backend URL no configurada');
      }

      const response = await fetch(`${BACKEND_URL}/api/auth/google/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}` // JWT de Supabase
        },
        body: JSON.stringify({
          code,
          integration_type,
          redirect_uri: `${window.location.origin}/integrations/oauth-callback`
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Mostrar mensaje exacto del backend
        throw new Error(errorData.error || errorData.message || `Error del servidor: ${response.status}`);
      }

      const result = await response.json();

      // 3️⃣ Éxito - Backend guardó los tokens
      setStatus('success');
      setMessage(`✅ ${getIntegrationName(integration_type)} conectado correctamente!`);

      console.log('[OAuthCallback] ✅ Integración conectada:', {
        integration_type,
        success: true
      });

      // Redirigir después de 2 segundos
      setTimeout(() => {
        navigate('/settings/integrations', { replace: true });
      }, 2000);

    } catch (error) {
      console.error('[OAuthCallback] Error:', error);
      setStatus('error');
      setMessage(error.message || 'Error al conectar la integración');

      // Redirigir al error después de 3 segundos
      setTimeout(() => {
        navigate('/settings/integrations', { replace: true });
      }, 3000);
    }
  }

  function getIntegrationName(type) {
    const names = {
      gmail: 'Gmail',
      google_calendar: 'Google Calendar',
      google_meet: 'Google Meet',
    };
    return names[type] || type;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          {status === 'processing' && (
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <Loader className="text-blue-600 dark:text-blue-400 animate-spin" size={32} />
            </div>
          )}
          {status === 'success' && (
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle className="text-green-600 dark:text-green-400" size={32} />
            </div>
          )}
          {status === 'error' && (
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <XCircle className="text-red-600 dark:text-red-400" size={32} />
            </div>
          )}
        </div>

        {/* Message */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            {status === 'processing' && 'Conectando...'}
            {status === 'success' && '¡Conectado!'}
            {status === 'error' && 'Error'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {message}
          </p>

          {/* Progress dots */}
          {status === 'processing' && (
            <div className="flex justify-center gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          )}

          {status === 'success' && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Redirigiendo...
            </p>
          )}

          {status === 'error' && (
            <button
              onClick={() => navigate('/settings/integrations')}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Volver a Integraciones
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

