import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getChats, getUserBots } from '@/services/telegramService';
import TelegramInbox from '@/features/telegram/components/TelegramInbox';
import { useToast } from '@/ui/use-toast';
import { Link } from 'react-router-dom';
import { Send, ArrowLeft } from 'lucide-react';

export default function TelegramPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [bots, setBots] = useState([]);
  const [chats, setChats] = useState([]);
  const [selectedBot, setSelectedBot] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBots();
  }, [user]);

  useEffect(() => {
    if (selectedBot) {
      loadChats();
    }
  }, [selectedBot]);

  async function loadBots() {
    if (!user) return;

    try {
      setLoading(true);
      const data = await getUserBots(user.id);
      setBots(data || []);
      
      // Seleccionar primer bot conectado
      const connectedBot = data?.find(b => b.isConnected);
      if (connectedBot) {
        setSelectedBot(connectedBot);
      }
    } catch (error) {
      console.error('Error cargando bots:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudieron cargar los bots',
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadChats() {
    if (!user || !selectedBot) return;

    try {
      const data = await getChats(user.id, selectedBot.id);
      setChats(data || []);
    } catch (error) {
      console.error('Error cargando chats:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudieron cargar los chats',
      });
    }
  }

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        <div style={{ color: 'var(--color-text-secondary)' }}>
          Cargando...
        </div>
      </div>
    );
  }

  if (bots.length === 0 || !bots.some(b => b.isConnected)) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-6"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        <div 
          className="max-w-md text-center p-8 rounded-xl border"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            borderColor: 'var(--color-border)',
          }}
        >
          <Send size={64} className="mx-auto mb-4" style={{ color: 'var(--color-text-tertiary)' }} />
          <h2 
            className="text-2xl font-bold mb-3"
            style={{ color: 'var(--color-text-primary)' }}
          >
            No hay bots conectados
          </h2>
          <p 
            className="mb-6"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Conecta un bot de Telegram para comenzar a recibir y enviar mensajes
          </p>
          <Link
            to="/settings/telegram"
            className="inline-block py-3 px-6 rounded-xl font-medium transition-all hover:opacity-90"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: '#FFFFFF',
            }}
          >
            Configurar Telegram
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="h-screen flex"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      {/* Sidebar con lista de bots (si hay múltiples) */}
      {bots.length > 1 && (
        <div 
          className="w-64 border-r flex flex-col"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {/* Botón Volver */}
          <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <button
              onClick={() => navigate('/')}
              className="w-full px-4 py-2 rounded-lg transition-all hover:opacity-80 flex items-center gap-2"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)'
              }}
            >
              <ArrowLeft size={18} />
              <span className="font-medium">Volver</span>
            </button>
          </div>

          <div className="p-4 flex-1">
            <h3 
              className="font-semibold mb-3"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Bots conectados
            </h3>
            <div className="space-y-2">
              {bots.filter(b => b.isConnected).map(bot => (
                <button
                  key={bot.id}
                  onClick={() => setSelectedBot(bot)}
                  className={`w-full px-4 py-3 rounded-lg text-left transition-all ${
                    selectedBot?.id === bot.id ? 'font-medium' : ''
                  }`}
                  style={{
                    backgroundColor: selectedBot?.id === bot.id 
                      ? 'var(--color-bg-secondary)' 
                      : 'transparent',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  @{bot.botUsername}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Botón Volver para cuando no hay sidebar (1 solo bot) */}
        {bots.length === 1 && (
          <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 rounded-lg transition-all hover:opacity-80 flex items-center gap-2"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)'
              }}
            >
              <ArrowLeft size={18} />
              <span className="font-medium">Volver</span>
            </button>
          </div>
        )}

        <div className="flex-1">
          {selectedBot ? (
            <TelegramInbox
              botId={selectedBot.id}
              chats={chats}
              onChatsUpdated={loadChats}
            />
          ) : (
            <div 
              className="h-full flex items-center justify-center"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Selecciona un bot
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
