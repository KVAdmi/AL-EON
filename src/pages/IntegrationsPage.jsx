import React, { useState } from 'react';
import { useUserProfile } from '../contexts/UserProfileContext';
import { Navigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { TestTube } from 'lucide-react';

export default function IntegrationsPage() {
  const { isRoot, integrations, connectIntegration, disconnectIntegration, hasIntegration } = useUserProfile();
  const [connecting, setConnecting] = useState(null);

  // 🔐 GUARD: Solo ROOT puede ver esta página
  if (!isRoot) {
    return <Navigate to="/chat" replace />;
  }

  const availableIntegrations = [
    {
      type: 'netlify',
      name: 'Netlify',
      icon: 'NET',
      description: 'Deploy, dominios, estado de sitios',
      fields: ['api_key'],
    },
    {
      type: 'supabase',
      name: 'Supabase',
      icon: 'SB',
      description: 'Base de datos, auth, storage',
      fields: ['project_url', 'api_key'],
    },
    {
      type: 'github',
      name: 'GitHub',
      icon: 'GH',
      description: 'Repos, commits, estado de código',
      fields: ['token'],
    },
    {
      type: 'openai',
      name: 'OpenAI',
      icon: 'AI',
      description: 'Modelo IA, uso de tokens',
      fields: ['api_key'],
    },
    {
      type: 'aws',
      name: 'AWS',
      icon: 'AWS',
      description: 'EC2, PM2, NGINX, infraestructura',
      fields: ['access_key_id', 'secret_access_key', 'region'],
    },
    {
      type: 'apple',
      name: 'Apple',
      icon: 'APP',
      description: 'App Store, TestFlight, certificados',
      fields: ['team_id', 'key_id', 'private_key'],
    },
    {
      type: 'slack',
      name: 'Slack',
      icon: 'SL',
      description: 'Notificaciones a canales, alertas',
      fields: ['webhook_url', 'bot_token'],
      capabilities: ['notifications', 'messaging']
    },
  ];

  async function handleConnect(integrationType) {
    const integration = availableIntegrations.find((i) => i.type === integrationType);
    if (!integration) return;

    // Mostrar prompt simple
    const config = {};
    for (const field of integration.fields) {
      const value = prompt(`${integration.name} - ${field}:`);
      if (!value) return; // Cancelado
      config[field] = value;
    }

    setConnecting(integrationType);
    const result = await connectIntegration(integrationType, config);
    setConnecting(null);

    if (result.success) {
      alert(`Listo: ${integration.name} conectado`);
    } else {
      alert(`Error: ${result.error}`);
    }
  }

  async function handleDisconnect(integrationType) {
    const integration = availableIntegrations.find((i) => i.type === integrationType);
    if (!integration) return;

    if (!confirm(`¿Desconectar ${integration.name}?`)) return;

    const result = await disconnectIntegration(integrationType);
    if (result.success) {
      alert(`Listo: ${integration.name} desconectado`);
    } else {
      alert(`Error: ${result.error}`);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">Integraciones</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Solo ROOT puede ver y gestionar estas integraciones
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {availableIntegrations.map((integration) => {
          const connected = hasIntegration(integration.type);
          const isConnecting = connecting === integration.type;

          return (
            <div
              key={integration.type}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-2 border-transparent hover:border-blue-500 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{integration.icon}</span>
                  <div>
                    <h3 className="text-xl font-semibold">{integration.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {integration.description}
                    </p>
                    {/* Capacidades/Tags */}
                    {integration.capabilities && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {integration.capabilities.map(cap => (
                          <span 
                            key={cap}
                            className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                          >
                            {cap}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div
                  className={`px-2 py-1 rounded text-xs font-semibold ${
                    connected
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {connected ? 'Conectado' : 'Desconectado'}
                </div>
              </div>

              {connected ? (
                <div className="space-y-2">
                  <Button
                    onClick={() => handleDisconnect(integration.type)}
                    variant="destructive"
                    className="w-full"
                  >
                    Desconectar
                  </Button>
                  <Button variant="outline" className="w-full">
                    Configurar
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => handleConnect(integration.type)}
                  disabled={isConnecting}
                  className="w-full"
                >
                  {isConnecting ? 'Conectando...' : 'Conectar'}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Estado de Infraestructura */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Estado de Infraestructura</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded">
            <p className="text-sm text-gray-600 dark:text-gray-400">AL-E CORE</p>
            <p className="text-2xl font-bold">Online</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded">
            <p className="text-sm text-gray-600 dark:text-gray-400">Latencia</p>
            <p className="text-2xl font-bold">~250ms</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded">
            <p className="text-sm text-gray-600 dark:text-gray-400">Último ping</p>
            <p className="text-2xl font-bold">Ahora</p>
          </div>
        </div>
      </div>
    </div>
  );
}
