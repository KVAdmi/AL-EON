import React, { useState } from 'react';
import { X, Save, FolderPlus } from 'lucide-react';

const EMOJI_OPTIONS = ['📁', '🚀', '💼', '🎯', '📊', '💡', '🔬', '🎨', '📱', '⚡', '🌟', '🔥'];
const COLOR_OPTIONS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#6B7280', // gray
  '#14B8A6', // teal
];

/**
 * Modal para crear/editar proyecto
 */
export function ProjectModal({ isOpen, onClose, onSave, project = null }) {
  const [name, setName] = useState(project?.name || '');
  const [description, setDescription] = useState(project?.description || '');
  const [color, setColor] = useState(project?.color || '#3B82F6');
  const [icon, setIcon] = useState(project?.icon || '📁');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const isEditing = Boolean(project);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('El nombre del proyecto es requerido');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        color,
        icon
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Error guardando proyecto');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div 
        className="w-full max-w-lg rounded-xl shadow-2xl"
        style={{ 
          backgroundColor: 'var(--color-bg-primary)',
          border: '1px solid var(--color-border)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-3">
            <div className="text-2xl">{icon}</div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {isEditing ? 'Editar Proyecto' : 'Nuevo Proyecto'}
            </h2>
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
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
              Nombre del proyecto *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 rounded-lg border"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)'
              }}
              placeholder="Ej: Startup Ideas, Data Analysis..."
              maxLength={50}
              autoFocus
            />
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
              {name.length}/50 caracteres
            </p>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
              Descripción (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 rounded-lg border resize-none"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
                minHeight: '80px'
              }}
              placeholder="Breve descripción del proyecto..."
              maxLength={200}
            />
          </div>

          {/* Icono */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
              Icono
            </label>
            <div className="grid grid-cols-6 gap-2">
              {EMOJI_OPTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => setIcon(emoji)}
                  className={`text-2xl p-2 rounded-lg transition-all ${
                    icon === emoji ? 'ring-2' : ''
                  }`}
                  style={{
                    backgroundColor: icon === emoji ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
                    borderColor: 'var(--color-border)',
                    border: '1px solid',
                    ringColor: 'var(--color-accent)'
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
              Color
            </label>
            <div className="grid grid-cols-8 gap-2">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-10 h-10 rounded-lg transition-all ${
                    color === c ? 'ring-2 ring-offset-2' : ''
                  }`}
                  style={{
                    backgroundColor: c,
                    ringColor: c,
                    ringOffsetColor: 'var(--color-bg-primary)'
                  }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div 
              className="p-3 rounded-lg text-sm"
              style={{ 
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#EF4444'
              }}
            >
              {error}
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
              backgroundColor: color,
              color: '#FFFFFF'
            }}
            disabled={isSaving || !name.trim()}
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                {isEditing ? <Save size={16} /> : <FolderPlus size={16} />}
                {isEditing ? 'Guardar Cambios' : 'Crear Proyecto'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
