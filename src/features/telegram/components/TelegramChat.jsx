import React, { useState, useEffect, useRef } from 'react';
import { getMessages, sendMessage } from '@/services/telegramService';
import { useToast } from '@/ui/use-toast';
import { Send, Loader2, RefreshCw } from 'lucide-react';
import TelegramMessage from './TelegramMessage';

export default function TelegramChat({ chatId, chatName, botId, onMessageSent }) {
  const { toast } = useToast();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadMessages();
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function loadMessages() {
    if (!chatId) {
      console.warn('[TelegramChat] No chatId provided');
      toast({
        variant: 'destructive',
        title: '⚠️ Error',
        description: 'No hay chatId - no se pueden cargar mensajes',
      });
      return;
    }

    try {
      setLoading(true);
      console.log('[TelegramChat] ========================================');
      console.log('[TelegramChat] 🔍 Cargando mensajes para chatId:', chatId);
      console.log('[TelegramChat] 🔍 Bot ID:', botId);
      
      const data = await getMessages(chatId);
      
      // 🔥 LOGGING COMPLETO DEL PAYLOAD
      console.log('[TelegramChat] 📦 PAYLOAD COMPLETO:', JSON.stringify(data, null, 2));
      console.log('[TelegramChat] 📊 Tipo de dato:', typeof data, Array.isArray(data) ? 'ES ARRAY' : 'NO ES ARRAY');
      console.log('[TelegramChat] 📊 Cantidad de mensajes:', data?.length || 0);
      
      if (Array.isArray(data) && data.length > 0) {
        console.log('[TelegramChat] 📥 Mensajes incoming:', data.filter(m => m.incoming === true).length);
        console.log('[TelegramChat] 📤 Mensajes outgoing:', data.filter(m => m.incoming === false).length);
        console.log('[TelegramChat] 📝 Primer mensaje:', data[0]);
      } else {
        console.warn('[TelegramChat] ⚠️ Backend devolvió array vacío o formato inválido');
      }
      
      console.log('[TelegramChat] ========================================');
      
      // ✅ NO FILTRAR — MOSTRAR TODOS (incoming true y false)
      setMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('[TelegramChat] ❌ Error cargando mensajes:', error);
      toast({
        variant: 'destructive',
        title: 'Error cargando mensajes',
        description: error.message || 'No se pudieron cargar los mensajes de Telegram',
      });
      setMessages([]); // 🔥 Limpiar mensajes en caso de error
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(e) {
    e.preventDefault();

    if (!newMessage.trim() || !chatId) return;

    try {
      setSending(true);

      await sendMessage({
        chatId,
        text: newMessage,
      });

      setNewMessage('');
      await loadMessages();
      onMessageSent();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo enviar el mensaje',
      });
    } finally {
      setSending(false);
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div 
        className="px-6 py-4 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center font-medium"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-primary)',
            }}
          >
            {chatName?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 
              className="font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {chatName}
            </h3>
            <p 
              className="text-xs"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              {messages.length} mensaje(s)
            </p>
          </div>
        </div>

        <button
          onClick={loadMessages}
          disabled={loading}
          className="p-2 rounded-lg transition-all hover:opacity-80"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {loading ? (
          <div 
            className="h-full flex items-center justify-center"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Cargando mensajes...
          </div>
        ) : messages.length > 0 ? (
          <>
            {messages.map((message) => (
              <TelegramMessage key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div 
            className="h-full flex items-center justify-center"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            No hay mensajes
          </div>
        )}
      </div>

      {/* Input */}
      <form 
        onSubmit={handleSend}
        className="px-6 py-4 border-t"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Escribe un mensaje..."
            disabled={sending}
            className="flex-1 px-4 py-2.5 rounded-lg border"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="px-6 py-2.5 rounded-lg font-medium transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: '#FFFFFF',
            }}
          >
            {sending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
