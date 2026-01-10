import React, { useState } from 'react';
import TelegramChat from './TelegramChat';
import { MessageSquare } from 'lucide-react';

export default function TelegramInbox({ botId, chats, onChatsUpdated }) {
  const [selectedChat, setSelectedChat] = useState(null);

  function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    } else {
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    }
  }

  return (
    <div className="h-full flex">
      {/* Chats list */}
      <div 
        className="w-80 border-r flex flex-col"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div 
          className="px-4 py-3 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h3 
            className="font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Conversaciones
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto">
          {chats.length > 0 ? (
            chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className={`w-full px-4 py-3 border-b text-left transition-all hover:opacity-80 ${
                  selectedChat?.id === chat.id ? 'font-medium' : ''
                }`}
                style={{
                  backgroundColor: selectedChat?.id === chat.id 
                    ? 'var(--color-bg-secondary)' 
                    : 'transparent',
                  borderColor: 'var(--color-border)',
                }}
              >
                <div className="flex items-start gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-medium text-sm"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {chat.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span 
                        className="font-medium truncate"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {chat.name || chat.username || 'Usuario'}
                      </span>
                      {chat.lastMessageDate && (
                        <span 
                          className="text-xs ml-2 flex-shrink-0"
                          style={{ color: 'var(--color-text-tertiary)' }}
                        >
                          {formatDate(chat.lastMessageDate)}
                        </span>
                      )}
                    </div>
                    {chat.lastMessage && (
                      <p 
                        className="text-sm truncate"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {chat.lastMessage}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div 
              className="p-6 text-center"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              <MessageSquare size={48} className="mx-auto mb-3" />
              <p 
                className="text-sm font-medium mb-2"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                No hay conversaciones aún
              </p>
              <p className="text-xs max-w-xs mx-auto">
                Abre Telegram en tu teléfono y envía un mensaje a tu bot para iniciar una conversación
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Chat view */}
      <div className="flex-1">
        {selectedChat ? (
          <TelegramChat
            chatId={selectedChat.chatId}  // ✅ Telegram chat ID numérico
            chatName={selectedChat.name || selectedChat.username}
            botId={botId}
            onMessageSent={onChatsUpdated}
          />
        ) : (
          <div 
            className="h-full flex items-center justify-center"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Selecciona una conversación
          </div>
        )}
      </div>
    </div>
  );
}
