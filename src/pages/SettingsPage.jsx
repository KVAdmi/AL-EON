import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, User, Palette, Database, Link2, Mic, Eye, Bell, Lock, CreditCard, 
  Save, Check, Code, Trash2, Download, AlertTriangle, Shield, Globe, Volume2, 
  Moon, Sun, Monitor, Wifi, WifiOff
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import IntegrationModal from '../components/IntegrationModal';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking');
  
  // Estado del perfil y configuración
  const [profile, setProfile] = useState({
    display_name: '',
    email: '',
    preferred_language: 'es',
    timezone: 'America/Mexico_City',
    theme: 'system',
    role: 'USER'
  });
  const [settings, setSettings] = useState({
    ai_model: 'gpt-4',
    ai_temperature: 0.7,
    context_persistent: true,
    voice_enabled: false
  });

  // Estado del modal de integraciones
  const [integrationModal, setIntegrationModal] = useState({
    isOpen: false,
    integration: null
  });

  const tabs = [
    { id: 'general', label: 'General', icon: <User size={18} /> },
    { id: 'personalization', label: 'Personalización', icon: <Palette size={18} /> },
    { id: 'voice', label: 'Voz', icon: <Mic size={18} /> },
    { id: 'memory', label: 'Memoria', icon: <Database size={18} /> },
    { id: 'integrations', label: 'Integraciones', icon: <Link2 size={18} /> },
    { id: 'developer', label: 'Desarrollador', icon: <Code size={18} /> },
    { id: 'notifications', label: 'Notificaciones', icon: <Bell size={18} /> },
    { id: 'data', label: 'Datos y privacidad', icon: <Shield size={18} /> },
  ];

  // Verificar estado del backend
  useEffect(() => {
    checkBackendHealth();
    const interval = setInterval(checkBackendHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  async function checkBackendHealth() {
    try {
      const BASE_URL = import.meta.env.VITE_ALE_CORE_BASE || import.meta.env.VITE_ALE_CORE_URL || 'https://api.al-eon.com';
      const url = `${BASE_URL}/api/ai/chat`;
      
      console.log("🏥 Health check URL =>", url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'universal', // ✅ AL-EON usa modo universal
          workspaceId: 'core',
          userId: 'health-check',
          messages: [{ role: 'user', content: 'ping' }]
        })
      });
      setBackendStatus(response.ok ? 'online' : 'error');
    } catch (error) {
      setBackendStatus('offline');
    }
  }

  // Cargar datos al montar
  useEffect(() => {
    loadUserData();
  }, [user]);

  async function loadUserData() {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // ✅ VERIFICAR SESIÓN ACTIVA ANTES DE HACER FETCH
      const { data: { session } } = await supabase.auth.getSession();

      // ❌ SI NO HAY SESIÓN: usar defaults en memoria
      if (!session?.user?.id) {
        console.warn('⚠️ No hay sesión activa - usando defaults en memoria');
        setProfile({
          display_name: '',
          email: user?.email || '',
          preferred_language: 'es',
          timezone: 'America/Mexico_City',
          theme: 'system',
          role: 'USER'
        });
        setSettings({
          ai_model: 'gpt-4',
          ai_temperature: 0.7,
          context_persistent: true,
          voice_enabled: false
        });
        setLoading(false);
        return;
      }
      
      // ✅ SOLO SI HAY SESIÓN: hacer fetch a user_profiles
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      
      // Ignorar 403 silenciosamente
      if (profileError && (profileError.code === '42501' || profileError.message?.includes('permission denied'))) {
        console.warn('⚠️ Perfil no accesible (403), usando defaults');
      }
      
      // SIEMPRE cargar datos, aunque no exista el perfil o haya error 403
      setProfile({
        display_name: profileData?.display_name || '',
        email: profileData?.email || session.user.email || '',
        preferred_language: profileData?.preferred_language || 'es',
        timezone: profileData?.timezone || 'America/Mexico_City',
        theme: profileData?.theme || 'system',
        role: profileData?.role || 'USER',
        // Nuevos campos de personalización
        preferred_name: profileData?.preferred_name || '',
        assistant_name: profileData?.assistant_name || 'Luma',
        tone_pref: profileData?.tone_pref || 'barrio'
      });
      
      // ✅ SOLO SI HAY SESIÓN: hacer fetch a user_settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      
      // Ignorar 403 silenciosamente
      if (settingsError && (settingsError.code === '42501' || settingsError.message?.includes('permission denied'))) {
        console.warn('⚠️ Settings no accesibles (403), usando defaults');
      }
      
      // SIEMPRE cargar settings
      setSettings({
        ai_model: settingsData?.ai_model || 'gpt-4',
        ai_temperature: settingsData?.ai_temperature || 0.7,
        context_persistent: settingsData?.context_persistent ?? true,
        voice_enabled: settingsData?.voice_enabled ?? false
      });
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
      
      // ✅ VERIFICAR SESIÓN ANTES DE GUARDAR
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user?.id) {
        console.warn('⚠️ No se pueden guardar cambios sin sesión activa');
        alert('No hay sesión activa. Por favor, inicia sesión nuevamente.');
        return;
      }
      
      // ✅ SOLO SI HAY SESIÓN: guardar perfil
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          display_name: profile.display_name,
          preferred_language: profile.preferred_language,
          timezone: profile.timezone,
          theme: profile.theme,
          // Nuevos campos de personalización
          preferred_name: profile.preferred_name,
          assistant_name: profile.assistant_name,
          tone_pref: profile.tone_pref
        })
        .eq('user_id', session.user.id);
      
      // Ignorar 403 silenciosamente
      if (profileError && !(profileError.code === '42501' || profileError.message?.includes('permission denied'))) {
        throw profileError;
      }
      
      // ✅ SOLO SI HAY SESIÓN: guardar settings
      const { error: settingsError } = await supabase
        .from('user_settings')
        .update({
          ai_model: settings.ai_model,
          ai_temperature: settings.ai_temperature,
          context_persistent: settings.context_persistent,
          voice_enabled: settings.voice_enabled
        })
        .eq('user_id', session.user.id);
      
      // Ignorar 403 silenciosamente
      if (settingsError && !(settingsError.code === '42501' || settingsError.message?.includes('permission denied'))) {
        throw settingsError;
      }
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      
      // Refresh del perfil en AuthContext para actualizar sidebar
      if (refreshProfile) {
        await refreshProfile();
      }
    } catch (error) {
      console.error('Error guardando cambios:', error);
      alert('Error al guardar cambios: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  // Guardar configuración de integración
  async function saveIntegration(integrationName, formData) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;

    // Mapear campos a columnas de la base de datos
    const updates = {};
    Object.keys(formData).forEach(key => {
      updates[key] = formData[key];
    });

    // Agregar flag de configuración
    const configKey = `${integrationName.toLowerCase().replace(/\s+/g, '_')}_configured`;
    updates[configKey] = true;

    const { error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('user_id', session.user.id);

    if (error) throw error;

    // Recargar perfil
    await loadUserData();
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div style={{ color: 'var(--color-text-secondary)' }}>Cargando configuración...</div>
      </div>
    );
  }

  const isOwner = profile.role === 'ROOT' || profile.email === 'pgaribay@infinitykode.com';

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 rounded-2xl hover:opacity-80 transition-all" style={{ color: 'var(--color-text-secondary)' }}>
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Configuración</h1>
            
            {/* Status indicator */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs" style={{
              backgroundColor: backendStatus === 'online' ? 'rgba(16, 185, 129, 0.1)' : 
                              backendStatus === 'offline' ? 'rgba(239, 68, 68, 0.1)' : 
                              'rgba(251, 191, 36, 0.1)',
              color: backendStatus === 'online' ? '#10b981' : 
                     backendStatus === 'offline' ? '#ef4444' : 
                     '#fbbf24'
            }}>
              {backendStatus === 'online' ? <Wifi size={12} /> : <WifiOff size={12} />}
              <span>{backendStatus === 'online' ? 'Conectado' : backendStatus === 'offline' ? 'Desconectado' : 'Verificando...'}</span>
            </div>
          </div>
          
          <button
            onClick={saveChanges}
            disabled={saving || saved}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl font-medium transition-all"
            style={{
              backgroundColor: saved ? '#10b981' : 'var(--color-accent)',
              color: 'white',
              opacity: saving ? 0.7 : 1,
              cursor: (saving || saved) ? 'not-allowed' : 'pointer'
            }}
          >
            {saved ? <Check size={18} /> : <Save size={18} />}
            {saving ? 'Guardando...' : saved ? '¡Guardado!' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-6xl mx-auto h-full flex flex-col md:flex-row gap-4 md:gap-6 p-4 md:p-6">
          {/* Sidebar - Horizontal scroll en móvil, vertical en desktop */}
          <div className="md:w-64 flex-shrink-0">
            {/* Móvil: Scroll horizontal */}
            <div className="flex md:hidden overflow-x-auto gap-2 pb-2 -mx-4 px-4">
              {tabs.map(tab => (
                <button 
                  key={tab.id} 
                  onClick={() => setActiveTab(tab.id)} 
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl transition-all whitespace-nowrap flex-shrink-0" 
                  style={{ 
                    backgroundColor: activeTab === tab.id ? 'var(--color-accent)' : 'var(--color-bg-secondary)', 
                    color: activeTab === tab.id ? '#FFFFFF' : 'var(--color-text-secondary)', 
                    fontWeight: activeTab === tab.id ? 600 : 400,
                    border: activeTab === tab.id ? 'none' : '1px solid var(--color-border)'
                  }}
                >
                  {tab.icon}
                  <span className="text-sm">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Desktop: Lista vertical */}
            <div className="hidden md:block space-y-1">
              {tabs.map(tab => (
                <button 
                  key={tab.id} 
                  onClick={() => setActiveTab(tab.id)} 
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left" 
                  style={{ 
                    backgroundColor: activeTab === tab.id ? 'var(--color-bg-secondary)' : 'transparent', 
                    color: activeTab === tab.id ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', 
                    fontWeight: activeTab === tab.id ? 500 : 400 
                  }}
                >
                  {tab.icon}
                  <span className="text-sm">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            <div className="rounded-2xl p-4 md:p-8 border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
              <TabContent 
                activeTab={activeTab} 
                profile={profile} 
                setProfile={setProfile}
                settings={settings}
                setSettings={setSettings}
                isOwner={isOwner}
                backendStatus={backendStatus}
                setIntegrationModal={setIntegrationModal}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modal de integración */}
      <IntegrationModal 
        integration={integrationModal.integration}
        isOpen={integrationModal.isOpen}
        onClose={() => setIntegrationModal({ isOpen: false, integration: null })}
        onSave={saveIntegration}
      />
    </div>
  );
}

function TabContent({ activeTab, profile, setProfile, settings, setSettings, isOwner, backendStatus, setIntegrationModal }) {
  // Estados para notificaciones
  const [notifSettings, setNotifSettings] = useState({
    push_enabled: false,
    email_daily: true,
    email_mentions: true,
    notify_responses: false,
    notify_errors: true,
  });

  useEffect(() => {
    // Actualizar estado de notificaciones al cargar
    if (typeof Notification !== 'undefined') {
      setNotifSettings(prev => ({
        ...prev,
        push_enabled: Notification.permission === 'granted'
      }));
    }
  }, []);

  const handleToggleNotif = (key, value) => {
    setNotifSettings(prev => ({ ...prev, [key]: value }));
    setSettings(prev => ({ 
      ...prev, 
      [`${key}`]: value
    }));
  };

  // ===== GENERAL =====
  if (activeTab === 'general') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>General</h2>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Configuración básica de tu cuenta
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Nombre para mostrar
          </label>
          <input
            type="text"
            value={profile.display_name}
            onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
            className="w-full px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-offset-0 transition-all"
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
            className="w-full px-4 py-2 rounded-xl border opacity-60 cursor-not-allowed"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)'
            }}
          />
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
            El email no se puede cambiar
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Idioma preferido
          </label>
          <select
            value={profile.preferred_language}
            onChange={(e) => setProfile({ ...profile, preferred_language: e.target.value })}
            className="w-full px-4 py-2 rounded-xl border outline-none focus:ring-2 transition-all"
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

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Zona horaria
          </label>
          <select
            value={profile.timezone}
            onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
            className="w-full px-4 py-2 rounded-xl border outline-none focus:ring-2 transition-all"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)'
            }}
          >
            <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
            <option value="America/New_York">Nueva York (GMT-5)</option>
            <option value="America/Los_Angeles">Los Ángeles (GMT-8)</option>
            <option value="Europe/Madrid">Madrid (GMT+1)</option>
          </select>
        </div>
      </div>
    );
  }

  // ===== PERSONALIZACIÓN =====
  if (activeTab === 'personalization') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>Personalización</h2>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Personaliza tu identidad y cómo AL-E interactúa contigo
          </p>
        </div>

        {/* SECCIÓN: Identidad del Usuario */}
        <div className="p-5 rounded-2xl border" style={{ 
          backgroundColor: 'var(--color-bg-tertiary)', 
          borderColor: 'var(--color-border)' 
        }}>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
            <User size={20} />
            Tu Identidad
          </h3>

          <div className="space-y-4">
            {/* Nombre preferido */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                ¿Cómo quieres que te diga?
              </label>
              <p className="text-xs mb-3" style={{ color: 'var(--color-text-tertiary)' }}>
                El nombre que AL-E usará para dirigirse a ti en las conversaciones
              </p>
              <input
                type="text"
                value={profile.preferred_name || ''}
                onChange={(e) => setProfile({ ...profile, preferred_name: e.target.value })}
                placeholder="Ej: Patto, Jefe, Boss"
                className="w-full px-4 py-3 rounded-2xl border focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)'
                }}
                maxLength={30}
              />
            </div>

            {/* Nombre del asistente */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                ¿Cómo se llama tu IA?
              </label>
              <p className="text-xs mb-3" style={{ color: 'var(--color-text-tertiary)' }}>
                Dale un nombre personalizado a tu asistente de IA
              </p>
              <input
                type="text"
                value={profile.assistant_name || 'Luma'}
                onChange={(e) => setProfile({ ...profile, assistant_name: e.target.value })}
                placeholder="Ej: Luma, Jarvis, Nova"
                className="w-full px-4 py-3 rounded-2xl border focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)'
                }}
                maxLength={30}
              />
            </div>

            {/* Tono de conversación */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                Tono de conversación
              </label>
              <p className="text-xs mb-3" style={{ color: 'var(--color-text-tertiary)' }}>
                Cómo quieres que hable contigo
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { value: 'barrio', label: 'Directo', desc: 'Sin rodeos, al grano' },
                  { value: 'pro', label: 'Profesional', desc: 'Formal y corporativo' },
                  { value: 'neutral', label: 'Equilibrado', desc: 'Natural y conversacional' }
                ].map(tone => (
                  <button
                    key={tone.value}
                    onClick={() => setProfile({ ...profile, tone_pref: tone.value })}
                    className="flex flex-col items-start gap-2 p-4 rounded-2xl border-2 transition-all text-left"
                    style={{
                      backgroundColor: profile.tone_pref === tone.value ? 'var(--color-accent-light)' : 'var(--color-bg-secondary)',
                      borderColor: profile.tone_pref === tone.value ? 'var(--color-accent)' : 'var(--color-border)',
                      color: 'var(--color-text-primary)'
                    }}
                  >
                    <span className="font-medium">{tone.label}</span>
                    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{tone.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Nombre de usuario (para mostrar en sidebar) */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Nombre para mostrar
          </label>
          <p className="text-xs mb-3" style={{ color: 'var(--color-text-tertiary)' }}>
            Este nombre se mostrará en lugar de tu email en la barra lateral
          </p>
          <input
            type="text"
            value={profile.display_name || ''}
            onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
            placeholder="Tu nombre"
            className="w-full px-4 py-3 rounded-2xl border focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)'
            }}
            maxLength={50}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>
            Tema
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'light', label: 'Claro', icon: <Sun size={20} /> },
              { value: 'dark', label: 'Oscuro', icon: <Moon size={20} /> },
              { value: 'system', label: 'Sistema', icon: <Monitor size={20} /> }
            ].map(theme => (
              <button
                key={theme.value}
                onClick={() => setProfile({ ...profile, theme: theme.value })}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all"
                style={{
                  backgroundColor: profile.theme === theme.value ? 'var(--color-accent-light)' : 'var(--color-bg-tertiary)',
                  borderColor: profile.theme === theme.value ? 'var(--color-accent)' : 'var(--color-border)',
                  color: profile.theme === theme.value ? 'var(--color-accent-bright)' : 'var(--color-text-primary)'
                }}
              >
                {theme.icon}
                <span className="text-sm font-medium">{theme.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Modelo de IA predeterminado
          </label>
          <select
            value={settings.ai_model}
            onChange={(e) => setSettings({ ...settings, ai_model: e.target.value })}
            className="w-full px-4 py-2 rounded-xl border outline-none focus:ring-2 transition-all"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)'
            }}
          >
            <option value="gpt-4">GPT-4 (Recomendado)</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Más rápido)</option>
          </select>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
            GPT-4 ofrece respuestas más precisas y contextuales
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Creatividad: {settings.ai_temperature.toFixed(1)}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={settings.ai_temperature}
            onChange={(e) => setSettings({ ...settings, ai_temperature: parseFloat(e.target.value) })}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${settings.ai_temperature * 100}%, var(--color-border) ${settings.ai_temperature * 100}%, var(--color-border) 100%)`
            }}
          />
          <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
            <span>Preciso</span>
            <span>Balanceado</span>
            <span>Creativo</span>
          </div>
        </div>
      </div>
    );
  }

  // ===== VOZ =====
  if (activeTab === 'voice') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>Voz</h2>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Configura la síntesis y reconocimiento de voz
          </p>
        </div>
        
        <div className="p-5 rounded-xl border flex items-center justify-between" style={{ 
          backgroundColor: 'var(--color-bg-tertiary)', 
          borderColor: 'var(--color-border)' 
        }}>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--color-accent-light)' }}>
              <Volume2 size={24} style={{ color: 'var(--color-accent)' }} />
            </div>
            <div>
              <h3 className="font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                Respuestas por voz
              </h3>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Escucha las respuestas de AL-E automáticamente
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.voice_enabled}
              onChange={(e) => setSettings({ ...settings, voice_enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" 
              style={{ 
                backgroundColor: settings.voice_enabled ? 'var(--color-accent)' : '#6b7280' 
              }}
            />
          </label>
        </div>
      </div>
    );
  }

  // ===== MEMORIA =====
  if (activeTab === 'memory') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>Memoria</h2>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Controla cómo AL-E recuerda información entre conversaciones
          </p>
        </div>
        
        <div className="p-5 rounded-xl border flex items-center justify-between" style={{ 
          backgroundColor: 'var(--color-bg-tertiary)', 
          borderColor: 'var(--color-border)' 
        }}>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--color-accent-light)' }}>
              <Database size={24} style={{ color: 'var(--color-accent)' }} />
            </div>
            <div>
              <h3 className="font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                Persistencia de contexto
              </h3>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                AL-E recordará conversaciones previas
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.context_persistent}
              onChange={(e) => setSettings({ ...settings, context_persistent: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" 
              style={{ 
                backgroundColor: settings.context_persistent ? 'var(--color-accent)' : '#6b7280' 
              }}
            />
          </label>
        </div>

        <div className="p-4 rounded-xl border" style={{ 
          backgroundColor: 'rgba(251, 191, 36, 0.1)', 
          borderColor: 'rgba(251, 191, 36, 0.3)' 
        }}>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            ⚠️ <strong>Nota:</strong> Desactivar la persistencia hará que cada conversación sea independiente. No se compartirá contexto entre sesiones.
          </p>
        </div>
      </div>
    );
  }

  // ===== INTEGRACIONES =====
  if (activeTab === 'integrations') {
    const integrations = [
      { 
        name: 'AL-E Core', 
        description: 'Motor de IA principal', 
        status: backendStatus === 'online' ? 'connected' : 'error',
        category: 'core',
        configurable: false
      },
      { 
        name: 'Supabase', 
        description: 'Base de datos y autenticación', 
        status: 'connected', 
        category: 'core',
        configurable: false
      },
      { 
        name: 'AWS', 
        description: 'Infraestructura en la nube', 
        status: profile?.aws_configured ? 'connected' : 'not-configured', 
        category: 'infrastructure',
        configurable: true,
        fields: ['aws_access_key', 'aws_secret_key', 'aws_region']
      },
      { 
        name: 'GitHub', 
        description: 'Repositorios y código', 
        status: profile?.github_configured ? 'connected' : 'not-configured', 
        category: 'development',
        configurable: true,
        fields: ['github_token']
      },
      { 
        name: 'Netlify', 
        description: 'Despliegue de frontend', 
        status: profile?.netlify_configured ? 'connected' : 'not-configured', 
        category: 'deployment',
        configurable: true,
        fields: ['netlify_token']
      },
      { 
        name: 'OpenAI', 
        description: 'Modelos de lenguaje', 
        status: 'connected', 
        category: 'ai',
        configurable: false
      },
      { 
        name: 'Google Play', 
        description: 'App Store para Android', 
        status: profile?.google_play_configured ? 'connected' : 'not-configured', 
        category: 'mobile',
        configurable: true,
        fields: ['google_play_key']
      },
      { 
        name: 'App Store Connect', 
        description: 'App Store para iOS', 
        status: profile?.app_store_configured ? 'connected' : 'not-configured', 
        category: 'mobile',
        configurable: true,
        fields: ['app_store_key']
      },
    ];

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>Integraciones</h2>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Conecta servicios externos con AL-EON. Configura tus claves API aquí.
          </p>
        </div>

        {/* Botón: Mis Integraciones (Gmail, Calendar, Meet) */}
        <div 
          onClick={() => navigate('/settings/integrations')}
          className="p-6 rounded-2xl border cursor-pointer hover:shadow-lg transition-all group" 
          style={{ 
            backgroundColor: 'var(--color-bg-tertiary)', 
            borderColor: 'var(--color-accent)',
            borderWidth: '2px'
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-500 text-white text-2xl">
                🔗
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  Mis Integraciones
                </h3>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Conecta tu Gmail, Google Calendar y Google Meet
                </p>
                <div className="flex gap-2 mt-2">
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                    Gmail
                  </span>
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                    Calendar
                  </span>
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                    Meet
                  </span>
                </div>
              </div>
            </div>
            <div className="text-2xl group-hover:translate-x-1 transition-transform">
              →
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {integrations.map(integration => (
            <div 
              key={integration.name}
              className="p-5 rounded-2xl border flex items-center justify-between" 
              style={{ 
                backgroundColor: 'var(--color-bg-tertiary)', 
                borderColor: 'var(--color-border)' 
              }}
            >
              <div className="flex items-center gap-4 flex-1">
                <div className={`w-3 h-3 rounded-full`} style={{
                  backgroundColor: integration.status === 'connected' ? '#10b981' : 
                                 integration.status === 'error' ? '#ef4444' : '#6b7280'
                }} />
                <div className="flex-1">
                  <h3 className="font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                    {integration.name}
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    {integration.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium" style={{
                  color: integration.status === 'connected' ? '#10b981' : 
                         integration.status === 'error' ? '#ef4444' : '#6b7280'
                }}>
                  {integration.status === 'connected' ? 'Conectado' :
                   integration.status === 'error' ? 'Error' : 'No configurado'}
                </div>
                {integration.configurable && (
                  <button
                    onClick={() => setIntegrationModal({ isOpen: true, integration })}
                    className="px-4 py-2 rounded-2xl text-sm font-medium transition-all"
                    style={{
                      backgroundColor: 'var(--color-accent)',
                      color: '#FFFFFF'
                    }}
                  >
                    Configurar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {isOwner && (
          <div className="p-4 rounded-xl border" style={{ 
            backgroundColor: 'rgba(139, 92, 246, 0.1)', 
            borderColor: 'rgba(139, 92, 246, 0.3)' 
          }}>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              👑 <strong>Modo Owner:</strong> Configura las integraciones desde el panel de administración
            </p>
          </div>
        )}
      </div>
    );
  }

  // ===== DESARROLLADOR =====
  if (activeTab === 'developer') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>Desarrollador</h2>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Herramientas y configuración avanzada
          </p>
        </div>

        <div className="p-5 rounded-xl border" style={{ 
          backgroundColor: 'var(--color-bg-tertiary)', 
          borderColor: 'var(--color-border)' 
        }}>
          <h3 className="font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Estado del sistema
          </h3>
          <div className="space-y-2 text-sm font-mono">
            <div className="flex justify-between">
              <span style={{ color: 'var(--color-text-secondary)' }}>Backend:</span>
              <span style={{ color: backendStatus === 'online' ? '#10b981' : '#ef4444' }}>
                {backendStatus}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--color-text-secondary)' }}>Endpoint:</span>
              <span style={{ color: 'var(--color-text-primary)' }}>api.al-eon.com</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--color-text-secondary)' }}>Versión:</span>
              <span style={{ color: 'var(--color-text-primary)' }}>1.0.0</span>
            </div>
          </div>
        </div>

        {isOwner && (
          <div className="p-4 rounded-xl border" style={{ 
            backgroundColor: 'rgba(139, 92, 246, 0.1)', 
            borderColor: 'rgba(139, 92, 246, 0.3)' 
          }}>
            <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
              👑 <strong>Modo Owner:</strong> Acceso completo a herramientas de desarrollo
            </p>
            <button 
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: 'white'
              }}
            >
              Abrir consola de administración
            </button>
          </div>
        )}
      </div>
    );
  }

  // ===== DATOS Y PRIVACIDAD =====
  if (activeTab === 'data') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>Datos y privacidad</h2>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Controla tus datos y configuración de privacidad
          </p>
        </div>

        <div className="p-5 rounded-xl border" style={{ 
          backgroundColor: 'var(--color-bg-tertiary)', 
          borderColor: 'var(--color-border)' 
        }}>
          <div className="flex items-start gap-4">
            <Shield size={24} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
            <div>
              <h3 className="font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                Tus datos están protegidos
              </h3>
              <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                Usamos encriptación de extremo a extremo y políticas estrictas de Row Level Security (RLS) para proteger tu información.
              </p>
              <ul className="space-y-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <li>✓ Solo tú puedes ver tus conversaciones</li>
                <li>✓ Los datos se almacenan de forma segura</li>
                <li>✓ Cumplimiento con GDPR y regulaciones de privacidad</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button className="w-full p-4 rounded-xl border flex items-center justify-between hover:opacity-80 transition-all" style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            borderColor: 'var(--color-border)'
          }}>
            <div className="flex items-center gap-3">
              <Download size={20} style={{ color: 'var(--color-accent)' }} />
              <div className="text-left">
                <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  Exportar mis datos
                </div>
                <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Descarga una copia de toda tu información
                </div>
              </div>
            </div>
          </button>

          <button className="w-full p-4 rounded-xl border flex items-center justify-between hover:opacity-80 transition-all" style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderColor: 'rgba(239, 68, 68, 0.3)'
          }}>
            <div className="flex items-center gap-3">
              <Trash2 size={20} style={{ color: '#ef4444' }} />
              <div className="text-left">
                <div className="font-medium" style={{ color: '#ef4444' }}>
                  Eliminar mi cuenta
                </div>
                <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Esta acción no se puede deshacer
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // ===== NOTIFICACIONES =====
  if (activeTab === 'notifications') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>Notificaciones</h2>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Gestiona cómo y cuándo recibes notificaciones
          </p>
        </div>

        <div className="space-y-4">
          {/* Push Notifications */}
          <div className="p-5 rounded-2xl border" style={{ 
            backgroundColor: 'var(--color-bg-tertiary)', 
            borderColor: 'var(--color-border)' 
          }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--color-accent-light)' }}>
                  <Bell size={24} style={{ color: 'var(--color-accent)' }} />
                </div>
                <div>
                  <h3 className="font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                    Notificaciones push
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Recibe alertas en tiempo real
                  </p>
                </div>
              </div>
              <button
                onClick={async () => {
                  if ('Notification' in window) {
                    const permission = await Notification.requestPermission();
                    if (permission === 'granted') {
                      handleToggleNotif('push_enabled', true);
                      alert('✅ Notificaciones activadas correctamente');
                    } else {
                      alert('❌ Necesitas dar permisos en tu navegador para recibir notificaciones');
                    }
                  } else {
                    alert('⚠️ Tu navegador no soporta notificaciones push');
                  }
                }}
                className="px-4 py-2 rounded-2xl text-sm font-medium"
                style={{
                  backgroundColor: notifSettings.push_enabled ? '#10b981' : 'var(--color-accent)',
                  color: 'white'
                }}
              >
                {notifSettings.push_enabled ? 'Activado' : 'Activar'}
              </button>
            </div>
          </div>

          {/* Email Notifications */}
          <div className="space-y-3">
            <h3 className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
              Notificaciones por email
            </h3>
            
            <div className="p-4 rounded-2xl border flex items-center justify-between" style={{ 
              backgroundColor: 'var(--color-bg-tertiary)', 
              borderColor: 'var(--color-border)' 
            }}>
              <div>
                <h4 className="font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  Resumen diario
                </h4>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Recibe un resumen de tus conversaciones cada día
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifSettings.email_daily}
                  onChange={(e) => handleToggleNotif('email_daily', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" 
                  style={{ backgroundColor: notifSettings.email_daily ? 'var(--color-accent)' : '#6b7280' }}
                />
              </label>
            </div>

            <div className="p-4 rounded-2xl border flex items-center justify-between" style={{ 
              backgroundColor: 'var(--color-bg-tertiary)', 
              borderColor: 'var(--color-border)' 
            }}>
              <div>
                <h4 className="font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  Menciones y respuestas
                </h4>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Cuando AL-E responda a tus mensajes importantes
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifSettings.email_mentions}
                  onChange={(e) => handleToggleNotif('email_mentions', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" 
                  style={{ backgroundColor: notifSettings.email_mentions ? 'var(--color-accent)' : '#6b7280' }}
                />
              </label>
            </div>

            <div className="p-4 rounded-2xl border flex items-center justify-between" style={{ 
              backgroundColor: 'var(--color-bg-tertiary)', 
              borderColor: 'var(--color-border)' 
            }}>
              <div>
                <h4 className="font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  Alertas de errores
                </h4>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Notificaciones cuando ocurra un error en el sistema
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifSettings.notify_errors}
                  onChange={(e) => handleToggleNotif('notify_errors', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" 
                  style={{ backgroundColor: notifSettings.notify_errors ? 'var(--color-accent)' : '#6b7280' }}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border" style={{ 
          backgroundColor: 'rgba(59, 130, 246, 0.1)', 
          borderColor: 'rgba(59, 130, 246, 0.3)' 
        }}>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            💡 <strong>Tip:</strong> Las notificaciones te mantienen informado sobre la actividad de tu asistente IA.
          </p>
        </div>
      </div>
    );
  }

  return null;
}

