/**
 * FIX TELEGRAM: Manejo de errores visible
 * 
 * PROBLEMAS QUE RESUELVE:
 * 1. Loading infinito cuando backend no responde
 * 2. Errores silenciosos que dejan UI en estado inconsistente
 * 3. No se distingue entre "sin datos" y "error cargando"
 * 
 * CAMBIOS:
 * - Agregar timeout a loadBots() y loadChats()
 * - Mostrar UI de error clara (no solo "No hay bots")
 * - Agregar botón "Reintentar"
 * - Loggear errores detallados para debugging
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getUserBots, getChats } from '@/services/telegramService';
import TelegramInbox from '@/features/telegram/components/TelegramInbox';
import { useToast } from '@/ui/use-toast';
import { Link } from 'react-router-dom';
import { Send, ArrowLeft, AlertCircle, RefreshCw, Settings } from 'lucide-react';

// 🔥 TIMEOUT HELPER
function withTimeout(promise, ms = 10000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), ms)
    )
  ]);
}

export default function TelegramPageFixed() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [bots, setBots] = useState([]);
  const [chats, setChats] = useState([]);
  const [selectedBot, setSelectedBot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingChats, setLoadingChats] = useState(false);
  
  // 🔥 NUEVO: Estados de error
  const [botsError, setBotsError] = useState(null);
  const [chatsError, setChatsError] = useState(null);

  useEffect(() => {
    loadBots();
  }, [user]);

  useEffect(() => {
    if (selectedBot) {
      loadChats();
    }
  }, [selectedBot]);

  async function loadBots() {
    if (!user) {
      console.warn('[Telegram] No hay usuario - abortando carga');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setBotsError(null); // 🔥 Reset error
      
      console.log('[Telegram] 🔍 Cargando bots para usuario:', user.id);
      
      // 🔥 CON TIMEOUT: 10 segundos máximo
      const data = await withTimeout(
        getUserBots(user.id),
        10000
      );

      console.log('[Telegram] ✅ Bots cargados:', data?.length || 0);
      
      setBots(data || []);
      
      // Auto-seleccionar primer bot si existe
      if (data && data.length > 0) {
        setSelectedBot(data[0]);
      }
      
    } catch (error) {
      console.error('[Telegram] ❌ Error cargando bots:', error);
      
      // 🔥 DISTINGUIR TIPO DE ERROR
      let userMessage = 'No se pudieron cargar los bots de Telegram.';
      
      if (error.message === 'TIMEOUT') {
        userMessage = 'La carga de bots tardó demasiado. Verifica tu conexión.';
      } else if (error.message?.includes('404')) {
        userMessage = 'No se encontró el endpoint de Telegram. Contacta a soporte.';
      } else if (error.message?.includes('401') || error.message?.includes('403')) {
        userMessage = 'No tienes permiso para acceder a los bots. Inicia sesión nuevamente.';
      } else if (error.message?.includes('500') || error.message?.includes('502')) {
        userMessage = 'El servidor de Telegram está teniendo problemas. Intenta más tarde.';
      }
      
      setBotsError({ message: userMessage, originalError: error.message });
      
      toast({
        variant: 'destructive',
        title: 'Error cargando bots',
        description: userMessage,
      });
      
    } finally {
      setLoading(false); // 🔥 GARANTIZADO
    }
  }

  async function loadChats() {
    if (!user || !selectedBot) {
      console.warn('[Telegram] No hay usuario o bot seleccionado');
      return;
    }

    try {
      setLoadingChats(true);
      setChatsError(null); // 🔥 Reset error
      
      console.log('[Telegram] 🔍 Cargando chats para bot:', selectedBot.id);
      
      // 🔥 CON TIMEOUT: 10 segundos máximo
      const data = await withTimeout(
        getChats(user.id, selectedBot.id),
        10000
      );

      console.log('[Telegram] ✅ Chats cargados:', data?.length || 0);
      
      setChats(data || []);
      
    } catch (error) {
      console.error('[Telegram] ❌ Error cargando chats:', error);
      
      // 🔥 DISTINGUIR TIPO DE ERROR
      let userMessage = 'No se pudieron cargar las conversaciones.';
      
      if (error.message === 'TIMEOUT') {
        userMessage = 'La carga de chats tardó demasiado. Verifica tu conexión.';
      } else if (error.message?.includes('404')) {
        userMessage = 'No se encontraron conversaciones para este bot.';
      }
      
      setChatsError({ message: userMessage, originalError: error.message });
      
      toast({
        variant: 'destructive',
        title: 'Error cargando chats',
        description: userMessage,
      });
      
    } finally {
      setLoadingChats(false); // 🔥 GARANTIZADO
    }
  }

  // 🔥 LOADING: Con timeout visual (máximo 15s antes de mostrar error)
  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"
            style={{ color: 'var(--color-primary)' }}
          />
          <p className="mt-4" style={{ color: 'var(--color-text-secondary)' }}>
            Cargando bots de Telegram...
          </p>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
            Si esto tarda más de 10 segundos, puede haber un problema
          </p>
        </div>
      </div>
    );
  }

  // 🔥 ERROR: Pantalla de error con botón "Reintentar"
  if (botsError) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-6"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        <div 
          className="max-w-md text-center p-8 rounded-xl border"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            borderColor: 'var(--color-error, #ef4444)',
          }}
        >
          <AlertCircle size={64} className="mx-auto mb-4" style={{ color: 'var(--color-error, #ef4444)' }} />
          <h2 
            className="text-2xl font-bold mb-3"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Error cargando Telegram
          </h2>
          <p 
            className="mb-6"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {botsError.message}
          </p>

          {/* Detalles técnicos (desarrollo) */}
          {process.env.NODE_ENV === 'development' && botsError.originalError && (
            <details className="mb-6 text-left">
              <summary className="text-sm cursor-pointer" style={{ color: 'var(--color-text-tertiary)' }}>
                Detalles técnicos
              </summary>
              <pre className="text-xs mt-2 p-3 rounded overflow-auto" style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-tertiary)'
              }}>
                {botsError.originalError}
              </pre>
            </details>
          )}

          <div className="flex gap-3">
            <button
              onClick={loadBots}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: '#FFFFFF'
              }}
            >
              <RefreshCw size={18} />
              Reintentar
            </button>
            <Link
              to="/settings/integrations/telegram"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)'
              }}
            >
              <Settings size={18} />
              Configurar
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 🔥 SIN BOTS: UI clara de "no hay datos"
  if (!Array.isArray(bots) || bots.length === 0 || !bots.some(b => b.isConnected)) {
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
            Conecta un bot de Telegram para recibir mensajes de tus usuarios
          </p>
          <Link
            to="/settings/integrations/telegram"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: '#FFFFFF'
            }}
          >
            <Settings size={18} />
            Conectar bot
          </Link>
        </div>
      </div>
    );
  }

  // 🔥 BOTS DISPONIBLES: Mostrar inbox
  return (
    <div 
      className="h-screen flex flex-col"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      {/* Header */}
      <div 
        className="border-b flex items-center gap-4 px-6 py-4"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <button
          onClick={() => navigate('/chat')}
          className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:bg-[var(--color-bg-hover)]"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <ArrowLeft size={18} />
          <span className="font-medium">Volver</span>
        </button>

        {/* Selector de bot (si hay múltiples) */}
        {bots.length > 1 && (
          <select
            value={selectedBot?.id}
            onChange={(e) => {
              const bot = bots.find(b => b.id === e.target.value);
              setSelectedBot(bot);
            }}
            className="px-3 py-2 rounded-lg"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)'
            }}
          >
            {bots.map(bot => (
              <option key={bot.id} value={bot.id}>
                @{bot.bot_username}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {loadingChats ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"
                style={{ color: 'var(--color-primary)' }}
              />
              <p className="mt-4" style={{ color: 'var(--color-text-secondary)' }}>
                Cargando conversaciones...
              </p>
            </div>
          </div>
        ) : chatsError ? (
          <div className="h-full flex items-center justify-center p-6">
            <div className="max-w-md text-center">
              <AlertCircle size={48} className="mx-auto mb-4" style={{ color: 'var(--color-error, #ef4444)' }} />
              <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                Error cargando conversaciones
              </h3>
              <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                {chatsError.message}
              </p>
              <button
                onClick={loadChats}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: '#FFFFFF'
                }}
              >
                <RefreshCw size={16} />
                Reintentar
              </button>
            </div>
          </div>
        ) : selectedBot ? (
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
  );
}
