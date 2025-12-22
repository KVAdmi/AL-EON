import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Palette, Database, Link2, Mic, Eye, Bell, Lock, CreditCard, Save, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  // Estado del perfil y configuración
  const [profile, setProfile] = useState({
    display_name: '',
    email: '',
    preferred_language: 'es',
    timezone: 'America/Mexico_City',
    theme: 'system'
  });
  
  const [settings, setSettings] = useState({
    ai_model: 'gpt-4',
    ai_temperature: 0.7,
    context_persistent: true,
    voice_enabled: false
  });

  const tabs = [
    { id: 'general', label: 'General', icon: <User size={18} /> },
    { id: 'personalization', label: 'Personalización', icon: <Palette size={18} /> },
    { id: 'data', label: 'Controles de datos', icon: <Database size={18} /> },
    { id: 'integrations', label: 'Integraciones', icon: <Link2 size={18} /> },
    { id: 'voice', label: 'Voz', icon: <Mic size={18} /> },
    { id: 'accessibility', label: 'Accesibilidad', icon: <Eye size={18} /> },
    { id: 'notifications', label: 'Notificaciones', icon: <Bell size={18} /> },
    { id: 'security', label: 'Seguridad', icon: <Lock size={18} /> },
    { id: 'billing', label: 'Plan', icon: <CreditCard size={18} /> },
  ];

  // Cargar datos al montar
  useEffect(() => {
    loadUserData();
  }, [user]);

  async function loadUserData() {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Cargar perfil
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (profileData) {
        setProfile({
          display_name: profileData.display_name || '',
          email: profileData.email || user.email,
          preferred_language: profileData.preferred_language || 'es',
          timezone: profileData.timezone || 'America/Mexico_City',
          theme: profileData.theme || 'system'
        });
      }
      
      // Cargar settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (settingsData) {
        setSettings({
          ai_model: settingsData.ai_model || 'gpt-4',
          ai_temperature: settingsData.ai_temperature || 0.7,
          context_persistent: settingsData.context_persistent ?? true,
          voice_enabled: settingsData.voice_enabled ?? false
        });
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  }

  async function saveChanges() {
    if (!user) return;
    
    try {
      setSaving(true);
      
      // Guardar perfil
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          display_name: profile.display_name,
          preferred_language: profile.preferred_language,
          timezone: profile.timezone,
          theme: profile.theme
        })
        .eq('user_id', user.id);
      
      if (profileError) throw profileError;
      
      // Guardar settings
      const { error: settingsError } = await supabase
        .from('user_settings')
        .update({
          ai_model: settings.ai_model,
          ai_temperature: settings.ai_temperature,
          context_persistent: settings.context_persistent,
          voice_enabled: settings.voice_enabled
        })
        .eq('user_id', user.id);
      
      if (settingsError) throw settingsError;
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error guardando cambios:', error);
      alert('Error al guardar cambios');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div style={{ color: 'var(--color-text-secondary)' }}>Cargando...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:opacity-80 transition-all" style={{ color: 'var(--color-text-secondary)' }}>
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Configuración</h1>
          </div>
          <button
            onClick={saveChanges}
            disabled={saving || saved}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
            style={{
              backgroundColor: saved ? '#10b981' : 'var(--color-accent)',
              color: 'white',
              opacity: saving ? 0.7 : 1
            }}
          >
            {saved ? <Check size={18} /> : <Save size={18} />}
            {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar cambios'}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="max-w-6xl mx-auto h-full flex gap-6 p-6">
          <div className="w-64 flex-shrink-0 space-y-1">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left" style={{ backgroundColor: activeTab === tab.id ? 'var(--color-bg-secondary)' : 'transparent', color: activeTab === tab.id ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', fontWeight: activeTab === tab.id ? 500 : 400 }}>
                {tab.icon}
                <span className="text-sm">{tab.label}</span>
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="rounded-xl p-8 border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
              <TabContent 
                activeTab={activeTab} 
                profile={profile} 
                setProfile={setProfile}
                settings={settings}
                setSettings={setSettings}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabContent({ activeTab, profile, setProfile, settings, setSettings }) {
  // General
  if (activeTab === 'general') {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>General</h2>
        
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Nombre para mostrar
          </label>
          <input
            type="text"
            value={profile.display_name}
            onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)'
            }}
            placeholder="Tu nombre"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Email
          </label>
          <input
            type="email"
            value={profile.email}
            disabled
            className="w-full px-4 py-2 rounded-lg border opacity-60"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)'
            }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Idioma
          </label>
          <select
            value={profile.preferred_language}
            onChange={(e) => setProfile({ ...profile, preferred_language: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)'
            }}
          >
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>
    );
  }

  // Personalización
  if (activeTab === 'personalization') {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Personalización</h2>
        
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Tema
          </label>
          <select
            value={profile.theme}
            onChange={(e) => setProfile({ ...profile, theme: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)'
            }}
          >
            <option value="light">Claro</option>
            <option value="dark">Oscuro</option>
            <option value="system">Sistema</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Modelo de IA
          </label>
          <select
            value={settings.ai_model}
            onChange={(e) => setSettings({ ...settings, ai_model: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)'
            }}
          >
            <option value="gpt-4">GPT-4</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Temperatura: {settings.ai_temperature}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={settings.ai_temperature}
            onChange={(e) => setSettings({ ...settings, ai_temperature: parseFloat(e.target.value) })}
            className="w-full"
          />
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
            Mayor temperatura = respuestas más creativas
          </p>
        </div>
      </div>
    );
  }

  // Voz
  if (activeTab === 'voice') {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Voz</h2>
        
        <div className="flex items-center justify-between p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)' }}>
          <div>
            <h3 className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Habilitar voz</h3>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Respuestas por voz automáticas</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.voice_enabled}
              onChange={(e) => setSettings({ ...settings, voice_enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" style={{ backgroundColor: settings.voice_enabled ? 'var(--color-accent)' : '#6b7280' }}></div>
          </label>
        </div>
      </div>
    );
  }

  // Integraciones
  if (activeTab === 'integrations') {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Integraciones</h2>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Próximamente: Conecta servicios externos</p>
      </div>
    );
  }

  // Resto de tabs
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        {activeTab === 'data' && 'Controles de datos'}
        {activeTab === 'accessibility' && 'Accesibilidad'}
        {activeTab === 'notifications' && 'Notificaciones'}
        {activeTab === 'security' && 'Seguridad'}
        {activeTab === 'billing' && 'Plan y facturación'}
      </h2>
      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>En desarrollo</p>
    </div>
  );
}
