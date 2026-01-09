import React, { useState, useEffect } from 'react';
import { getInbox, getMessage } from '@/services/emailService';
import { useToast } from '@/ui/use-toast';
import { RefreshCw, Mail, MailOpen } from 'lucide-react';
import EmailMessage from './EmailMessage';
import useEmailStore from '../../../stores/emailStore';

export default function EmailInbox({ accountId, folder, onSelectMessage }) {
  const { toast } = useToast();
  const { setRefreshMessages } = useEmailStore();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingFullMessage, setLoadingFullMessage] = useState(false);

  useEffect(() => {
    loadMessages();
    // Registrar función de refresh en el store
    setRefreshMessages(loadMessages);
  }, [accountId, folder]);

  async function loadMessages() {
    if (!accountId) return;

    try {
      setLoading(true);
      
      // Intentar cargar desde backend
      try {
        const data = await getInbox(accountId, { folder });
        setMessages(data?.messages || []);
        return;
      } catch (backendError) {
        console.log('[EmailInbox] Backend no disponible, leyendo de Supabase:', backendError.message);
      }
      
      // Fallback: Leer directo de Supabase
      const { supabase } = await import('../../../lib/supabase');
      
      let query = supabase
        .from('email_messages')
        .select('*')
        .eq('account_id', accountId)
        .order('sent_at', { ascending: false });
      
      // Filtrar por carpeta si se especifica
      if (folder) {
        // Mapear nombres de carpetas de UI a DB
        const folderMap = {
          'inbox': 'Inbox',
          'sent': 'Sent',
          'drafts': 'Drafts',
          'starred': 'Starred',
          'spam': 'Spam',
          'archive': 'Archive',
          'trash': 'Trash'
        };
        const dbFolder = folderMap[folder] || folder;
        query = query.eq('folder', dbFolder);
      }
      
      const { data: dbMessages, error } = await query;
      
      if (error) {
        console.error('[EmailInbox] Error de Supabase:', error);
        setMessages([]);
        return;
      }
      
      // Transformar formato de Supabase a formato esperado por UI
      const transformedMessages = (dbMessages || [])
        .filter(msg => {
          // Validar que el mensaje tenga los campos mínimos necesarios
          if (!msg.id) {
            console.warn('[EmailInbox] ⚠️ Mensaje sin ID, ignorado:', msg);
            return false;
          }
          if (!msg.from_address && !msg.from_email) {
            console.warn('[EmailInbox] ⚠️ Mensaje sin remitente, ignorado. ID:', msg.id);
            return false;
          }
          return true;
        })
        .map(msg => ({
          id: msg.id,
          // Si tiene from_name usarlo, sino usar el email
          from: msg.from_name || msg.from_address || msg.from_email || 'Desconocido',
          from_address: msg.from_address || msg.from_email || 'unknown@example.com',
          from_name: msg.from_name || msg.from_address || null,
          to_addresses: msg.to_addresses || [],
          cc_addresses: msg.cc_addresses || [],
          bcc_addresses: msg.bcc_addresses || [],
          subject: msg.subject || '(Sin asunto)',
          preview: msg.body_preview || msg.body_text?.substring(0, 100) || msg.body_html?.substring(0, 100).replace(/<[^>]*>/g, '') || '',
          body_text: msg.body_text || '',
          body_html: msg.body_html || '',
          date: msg.date || msg.sent_at || msg.received_at || msg.created_at,
          sent_at: msg.sent_at || msg.date,
          received_at: msg.received_at,
          created_at: msg.created_at,
          read: msg.is_read || false,
          is_read: msg.is_read || false,
          starred: msg.is_starred || false,
          is_starred: msg.is_starred || false,
          folder: msg.folder,
          account_id: msg.account_id,
          has_attachments: msg.has_attachments || false,
          attachments: msg.attachments || [],
          attachment_count: msg.attachments?.length || 0,
        }));
      
      console.log(`[EmailInbox] ✅ ${transformedMessages.length} mensajes válidos de ${dbMessages?.length || 0} totales`);
      setMessages(transformedMessages);
      
    } catch (error) {
      console.error('Error cargando mensajes:', error);
      
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudieron cargar los mensajes',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadMessages();
    setRefreshing(false);
  }

  /**
   * 🔥 NUEVA FUNCIÓN: Cargar contenido completo del mensaje
   */
  async function handleMessageClick(message) {
    try {
      setSelectedMessageId(message.id);
      setLoadingFullMessage(true);
      
      console.log('[EmailInbox] 📧 Cargando mensaje completo:', message.id);
      
      // ✅ LLAMAR ENDPOINT CORRECTO para obtener body_html y body_text
      const fullMessage = await getMessage(accountId, message.id);
      
      console.log('[EmailInbox] ✅ Mensaje completo recibido:', {
        id: fullMessage.id,
        has_body_html: !!fullMessage.body_html,
        has_body_text: !!fullMessage.body_text,
        body_html_length: fullMessage.body_html?.length || 0,
        body_text_length: fullMessage.body_text?.length || 0
      });
      
      // Pasar mensaje completo al padre
      if (onSelectMessage) {
        onSelectMessage(fullMessage);
      }
    } catch (error) {
      console.error('[EmailInbox] ❌ Error cargando mensaje completo:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo cargar el contenido del mensaje',
      });
      
      // Fallback: pasar el mensaje sin contenido completo
      if (onSelectMessage) {
        onSelectMessage(message);
      }
    } finally {
      setLoadingFullMessage(false);
    }
  }

  function formatDate(dateString) {
    if (!dateString) return 'Sin fecha';
    
    try {
      const date = new Date(dateString);
      
      // Validar fecha válida
      if (isNaN(date.getTime())) {
        return 'Fecha inválida';
      }
      
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
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'Sin fecha';
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

  return (
    <div className="flex-1 flex flex-col">
      {/* Header - SIEMPRE VISIBLE */}
      <div 
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <h3 
          className="font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {folder === 'inbox' && 'Bandeja de entrada'}
          {folder === 'sent' && 'Enviados'}
          {folder === 'starred' && 'Destacados'}
          {folder === 'archive' && 'Archivados'}
          {folder === 'trash' && 'Papelera'}
          {!folder && 'Todos los mensajes'}
        </h3>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 rounded-lg transition-all hover:opacity-80"
          style={{ color: 'var(--color-text-secondary)' }}
          title="Sincronizar mensajes"
        >
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Empty state cuando NO hay mensajes */}
      {messages.length === 0 ? (
        <div 
          className="flex-1 flex items-center justify-center p-6"
        >
          <div className="text-center max-w-md">
            <Mail size={48} className="mx-auto mb-4" style={{ color: 'var(--color-text-tertiary)' }} />
            <h3 
              className="text-lg font-semibold mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              No hay mensajes en esta carpeta
            </h3>
            <p 
              className="text-sm mb-4"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Los mensajes que envíes o recibas aparecerán aquí.
            </p>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg mx-auto transition-all hover:opacity-90"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: 'white',
              }}
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              Sincronizar ahora
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">{messages.map((message) => (
            <button
              key={message.id}
              onClick={() => handleMessageClick(message)}
              disabled={loadingFullMessage && selectedMessageId === message.id}
              className={`w-full px-4 py-3 border-b text-left transition-all hover:opacity-80 ${
                selectedMessageId === message.id ? 'font-medium' : ''
              } ${loadingFullMessage && selectedMessageId === message.id ? 'opacity-50 cursor-wait' : ''}`}
              style={{
                backgroundColor: selectedMessageId === message.id 
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
                      {formatDate(message.date || message.sent_at || message.received_at || message.created_at)}
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
      )}
    </div>
  );
}
