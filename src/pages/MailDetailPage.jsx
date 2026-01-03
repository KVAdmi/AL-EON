/**
 * MailDetailPage.jsx
 * Vista de detalle de correo con acciones IA
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getMailMessage, 
  markMailAsRead, 
  generateAIReply, 
  saveDraft,
  updateMailFlag,
  markAsSpam 
} from '@/services/mailService';
import { 
  ArrowLeft, 
  Mail, 
  Send, 
  Save, 
  Clock, 
  Sparkles,
  Flag,
  AlertCircle,
  Star,
  Loader2
} from 'lucide-react';
import { useToast } from '@/ui/use-toast';

export default function MailDetailPage() {
  const { id } = useParams();
  const { session } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [draftText, setDraftText] = useState('');
  const [showDraft, setShowDraft] = useState(false);

  useEffect(() => {
    if (session?.access_token && id) {
      loadMessage();
    }
  }, [session, id]);

  async function loadMessage() {
    if (!session?.access_token || !id) return;

    try {
      setLoading(true);
      const data = await getMailMessage(session.access_token, id);
      setMessage(data);
      
      // Marcar como leído si es nuevo
      if (data.status === 'new') {
        await markMailAsRead(session.access_token, id);
        setMessage({ ...data, status: 'read' });
      }
    } catch (error) {
      console.error('Error cargando correo:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo cargar el correo',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateReply() {
    if (!session?.access_token || !id) return;

    try {
      setGenerating(true);
      const result = await generateAIReply(session.access_token, id);
      setDraftText(result.draft_text || result.reply || '');
      setShowDraft(true);
      
      toast({
        title: 'Respuesta generada',
        description: 'AL-E ha creado una respuesta. Puedes editarla antes de guardar.',
      });
    } catch (error) {
      console.error('Error generando respuesta:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo generar la respuesta',
      });
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveDraft() {
    if (!session?.access_token || !id || !draftText.trim()) return;

    try {
      setSaving(true);
      await saveDraft(session.access_token, id, {
        draft_text: draftText,
        status: 'draft',
      });
      
      toast({
        title: 'Borrador guardado',
        description: 'Tu borrador se guardó correctamente',
      });
    } catch (error) {
      console.error('Error guardando borrador:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo guardar el borrador',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePending() {
    if (!session?.access_token || !id || !draftText.trim()) return;

    try {
      setSaving(true);
      await saveDraft(session.access_token, id, {
        draft_text: draftText,
        status: 'pending_send',
      });
      
      toast({
        title: 'Guardado para enviar',
        description: 'El correo se enviará automáticamente después',
      });
      
      navigate('/mail/pending');
    } catch (error) {
      console.error('Error guardando pendiente:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo guardar como pendiente',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleFlag(flag) {
    if (!session?.access_token || !id) return;

    try {
      await updateMailFlag(session.access_token, id, flag);
      setMessage({ ...message, flag });
      
      toast({
        title: 'Bandera actualizada',
        description: `Correo marcado como ${flag}`,
      });
    } catch (error) {
      console.error('Error actualizando bandera:', error);
    }
  }

  async function handleMarkSpam() {
    if (!session?.access_token || !id) return;

    try {
      await markAsSpam(session.access_token, id);
      
      toast({
        title: 'Marcado como spam',
        description: 'El correo se movió a spam',
      });
      
      navigate('/mail');
    } catch (error) {
      console.error('Error marcando spam:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo marcar como spam',
      });
    }
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <Loader2 size={48} className="animate-spin" style={{ color: 'var(--color-text-secondary)' }} />
      </div>
    );
  }

  if (!message) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-8" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <Mail size={64} className="mb-4 opacity-20" style={{ color: 'var(--color-text-secondary)' }} />
        <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
          Correo no encontrado
        </h3>
        <button
          onClick={() => navigate('/mail')}
          className="mt-4 px-4 py-2 rounded-lg"
          style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
        >
          Volver a la bandeja
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/mail')}
            className="p-2 rounded-lg hover:bg-[var(--color-bg-hover)]"
            style={{ color: 'var(--color-text-primary)' }}
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
            {message.subject}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleMarkSpam}
            className="p-2 rounded-lg hover:bg-[var(--color-bg-hover)]"
            style={{ color: '#EF4444' }}
            title="Marcar como spam"
          >
            <AlertCircle size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          {/* Message Header */}
          <div 
            className="p-6 rounded-xl mb-6"
            style={{ 
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)' 
            }}
          >
            <div className="flex items-start gap-4">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg shrink-0"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                {(message.from_name || message.from_email).charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      {message.from_name || message.from_email}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      {message.from_email}
                    </div>
                  </div>
                  
                  {message.flag && (
                    <select
                      value={message.flag}
                      onChange={(e) => handleToggleFlag(e.target.value)}
                      className="px-3 py-1 rounded-lg text-sm"
                      style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        color: 'var(--color-text-primary)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <option value="">Sin bandera</option>
                      <option value="urgent">Urgente</option>
                      <option value="important">Importante</option>
                      <option value="pending">Pendiente</option>
                      <option value="follow_up">Follow Up</option>
                      <option value="low_priority">Baja prioridad</option>
                    </select>
                  )}
                </div>

                <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                  Para: {message.to_email}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                  {formatDate(message.received_at)}
                </div>
              </div>
            </div>
          </div>

          {/* Message Body */}
          <div 
            className="p-6 rounded-xl mb-6"
            style={{ 
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)' 
            }}
          >
            <div 
              className="prose prose-invert max-w-none"
              style={{ color: 'var(--color-text-primary)' }}
              dangerouslySetInnerHTML={{ 
                __html: message.body_html || message.body_text?.replace(/\n/g, '<br>') || message.snippet 
              }}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={handleGenerateReply}
              disabled={generating || showDraft}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium disabled:opacity-50"
              style={{ 
                backgroundColor: 'var(--color-accent)', 
                color: 'white' 
              }}
            >
              {generating ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Sparkles size={18} />
              )}
              {generating ? 'Generando...' : 'Generar respuesta con AL-E'}
            </button>
          </div>

          {/* Draft Editor */}
          {showDraft && (
            <div 
              className="p-6 rounded-xl"
              style={{ 
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)' 
              }}
            >
              <h3 className="font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                Respuesta generada
              </h3>
              
              <textarea
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                rows={10}
                className="w-full p-3 rounded-lg resize-none"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border)',
                }}
                placeholder="Edita la respuesta..."
              />

              <div className="flex flex-wrap gap-3 mt-4">
                <button
                  onClick={handleSaveDraft}
                  disabled={saving || !draftText.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                  style={{ 
                    backgroundColor: 'var(--color-bg-tertiary)', 
                    color: 'var(--color-text-primary)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Guardar borrador
                </button>

                <button
                  onClick={handleSavePending}
                  disabled={saving || !draftText.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                  style={{ 
                    backgroundColor: '#F59E0B', 
                    color: 'white' 
                  }}
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Clock size={18} />}
                  Enviar después
                </button>

                <button
                  onClick={() => setShowDraft(false)}
                  className="px-4 py-2 rounded-lg"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
