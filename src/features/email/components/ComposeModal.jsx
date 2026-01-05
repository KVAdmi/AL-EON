import React, { useState, useEffect } from 'react';
import { sendEmail } from '@/services/emailService';
import { useToast } from '@/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { X, Send, Loader2, CheckCircle2, XCircle } from 'lucide-react';

const STORAGE_KEY = 'ale_email_compose_draft';

export default function ComposeModal({ accounts, defaultAccountId, onClose }) {
  const { toast } = useToast();
  const { accessToken } = useAuth(); // 🔥 Obtener token del contexto
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState(null); // null | 'sending' | 'sent' | 'failed'
  const [messageId, setMessageId] = useState(null);

  // Recuperar draft de localStorage
  const getInitialFormData = () => {
    try {
      const draft = localStorage.getItem(STORAGE_KEY);
      if (draft) {
        const parsed = JSON.parse(draft);
        // Usar cuenta por defecto si existe
        return {
          ...parsed,
          accountId: defaultAccountId || parsed.accountId || accounts[0]?.id || '',
        };
      }
    } catch (error) {
      console.error('Error recuperando draft:', error);
    }
    
    return {
      accountId: defaultAccountId || accounts[0]?.id || '',
      to: '',
      subject: '',
      body: '',
      cc: '',
      bcc: '',
    };
  };

  const [formData, setFormData] = useState(getInitialFormData);

  // Guardar draft automáticamente (solo si hay contenido)
  useEffect(() => {
    if (formData.to || formData.subject || formData.body) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
      } catch (error) {
        console.error('Error guardando draft:', error);
      }
    }
  }, [formData]);

  function handleChange(field, value) {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSendStatus(null); // Reset status al editar
  }

  async function handleSend(e) {
    e.preventDefault();

    if (!formData.accountId || !formData.to || !formData.subject) {
      toast({
        variant: 'destructive',
        title: 'Campos requeridos',
        description: 'Completa los campos: cuenta, destinatario y asunto',
      });
      return;
    }

    try {
      setSending(true);
      setSendStatus('sending');

      // 🔥 Verificar que hay token
      if (!accessToken) {
        toast({
          variant: 'destructive',
          title: 'Error de autenticación',
          description: 'No estás autenticado. Por favor recarga la página.',
        });
        return;
      }

      const payload = {
        accountId: formData.accountId,
        to: formData.to,
        subject: formData.subject,
        body: formData.body,
        ...(formData.cc && { cc: formData.cc.split(',').map(e => e.trim()) }),
        ...(formData.bcc && { bcc: formData.bcc.split(',').map(e => e.trim()) }),
      };

      // 🔥 PASAR EL TOKEN COMO SEGUNDO PARÁMETRO
      const response = await sendEmail(payload, accessToken);
      
      // CONFIRMAR ENVÍO SOLO SI HAY messageId
      if (response.messageId) {
        setSendStatus('sent');
        setMessageId(response.messageId);

        toast({
          title: 'Email enviado correctamente',
          description: `ID: ${response.messageId}`,
        });

        // Limpiar draft después de envío exitoso
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
          console.error('Error limpiando draft:', error);
        }

        // Cerrar después de 2 segundos
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        // SI NO HAY messageId: NO CONFIRMAR
        throw new Error(response.message || 'No se pudo enviar el email');
      }

    } catch (error) {
      setSendStatus('failed');
      toast({
        variant: 'destructive',
        title: 'Error al enviar',
        description: error.message || 'No se pudo enviar el email',
      });
    } finally {
      setSending(false);
    }
  }

  const selectedAccount = accounts.find(a => a.id === formData.accountId);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      onClick={onClose}
    >
      <div 
        className="w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--color-bg-secondary)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h2 
            className="text-xl font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Redactar mensaje
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-all hover:opacity-80"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSend} className="p-6 space-y-4">
          {/* Account selector */}
          <div>
            <label 
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--color-text-primary)' }}
            >
              De
            </label>
            <select
              value={formData.accountId}
              onChange={(e) => handleChange('accountId', e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
              required
            >
              {accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.fromName} &lt;{account.fromEmail}&gt;
                </option>
              ))}
            </select>
          </div>

          {/* To */}
          <div>
            <label 
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Para
            </label>
            <input
              type="email"
              value={formData.to}
              onChange={(e) => handleChange('to', e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
              placeholder="destinatario@email.com"
              required
            />
          </div>

          {/* CC/BCC */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label 
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--color-text-primary)' }}
              >
                CC (opcional)
              </label>
              <input
                type="text"
                value={formData.cc}
                onChange={(e) => handleChange('cc', e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border"
                style={{
                  backgroundColor: 'var(--color-bg-primary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                placeholder="email1@example.com, email2@example.com"
              />
            </div>

            <div>
              <label 
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--color-text-primary)' }}
              >
                BCC (opcional)
              </label>
              <input
                type="text"
                value={formData.bcc}
                onChange={(e) => handleChange('bcc', e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border"
                style={{
                  backgroundColor: 'var(--color-bg-primary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                placeholder="email1@example.com, email2@example.com"
              />
            </div>
          </div>

          {/* Subject */}
          <div>
            <label 
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Asunto
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => handleChange('subject', e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
              placeholder="Asunto del mensaje"
              required
            />
          </div>

          {/* Body */}
          <div>
            <label 
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Mensaje
            </label>
            <textarea
              value={formData.body}
              onChange={(e) => handleChange('body', e.target.value)}
              className="w-full px-4 py-3 rounded-lg border resize-none"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
                minHeight: '200px',
              }}
              placeholder="Escribe tu mensaje aquí..."
            />
          </div>

          {/* Status indicator */}
          {sendStatus && (
            <div 
              className={`p-4 rounded-lg border flex items-center gap-3`}
              style={{
                backgroundColor: sendStatus === 'sent' 
                  ? 'rgba(16, 185, 129, 0.1)' 
                  : sendStatus === 'failed'
                  ? 'rgba(239, 68, 68, 0.1)'
                  : 'rgba(59, 130, 246, 0.1)',
                borderColor: sendStatus === 'sent' 
                  ? '#10b981' 
                  : sendStatus === 'failed'
                  ? '#ef4444'
                  : '#3b82f6',
              }}
            >
              {sendStatus === 'sending' && (
                <>
                  <Loader2 size={20} className="animate-spin" style={{ color: '#3b82f6' }} />
                  <span style={{ color: '#3b82f6' }}>Enviando...</span>
                </>
              )}
              {sendStatus === 'sent' && (
                <>
                  <CheckCircle2 size={20} style={{ color: '#10b981' }} />
                  <div>
                    <p className="font-medium" style={{ color: '#10b981' }}>Enviado correctamente</p>
                    {messageId && (
                      <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                        ID: {messageId}
                      </p>
                    )}
                  </div>
                </>
              )}
              {sendStatus === 'failed' && (
                <>
                  <XCircle size={20} style={{ color: '#ef4444' }} />
                  <span style={{ color: '#ef4444' }}>Error al enviar</span>
                </>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={sending || sendStatus === 'sent'}
              className="flex-1 py-3 px-4 rounded-xl font-medium transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: '#FFFFFF',
              }}
            >
              {sending && <Loader2 size={18} className="animate-spin" />}
              {sending ? 'Enviando...' : (
                <>
                  <Send size={18} />
                  Enviar
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="px-6 py-3 rounded-xl font-medium border transition-all hover:opacity-90 disabled:opacity-50"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              {sendStatus === 'sent' ? 'Cerrar' : 'Cancelar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
