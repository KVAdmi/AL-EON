import React, { useState, useEffect } from 'react';
import { getMessage } from '@/services/emailService';
import { useToast } from '@/ui/use-toast';
import { Mail, Calendar, Paperclip, Reply, Forward, Archive, Trash2 } from 'lucide-react';

export default function EmailMessage({ message, accountId }) {
  const { toast } = useToast();
  const [fullMessage, setFullMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (message?.id) {
      loadFullMessage();
    }
  }, [message?.id]);

  async function loadFullMessage() {
    if (!accountId || !message?.id) return;

    try {
      setLoading(true);
      const data = await getMessage(accountId, message.id);
      setFullMessage(data);
    } catch (error) {
      console.error('Error cargando mensaje completo:', error);
      // Si no se puede cargar, usar el mensaje preview
      setFullMessage(message);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const displayMessage = fullMessage || message;

  if (loading) {
    return (
      <div 
        className="h-full flex items-center justify-center"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Cargando mensaje...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div 
        className="px-6 py-4 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <h2 
          className="text-xl font-bold mb-3"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {displayMessage.subject || '(Sin asunto)'}
        </h2>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center font-medium"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-primary)',
              }}
            >
              {displayMessage.from?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p 
                className="font-medium"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {displayMessage.from}
              </p>
              <p 
                className="text-sm flex items-center gap-1"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <Calendar size={12} />
                {formatDate(displayMessage.date)}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              className="p-2 rounded-lg transition-all hover:opacity-80"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-secondary)',
              }}
              title="Responder"
            >
              <Reply size={16} />
            </button>
            <button
              className="p-2 rounded-lg transition-all hover:opacity-80"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-secondary)',
              }}
              title="Reenviar"
            >
              <Forward size={16} />
            </button>
            <button
              className="p-2 rounded-lg transition-all hover:opacity-80"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-secondary)',
              }}
              title="Archivar"
            >
              <Archive size={16} />
            </button>
            <button
              className="p-2 rounded-lg transition-all hover:opacity-80"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                color: '#ef4444',
              }}
              title="Eliminar"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">
        {displayMessage.attachments && displayMessage.attachments.length > 0 && (
          <div 
            className="mb-6 p-4 rounded-lg border"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div 
              className="flex items-center gap-2 mb-3"
              style={{ color: 'var(--color-text-primary)' }}
            >
              <Paperclip size={16} />
              <span className="font-medium text-sm">
                {displayMessage.attachments.length} adjunto(s)
              </span>
            </div>
            <div className="space-y-2">
              {displayMessage.attachments.map((attachment, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded border"
                  style={{
                    backgroundColor: 'var(--color-bg-primary)',
                    borderColor: 'var(--color-border)',
                  }}
                >
                  <span 
                    className="text-sm"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {attachment.filename}
                  </span>
                  <span 
                    className="text-xs"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    {attachment.size}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div 
          className="prose max-w-none"
          style={{ color: 'var(--color-text-primary)' }}
          dangerouslySetInnerHTML={{ 
            __html: displayMessage.bodyHtml || displayMessage.body?.replace(/\n/g, '<br>') || displayMessage.preview 
          }}
        />
      </div>
    </div>
  );
}
