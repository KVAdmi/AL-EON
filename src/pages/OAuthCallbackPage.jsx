/**
 * OAuthCallbackPage.jsx
 * 
 * Página que recibe el código de autorización de Google OAuth
 * y lo intercambia por un refresh token para guardarlo en Supabase
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Loader, CheckCircle, XCircle } from 'lucide-react';

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState('processing'); // 'processing' | 'success' | 'error'
  const [message, setMessage] = useState('Procesando autorización...');

  const GOOGLE_CLIENT_ID = '1010443733044-nj923bcv3rp20mi7ilb75bdvr0jnjfdq.apps.googleusercontent.com';
  const GOOGLE_CLIENT_SECRET = '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';
  const REDIRECT_URI = `${window.location.origin}/integrations/oauth-callback`;

  useEffect(() => {
    handleOAuthCallback();
  }, [searchParams, user]);

  async function handleOAuthCallback() {
    try {
      // Obtener parámetros de la URL
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

      setMessage('Intercambiando código por tokens...');

      // Intercambiar código por tokens (access token y refresh token)
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(`Error obteniendo tokens: ${errorData.error_description || errorData.error}`);
      }

      const tokens = await tokenResponse.json();
      const { access_token, refresh_token, expires_in, scope } = tokens;

      if (!refresh_token) {
        throw new Error('No se recibió refresh token. Intenta revocar el acceso en tu cuenta de Google y vuelve a autorizar.');
      }

      setMessage('Guardando credenciales...');

      // ✅ P0: Calcular expires_at
      const expiresAt = new Date(Date.now() + (expires_in * 1000)).toISOString();

      // ✅ P0: Guardar en Supabase con TODOS los campos requeridos NO NULL
      const { error: dbError } = await supabase
        .from('user_integrations')
        .upsert({
          user_id: user.id,
          integration_type,
          // ✅ Campos principales (NO NULL según backend)
          access_token,           // ✅ NUEVO: access token inicial
          refresh_token,          // ✅ Ya existía
          expires_at: expiresAt,  // ✅ NUEVO: cuándo expira
          scopes: scope,          // ✅ NUEVO: scopes autorizados
          connected_at: new Date().toISOString(), // ✅ NUEVO: cuándo se conectó
          is_active: true,        // ✅ Marcar como activo
          // ✅ Config adicional (legacy compatibility)
          config: {
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            provider: 'google'
          },
        }, {
          onConflict: 'user_id,integration_type',
        });

      if (dbError) throw dbError;

      // Éxito
      setStatus('success');
      setMessage(`✅ ${getIntegrationName(integration_type)} conectado exitosamente!`);

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
