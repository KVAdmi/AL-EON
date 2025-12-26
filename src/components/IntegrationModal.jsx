import React, { useState } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';

export default function IntegrationModal({ integration, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({});
  const [showSecrets, setShowSecrets] = useState({});
  const [saving, setSaving] = useState(false);

  if (!isOpen || !integration) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(integration.name, formData);
      onClose();
    } catch (error) {
      console.error('Error saving integration:', error);
      alert('Error al guardar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const getFieldConfig = (fieldName) => {
    const configs = {
      aws_access_key: { label: 'AWS Access Key ID', type: 'text', placeholder: 'AKIA...' },
      aws_secret_key: { label: 'AWS Secret Access Key', type: 'password', placeholder: 'wJalrXUtnFEMI/K7MDENG...' },
      aws_region: { label: 'AWS Region', type: 'select', options: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'] },
      github_token: { label: 'GitHub Personal Access Token', type: 'password', placeholder: 'ghp_...' },
      netlify_token: { label: 'Netlify Personal Access Token', type: 'password', placeholder: 'nfp_...' },
      google_play_key: { label: 'Google Play Service Account JSON', type: 'textarea', placeholder: '{ "type": "service_account", ... }' },
      app_store_key: { label: 'App Store Connect API Key', type: 'password', placeholder: 'key_...' },
    };
    return configs[fieldName] || { label: fieldName, type: 'text' };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
      <div 
        className="w-full max-w-2xl rounded-2xl p-4 md:p-6 shadow-xl my-8 max-h-[90vh] overflow-y-auto" 
        style={{ backgroundColor: 'var(--color-bg-secondary)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl md:text-2xl font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
              Configurar {integration.name}
            </h2>
            <p className="text-xs md:text-sm mt-1 truncate" style={{ color: 'var(--color-text-secondary)' }}>
              {integration.description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-opacity-80 transition-colors flex-shrink-0"
            style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
          >
            <X size={20} style={{ color: 'var(--color-text-primary)' }} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {integration.fields?.map(fieldName => {
            const config = getFieldConfig(fieldName);
            const isSecret = config.type === 'password';
            const showSecret = showSecrets[fieldName];

            return (
              <div key={fieldName}>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  {config.label}
                </label>
                
                {config.type === 'select' ? (
                  <select
                    value={formData[fieldName] || config.options[0]}
                    onChange={(e) => setFormData({ ...formData, [fieldName]: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl border focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)'
                    }}
                  >
                    {config.options.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : config.type === 'textarea' ? (
                  <textarea
                    value={formData[fieldName] || ''}
                    onChange={(e) => setFormData({ ...formData, [fieldName]: e.target.value })}
                    placeholder={config.placeholder}
                    rows={6}
                    className="w-full px-4 py-3 rounded-2xl border focus:outline-none focus:ring-2 font-mono text-sm"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)'
                    }}
                  />
                ) : (
                  <div className="relative">
                    <input
                      type={isSecret && !showSecret ? 'password' : 'text'}
                      value={formData[fieldName] || ''}
                      onChange={(e) => setFormData({ ...formData, [fieldName]: e.target.value })}
                      placeholder={config.placeholder}
                      className="w-full px-4 py-3 rounded-2xl border focus:outline-none focus:ring-2"
                      style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-primary)',
                        paddingRight: isSecret ? '3rem' : '1rem'
                      }}
                    />
                    {isSecret && (
                      <button
                        type="button"
                        onClick={() => setShowSecrets({ ...showSecrets, [fieldName]: !showSecret })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-opacity-80 rounded-lg"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Info Box */}
          <div className="p-4 rounded-xl border" style={{ 
            backgroundColor: 'rgba(59, 130, 246, 0.1)', 
            borderColor: 'rgba(59, 130, 246, 0.3)' 
          }}>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              💡 <strong>Seguridad:</strong> Tus credenciales se almacenan de forma segura y encriptada en Supabase. 
              Nunca se exponen en el código del cliente.
            </p>
          </div>

          {/* Actions - Sticky al final en móvil */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 mt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:flex-1 px-6 py-3 rounded-2xl font-medium transition-colors text-sm md:text-base"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-primary)'
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:flex-1 px-6 py-3 rounded-2xl font-medium transition-colors text-sm md:text-base"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: 'white',
                opacity: saving ? 0.6 : 1
              }}
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
