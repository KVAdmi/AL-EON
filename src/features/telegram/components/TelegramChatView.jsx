/**
 * TelegramChatView.jsx
 * Vista completa de chat de Telegram
 * Muestra lista de conversaciones y mensajes con el bot
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MessageSquare, RefreshCw, Send, Loader2, Bot, User } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_CORE_BASE_URL || 'https://api.al-eon.com';

export default function TelegramChatView() {
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingChats, setLoadingChats] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  
  const { accessToken, user } = useAuth();
  const messagesEndRef = useRef(null);

  // Cargar lista de chats al montar
  useEffect(() => {
    loadChats();
  }, []);

  // Cargar mensajes cuando se selecciona un chat
  useEffect(() => {
    if (selectedChatId) {
      loadMessages(selectedChatId);
      
      // Polling cada 5s para nuevos mensajes
      const interval = setInterval(() => {
        loadMessages(selectedChatId);
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [selectedChatId]);

  // Auto-scroll al último mensaje
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChats = async () => {
    try {
      setLoadingChats(true);
      console.log('[TELEGRAM] 🔍 Cargando chats...');

      const response = await fetch(`${BACKEND_URL}/api/telegram/chats`, {
        headers: { 
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }

      const data = await response.json();
      
      if (data.ok && Array.isArray(data.chats)) {
        setChats(data.chats);
        console.log('[TELEGRAM] ✅ Chats cargados:', data.chats.length);
      } else {
        setChats([]);
        console.warn('[TELEGRAM] ⚠️ No se encontraron chats');
      }
    } catch (error) {
      console.error('[TELEGRAM] ❌ Error loading chats:', error);
      setChats([]);
    } finally {
      setLoadingChats(false);
    }
  };

  const loadMessages = async (chatId) => {
    try {
      setLoading(true);
      console.log('[TELEGRAM] 📬 Cargando mensajes para chat:', chatId);

      const response = await fetch(`${BACKEND_URL}/api/telegram/messages?chatId=${chatId}`, {
        headers: { 
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }

      const data = await response.json();
      
      if (data.ok && Array.isArray(data.messages)) {
        setMessages(data.messages);
        console.log('[TELEGRAM] ✅ Mensajes cargados:', data.messages.length);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('[TELEGRAM] ❌ Error loading messages:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedChatId || sending) return;

    try {
      setSending(true);
      console.log('[TELEGRAM] 📤 Enviando mensaje:', newMessage);

      const response = await fetch(`${BACKEND_URL}/api/telegram/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId: selectedChatId,
          text: newMessage,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }

      console.log('[TELEGRAM] ✅ Mensaje enviado');
      
      setNewMessage('');
      
      // Recargar mensajes
      await loadMessages(selectedChatId);
      
    } catch (error) {
      console.error('[TELEGRAM] ❌ Error sending message:', error);
      alert(`Error al enviar mensaje: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  const selectedChat = chats.find(c => c.id === selectedChatId);

  return (
    <div className="h-full flex" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Sidebar - Lista de chats */}
      <div 
        className="w-80 border-r flex flex-col"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {/* Header del sidebar */}
        <div 
          className="p-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h2 
            className="text-lg font-semibold flex items-center gap-2"
            style={{ color: 'var(--color-text-primary)' }}
          >
            <MessageSquare size={20} />
            Telegram
          </h2>
          <button
            onClick={loadChats}
            disabled={loadingChats}
            className="p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
            title="Recargar chats"
          >
            <RefreshCw 
              size={16} 
              className={loadingChats ? 'animate-spin' : ''}
              style={{ color: 'var(--color-text-secondary)' }}
            />
          </button>
        </div>

        {/* Lista de chats */}
        <div className="flex-1 overflow-y-auto">
          {loadingChats ? (
            <div 
              className="p-6 text-center"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Cargando chats...
            </div>
          ) : chats.length === 0 ? (
            <div 
              className="p-6 text-center"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              <MessageSquare size={40} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No hay conversaciones</p>
            </div>
          ) : (
            chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => setSelectedChatId(chat.id)}
                className={`p-4 border-b cursor-pointer transition-colors ${
                  selectedChatId === chat.id ? 'bg-[var(--color-bg-tertiary)]' : 'hover:bg-[var(--color-bg-secondary)]'
                }`}
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div 
                  className="font-medium mb-1"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {chat.chat_name || 'Sin nombre'}
                </div>
                <div 
                  className="text-sm truncate"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  {chat.last_message_text || 'No hay mensajes'}
                </div>
                <div 
                  className="text-xs mt-1"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  {chat.last_message_at 
                    ? new Date(chat.last_message_at).toLocaleString('es-MX')
                    : ''}
                </div>
                {chat.unread_count > 0 && (
                  <div 
                    className="inline-block px-2 py-1 rounded-full text-xs font-medium mt-1"
                    style={{ 
                      backgroundColor: 'var(--color-accent)', 
                      color: '#FFFFFF' 
                    }}
                  >
                    {chat.unread_count}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Panel de mensajes */}
      <div className="flex-1 flex flex-col">
        {selectedChatId ? (
          <>
            {/* Header del chat */}
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
                  {selectedChat?.chat_name?.charAt(0).toUpperCase() || 'T'}
                </div>
                <div>
                  <h3 
                    className="font-semibold"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {selectedChat?.chat_name || 'Chat de Telegram'}
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
                onClick={() => loadMessages(selectedChatId)}
                disabled={loading}
                className="p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
              >
                <RefreshCw 
                  size={16} 
                  className={loading ? 'animate-spin' : ''}
                  style={{ color: 'var(--color-text-secondary)' }}
                />
              </button>
            </div>

            {/* Lista de mensajes */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {loading && messages.length === 0 ? (
                <div 
                  className="h-full flex items-center justify-center"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  Cargando mensajes...
                </div>
              ) : messages.length === 0 ? (
                <div 
                  className="h-full flex items-center justify-center"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  No hay mensajes en esta conversación
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <div 
                      key={message.id}
                      className={`flex gap-3 ${
                        message.sender_type === 'user' ? 'flex-row-reverse' : ''
                      }`}
                    >
                      {/* Avatar */}
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: message.sender_type === 'user' 
                            ? 'var(--color-accent)' 
                            : 'var(--color-bg-tertiary)',
                        }}
                      >
                        {message.sender_type === 'user' ? (
                          <User size={16} style={{ color: '#FFFFFF' }} />
                        ) : (
                          <Bot size={16} style={{ color: 'var(--color-text-primary)' }} />
                        )}
                      </div>

                      {/* Mensaje */}
                      <div 
                        className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                          message.sender_type === 'user' 
                            ? 'rounded-tr-none' 
                            : 'rounded-tl-none'
                        }`}
                        style={{
                          backgroundColor: message.sender_type === 'user'
                            ? 'var(--color-accent)'
                            : 'var(--color-bg-secondary)',
                          color: message.sender_type === 'user'
                            ? '#FFFFFF'
                            : 'var(--color-text-primary)',
                        }}
                      >
                        <div className="whitespace-pre-wrap break-words">
                          {message.text}
                        </div>
                        <div 
                          className="text-xs mt-1 flex items-center gap-1"
                          style={{ 
                            opacity: 0.7,
                            color: message.sender_type === 'user' 
                              ? '#FFFFFF' 
                              : 'var(--color-text-tertiary)'
                          }}
                        >
                          {new Date(message.sent_at).toLocaleTimeString('es-MX', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {message.sender_type === 'bot' && message.status && (
                            <span> • {message.status}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input de mensaje */}
            <form 
              onSubmit={handleSendMessage}
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
                  className="flex-1 px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2"
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
          </>
        ) : (
          <div 
            className="h-full flex items-center justify-center"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            <div className="text-center">
              <MessageSquare size={60} className="mx-auto mb-4 opacity-40" />
              <p className="text-lg">Selecciona una conversación</p>
              <p className="text-sm mt-2">Elige un chat para ver los mensajes</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
