/**
 * IntegrationsStatusPanel.jsx
 * 
 * Panel que muestra el estado REAL de las integraciones del usuario:
 * - Conectado: ✅/❌
 * - Acceso válido: ✅/❌ (token no expirado)
 * - Refresh token: ✅/❌
 * - Expira en: fecha/hora
 * - Último error: mensaje si aplica
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react';

export default function IntegrationsStatusPanel() {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadIntegrationsStatus();
    }
  }, [user]);

  async function loadIntegrationsStatus() {
    try {
      const { data, error } = await supabase
        .from('user_integrations')
        .select('integration_type, access_token, refresh_token, expires_at, connected_at, updated_at')
        .eq('user_id', user.id)
        .in('integration_type', ['gmail', 'google_calendar', 'google_meet']);

      if (error) throw error;

      const enriched = (data || []).map(int => {
        const expiresAt = new Date(int.expires_at);
        const now = new Date();
        const hasAccess = expiresAt > now;
        const expiresIn = Math.floor((expiresAt - now) / (1000 * 60)); // minutos

        return {
          type: int.integration_type,
          name: getIntegrationName(int.integration_type),
          connected: !!int.access_token,
          hasAccess,
          hasRefresh: !!int.refresh_token,
          expiresAt,
          expiresIn,
          connectedAt: new Date(int.connected_at),
          lastUpdated: new Date(int.updated_at),
          lastError: null // TODO: Agregar columna last_error a la tabla
        };
      });

      setIntegrations(enriched);
    } catch (error) {
      console.error('[IntegrationsStatusPanel] Error:', error);
    } finally {
      setLoading(false);
    }
  }

  function getIntegrationName(type) {
    const names = {
      gmail: 'Gmail',
      google_calendar: 'Google Calendar',
      google_meet: 'Google Meet'
    };
    return names[type] || type;
  }

  function getExpiryColor(expiresIn) {
    if (expiresIn <= 0) return 'rgb(239, 68, 68)'; // Rojo - expirado
    if (expiresIn <= 10) return 'rgb(251, 191, 36)'; // Amarillo - expira pronto
    return 'rgb(34, 197, 94)'; // Verde - válido
  }

  function getExpiryText(expiresIn) {
    if (expiresIn <= 0) return 'Expirado';
    if (expiresIn < 60) return `${expiresIn} min`;
    const hours = Math.floor(expiresIn / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  }

  if (loading) {
    return (
      <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-2">
          <RefreshCw className="animate-spin" size={16} style={{ color: 'var(--color-accent)' }} />
          <span style={{ color: 'var(--color-text-secondary)' }}>Cargando estado...</span>
        </div>
      </div>
    );
  }

  if (integrations.length === 0) {
    return (
      <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          No tienes integraciones conectadas. Conéctelas arriba.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          📊 Estado de Integraciones
        </h3>
        <button
          onClick={loadIntegrationsStatus}
          className="p-1 rounded hover:opacity-70 transition-opacity"
          style={{ color: 'var(--color-accent)' }}
          title="Refrescar estado"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {integrations.map(int => (
        <div
          key={int.type}
          className="p-3 rounded-lg"
          style={{ 
            backgroundColor: 'var(--color-bg-secondary)', 
            border: `1px solid ${int.hasAccess ? 'var(--color-border)' : 'rgb(239, 68, 68)'}` 
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {int.name}
              </span>
            </div>
            {int.hasAccess ? (
              <CheckCircle size={16} style={{ color: 'rgb(34, 197, 94)' }} />
            ) : (
              <XCircle size={16} style={{ color: 'rgb(239, 68, 68)' }} />
            )}
          </div>

          {/* Status Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Conectado */}
            <div className="flex items-center gap-1">
              {int.connected ? (
                <CheckCircle size={12} style={{ color: 'rgb(34, 197, 94)' }} />
              ) : (
                <XCircle size={12} style={{ color: 'rgb(239, 68, 68)' }} />
              )}
              <span style={{ color: 'var(--color-text-secondary)' }}>Conectado</span>
            </div>

            {/* Acceso Válido */}
            <div className="flex items-center gap-1">
              {int.hasAccess ? (
                <CheckCircle size={12} style={{ color: 'rgb(34, 197, 94)' }} />
              ) : (
                <XCircle size={12} style={{ color: 'rgb(239, 68, 68)' }} />
              )}
              <span style={{ color: 'var(--color-text-secondary)' }}>Acceso Válido</span>
            </div>

            {/* Refresh Token */}
            <div className="flex items-center gap-1">
              {int.hasRefresh ? (
                <CheckCircle size={12} style={{ color: 'rgb(34, 197, 94)' }} />
              ) : (
                <XCircle size={12} style={{ color: 'rgb(239, 68, 68)' }} />
              )}
              <span style={{ color: 'var(--color-text-secondary)' }}>Refresh Token</span>
            </div>

            {/* Expira en */}
            <div className="flex items-center gap-1">
              <Clock size={12} style={{ color: getExpiryColor(int.expiresIn) }} />
              <span style={{ color: getExpiryColor(int.expiresIn) }}>
                Expira en {getExpiryText(int.expiresIn)}
              </span>
            </div>
          </div>

          {/* Last Error */}
          {int.lastError && (
            <div className="mt-2 flex items-start gap-1 text-xs p-2 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
              <AlertTriangle size={12} style={{ color: 'rgb(239, 68, 68)', marginTop: '2px' }} />
              <span style={{ color: 'rgb(239, 68, 68)' }}>{int.lastError}</span>
            </div>
          )}

          {/* Warning si está por expirar */}
          {!int.hasAccess && (
            <div className="mt-2 text-xs p-2 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)' }}>
              ⚠️ Token expirado. Reconecta esta integración.
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
