/**
 * EmailComposer - Componente para redactar nuevos correos
 * Soporta: reply, reply all, forward, nuevo correo
 * Estados: draft, sending, sent, error
 */
import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  Paperclip, 
  Bold, 
  Italic, 
  Underline,
  Link as LinkIcon,
  Image as ImageIcon,
  Minimize2,
  Maximize2,
  Trash2,
  Save,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import useEmailStore from '../../../stores/emailStore';
import { sendEmail, saveDraft, deleteDraft } from '../../../services/emailService';
import { useToast } from '@/ui/use-toast';
import { useNavigate } from 'react-router-dom';

export default function EmailComposer({ 
  mode = 'new', // 'new', 'reply', 'replyAll', 'forward'
  replyTo = null,
  account = null, // ✅ NUEVO: cuenta desde el padre
  onClose,
  onSent
}) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { currentAccount: storeAccount, composeDraft, updateComposeDraft, closeCompose, triggerRefresh } = useEmailStore();
  
  // ✅ Usar account del padre O del store
  const currentAccount = account || storeAccount;
  
  const [sending, setSending] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const fileInputRef = useRef(null);

  // 🔍 DEBUG: Verificar currentAccount
  useEffect(() => {
    console.log('[EmailComposer] 🔍 DEBUG currentAccount:', {
      existe: !!currentAccount,
      id: currentAccount?.id,
      email: currentAccount?.from_email,
      mode,
      replyTo: !!replyTo
    });
  }, [currentAccount, mode, replyTo]);

  const [formData, setFormData] = useState({
    to: [],
    cc: [],
    bcc: [],
    subject: '',
    body_html: '',
    body_text: '',
  });

  // Inicializar según el modo
  useEffect(() => {
    if (mode === 'reply' && replyTo) {
      // ✅ Crear quoted text limpio (sin HTML crudo visible)
      const quotedText = `\n\n---\nDe: ${replyTo.from_name || replyTo.from_address}\nFecha: ${new Date(replyTo.date).toLocaleString()}\n\n${replyTo.body_text || replyTo.body_html || ''}`;
      
      setFormData({
        to: [replyTo.from_address],
        cc: [],
        bcc: [],
        subject: `Re: ${replyTo.subject || ''}`,
        body_html: quotedText,
        body_text: quotedText,
      });
    } else if (mode === 'replyAll' && replyTo) {
      const allRecipients = [...(replyTo.to_addresses || []), ...(replyTo.cc_addresses || [])];
      const filteredCc = allRecipients.filter(email => 
        email !== currentAccount?.fromEmail && email !== replyTo.from_address
      );
      
      // ✅ Crear quoted text limpio (sin HTML crudo visible)
      const quotedText = `\n\n---\nDe: ${replyTo.from_name || replyTo.from_address}\nFecha: ${new Date(replyTo.date).toLocaleString()}\n\n${replyTo.body_text || replyTo.body_html || ''}`;
      
      setFormData({
        to: [replyTo.from_address],
        cc: filteredCc,
        bcc: [],
        subject: `Re: ${replyTo.subject || ''}`,
        body_html: quotedText,
        body_text: quotedText,
      });
      setShowCc(filteredCc.length > 0);
    } else if (mode === 'forward' && replyTo) {
      setFormData({
        to: [],
        cc: [],
        bcc: [],
        subject: `Fwd: ${replyTo.subject || ''}`,
        body_html: `<br/><br/>---<br/><strong>De:</strong> ${replyTo.from_name || replyTo.from_address}<br/><strong>Asunto:</strong> ${replyTo.subject}<br/><strong>Fecha:</strong> ${new Date(replyTo.date).toLocaleString()}<br/><br/>${replyTo.body_html || ''}`,
        body_text: '',
      });
    } else if (composeDraft) {
      setFormData(composeDraft);
    }
  }, [mode, replyTo, composeDraft]);

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    updateComposeDraft({ [field]: value });
  };

  const handleEmailInput = (field, value) => {
    const emails = value.split(/[,;\s]+/).filter(e => e.trim());
    handleChange(field, emails);
  };

  const handleSend = async () => {
    if (!currentAccount) {
      toast({
        variant: "destructive",
        title: "Sin cuenta conectada",
        description: "Conecta tu cuenta de Gmail o Outlook para enviar correos",
      });
      return;
    }

    if (!formData.to || formData.to.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Agrega al menos un destinatario",
      });
      return;
    }

    if (!formData.subject?.trim()) {
      const confirmed = confirm('El asunto está vacío. ¿Enviar de todos modos?');
      if (!confirmed) return;
    }

    setSending(true);

    try {
      const emailData = {
        accountId: currentAccount.id,
        to: formData.to,
        cc: formData.cc,
        bcc: formData.bcc,
        subject: formData.subject,
        body: formData.body_html || formData.body_text, // ✅ Backend espera "body"
        attachments: attachments,
      };

      const result = await sendEmail(emailData);

      toast({
        title: "✓ Correo enviado",
        description: "El correo se envió exitosamente",
      });
      
      // ✅ Refrescar lista de mensajes (silenciar error si falla)
      if (triggerRefresh) {
        setTimeout(() => {
          triggerRefresh().catch(err => {
            console.warn('[EmailComposer] ⚠️ Error al refrescar (silenciado, correo ya enviado):', err);
            // NO mostrar error al usuario - el correo ya se envió exitosamente
          });
        }, 500); // Pequeño delay para que el backend procese
      }
      
      if (onSent) {
        onSent(result);
      }

      handleClose();
    } catch (error) {
      console.error('[EmailComposer] Error al enviar:', error);
      toast({
        variant: "destructive",
        title: "Error al enviar",
        description: error.message || "Revisa destinatario, asunto y contenido",
      });
    } finally {
      setSending(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!currentAccount) return;

    setSavingDraft(true);

    try {
      await saveDraft(currentAccount.id, formData);
      toast({
        title: "✓ Borrador guardado",
        description: "El borrador se guardó correctamente",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar el borrador",
      });
    } finally {
      setSavingDraft(false);
    }
  };

  const handleAttachment = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;

    const newAttachments = files.map(file => ({
      filename: file.name,
      size_bytes: file.size,
      content_type: file.type,
      file: file,
    }));

    setAttachments([...attachments, ...newAttachments]);
    toast({
      title: "✓ Archivos adjuntos",
      description: `${files.length} archivo(s) adjuntado(s)`,
    });
  };

  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    if (formData.to.length > 0 || formData.subject || formData.body_html) {
      const confirmed = confirm('¿Descartar este borrador?');
      if (!confirmed) return;
    }

    closeCompose();
    if (onClose) onClose();
  };

  const stripHtml = (html) => {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  if (minimized) {
    return (
      <div
        className="fixed bottom-0 right-4 w-64 rounded-t-lg shadow-lg cursor-pointer hover:opacity-90 transition-all"
        style={{ backgroundColor: 'var(--color-bg-primary)', borderTop: '3px solid var(--color-primary)' }}
        onClick={() => setMinimized(false)}
      >
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Send className="w-4 h-4 shrink-0" style={{ color: 'var(--color-primary)' }} />
            <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
              {formData.subject || 'Nuevo mensaje'}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className="p-1 hover:opacity-80"
          >
            <X className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-0 right-4 w-full max-w-2xl rounded-t-lg shadow-2xl flex flex-col"
      style={{
        backgroundColor: 'var(--color-bg-primary)',
        height: '600px',
        maxHeight: '80vh',
        borderTop: '3px solid var(--color-primary)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-2">
          <Send className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
          <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {mode === 'reply' ? 'Responder' : 
             mode === 'replyAll' ? 'Responder a todos' :
             mode === 'forward' ? 'Reenviar' :
             'Nuevo mensaje'}
          </h3>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleSaveDraft}
            disabled={savingDraft}
            className="p-2 rounded hover:opacity-80 transition-all disabled:opacity-50"
            title="Guardar borrador"
          >
            {savingDraft ? (
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--color-text-secondary)' }} />
            ) : (
              <Save className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
            )}
          </button>

          <button
            onClick={() => setMinimized(true)}
            className="p-2 rounded hover:opacity-80 transition-all"
            title="Minimizar"
          >
            <Minimize2 className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
          </button>

          <button
            onClick={handleClose}
            className="p-2 rounded hover:opacity-80 transition-all"
            title="Cerrar"
          >
            <X className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 space-y-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          {/* Para */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium w-16 shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
              Para:
            </label>
            <input
              type="text"
              value={formData.to.join(', ')}
              onChange={(e) => handleEmailInput('to', e.target.value)}
              placeholder="destinatario@email.com"
              className="flex-1 px-2 py-1.5 rounded border focus:outline-none focus:ring-2"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowCc(!showCc)}
                className="text-sm px-2 py-1 rounded hover:opacity-80"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Cc
              </button>
              <button
                onClick={() => setShowBcc(!showBcc)}
                className="text-sm px-2 py-1 rounded hover:opacity-80"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Bcc
              </button>
            </div>
          </div>

          {/* Cc */}
          {showCc && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium w-16 shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
                Cc:
              </label>
              <input
                type="text"
                value={formData.cc.join(', ')}
                onChange={(e) => handleEmailInput('cc', e.target.value)}
                placeholder="copia@email.com"
                className="flex-1 px-2 py-1.5 rounded border"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>
          )}

          {/* Bcc */}
          {showBcc && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium w-16 shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
                Bcc:
              </label>
              <input
                type="text"
                value={formData.bcc.join(', ')}
                onChange={(e) => handleEmailInput('bcc', e.target.value)}
                placeholder="copia-oculta@email.com"
                className="flex-1 px-2 py-1.5 rounded border"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>
          )}

          {/* Asunto */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium w-16 shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
              Asunto:
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => handleChange('subject', e.target.value)}
              placeholder="Asunto del mensaje"
              className="flex-1 px-2 py-1.5 rounded border"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>
        </div>

        {/* Adjuntos */}
        {attachments.length > 0 && (
          <div className="px-4 py-2 border-b space-y-1" style={{ borderColor: 'var(--color-border)' }}>
            {attachments.map((attachment, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded"
                style={{ backgroundColor: 'var(--color-bg-secondary)' }}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Paperclip className="w-4 h-4 shrink-0" style={{ color: 'var(--color-text-tertiary)' }} />
                  <span className="text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {attachment.filename}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                    ({(attachment.size_bytes / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  onClick={() => removeAttachment(idx)}
                  className="p-1 rounded hover:opacity-80"
                  title="Eliminar"
                >
                  <X className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Editor de texto */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <textarea
            value={formData.body_html}
            onChange={(e) => handleChange('body_html', e.target.value)}
            placeholder="Escribe tu mensaje aquí..."
            className="flex-1 p-4 resize-none focus:outline-none"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between px-4 py-3 border-t"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleAttachment}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:opacity-80 transition-all"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-text-primary)',
            }}
          >
            <Paperclip className="w-4 h-4" />
            <span className="text-sm">Adjuntar</span>
          </button>
        </div>

        <button
          onClick={handleSend}
          disabled={sending || !formData.to.length}
          className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: (sending || !formData.to.length) ? 'var(--color-bg-tertiary)' : 'var(--color-primary)',
            color: 'white',
          }}
        >
          {sending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Enviar
              </>
            )}
        </button>
      </div>
    </div>
  );
}
