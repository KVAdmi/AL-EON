/**
 * EmailDetailView.jsx
 * Vista COMPLETA de un email: Header, Body HTML, Attachments, Reply/Forward
 */

import React, { useState } from 'react';
import { X, Reply, Forward, Trash2, Archive, Star, MoreVertical, Download } from 'lucide-react';
import AttachmentsList from '@/components/email/AttachmentsList';

export default function EmailDetailView({ email, onClose, onReply, onForward, onDelete, onArchive }) {
  const [showRawHtml, setShowRawHtml] = useState(false);
  const [isStarred, setIsStarred] = useState(email?.is_starred || false);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', { 
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const parseAddresses = (addressString) => {
    if (!addressString) return [];
    return addressString.split(',').map(a => a.trim()).filter(Boolean);
  };

  const handleStar = () => {
    setIsStarred(!isStarred);
    // TODO: Llamar a API para marcar como favorito
  };

  if (!email) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Selecciona un email para ver su contenido
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header Bar */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Cerrar"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={handleStar}
            className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${
              isStarred ? 'text-yellow-500' : 'text-gray-400'
            }`}
            title={isStarred ? 'Quitar favorito' : 'Marcar como favorito'}
          >
            <Star className="w-5 h-5" fill={isStarred ? 'currentColor' : 'none'} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onReply(email)}
            className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Responder"
          >
            <Reply className="w-4 h-4" />
            <span className="text-sm">Responder</span>
          </button>
          <button
            onClick={() => onForward(email)}
            className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Reenviar"
          >
            <Forward className="w-4 h-4" />
            <span className="text-sm">Reenviar</span>
          </button>
          <div className="w-px h-6 bg-gray-300 mx-2"></div>
          <button
            onClick={() => onArchive(email)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Archivar"
          >
            <Archive className="w-5 h-5" />
          </button>
          <button
            onClick={() => onDelete(email)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Eliminar"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Más opciones"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Email Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          {/* Subject */}
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            {email.subject || '(Sin asunto)'}
          </h1>

          {/* Sender Info */}
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
              {getInitials(email.from_name || email.from_email)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">
                      {email.from_name || email.from_email}
                    </span>
                    {!email.from_name && (
                      <span className="text-sm text-gray-500">
                        &lt;{email.from_email}&gt;
                      </span>
                    )}
                  </div>
                  {email.from_name && (
                    <div className="text-sm text-gray-600">
                      &lt;{email.from_email}&gt;
                    </div>
                  )}
                  
                  {/* Recipients */}
                  <div className="mt-2 space-y-1">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Para:</span>{' '}
                      {parseAddresses(email.to_email).map((addr, i) => (
                        <span key={i}>
                          {i > 0 && ', '}
                          <span className="text-gray-900">{addr}</span>
                        </span>
                      ))}
                    </div>
                    
                    {email.cc_email && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">CC:</span>{' '}
                        {parseAddresses(email.cc_email).map((addr, i) => (
                          <span key={i}>
                            {i > 0 && ', '}
                            <span className="text-gray-900">{addr}</span>
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {email.bcc_email && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">BCC:</span>{' '}
                        {parseAddresses(email.bcc_email).map((addr, i) => (
                          <span key={i}>
                            {i > 0 && ', '}
                            <span className="text-gray-900">{addr}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-sm text-gray-500 flex-shrink-0 ml-4">
                  {formatDate(email.date || email.created_at)}
                </div>
              </div>
            </div>
          </div>

          {/* Attachments (si existen) */}
          {email.attachments && email.attachments.length > 0 && (
            <div className="mb-6">
              <AttachmentsList 
                attachments={email.attachments}
                onDelete={null}
              />
            </div>
          )}

          {/* Body */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-700">Contenido del mensaje</h3>
              <button
                onClick={() => setShowRawHtml(!showRawHtml)}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                {showRawHtml ? 'Ver renderizado' : 'Ver HTML crudo'}
              </button>
            </div>

            {showRawHtml ? (
              <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-x-auto border border-gray-200 font-mono">
                {email.body || email.body_html}
              </pre>
            ) : (
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ 
                  __html: email.body_html || email.body || '<p class="text-gray-500">(Sin contenido)</p>' 
                }}
              />
            )}
          </div>

          {/* Thread History (si existe) */}
          {email.thread_id && email.thread_messages && email.thread_messages.length > 1 && (
            <div className="mt-8 border-t border-gray-200 pt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">
                Conversación ({email.thread_messages.length} mensajes)
              </h3>
              <div className="space-y-4">
                {email.thread_messages.map((msg, idx) => (
                  <div key={idx} className="border-l-2 border-gray-300 pl-4 py-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-gray-900 text-sm">
                        {msg.from_name || msg.from_email}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(msg.date)}
                      </div>
                    </div>
                    <div 
                      className="text-sm text-gray-700"
                      dangerouslySetInnerHTML={{ __html: msg.body_html || msg.body }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => onReply(email)}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Reply className="w-4 h-4" />
            <span>Responder</span>
          </button>
          <button
            onClick={() => onForward(email)}
            className="flex items-center gap-2 px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            <Forward className="w-4 h-4" />
            <span>Reenviar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
