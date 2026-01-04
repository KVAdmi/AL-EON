/**
 * EmailMessageDetail - Vista detalle de un mensaje
 * Incluye HTML sanitizado, botones para reply/reply all/forward
 * Botón para crear tarea/pendiente
 */
import React, { useState } from 'react';
import { 
  Reply, 
  ReplyAll, 
  Forward, 
  Star,
  Archive,
  Trash2,
  Download,
  Calendar,
  CheckSquare,
  Paperclip,
  X,
  Loader2,
  AlertCircle
} from 'lucide-react';
import DOMPurify from 'dompurify';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import useEmailStore from '../../../stores/emailStore';
import { toggleStar, moveToFolder } from '../../../services/emailService';
import { useToast } from '@/ui/use-toast';

export default function EmailMessageDetail({ message, onReply, onReplyAll, onForward, onCreateTask, onClose }) {
  const { toast } = useToast();
  const { toggleStar: toggleStarStore, updateMessage } = useEmailStore();
  const [starring, setStarring] = useState(false);
  const [archiving, setArchiving] = useState(false);

  if (!message) {
    return (
      <div 
        className="h-full flex items-center justify-center p-6"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--color-text-tertiary)' }} />
          <p className="text-lg font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Selecciona un mensaje
          </p>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Elige un correo de tu bandeja para ver su contenido
          </p>
        </div>
      </div>
    );
  }

  const handleToggleStar = async () => {
    setStarring(true);
    try {
      await toggleStar(message.account_id, message.id);
      toggleStarStore(message.id);
    } catch (error) {
      toast.error('Error al actualizar estrella');
    } finally {
      setStarring(false);
    }
  };

  const handleArchive = async () => {
    setArchiving(true);
    try {
      await moveToFolder(message.account_id, message.id, 'archive');
      updateMessage(message.id, { folder_id: 'archive' });
      toast.success('✓ Mensaje archivado');
      if (onClose) onClose();
    } catch (error) {
      toast.error('Error al archivar mensaje');
    } finally {
      setArchiving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Mover este mensaje a la papelera?')) return;

    try {
      await moveToFolder(message.account_id, message.id, 'trash');
      updateMessage(message.id, { folder_id: 'trash' });
      toast.success('✓ Mensaje movido a papelera');
      if (onClose) onClose();
    } catch (error) {
      toast.error('Error al eliminar mensaje');
    }
  };

  const getSanitizedHTML = (html) => {
    if (!html) return '';
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'b', 'i', 'em', 'u', 'a', 'ul', 'ol', 'li',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'span', 'img', 'table',
        'thead', 'tbody', 'tr', 'td', 'th', 'blockquote', 'pre', 'code'
      ],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'style', 'class', 'target'],
    });
  };

  const formatDateTime = (date) => {
    try {
      return format(new Date(date), "d 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es });
    } catch {
      return '';
    }
  };

  const getRecipients = () => {
    const recipients = [];
    if (message.to_addresses?.length) {
      recipients.push(...message.to_addresses.map(email => `Para: ${email}`));
    }
    if (message.cc_addresses?.length) {
      recipients.push(...message.cc_addresses.map(email => `CC: ${email}`));
    }
    return recipients;
  };

  return (
    <div 
      className="h-full flex flex-col"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      {/* Header del mensaje */}
      <div 
        className="p-4 border-b space-y-3"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {/* Botones de acción */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onReply && onReply(message)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:opacity-80 transition-all"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
              }}
              title="Responder"
            >
              <Reply className="w-4 h-4" />
              <span className="text-sm font-medium hidden sm:inline">Responder</span>
            </button>

            <button
              onClick={() => onReplyAll && onReplyAll(message)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:opacity-80 transition-all"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
              }}
              title="Responder a todos"
            >
              <ReplyAll className="w-4 h-4" />
              <span className="text-sm font-medium hidden sm:inline">Responder todos</span>
            </button>

            <button
              onClick={() => onForward && onForward(message)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:opacity-80 transition-all"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
              }}
              title="Reenviar"
            >
              <Forward className="w-4 h-4" />
              <span className="text-sm font-medium hidden sm:inline">Reenviar</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleStar}
              disabled={starring}
              className="p-2 rounded-lg hover:opacity-80 transition-all disabled:opacity-50"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                color: message.is_starred ? '#facc15' : 'var(--color-text-primary)',
              }}
              title="Destacar"
            >
              <Star className={`w-5 h-5 ${message.is_starred ? 'fill-yellow-400' : ''}`} />
            </button>

            <button
              onClick={handleArchive}
              disabled={archiving}
              className="p-2 rounded-lg hover:opacity-80 transition-all disabled:opacity-50"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
              }}
              title="Archivar"
            >
              {archiving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Archive className="w-5 h-5" />
              )}
            </button>

            <button
              onClick={handleDelete}
              className="p-2 rounded-lg hover:opacity-80 transition-all"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
              }}
              title="Eliminar"
            >
              <Trash2 className="w-5 h-5" />
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:opacity-80 transition-all lg:hidden"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-primary)',
                }}
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Botones de integración con AL-E */}
        <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <button
            onClick={() => onCreateTask && onCreateTask(message)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:opacity-80 transition-all"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'white',
            }}
          >
            <CheckSquare className="w-4 h-4" />
            <span className="text-sm font-medium">Crear Tarea</span>
          </button>

          <button
            onClick={() => toast.info('Función próximamente')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:opacity-80 transition-all"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-text-primary)',
            }}
          >
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-medium">Agendar</span>
          </button>
        </div>
      </div>

      {/* Contenido del mensaje */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Asunto */}
        <h1 
          className="text-2xl font-bold mb-4"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {message.subject || '(Sin asunto)'}
        </h1>

        {/* Información del remitente */}
        <div className="mb-6 space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {message.from_name || message.from_address}
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {message.from_address}
              </p>
            </div>
            <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
              {formatDateTime(message.date)}
            </p>
          </div>

          {/* Destinatarios */}
          {getRecipients().length > 0 && (
            <details className="text-sm">
              <summary 
                className="cursor-pointer hover:opacity-80"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Para: {message.to_addresses?.[0] || 'mí'} 
                {getRecipients().length > 1 && ` y ${getRecipients().length - 1} más`}
              </summary>
              <div className="mt-2 pl-4 space-y-1" style={{ color: 'var(--color-text-tertiary)' }}>
                {getRecipients().map((recipient, idx) => (
                  <p key={idx}>{recipient}</p>
                ))}
              </div>
            </details>
          )}
        </div>

        {/* Adjuntos */}
        {message.has_attachments && message.attachments?.length > 0 && (
          <div 
            className="mb-6 p-4 rounded-lg border"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Paperclip className="w-5 h-5" style={{ color: 'var(--color-text-primary)' }} />
              <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {message.attachment_count} adjunto{message.attachment_count > 1 ? 's' : ''}
              </p>
            </div>
            <div className="space-y-2">
              {message.attachments.map((attachment, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded"
                  style={{ backgroundColor: 'var(--color-bg-primary)' }}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Paperclip className="w-4 h-4 shrink-0" style={{ color: 'var(--color-text-tertiary)' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                        {attachment.filename}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                        {(attachment.size_bytes / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <a
                    href={attachment.download_url}
                    download
                    className="p-1.5 rounded hover:opacity-80 transition-all shrink-0"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      color: 'var(--color-text-primary)',
                    }}
                    title="Descargar"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cuerpo del mensaje */}
        <div
          className="prose max-w-none"
          style={{ color: 'var(--color-text-primary)' }}
          dangerouslySetInnerHTML={{
            __html: getSanitizedHTML(message.body_html) || message.body_text?.replace(/\n/g, '<br />') || '',
          }}
        />
      </div>
    </div>
  );
}
