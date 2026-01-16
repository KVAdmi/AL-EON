/**
 * ErrorAlert.jsx
 * Componente para mostrar errores diferenciados de AL-E
 * 
 * Distingue entre:
 * - Errores de configuración (sin cuentas, cuentas inactivas)
 * - Errores técnicos (database, timeout, etc)
 * 
 * Actualizado: 16 enero 2026
 */

import React from 'react';
import { AlertCircle, XCircle, Settings, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Componente de alerta de error con diferentes variantes
 */
export default function ErrorAlert({ error, message }) {
  const navigate = useNavigate();

  // Detectar tipo de error basado en el mensaje
  const isNoEmailAccounts = message?.includes('NO_EMAIL_ACCOUNTS') || 
                           message?.includes('sin cuentas de correo') ||
                           message?.includes('no tienes cuentas de correo configuradas');
  
  const isNoActiveAccounts = message?.includes('NO_ACTIVE_ACCOUNTS') || 
                            message?.includes('cuentas inactivas') ||
                            message?.includes('ninguna está activa');
  
  const isDatabaseError = message?.includes('DATABASE_ERROR') || 
                         message?.includes('Error de conexión') ||
                         message?.includes('No pude conectar');
  
  const isTimeoutError = message?.includes('timeout') || 
                        message?.includes('Tiempo de espera');

  // Error: Sin cuentas de correo configuradas
  if (isNoEmailAccounts) {
    return (
      <div
        className="flex gap-3 p-4 rounded-lg"
        style={{
          backgroundColor: 'rgba(251, 191, 36, 0.1)', // amber-400 con opacidad
          border: '1px solid rgba(251, 191, 36, 0.3)',
        }}
      >
        <Settings 
          className="w-5 h-5 flex-shrink-0 mt-0.5" 
          style={{ color: 'rgb(251, 191, 36)' }} 
        />
        <div className="flex-1">
          <h4 
            className="font-semibold text-sm mb-1"
            style={{ color: 'rgb(251, 191, 36)' }}
          >
            Sin cuentas de correo
          </h4>
          <p 
            className="text-sm mb-2"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Para usar esta función, configura una cuenta en Email Hub.
          </p>
          <button
            onClick={() => navigate('/settings/email')}
            className="text-sm font-medium underline hover:opacity-80 transition-opacity"
            style={{ color: 'rgb(251, 191, 36)' }}
          >
            Configurar ahora →
          </button>
        </div>
      </div>
    );
  }

  // Error: Cuentas inactivas
  if (isNoActiveAccounts) {
    return (
      <div
        className="flex gap-3 p-4 rounded-lg"
        style={{
          backgroundColor: 'rgba(251, 191, 36, 0.1)',
          border: '1px solid rgba(251, 191, 36, 0.3)',
        }}
      >
        <AlertCircle 
          className="w-5 h-5 flex-shrink-0 mt-0.5" 
          style={{ color: 'rgb(251, 191, 36)' }} 
        />
        <div className="flex-1">
          <h4 
            className="font-semibold text-sm mb-1"
            style={{ color: 'rgb(251, 191, 36)' }}
          >
            Cuentas inactivas
          </h4>
          <p 
            className="text-sm mb-2"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Tienes cuentas configuradas pero ninguna está activa. Reactívalas en configuración.
          </p>
          <button
            onClick={() => navigate('/settings/email')}
            className="text-sm font-medium underline hover:opacity-80 transition-opacity"
            style={{ color: 'rgb(251, 191, 36)' }}
          >
            Ir a configuración →
          </button>
        </div>
      </div>
    );
  }

  // Error: Timeout
  if (isTimeoutError) {
    return (
      <div
        className="flex gap-3 p-4 rounded-lg"
        style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)', // red-500 con opacidad
          border: '1px solid rgba(239, 68, 68, 0.3)',
        }}
      >
        <WifiOff 
          className="w-5 h-5 flex-shrink-0 mt-0.5" 
          style={{ color: 'rgb(239, 68, 68)' }} 
        />
        <div className="flex-1">
          <h4 
            className="font-semibold text-sm mb-1"
            style={{ color: 'rgb(239, 68, 68)' }}
          >
            Tiempo de espera agotado
          </h4>
          <p 
            className="text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            La operación tardó demasiado tiempo. Por favor, intenta nuevamente.
          </p>
        </div>
      </div>
    );
  }

  // Error: Database o técnico
  if (isDatabaseError) {
    return (
      <div
        className="flex gap-3 p-4 rounded-lg"
        style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
        }}
      >
        <XCircle 
          className="w-5 h-5 flex-shrink-0 mt-0.5" 
          style={{ color: 'rgb(239, 68, 68)' }} 
        />
        <div className="flex-1">
          <h4 
            className="font-semibold text-sm mb-1"
            style={{ color: 'rgb(239, 68, 68)' }}
          >
            Error técnico
          </h4>
          <p 
            className="text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            No pude conectar con el servidor. Por favor, intenta nuevamente.
          </p>
        </div>
      </div>
    );
  }

  // Error genérico
  return (
    <div
      className="flex gap-3 p-4 rounded-lg"
      style={{
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
      }}
    >
      <XCircle 
        className="w-5 h-5 flex-shrink-0 mt-0.5" 
        style={{ color: 'rgb(239, 68, 68)' }} 
      />
      <div className="flex-1">
        <h4 
          className="font-semibold text-sm mb-1"
          style={{ color: 'rgb(239, 68, 68)' }}
        >
          Error
        </h4>
        <p 
          className="text-sm"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {message || error || 'Ocurrió un error inesperado'}
        </p>
      </div>
    </div>
  );
}
