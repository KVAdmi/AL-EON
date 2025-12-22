import React, { useState } from 'react';
import { useUserProfile } from '../contexts/UserProfileContext';
import { Button } from '../components/ui/button';

export default function ProfilePage() {
  const { profile, updateProfile, loading } = useUserProfile();
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [timezone, setTimezone] = useState(profile?.timezone || 'America/Mexico_City');
  const [language, setLanguage] = useState(profile?.preferred_language || 'es');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const updates = {};
    
    if (displayName !== profile?.display_name) {
      updates.display_name = displayName;
    }
    if (timezone !== profile?.timezone) {
      updates.timezone = timezone;
    }
    
    const result = await updateProfile(updates);
    setSaving(false);

    if (result.success) {
      alert('Perfil actualizado');
    } else {
      alert('Error: ' + result.error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Cargando perfil...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6" style={{ color: 'var(--color-text-primary)' }}>
        Mi Perfil
      </h1>

      <div 
        className="rounded-xl shadow p-6 space-y-6"
        style={{ backgroundColor: 'var(--color-bg-secondary)' }}
      >
        {/* Email (no editable) */}
        <div>
          <label 
            className="block text-sm font-medium mb-2" 
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Email
          </label>
          <input
            type="email"
            value={profile?.email || ''}
            disabled
            className="w-full px-4 py-2 rounded-xl"
            style={{ 
              backgroundColor: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-tertiary)',
              cursor: 'not-allowed'
            }}
          />
        </div>

        {/* Rol (no editable) */}
        <div>
          <label 
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Rol
          </label>
          <div 
            className="px-4 py-2 rounded-xl"
            style={{ 
              backgroundColor: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-tertiary)'
            }}
          >
            {profile?.role === 'ROOT' ? 'ROOT (Admin Total)' : 'USER (Usuario)'}
          </div>
        </div>

        {/* Nombre */}
        <div>
          <label 
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Nombre
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-4 py-2 rounded-xl"
            placeholder="Tu nombre"
            style={{ 
              backgroundColor: 'var(--color-bg-primary)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)'
            }}
          />
        </div>

        {/* Idioma */}
        <div>
          <label 
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Idioma Preferido
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-4 py-2 rounded-xl"
            style={{ 
              backgroundColor: 'var(--color-bg-primary)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)'
            }}
          >
            <option value="es">Español</option>
            <option value="en">English</option>
            <option value="pt">Português</option>
          </select>
        </div>

        {/* Zona Horaria */}
        <div>
          <label 
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Zona Horaria
          </label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full px-4 py-2 rounded-xl"
            style={{ 
              backgroundColor: 'var(--color-bg-primary)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)'
            }}
          >
            <option value="America/Mexico_City">México</option>
            <option value="America/New_York">New York</option>
            <option value="America/Los_Angeles">Los Angeles</option>
            <option value="Europe/Madrid">Madrid</option>
            <option value="America/Sao_Paulo">São Paulo</option>
          </select>
        </div>

        {/* Botón Guardar */}
        <Button 
          onClick={handleSave} 
          disabled={saving} 
          className="w-full rounded-xl px-4 py-3 font-medium transition-all"
          style={{
            backgroundColor: saving ? 'var(--color-bg-tertiary)' : 'var(--color-accent)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border)',
            cursor: saving ? 'not-allowed' : 'pointer'
          }}
        >
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>
    </div>
  );
}
