import React, { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';

/**
 * Modal para confirmar guardado de memoria explícita
 * El usuario puede editar el contenido antes de guardar
 */
export function SaveMemoryModal({ isOpen, onClose, initialContent, messageType, onSave }) {
  const [content, setContent] = useState(initialContent || '');
  const [scope, setScope] = useState('user');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    if (!content.trim()) {
      setError('El contenido no puede estar vacío');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave({
        content: content.trim(),
        type: messageType, // 'agreement' | 'fact'
        scope
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Error guardando memoria');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const typeLabel = messageType === 'agreement' ? 'Acuerdo' : 'Hecho Importante';
  const typeDescription = messageType === 'agreement' 
    ? 'Decisiones o compromisos que deben recordarse'
    : 'Información clave para el contexto del proyecto';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div 
        className="w-full max-w-2xl rounded-xl shadow-2xl"
        style={{ 
          backgroundColor: 'var(--color-bg-primary)',
          border: '1px solid var(--color-border)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Guardar como {typeLabel}
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              {typeDescription}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-all"
            style={{ color: 'var(--color-text-secondary)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Info banner */}
          <div 
            className="flex gap-3 p-3 rounded-lg"
            style={{ 
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.2)'
            }}
          >
            <AlertCircle size={20} className="flex-shrink-0 text-blue-400 mt-0.5" />
            <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <p className="font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                Esto permitirá que AL-E lo recuerde en el futuro
              </p>
              <p>Solo se recordará lo que tú confirmes. Puedes editar el texto antes de guardar.</p>
            </div>
          </div>

          {/* Editable content */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
              Contenido a recordar:
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-3 rounded-lg border resize-none"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
                minHeight: '120px'
              }}
              placeholder="Escribe o edita el contenido a recordar..."
            />
          </div>

          {/* Scope selector */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
              Alcance de la memoria:
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setScope('user')}
                className={`flex-1 p-3 rounded-lg border transition-all ${
                  scope === 'user' ? 'ring-2' : ''
                }`}
                style={{
                  backgroundColor: scope === 'user' ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
                  borderColor: scope === 'user' ? 'var(--color-accent)' : 'var(--color-border)',
                  color: scope === 'user' ? '#FFFFFF' : 'var(--color-text-primary)',
                  ringColor: 'var(--color-accent)'
                }}
              >
                <div className="text-sm font-medium">Personal</div>
                <div className="text-xs mt-1 opacity-80">Solo para ti en todos los proyectos</div>
              </button>
              
              <button
                onClick={() => setScope('project')}
                className={`flex-1 p-3 rounded-lg border transition-all ${
                  scope === 'project' ? 'ring-2' : ''
                }`}
                style={{
                  backgroundColor: scope === 'project' ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
                  borderColor: scope === 'project' ? 'var(--color-accent)' : 'var(--color-border)',
                  color: scope === 'project' ? '#FFFFFF' : 'var(--color-text-primary)',
                  ringColor: 'var(--color-accent)'
                }}
              >
                <div className="text-sm font-medium">Proyecto</div>
                <div className="text-xs mt-1 opacity-80">Compartido con el equipo</div>
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div 
              className="flex items-center gap-2 p-3 rounded-lg"
              style={{ 
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)'
              }}
            >
              <AlertCircle size={16} className="text-red-400" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg transition-all"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)'
            }}
            disabled={isSaving}
          >
            Cancelar
          </button>
          
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg transition-all flex items-center gap-2"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: '#FFFFFF'
            }}
            disabled={isSaving || !content.trim()}
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save size={16} />
                Guardar Memoria
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
