import React from 'react';
import { useUserProfile } from '../contexts/UserProfileContext';
import { Navigate } from 'react-router-dom';

export default function PlatformsPage() {
  const { isRoot } = useUserProfile();

  // 🔐 GUARD: Solo ROOT puede ver esta página
  if (!isRoot) {
    return <Navigate to="/chat" replace />;
  }

  const platforms = [
    {
      name: 'AL-E CORE',
      icon: 'ALE',
      status: 'online',
      description: 'Backend principal de IA',
      domain: 'https://ale-core.infinitykode.com',
      metrics: { uptime: '99.9%', requests: '1.2M/mes' },
    },
    {
      name: 'AL-EON',
      icon: 'EON',
      status: 'online',
      description: 'Frontend de chat',
      domain: 'https://aleon.infinitykode.com',
      metrics: { users: '127', sessions: '450/día' },
    },
    {
      name: 'L.U.C.I',
      icon: 'LUCI',
      status: 'development',
      description: 'Módulo de automatización',
      domain: 'https://luci.infinitykode.com',
      metrics: { progress: '60%' },
    },
  ];

  function getStatusBadge(status) {
    const styles = {
      online: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      offline: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      development: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    };

    const labels = {
      online: '🟢 Online',
      offline: '🔴 Offline',
      development: '🟡 En Desarrollo',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">🌐 Plataformas</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        👑 Vista general de todas las plataformas del ecosistema
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {platforms.map((platform) => (
          <div
            key={platform.name}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-2 border-transparent hover:border-blue-500 transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-5xl">{platform.icon}</span>
                <div>
                  <h3 className="text-xl font-bold">{platform.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {platform.description}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-4">{getStatusBadge(platform.status)}</div>

            <div className="space-y-2 mb-4">
              <p className="text-sm">
                <strong>Dominio:</strong>
              </p>
              <a
                href={platform.domain}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm break-all"
              >
                {platform.domain}
              </a>
            </div>

            <div className="space-y-2 p-4 bg-gray-50 dark:bg-gray-700 rounded">
              <p className="text-sm font-semibold mb-2">📊 Métricas</p>
              {Object.entries(platform.metrics).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 capitalize">{key}:</span>
                  <span className="font-semibold">{value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Estado Global */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">📊 Estado Global del Ecosistema</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Plataformas Activas</p>
            <p className="text-3xl font-bold text-green-600">2/3</p>
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Usuarios Total</p>
            <p className="text-3xl font-bold text-blue-600">127</p>
          </div>
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Requests/día</p>
            <p className="text-3xl font-bold text-purple-600">15K</p>
          </div>
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Uptime Promedio</p>
            <p className="text-3xl font-bold text-yellow-600">99.8%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
