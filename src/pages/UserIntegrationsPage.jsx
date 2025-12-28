/**
 * UserIntegrationsPage.jsx
 * 
 * Página para que USUARIOS NORMALES conecten sus propias cuentas de:
 * - Gmail
 * - Google Calendar
 * - Google Meet
 * 
 * NO permite configurar APIs de desarrollo (esas son solo para ROOT)
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Mail, Calendar, Video, CheckCircle, XCircle, Loader, ExternalLink } from 'lucide-react';

export default function UserIntegrationsPage() {
  const { user } = useAuth();
  const [userIntegrations, setUserIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectingType, setConnectingType] = useState(null);

  // Client ID y Secret de tu proyecto OAuth (compartidos por todos los usuarios)
  const GOOGLE_CLIENT_ID = '1010443733044-nj923bcv3rp20mi7ilb75bdvr0jnjfdq.apps.googleusercontent.com';
  const GOOGLE_CLIENT_SECRET = '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';
  const REDIRECT_URI = 'https://al-eon.com/integrations/oauth-callback';

  // Integraciones disponibles para usuarios normales
  const availableIntegrations = [
    {
      type: 'gmail',
      name: 'Gmail',
      icon: Mail,
      color: 'red',
      description: 'Envía y recibe emails desde AL-EON',
      scope: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly',
    },
    {
      type: 'google_calendar',
      name: 'Google Calendar',
      icon: Calendar,
      color: 'blue',
      description: 'Gestiona eventos y recordatorios',
      scope: 'https://www.googleapis.com/auth/calendar',
    },
    {
      type: 'google_meet',
      name: 'Google Meet',
      icon: Video,
      color: 'green',
      description: 'Crea y gestiona videollamadas',
      scope: 'https://www.googleapis.com/auth/calendar',
    },
  ];

  // Cargar integraciones del usuario
  useEffect(() => {
    loadUserIntegrations();
  }, [user]);

  async function loadUserIntegrations() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_integrations')
        .select('*')
        .eq('user_id', user.id)
        .in('integration_type', ['gmail', 'google_calendar', 'google_meet']);

      if (error) throw error;

      setUserIntegrations(data || []);
    } catch (error) {
      console.error('[UserIntegrations] Error cargando integraciones:', error);
    } finally {
      setLoading(false);
    }
  }

  // Iniciar flujo OAuth de Google
  function handleConnectGoogle(integrationType) {
    const integration = availableIntegrations.find(i => i.type === integrationType);
    if (!integration) return;

    setConnectingType(integrationType);

    // Construir URL de autorización de Google
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', integration.scope);
    authUrl.searchParams.set('access_type', 'offline'); // Para obtener refresh token
    authUrl.searchParams.set('prompt', 'consent'); // Forzar pantalla de consentimiento
    authUrl.searchParams.set('state', JSON.stringify({
      integration_type: integrationType,
      user_id: user.id,
    }));

    // Redirigir a Google para autorización
    window.location.href = authUrl.toString();
  }

  // Desconectar integración
  async function handleDisconnect(integrationType) {
    if (!confirm(`¿Desconectar ${integrationType}?`)) return;

    try {
      const { error } = await supabase
        .from('user_integrations')
        .delete()
        .eq('user_id', user.id)
        .eq('integration_type', integrationType);

      if (error) throw error;

      // Recargar lista
      await loadUserIntegrations();
    } catch (error) {
      console.error('[UserIntegrations] Error desconectando:', error);
      alert('Error al desconectar. Intenta de nuevo.');
    }
  }

  // Verificar si el usuario tiene una integración conectada
  function hasIntegration(type) {
    return userIntegrations.some(
      int => int.integration_type === type
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <Loader className="animate-spin" style={{ color: 'var(--color-accent)' }} size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Header */}
      <div style={{ 
        backgroundColor: 'var(--color-bg-secondary)', 
        borderBottom: '1px solid var(--color-border)' 
      }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            🔗 Mis Integraciones
          </h1>
          <p className="mt-2" style={{ color: 'var(--color-text-secondary)' }}>
            Conecta tus cuentas de Google para usar Gmail, Calendar y Meet desde AL-EON
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableIntegrations.map((integration) => {
            const connected = hasIntegration(integration.type);
            const isConnecting = connectingType === integration.type;
            const Icon = integration.icon;

            return (
              <div
                key={integration.type}
                className="rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)'
                }}
              >
                {/* Icon & Status */}
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                  >
                    <Icon size={24} style={{ color: 'var(--color-accent)' }} />
                  </div>
                  {connected && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
                      <CheckCircle size={12} />
                      Conectado
                    </div>
                  )}
                </div>

                {/* Info */}
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  {integration.name}
                </h3>
                <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                  {integration.description}
                </p>

                {/* Action Button */}
                {connected ? (
                  <div className="space-y-2">
                    <button
                      onClick={() => handleDisconnect(integration.type)}
                      className="w-full px-4 py-2 rounded-lg transition-colors text-sm font-medium hover:opacity-80"
                      style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}
                    >
                      Desconectar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleConnectGoogle(integration.type)}
                    disabled={isConnecting}
                    className="w-full px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF' }}
                  >
                    {isConnecting ? (
                      <>
                        <Loader size={16} className="animate-spin" />
                        Conectando...
                      </>
                    ) : (
                      <>
                        <ExternalLink size={16} />
                        Conectar con Google
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Info Box */}
        <div className="mt-8 rounded-lg p-6" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-accent)' }}>
                <span className="text-white text-sm">ℹ️</span>
              </div>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                ¿Cómo funciona?
              </h4>
              <ul className="space-y-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <li>• Al conectar, autorizarás a AL-EON a acceder a tu cuenta de Google</li>
                <li>• Tus credenciales se guardan de forma segura y encriptada</li>
                <li>• Puedes desconectar en cualquier momento</li>
                <li>• AL-EON solo accede a los datos que autorizas</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Connected Accounts Summary */}
        {userIntegrations.length > 0 && (
          <div className="mt-8 rounded-lg shadow-sm p-6" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              📋 Cuentas Conectadas
            </h3>
            <div className="space-y-3">
              {userIntegrations.map((int) => {
                const integration = availableIntegrations.find(i => i.type === int.integration_type);
                if (!integration) return null;

                return (
                  <div
                    key={int.id}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded" style={{ backgroundColor: 'var(--color-accent)', opacity: 0.2 }}>
                        <integration.icon size={16} style={{ color: 'var(--color-accent)' }} />
                      </div>
                      <div>
                        <p className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>
                          {integration.name}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                          Conectado el {new Date(int.created_at).toLocaleDateString('es-MX')}
                        </p>
                      </div>
                    </div>
                    <div className="px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
                      Activo
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
