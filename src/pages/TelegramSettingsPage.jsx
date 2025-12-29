import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getUserBots } from '@/services/telegramService';
import ConnectBotForm from '@/features/telegram/components/ConnectBotForm';
import { useToast } from '@/ui/use-toast';
import { Link } from 'react-router-dom';
import { Send, CheckCircle2, XCircle, AlertCircle, ArrowLeft } from 'lucide-react';

export default function TelegramSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConnectForm, setShowConnectForm] = useState(false);

  useEffect(() => {
    loadBots();
  }, [user]);

  async function loadBots() {
    if (!user) return;

    try {
      setLoading(true);
      const data = await getUserBots(user.id);
      setBots(data || []);
    } catch (error) {
      console.error('Error cargando bots:', error);
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

  return (
    <div 
      className="h-screen overflow-y-auto"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      <div className="max-w-4xl mx-auto p-6 pb-32">
        {/* Botón Volver */}
        <button
          onClick={() => navigate('/integrations')}
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
            {/* Connected bots */}
            {bots.length > 0 && (
              <div className="space-y-4 mb-6">
                {bots.map(bot => (
                  <div
                    key={bot.id}
                    className="p-5 rounded-xl border flex items-center justify-between"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderColor: 'var(--color-border)',
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <Send size={24} style={{ color: 'var(--color-accent)' }} />
                      <div>
                        <h3 
                          className="font-semibold text-lg"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          @{bot.botUsername}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          {bot.isConnected ? (
                            <>
                              <CheckCircle2 size={16} style={{ color: '#10b981' }} />
                              <span 
                                className="text-sm"
                                style={{ color: '#10b981' }}
                              >
                                Conectado
                              </span>
                            </>
                          ) : (
                            <>
                              <XCircle size={16} style={{ color: '#ef4444' }} />
                              <span 
                                className="text-sm"
                                style={{ color: '#ef4444' }}
                              >
                                Desconectado
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
                ))}
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
                <ConnectBotForm
                  userId={user?.id}
                  onSuccess={handleBotConnected}
                  onCancel={() => setShowConnectForm(false)}
                />
              </div>
            ) : (
              <>
                {bots.length === 0 && (
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
