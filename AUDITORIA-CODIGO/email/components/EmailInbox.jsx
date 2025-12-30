import React, { useState, useEffect } from 'react';
import { getInbox } from '@/services/emailService';
import { useToast } from '@/ui/use-toast';
import { RefreshCw, Mail, MailOpen } from 'lucide-react';
import EmailMessage from './EmailMessage';

export default function EmailInbox({ accountId }) {
  const { toast } = useToast();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMessages();
  }, [accountId]);

  async function loadMessages() {
    if (!accountId) return;

    try {
      setLoading(true);
      const data = await getInbox(accountId);
      setMessages(data?.messages || []);
    } catch (error) {
      console.error('Error cargando mensajes:', error);
      
      // Si el backend no está listo, mostrar mensaje amigable
      if (error.message.includes('Backend no disponible') || error.message.includes('404')) {
        // No mostrar error, solo mantener empty state
        setMessages([]);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message || 'No se pudieron cargar los mensajes',
        });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadMessages();
    setRefreshing(false);
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    } else if (date.getFullYear() === today.getFullYear()) {
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    } else {
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  }

  if (loading) {
    return (
      <div 
        className="flex-1 flex items-center justify-center"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Cargando mensajes...
      </div>
    );
  }

  // Empty state cuando IMAP no está configurado o backend no disponible
  if (messages.length === 0) {
    return (
      <div 
        className="flex-1 flex items-center justify-center p-6"
      >
        <div className="text-center max-w-md">
          <Mail size={64} className="mx-auto mb-4" style={{ color: 'var(--color-text-tertiary)' }} />
          <h3 
            className="text-lg font-semibold mb-2"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Inbox en preparación
          </h3>
          <p 
            className="text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            La recepción de emails (IMAP) estará disponible próximamente. Por ahora puedes enviar emails desde Redactar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex">
      {/* Lista de mensajes */}
      <div 
        className="w-96 border-r flex flex-col"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {/* Header */}
        <div 
          className="px-4 py-3 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h3 
            className="font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Bandeja de entrada
          </h3>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg transition-all hover:opacity-80"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Message list */}
        <div className="flex-1 overflow-y-auto">
          {messages.map((message) => (
            <button
              key={message.id}
              onClick={() => setSelectedMessage(message)}
              className={`w-full px-4 py-3 border-b text-left transition-all hover:opacity-80 ${
                selectedMessage?.id === message.id ? 'font-medium' : ''
              }`}
              style={{
                backgroundColor: selectedMessage?.id === message.id 
                  ? 'var(--color-bg-secondary)' 
                  : 'transparent',
                borderColor: 'var(--color-border)',
              }}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  {message.read ? (
                    <MailOpen size={16} style={{ color: 'var(--color-text-tertiary)' }} />
                  ) : (
                    <Mail size={16} style={{ color: 'var(--color-accent)' }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span 
                      className="font-medium truncate"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {message.from}
                    </span>
                    <span 
                      className="text-xs ml-2 flex-shrink-0"
                      style={{ color: 'var(--color-text-tertiary)' }}
                    >
                      {formatDate(message.date)}
                    </span>
                  </div>
                  <p 
                    className="text-sm truncate mb-1"
                    style={{ 
                      color: message.read 
                        ? 'var(--color-text-secondary)' 
                        : 'var(--color-text-primary)',
                      fontWeight: message.read ? 'normal' : '500',
                    }}
                  >
                    {message.subject || '(Sin asunto)'}
                  </p>
                  <p 
                    className="text-xs truncate"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    {message.preview}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Message viewer */}
      <div className="flex-1">
        {selectedMessage ? (
          <EmailMessage message={selectedMessage} accountId={accountId} />
        ) : (
          <div 
            className="h-full flex items-center justify-center"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Selecciona un mensaje para verlo
          </div>
        )}
      </div>
    </div>
  );
}
