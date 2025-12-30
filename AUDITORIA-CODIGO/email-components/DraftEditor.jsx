import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Paperclip, Trash2 } from 'lucide-react';
import { createDraft, updateDraft, sendDraft, uploadAttachment, deleteAttachment } from '@/services/emailService';
import AttachmentsList from '@/components/email/AttachmentsList';

export default function DraftEditor({ draft, accountId, ownerUserId, onClose, onSent }) {
  const [to, setTo] = useState(draft?.to_email || '');
  const [subject, setSubject] = useState(draft?.subject || '');
  const [body, setBody] = useState(draft?.body || '');
  const [attachments, setAttachments] = useState(draft?.attachments || []);
  const [draftId, setDraftId] = useState(draft?.draft_id || null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const fileInputRef = useRef(null);
  const saveTimerRef = useRef(null);

  // Autosave cada 2 segundos
  useEffect(() => {
    if (!accountId || !ownerUserId) return;
    
    // Clear previous timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // Set new timer
    saveTimerRef.current = setTimeout(() => {
      handleAutoSave();
    }, 2000);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [to, subject, body]);

  const handleAutoSave = async () => {
    if (!accountId || !ownerUserId) return;
    if (!to && !subject && !body) return; // No guardar si está vacío

    setIsSaving(true);
    try {
      if (draftId) {
        // Update existing draft
        await updateDraft(draftId, {
          to_email: to,
          subject: subject,
          body: body,
        });
      } else {
        // Create new draft
        const result = await createDraft({
          account_id: accountId,
          owner_user_id: ownerUserId,
          to_email: to,
          subject: subject,
          body: body,
        });
        setDraftId(result.draft.draft_id);
      }
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error autosaving draft:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!draftId) {
      alert('Debes escribir algo primero para que se cree el borrador');
      return;
    }

    for (const file of files) {
      if (file.size > 25 * 1024 * 1024) {
        alert(`El archivo ${file.name} es muy grande (máx 25MB)`);
        continue;
      }

      try {
        const result = await uploadAttachment(file, ownerUserId, draftId);
        setAttachments(prev => [...prev, result.attachment]);
      } catch (error) {
        console.error('Error uploading file:', error);
        alert(`Error al subir ${file.name}: ${error.message}`);
      }
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    try {
      await deleteAttachment(attachmentId);
      setAttachments(prev => prev.filter(a => a.attachment_id !== attachmentId));
    } catch (error) {
      console.error('Error deleting attachment:', error);
      alert('Error al eliminar adjunto');
    }
  };

  const handleSend = async () => {
    if (!to || !subject) {
      alert('Debes llenar "Para" y "Asunto"');
      return;
    }

    if (!draftId) {
      alert('El borrador no se ha guardado aún');
      return;
    }

    setIsSending(true);
    try {
      await sendDraft(draftId);
      alert('✅ Email enviado exitosamente');
      onSent?.();
      onClose();
    } catch (error) {
      console.error('Error sending email:', error);
      alert(`Error al enviar: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-800">
              {draft ? 'Editar Borrador' : 'Nuevo Email'}
            </h2>
            {isSaving && (
              <span className="text-xs text-gray-500 animate-pulse">Guardando...</span>
            )}
            {lastSaved && !isSaving && (
              <span className="text-xs text-gray-500">
                Guardado {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Para */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Para:</label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="destinatario@ejemplo.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Asunto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asunto:</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Escribe el asunto del email"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Cuerpo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje:</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Escribe tu mensaje aquí..."
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <AttachmentsList
              attachments={attachments}
              onDelete={handleDeleteAttachment}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!draftId}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Paperclip className="w-4 h-4" />
              <span className="text-sm">Adjuntar</span>
            </button>
          </div>

          <button
            onClick={handleSend}
            disabled={isSending || !to || !subject}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            <span>{isSending ? 'Enviando...' : 'Enviar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
