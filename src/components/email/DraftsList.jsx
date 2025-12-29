import React from 'react';
import { FileText, Clock, Trash2 } from 'lucide-react';
import { deleteDraft } from '@/services/emailService';

export default function DraftsList({ drafts, onSelectDraft, onDraftDeleted }) {
  const handleDelete = async (e, draftId) => {
    e.stopPropagation(); // Evitar que abra el editor
    
    if (!confirm('¿Eliminar este borrador?')) return;

    try {
      await deleteDraft(draftId);
      onDraftDeleted?.(draftId);
    } catch (error) {
      console.error('Error deleting draft:', error);
      alert('Error al eliminar borrador');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    // Menos de 1 minuto
    if (diff < 60000) return 'Hace un momento';
    
    // Menos de 1 hora
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `Hace ${minutes} min`;
    }
    
    // Hoy
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }
    
    // Esta semana
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString('es-ES', { weekday: 'short' });
    }
    
    // Más antiguo
    return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
  };

  if (drafts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <FileText className="w-12 h-12 mb-3 opacity-50" />
        <p className="text-sm">No tienes borradores guardados</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {drafts.map((draft) => (
        <div
          key={draft.draft_id}
          onClick={() => onSelectDraft(draft)}
          className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Para */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-500">Para:</span>
                <span className="text-sm font-medium text-gray-800 truncate">
                  {draft.to_email || '(sin destinatario)'}
                </span>
              </div>
              
              {/* Asunto */}
              <div className="text-sm font-semibold text-gray-900 mb-1 truncate">
                {draft.subject || '(sin asunto)'}
              </div>
              
              {/* Body preview */}
              <div className="text-sm text-gray-600 line-clamp-2">
                {draft.body || '(sin contenido)'}
              </div>
              
              {/* Fecha */}
              <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                <span>{formatDate(draft.updated_at)}</span>
              </div>
            </div>

            {/* Delete button */}
            <button
              onClick={(e) => handleDelete(e, draft.draft_id)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0"
              title="Eliminar borrador"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
