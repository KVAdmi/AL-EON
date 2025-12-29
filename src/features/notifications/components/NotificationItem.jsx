import React from 'react';
import { Mail, Calendar, MessageCircle, Bell, CheckCircle, Trash2, Circle } from 'lucide-react';

export default function NotificationItem({ notification, onClick, onMarkAsRead, onDelete }) {
  const { id, title, message, channel, read, created_at, metadata } = notification;

  // Ícono según canal
  const getIcon = () => {
    switch (channel) {
      case 'email':
        return <Mail size={20} style={{ color: 'var(--color-accent)' }} />;
      case 'telegram':
        return <MessageCircle size={20} style={{ color: 'var(--color-accent)' }} />;
      case 'in_app':
        return <Bell size={20} style={{ color: 'var(--color-accent)' }} />;
      default:
        return <Bell size={20} style={{ color: 'var(--color-accent)' }} />;
    }
  };

  // Badge de tipo
  const getTypeBadge = () => {
    if (metadata?.type === 'event_reminder') {
      return (
        <span
          className="px-2 py-0.5 rounded text-xs font-medium"
          style={{
            backgroundColor: 'var(--color-accent)',
            color: 'var(--color-text-primary)',
            opacity: 0.8
          }}
        >
          Recordatorio
        </span>
      );
    }
    if (metadata?.type === 'message') {
      return (
        <span
          className="px-2 py-0.5 rounded text-xs font-medium"
          style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            color: 'var(--color-text-secondary)'
          }}
        >
          Mensaje
        </span>
      );
    }
    return null;
  };

  // Formatear fecha
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  };

  return (
    <div
      className={`p-4 hover:bg-opacity-50 transition-all cursor-pointer relative ${
        !read ? 'bg-opacity-30' : ''
      }`}
      style={{
        backgroundColor: !read ? 'var(--color-accent)' : 'transparent'
      }}
      onClick={onClick}
    >
      {/* Indicador sin leer */}
      {!read && (
        <div
          className="absolute top-4 left-2 w-2 h-2 rounded-full"
          style={{ backgroundColor: 'var(--color-accent)' }}
        />
      )}

      <div className="flex gap-3 items-start pl-2">
        {/* Ícono */}
        <div
          className="p-2 rounded-lg flex-shrink-0"
          style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
        >
          {getIcon()}
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4
              className={`text-sm font-medium truncate ${!read ? 'font-semibold' : ''}`}
              style={{ color: 'var(--color-text-primary)' }}
            >
              {title}
            </h4>
            <span
              className="text-xs whitespace-nowrap"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              {formatDate(created_at)}
            </span>
          </div>

          {message && (
            <p
              className="text-sm line-clamp-2 mb-2"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {message}
            </p>
          )}

          {/* Badge y metadatos */}
          <div className="flex items-center gap-2">
            {getTypeBadge()}
            
            {metadata?.eventTitle && (
              <span
                className="text-xs truncate"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                {metadata.eventTitle}
              </span>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {!read && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead(id);
              }}
              className="p-1.5 rounded hover:bg-opacity-80 transition-all"
              style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
              title="Marcar como leída"
            >
              <CheckCircle size={16} style={{ color: 'var(--color-text-secondary)' }} />
            </button>
          )}
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(id);
            }}
            className="p-1.5 rounded hover:bg-opacity-80 transition-all"
            style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
            title="Eliminar"
          >
            <Trash2 size={16} style={{ color: 'var(--color-text-secondary)' }} />
          </button>
        </div>
      </div>
    </div>
  );
}
