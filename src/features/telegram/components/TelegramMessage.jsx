import React from 'react';

export default function TelegramMessage({ message }) {
  // 🔥 MOSTRAR INCOMING = FALSE COMO MENSAJES DEL USUARIO (izquierda)
  // 🔥 MOSTRAR INCOMING = TRUE COMO MENSAJES DEL BOT (derecha)
  const isFromBot = message.incoming === true;
  const isOutgoing = isFromBot;

  function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
      <div 
        className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${
          isOutgoing ? 'rounded-br-sm' : 'rounded-bl-sm'
        }`}
        style={{
          backgroundColor: isOutgoing 
            ? 'var(--color-accent)' 
            : 'var(--color-bg-secondary)',
        }}
      >
        {!isOutgoing && message.from?.name && (
          <p 
            className="text-xs font-medium mb-1"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {message.from.name}
          </p>
        )}
        
        <p 
          className="text-sm whitespace-pre-wrap break-words"
          style={{ 
            color: isOutgoing ? '#FFFFFF' : 'var(--color-text-primary)' 
          }}
        >
          {message.text}
        </p>

        <div 
          className="text-xs mt-1 text-right"
          style={{ 
            color: isOutgoing 
              ? 'rgba(255, 255, 255, 0.7)' 
              : 'var(--color-text-tertiary)' 
          }}
        >
          {formatTime(message.date)}
        </div>
      </div>
    </div>
  );
}
