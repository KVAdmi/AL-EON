/**
 * RichEmailComposer.jsx
 * Composer COMPLETO con editor Rico (React Quill)
 * CC, BCC, Attachments, Preview HTML
 */

import React, { useState, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { X, Send, Paperclip, Users, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { uploadAttachment, deleteAttachment } from '@/services/emailService';
import AttachmentsList from '@/components/email/AttachmentsList';

const QUILL_MODULES = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'align': [] }],
    ['link', 'image'],
    ['clean']
  ],
};

const QUILL_FORMATS = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background',
  'list', 'bullet',
  'align',
  'link', 'image'
];

export default function RichEmailComposer({ 
  accountId, 
  ownerUserId,
  defaultTo = '',
  defaultSubject = '',
  defaultBody = '',
  signatureHtml = '',
  onSend, 
  onClose 
}) {
  const [to, setTo] = useState(defaultTo);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [attachments, setAttachments] = useState([]);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    
    for (const file of files) {
      if (file.size > 25 * 1024 * 1024) {
        alert(`El archivo ${file.name} es muy grande (máx 25MB)`);
        continue;
      }

      const fileId = Date.now() + Math.random();
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

      try {
        // Simular progreso (en producción: usar XMLHttpRequest con onprogress)
        const interval = setInterval(() => {
          setUploadProgress(prev => ({
            ...prev,
            [fileId]: Math.min((prev[fileId] || 0) + 20, 90)
          }));
        }, 200);

        const result = await uploadAttachment(file, ownerUserId, null, null);
        
        clearInterval(interval);
        setUploadProgress(prev => {
          const next = { ...prev };
          delete next[fileId];
          return next;
        });
        
        setAttachments(prev => [...prev, result.attachment]);
      } catch (error) {
        console.error('Error uploading file:', error);
        alert(`Error al subir ${file.name}: ${error.message}`);
        setUploadProgress(prev => {
          const next = { ...prev };
          delete next[fileId];
          return next;
        });
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
    if (!to) {
      alert('Debes especificar al menos un destinatario');
      return;
    }
    if (!subject) {
      alert('El asunto es requerido');
      return;
    }

    setIsSending(true);
    try {
      // Agregar firma si existe
      const finalBody = signatureHtml 
        ? `${body}<br/><br/>---<br/>${signatureHtml}`
        : body;

      await onSend({
        to_email: to,
        cc_email: cc || null,
        bcc_email: bcc || null,
        subject,
        body: finalBody,
        attachment_ids: attachments.map(a => a.attachment_id),
      });
      
      alert('✅ Email enviado exitosamente');
      onClose();
    } catch (error) {
      console.error('Error sending email:', error);
      alert(`Error al enviar: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const previewHtml = () => {
    const finalBody = signatureHtml 
      ? `${body}<br/><br/>---<br/>${signatureHtml}`
      : body;
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 20px; }
            .field { margin: 5px 0; }
            .label { font-weight: bold; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="field"><span class="label">Para:</span> ${to}</div>
            ${cc ? `<div class="field"><span class="label">CC:</span> ${cc}</div>` : ''}
            ${bcc ? `<div class="field"><span class="label">BCC:</span> ${bcc}</div>` : ''}
            <div class="field"><span class="label">Asunto:</span> ${subject}</div>
          </div>
          <div>${finalBody}</div>
        </body>
      </html>
    `;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Nuevo Email</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Recipients */}
        <div className="p-4 space-y-2 border-b border-gray-200">
          {/* Para */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 w-16">Para:</label>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="destinatario@ejemplo.com, otro@ejemplo.com"
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="flex gap-1">
              <button
                onClick={() => setShowCc(!showCc)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
              >
                CC
              </button>
              <button
                onClick={() => setShowBcc(!showBcc)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
              >
                BCC
              </button>
            </div>
          </div>

          {/* CC */}
          {showCc && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 w-16">CC:</label>
              <input
                type="text"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="cc@ejemplo.com"
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* BCC */}
          {showBcc && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 w-16">BCC:</label>
              <input
                type="text"
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                placeholder="bcc@ejemplo.com"
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Asunto */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 w-16">Asunto:</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Escribe el asunto del email"
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Editor Body */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {showPreview ? (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Preview HTML</h3>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 rounded"
                  >
                    <ChevronUp className="w-4 h-4" />
                    Ocultar
                  </button>
                </div>
                <iframe
                  srcDoc={previewHtml()}
                  className="w-full h-96 bg-white rounded border border-gray-300"
                  title="Email Preview"
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden">
              <ReactQuill
                value={body}
                onChange={setBody}
                modules={QUILL_MODULES}
                formats={QUILL_FORMATS}
                placeholder="Escribe tu mensaje aquí..."
                className="h-full"
                style={{ height: 'calc(100% - 42px)' }}
              />
            </div>
          )}
        </div>

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="p-4 border-t border-gray-200">
            <AttachmentsList
              attachments={attachments}
              onDelete={handleDeleteAttachment}
            />
          </div>
        )}

        {/* Upload Progress */}
        {Object.keys(uploadProgress).length > 0 && (
          <div className="px-4 pb-2">
            {Object.entries(uploadProgress).map(([id, progress]) => (
              <div key={id} className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600">Subiendo archivo...</span>
                  <span className="text-xs text-gray-600">{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="bg-blue-600 h-1.5 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200">
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
              className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Paperclip className="w-4 h-4" />
              <span className="text-sm">Adjuntar</span>
            </button>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span className="text-sm">Preview</span>
            </button>
          </div>

          <button
            onClick={handleSend}
            disabled={isSending || !to || !subject}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            <span>{isSending ? 'Enviando...' : 'Enviar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
