/**
 * UserIntegrationsPage.jsx
 * 
 * Página para que USUARIOS NORMALES conecten sus cuentas de:
 * - Email (SMTP/IMAP manual)
 * - Telegram (Bot configuration)
 * - Otros servicios futuros
 * 
 * NO incluye Google OAuth (eliminado en favor de sistemas internos)
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Calendar, MessageCircle, ArrowRight } from 'lucide-react';

export default function UserIntegrationsPage() {
  const navigate = useNavigate();

  const integrations = [
    {
      name: 'Email',
      description: 'Configura cuentas SMTP/IMAP para enviar y recibir correos',
      icon: Mail,
      path: '/settings/email',
      color: '#3B82F6'
    },
    {
      name: 'Agenda',
      description: 'Gestiona eventos y recordatorios en tu calendario interno',
      icon: Calendar,
      path: '/calendar',
      color: '#10B981'
    },
    {
      name: 'Telegram',
      description: 'Conecta bots de Telegram para notificaciones',
      icon: MessageCircle,
      path: '/settings/telegram',
      color: '#0088CC'
    }
  ];

  return (
    <div
      className="h-screen overflow-y-auto"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      <div style={{ paddingBottom: '120px' }}>
      {/* Header */}
      <div
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderBottom: '1px solid var(--color-border)'
        }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Mis Integraciones
          </h1>
          <p className="mt-2" style={{ color: 'var(--color-text-secondary)' }}>
            Conecta tus servicios para usar Email, Agenda y Telegram desde AL-EON
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {integrations.map((integration) => {
            const Icon = integration.icon;

            return (
              <div
                key={integration.name}
                className="rounded-xl shadow-sm p-6 hover:shadow-md transition-all cursor-pointer"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)'
                }}
                onClick={() => navigate(integration.path)}
              >
                {/* Icon */}
                <div className="mb-4">
                  <div
                    className="inline-flex p-3 rounded-lg"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                  >
                    <Icon size={24} style={{ color: integration.color }} />
                  </div>
                </div>

                {/* Info */}
                <h3
                  className="text-lg font-semibold mb-2"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {integration.name}
                </h3>
                <p
                  className="text-sm mb-4"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {integration.description}
                </p>

                {/* Action Button */}
                <button
                  className="w-full px-4 py-2 rounded-lg transition-all text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90"
                  style={{
                    backgroundColor: integration.color,
                    color: '#FFFFFF'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(integration.path);
                  }}
                >
                  Configurar
                  <ArrowRight size={16} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Info Box */}
        <div
          className="mt-8 rounded-lg p-6"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)'
          }}
        >
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                <span className="text-white text-sm">i</span>
              </div>
            </div>
            <div className="flex-1">
              <h4
                className="font-semibold mb-2"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Sistema de Integraciones Interno
              </h4>
              <ul
                className="space-y-1 text-sm"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <li>• Email: Configura cuentas SMTP/IMAP directamente (sin OAuth)</li>
                <li>• Agenda: Sistema de calendario interno independiente</li>
                <li>• Telegram: Conecta tus bots para notificaciones</li>
                <li>• Tus credenciales se guardan de forma segura y encriptada</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

