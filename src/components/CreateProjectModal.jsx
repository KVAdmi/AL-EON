import React, { useState } from 'react';
import { X, FolderPlus } from 'lucide-react';

const PRESET_COLORS = [
  { name: 'Azul', value: '#3B82F6' },
  { name: 'Verde', value: '#10B981' },
  { name: 'Púrpura', value: '#8B5CF6' },
  { name: 'Rosa', value: '#EC4899' },
  { name: 'Amarillo', value: '#F59E0B' },
  { name: 'Rojo', value: '#EF4444' },
  { name: 'Gris', value: '#6B7280' },
  { name: 'Índigo', value: '#6366F1' },
];

const PRESET_ICONS = ['📁', '🚀', '💼', '📊', '🎯', '💡', '🔬', '🎨', '📝', '🌟', '⚡', '🔥'];

/**
 * Modal para crear o editar proyectos
 */
export function CreateProjectModal({ isOpen, onClose, onSave, existingProject }) {
  const [name, setName] = useState(existingProject?.name || '');
  const [description, setDescription] = useState(existingProject?.description || '');
  const [color, setColor] = useState(existingProject?.color || '#3B82F6');
  const [icon, setIcon] = useState(existingProject?.icon || '📁');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

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
      // Reset form
      setName('');
      setDescription('');
      setColor('#3B82F6');
      setIcon('📁');
    } catch (err) {
      setError(err.message || 'Error guardando proyecto');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const isEditing = !!existingProject;

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
          <div className="flex items-center gap-2">
            <FolderPlus size={20} style={{ color: 'var(--color-accent)' }} />
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
              Nombre del proyecto <span className="text-red-500">*</span>
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
              placeholder="Ej: Startup Ideas, Research, Personal..."
              autoFocus
            />
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
              placeholder="Describe de qué trata este proyecto..."
            />
          </div>

          {/* Icono */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
              Ícono
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_ICONS.map((presetIcon) => (
                <button
                  key={presetIcon}
                  onClick={() => setIcon(presetIcon)}
                  className={`w-10 h-10 rounded-lg text-xl transition-all ${
                    icon === presetIcon ? 'ring-2' : ''
                  }`}
                  style={{
                    backgroundColor: icon === presetIcon ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    ringColor: 'var(--color-accent)'
                  }}
                >
                  {presetIcon}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor.value}
                  onClick={() => setColor(presetColor.value)}
                  className={`w-10 h-10 rounded-lg transition-all ${
                    color === presetColor.value ? 'ring-2 ring-offset-2' : ''
                  }`}
                  style={{
                    backgroundColor: presetColor.value,
                    border: '2px solid ' + (color === presetColor.value ? '#FFFFFF' : 'transparent')
                  }}
                  title={presetColor.name}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
            <div className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              Vista previa:
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{icon}</span>
              <div>
                <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {name || 'Nombre del proyecto'}
                </div>
                {description && (
                  <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                    {description}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg text-sm text-red-400" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
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
              backgroundColor: 'var(--color-accent)',
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
                <FolderPlus size={16} />
                {isEditing ? 'Actualizar' : 'Crear Proyecto'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
