import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getUserBots, updateBotSettings } from '@/services/telegramService';
import ConnectBotForm from '@/features/telegram/components/ConnectBotForm';
import { useToast } from '@/ui/use-toast';
import { Link } from 'react-router-dom';
import { Send, CheckCircle2, XCircle, AlertCircle, ArrowLeft, AlertTriangle } from 'lucide-react';

export default function TelegramSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // 🔍 DEBUG: Verificar user
  useEffect(() => {
    console.log('[TelegramSettings] 🔍 DEBUG User:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      userKeys: user ? Object.keys(user) : []
    });
  }, [user]);

  useEffect(() => {
    loadBots();
  }, [user]);

  async function loadBots() {
    if (!user) return;

    try {
      setLoading(true);
      setLoadError(null);
      const data = await getUserBots(user.id);
      setBots(data || []);
    } catch (error) {
      console.error('Error cargando bots:', error);
      setLoadError(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudieron cargar los bots de Telegram',
      });
    } finally {
      setLoading(false);
    }
  }

  function handleBotConnected() {
    loadBots();
    setShowConnectForm(false);
  }

  async function handleToggleAutoSend(botId, currentValue) {
    try {
      await updateBotSettings(botId, {
        auto_send_enabled: !currentValue
      });
      
      toast({
        title: !currentValue ? 'Auto-send activado' : 'Auto-send desactivado',
        description: !currentValue 
          ? '✓ AL-E podrá enviar mensajes automáticamente por Telegram'
          : '✓ AL-E solicitará tu aprobación antes de enviar mensajes',
      });
      
      loadBots();
    } catch (error) {
      console.error('Error actualizando configuración:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo actualizar la configuración',
      });
    }
  }

  return (
    <div 
      className="h-screen overflow-y-auto"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      <div className="max-w-4xl mx-auto p-6 pb-32">
        {/* Botón Volver */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-6 px-4 py-2 rounded-lg transition-all hover:opacity-80"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border)'
          }}
        >
          <ArrowLeft size={18} />
          <span className="font-medium">Volver</span>
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 
            className="text-3xl font-bold mb-2"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Configuración de Telegram
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Conecta tu bot personal para recibir notificaciones y gestionar mensajes
          </p>
        </div>

        {loading ? (
          <div 
            className="text-center py-12"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Cargando...
          </div>
        ) : (
          <>
            {loadError && (
              <div
                className="p-4 rounded-xl border flex items-start gap-3 mb-6"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  borderColor: 'rgba(239, 68, 68, 0.3)',
                }}
              >
                <AlertCircle size={20} className="flex-shrink-0 mt-0.5" style={{ color: '#EF4444' }} />
                <div className="flex-1">
                  <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    Error cargando bots
                  </p>
                  <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {loadError.message || 'No se pudieron cargar los bots de Telegram'}
                  </p>
                  <button
                    onClick={loadBots}
                    className="mt-3 px-4 py-2 rounded-lg font-medium"
                    style={{
                      backgroundColor: 'var(--color-accent)',
                      color: '#FFFFFF',
                    }}
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            )}

            {/* Connected bots */}
            {bots.length > 0 && (
              <div className="space-y-4 mb-6">
                {bots.map(bot => {
                  // Determinar estado del bot
                  const hasStarted = bot.chat_id || bot.has_started;
                  const status = bot.isConnected && hasStarted 
                    ? 'connected' 
                    : bot.isConnected && !hasStarted 
                    ? 'waiting' 
                    : 'error';
                  
                  return (
                    <div
                      key={bot.id}
                      className="p-5 rounded-xl border"
                      style={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        borderColor: 'var(--color-border)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-4">
                          <Send size={24} style={{ color: 'var(--color-accent)' }} />
                          <div>
                            <h3 
                              className="font-semibold text-lg"
                              style={{ color: 'var(--color-text-primary)' }}
                            >
                              @{bot.botUsername || bot.bot_username}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              {status === 'connected' && (
                                <>
                                  <CheckCircle2 size={16} style={{ color: '#10b981' }} />
                                  <span 
                                    className="text-sm font-medium"
                                    style={{ color: '#10b981' }}
                                  >
                                    ✅ Conectado
                                  </span>
                                </>
                              )}
                              {status === 'waiting' && (
                                <>
                                  <AlertTriangle size={16} style={{ color: '#f59e0b' }} />
                                  <span 
                                    className="text-sm font-medium"
                                    style={{ color: '#f59e0b' }}
                                  >
                                    ⚠️ Falta presionar Start
                                  </span>
                                </>
                              )}
                              {status === 'error' && (
                                <>
                                  <XCircle size={16} style={{ color: '#ef4444' }} />
                                  <span 
                                    className="text-sm font-medium"
                                    style={{ color: '#ef4444' }}
                                  >
                                    ❌ Error de conexión
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <Link
                          to="/telegram"
                          className="py-2 px-4 rounded-lg font-medium border transition-all hover:opacity-80"
                          style={{
                            borderColor: 'var(--color-border)',
                            color: 'var(--color-text-primary)',
                          }}
                        >
                          Ver mensajes
                        </Link>
                      </div>

                      {/* Toggle Auto-send */}
                      <div 
                        className="flex items-center justify-between p-4 rounded-lg"
                        style={{ backgroundColor: 'var(--color-bg-primary)' }}
                      >
                        <div>
                          <h4 
                            className="font-medium mb-1"
                            style={{ color: 'var(--color-text-primary)' }}
                          >
                            Auto-send permitido
                          </h4>
                          <p 
                            className="text-sm"
                            style={{ color: 'var(--color-text-secondary)' }}
                          >
                            {bot.auto_send_enabled 
                              ? 'AL-E puede enviar mensajes automáticamente' 
                              : 'AL-E pedirá tu aprobación antes de enviar'}
                          </p>
                        </div>
                        
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={bot.auto_send_enabled || false}
                            onChange={() => {
                              const id = bot.id || bot.bot_id;
                              console.log('[TelegramSettings] Toggling auto-send for bot:', id);
                              handleToggleAutoSend(id, bot.auto_send_enabled);
                            }}
                          />
                          <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0078d4]"></div>
                        </label>
                      </div>

                      {/* Instrucciones si falta Start */}
                      {status === 'waiting' && (
                        <div 
                          className="mt-3 p-3 rounded-lg border-l-4"
                          style={{ 
                            backgroundColor: 'rgba(245, 158, 11, 0.1)',
                            borderLeftColor: '#f59e0b'
                          }}
                        >
                          <p 
                            className="text-sm font-medium mb-2"
                            style={{ color: 'var(--color-text-primary)' }}
                          >
                            📱 <strong>Último paso:</strong> Abre Telegram y presiona <strong>INICIAR</strong> en el bot
                          </p>
                          <a
                            href={`https://t.me/${bot.botUsername || bot.bot_username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all hover:opacity-80"
                            style={{
                              backgroundColor: '#0088cc',
                              color: '#ffffff'
                            }}
                          >
                            <Send size={16} />
                            Abrir @{bot.botUsername || bot.bot_username} en Telegram
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Connect form */}
            {showConnectForm ? (
              <div 
                className="p-6 rounded-xl border"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                }}
              >
                {!user || !user.id ? (
                  <div 
                    className="text-center py-8"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="font-medium mb-2">No se pudo obtener información del usuario</p>
                    <p className="text-sm">Por favor recarga la página o inicia sesión nuevamente</p>
                    <button
                      onClick={() => window.location.reload()}
                      className="mt-4 px-4 py-2 rounded-lg font-medium"
                      style={{
                        backgroundColor: 'var(--color-primary)',
                        color: 'white'
                      }}
                    >
                      Recargar página
                    </button>
                  </div>
                ) : user?.id ? (
                  <ConnectBotForm
                    userId={user.id}
                    onSuccess={handleBotConnected}
                    onCancel={() => setShowConnectForm(false)}
                  />
                ) : (
                  <div className="text-center py-12">
                    <AlertCircle size={48} className="mx-auto mb-4" style={{ color: 'var(--color-text-tertiary)' }} />
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                      Cargando información del usuario...
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <>
                {bots.length === 0 && !loadError && (
                  <div 
                    className="text-center py-12 rounded-xl border mb-6"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderColor: 'var(--color-border)',
                    }}
                  >
                    <Send size={64} className="mx-auto mb-4" style={{ color: 'var(--color-text-tertiary)' }} />
                    <h3 
                      className="text-xl font-semibold mb-2"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      No hay bots conectados
                    </h3>
                    <p 
                      className="mb-6"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      Conecta tu bot de Telegram para comenzar
                    </p>
                  </div>
                )}

                <button
                  onClick={() => setShowConnectForm(true)}
                  className="w-full py-4 px-6 rounded-xl border-2 border-dashed transition-all hover:border-solid"
                  style={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  <span className="font-medium">+ Conectar bot de Telegram</span>
                </button>
              </>
            )}

            {/* Instructions */}
            <div 
              className="mt-8 p-5 rounded-xl border"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div className="flex items-start gap-3">
                <AlertCircle size={20} style={{ color: 'var(--color-accent)', marginTop: '2px' }} />
                <div>
                  <h4 
                    className="font-semibold mb-2"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    Cómo obtener un bot de Telegram
                  </h4>
                  <ol 
                    className="list-decimal list-inside space-y-1 text-sm"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    <li>Abre Telegram y busca @BotFather</li>
                    <li>Envía el comando /newbot y sigue las instrucciones</li>
                    <li>Copia el token que te proporciona</li>
                    <li>Pega el token en el formulario de arriba</li>
                    <li>Una vez conectado, abre tu bot en Telegram y presiona INICIAR</li>
                  </ol>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
