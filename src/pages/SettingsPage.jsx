import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, User, Palette, Database, Link2, Mic, Eye, Bell, Lock, CreditCard, 
  Save, Check, Code, Trash2, Download, AlertTriangle, Shield, Globe, Volume2, 
  Moon, Sun, Monitor, Wifi, WifiOff, Upload, Camera, X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import IntegrationModal from '../components/IntegrationModal';
import { requestNotificationPermission, getNotificationPermission, showNotification } from '../lib/notifications';

// 🔥 FIX: availableVoices debe estar disponible en todo el componente
let globalAvailableVoices = [];

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const fileInputRef = useRef(null);
  const userAvatarInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingUserAvatar, setUploadingUserAvatar] = useState(false);
  
  // Estado del perfil y configuración
  const [profile, setProfile] = useState({
    display_name: '',
    email: '',
    preferred_language: 'es',
    timezone: 'America/Mexico_City',
    theme: 'system',
    role: 'USER',
    assistant_avatar_url: null,
    user_avatar_url: null
  });
  const [settings, setSettings] = useState({
    ai_model: 'gpt-4',
    ai_temperature: 0.7,
    context_persistent: true,
    voice_enabled: false,
    tts_enabled: false,
    tts_gender: 'female',
    tts_voice_name: null,
    tts_lang: 'es-MX',
  });

  // Estado para voces disponibles (Web Speech API)
  const [availableVoices, setAvailableVoices] = useState([]);
  const [testingVoice, setTestingVoice] = useState(false);

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

  // Cargar voces disponibles del dispositivo (Web Speech API)
  useEffect(() => {
    loadVoices();
    
    // Escuchar evento voiceschanged (Safari/iOS)
    if (window.speechSynthesis) {
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    }
    
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      }
    };
  }, []);

  function loadVoices() {
    try {
      if (!window.speechSynthesis) {
        console.warn('[TTS] Web Speech API no disponible en este navegador');
        return;
      }

      const voices = window.speechSynthesis.getVoices();
      console.log('[TTS] Voces disponibles:', voices.length);
      
      // Filtrar voces en español (priorizar mexicanas)
      const spanishVoices = voices.filter(v => 
        v.lang.startsWith('es') || v.lang.startsWith('es-MX')
      );
      
      setAvailableVoices(spanishVoices);
      globalAvailableVoices = spanishVoices;
      
      // Auto-seleccionar voz mexicana si no hay ninguna guardada
      if (!settings.tts_voice_name && spanishVoices.length > 0) {
        const mexicanVoice = spanishVoices.find(v => 
          v.lang === 'es-MX' || v.name.toLowerCase().includes('mexico')
        );
        
        if (mexicanVoice) {
          setSettings(prev => ({
            ...prev,
            tts_voice_name: mexicanVoice.name,
          }));
        }
      }
    } catch (error) {
      console.error('[TTS] Error al cargar voces:', error);
      // No interrumpir la carga de la página si fallan las voces
    }
  }

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
        tone_pref: profileData?.tone_pref || 'barrio',
        assistant_avatar_url: profileData?.assistant_avatar_url || null,
        user_avatar_url: profileData?.user_avatar_url || null
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
        voice_enabled: settingsData?.voice_enabled ?? false,
        tts_enabled: settingsData?.tts_enabled ?? false,
        tts_gender: settingsData?.tts_gender || 'female',
        tts_voice_name: settingsData?.tts_voice_name || null,
        tts_lang: settingsData?.tts_lang || 'es-MX',
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
          tone_pref: profile.tone_pref,
          assistant_avatar_url: profile.assistant_avatar_url
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

  // 📸 SUBIR AVATAR DE AL-E
  async function handleAvatarUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen válida');
      return;
    }

    try {
      setUploadingAvatar(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        alert('No hay sesión activa');
        return;
      }

      // Generar nombre único para el archivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}/avatar-${Date.now()}.${fileExt}`;

      // Eliminar avatar anterior si existe
      if (profile.assistant_avatar_url) {
        const oldPath = profile.assistant_avatar_url.split('/').slice(-2).join('/');
        await supabase.storage
          .from('ale-avatars')
          .remove([oldPath]);
      }

      // Subir nuevo avatar
      const { data, error: uploadError } = await supabase.storage
        .from('ale-avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('ale-avatars')
        .getPublicUrl(fileName);

      console.log('[Avatar] URL pública generada:', publicUrl);

      // Actualizar estado local primero
      setProfile({ ...profile, assistant_avatar_url: publicUrl });
      
      // Actualizar base de datos
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ assistant_avatar_url: publicUrl })
        .eq('user_id', session.user.id);

      if (updateError) {
        console.error('[Avatar] Error actualizando perfil:', updateError);
        throw new Error(`Error guardando avatar: ${updateError.message}`);
      }

      console.log('[Avatar] Perfil actualizado exitosamente');

      // Refresh del perfil
      if (refreshProfile) {
        await refreshProfile();
      }

      alert('✅ Avatar actualizado correctamente');
    } catch (error) {
      console.error('Error subiendo avatar:', error);
      alert('Error al subir avatar: ' + error.message);
    } finally {
      setUploadingAvatar(false);
    }
  }

  // 🗑️ ELIMINAR AVATAR DE AL-E
  async function handleAvatarDelete() {
    if (!confirm('¿Eliminar el avatar de AL-E?')) return;

    try {
      setUploadingAvatar(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      // Eliminar archivo de storage
      if (profile.assistant_avatar_url) {
        const oldPath = profile.assistant_avatar_url.split('/').slice(-2).join('/');
        await supabase.storage
          .from('ale-avatars')
          .remove([oldPath]);
      }

      // Actualizar base de datos
      await supabase
        .from('user_profiles')
        .update({ assistant_avatar_url: null })
        .eq('user_id', session.user.id);

      // Actualizar estado
      setProfile({ ...profile, assistant_avatar_url: null });

      // Refresh del perfil
      if (refreshProfile) {
        await refreshProfile();
      }

      alert('✅ Avatar eliminado');
    } catch (error) {
      console.error('Error eliminando avatar:', error);
      alert('Error al eliminar avatar: ' + error.message);
    } finally {
      setUploadingAvatar(false);
    }
  }

  // 📸 SUBIR AVATAR DEL USUARIO
  async function handleUserAvatarUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen válida');
      return;
    }

    try {
      setUploadingUserAvatar(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        alert('No hay sesión activa');
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}/user-avatar-${Date.now()}.${fileExt}`;

      // Eliminar avatar anterior si existe
      if (profile.user_avatar_url) {
        const oldPath = profile.user_avatar_url.split('/').slice(-2).join('/');
        await supabase.storage
          .from('ale-avatars')
          .remove([oldPath]);
      }

      // Subir nuevo avatar
      const { data, error: uploadError } = await supabase.storage
        .from('ale-avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('ale-avatars')
        .getPublicUrl(fileName);

      setProfile({ ...profile, user_avatar_url: publicUrl });
      
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ user_avatar_url: publicUrl })
        .eq('user_id', session.user.id);

      if (updateError) throw new Error(`Error guardando avatar: ${updateError.message}`);

      if (refreshProfile) {
        await refreshProfile();
      }

      alert('✅ Tu avatar se actualizó correctamente');
    } catch (error) {
      console.error('Error subiendo avatar del usuario:', error);
      alert('Error al subir avatar: ' + error.message);
    } finally {
      setUploadingUserAvatar(false);
    }
  }

  // 🗑️ ELIMINAR AVATAR DEL USUARIO
  async function handleUserAvatarDelete() {
    if (!confirm('¿Eliminar tu avatar?')) return;

    try {
      setUploadingUserAvatar(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      if (profile.user_avatar_url) {
        const oldPath = profile.user_avatar_url.split('/').slice(-2).join('/');
        await supabase.storage
          .from('ale-avatars')
          .remove([oldPath]);
      }

      await supabase
        .from('user_profiles')
        .update({ user_avatar_url: null })
        .eq('user_id', session.user.id);

      setProfile({ ...profile, user_avatar_url: null });

      if (refreshProfile) {
        await refreshProfile();
      }

      alert('✅ Avatar eliminado');
    } catch (error) {
      console.error('Error eliminando avatar:', error);
      alert('Error al eliminar avatar: ' + error.message);
    } finally {
      setUploadingUserAvatar(false);
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
                uploadingAvatar={uploadingAvatar}
                setUploadingAvatar={setUploadingAvatar}
                handleAvatarUpload={handleAvatarUpload}
                handleAvatarDelete={handleAvatarDelete}
                uploadingUserAvatar={uploadingUserAvatar}
                setUploadingUserAvatar={setUploadingUserAvatar}
                handleUserAvatarUpload={handleUserAvatarUpload}
                handleUserAvatarDelete={handleUserAvatarDelete}
                userAvatarInputRef={userAvatarInputRef}
                fileInputRef={fileInputRef}
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

function TabContent({ 
  activeTab, 
  profile, 
  setProfile, 
  settings, 
  setSettings, 
  isOwner, 
  backendStatus, 
  setIntegrationModal, 
  uploadingAvatar, 
  setUploadingAvatar, 
  handleAvatarUpload,
  handleAvatarDelete,
  uploadingUserAvatar,
  setUploadingUserAvatar,
  handleUserAvatarUpload,
  handleUserAvatarDelete,
  userAvatarInputRef,
  fileInputRef
}) {
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
        
        {/* Avatar del usuario */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Tu foto de perfil
          </label>
          <p className="text-xs mb-3" style={{ color: 'var(--color-text-tertiary)' }}>
            Esta foto aparecerá en tus mensajes del chat
          </p>
          
          <div className="flex items-center gap-4">
            {/* Preview del avatar */}
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden border-2"
              style={{ 
                borderColor: 'var(--color-accent)',
                backgroundColor: profile.user_avatar_url ? 'transparent' : 'var(--color-accent-light)'
              }}
            >
              {profile.user_avatar_url ? (
                <img 
                  src={profile.user_avatar_url} 
                  alt="Tu avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User 
                  size={32} 
                  style={{ color: 'var(--color-accent)' }}
                />
              )}
            </div>

            {/* Botones de acción */}
            <div className="flex flex-col gap-2">
              <input
                ref={userAvatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleUserAvatarUpload}
                className="hidden"
              />
              
              <button
                onClick={() => userAvatarInputRef.current?.click()}
                disabled={uploadingUserAvatar}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border transition-all hover:opacity-80"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  borderColor: 'var(--color-accent)',
                  color: '#fff'
                }}
              >
                {uploadingUserAvatar ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Subiendo...</span>
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    <span>{profile.user_avatar_url ? 'Cambiar' : 'Subir'}</span>
                  </>
                )}
              </button>

              {profile.user_avatar_url && (
                <button
                  onClick={handleUserAvatarDelete}
                  disabled={uploadingUserAvatar}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border transition-all hover:opacity-80"
                  style={{
                    backgroundColor: 'transparent',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  <X size={16} />
                  <span>Eliminar</span>
                </button>
              )}
            </div>
          </div>
          
          <p className="text-xs mt-2" style={{ color: 'var(--color-text-tertiary)' }}>
            Formatos: JPG, PNG, GIF, WEBP. Sin límite de tamaño.
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

            {/* Avatar del asistente */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                Avatar de {profile.assistant_name || 'AL-E'}
              </label>
              <p className="text-xs mb-3" style={{ color: 'var(--color-text-tertiary)' }}>
                Personaliza el avatar de tu asistente (aparecerá en el chat y sidebar)
              </p>
              
              <div className="flex items-center gap-4">
                {/* Preview del avatar */}
                <div 
                  className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden border-2"
                  style={{ 
                    borderColor: 'var(--color-accent)',
                    backgroundColor: profile.assistant_avatar_url ? 'transparent' : 'var(--color-accent-light)'
                  }}
                >
                  {profile.assistant_avatar_url ? (
                    <img 
                      src={profile.assistant_avatar_url} 
                      alt="Avatar de AL-E"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera 
                      size={32} 
                      style={{ color: 'var(--color-accent)' }}
                    />
                  )}
                </div>

                {/* Botones de acción */}
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border transition-all hover:opacity-80"
                    style={{
                      backgroundColor: 'var(--color-accent)',
                      borderColor: 'var(--color-accent)',
                      color: '#fff'
                    }}
                  >
                    {uploadingAvatar ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Subiendo...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={16} />
                        <span>{profile.assistant_avatar_url ? 'Cambiar' : 'Subir'}</span>
                      </>
                    )}
                  </button>

                  {profile.assistant_avatar_url && (
                    <button
                      onClick={handleAvatarDelete}
                      disabled={uploadingAvatar}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border transition-all hover:opacity-80"
                      style={{
                        backgroundColor: 'transparent',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-secondary)'
                      }}
                    >
                      <X size={16} />
                      <span>Eliminar</span>
                    </button>
                  )}
                </div>
              </div>
              
              <p className="text-xs mt-2" style={{ color: 'var(--color-text-tertiary)' }}>
                Formatos: JPG, PNG, GIF, WEBP. Sin límite de tamaño.
              </p>
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
    // 🔥 PROTECCIÓN: Si availableVoices es undefined, forzar array vacío
    const safeAvailableVoices = Array.isArray(availableVoices) ? availableVoices : [];
    
    // Funciones de filtro de voces (con validación)
    const mexicanVoices = safeAvailableVoices.filter(v => 
      v.lang === 'es-MX' || 
      v.name.toLowerCase().includes('mexico') ||
      v.name.toLowerCase().includes('mexican')
    );

    const spanishVoices = safeAvailableVoices.filter(v => 
      v.lang.startsWith('es') && !mexicanVoices.some(mv => mv.name === v.name)
    );

    const maleVoices = safeAvailableVoices.filter(v => 
      !v.name.toLowerCase().includes('female') &&
      !v.name.toLowerCase().includes('mujer') &&
      (v.name.toLowerCase().includes('male') || 
       v.name.toLowerCase().includes('hombre') ||
       v.name.toLowerCase().includes('diego') ||
       v.name.toLowerCase().includes('jorge'))
    );

    const femaleVoices = safeAvailableVoices.filter(v => 
      v.name.toLowerCase().includes('female') ||
      v.name.toLowerCase().includes('mujer') ||
      v.name.toLowerCase().includes('paulina') ||
      v.name.toLowerCase().includes('monica')
    );

    const testVoice = () => {
      if (!window.speechSynthesis) {
        alert('Tu navegador no soporta síntesis de voz');
        return;
      }

      setTestingVoice(true);
      
      const utterance = new SpeechSynthesisUtterance(
        'Hola, soy tu asistente. Así suena mi voz.'
      );
      
      utterance.lang = settings.tts_lang;
      
      if (settings.tts_voice_name && safeAvailableVoices.length > 0) {
        const selectedVoice = safeAvailableVoices.find(v => v.name === settings.tts_voice_name);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }
      
      utterance.onend = () => setTestingVoice(false);
      utterance.onerror = () => setTestingVoice(false);
      
      window.speechSynthesis.speak(utterance);
      
      console.log('[TTS] Probando voz:', settings.tts_voice_name);
    };

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>Voz</h2>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Configura cómo AL-E habla las respuestas usando las voces de tu dispositivo
          </p>
        </div>
        
        {/* Toggle principal */}
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
              checked={settings.tts_enabled}
              onChange={(e) => setSettings({ ...settings, tts_enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" 
              style={{ 
                backgroundColor: settings.tts_enabled ? 'var(--color-accent)' : '#6b7280' 
              }}
            />
          </label>
        </div>

        {/* Selector de género (presets mexicanos) */}
        {settings.tts_enabled && (
          <>
            <div className="p-5 rounded-xl border space-y-4" style={{ 
              backgroundColor: 'var(--color-bg-tertiary)', 
              borderColor: 'var(--color-border)' 
            }}>
              <div>
                <h3 className="font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  Género de voz
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      // 🔥 RECALCULAR mexicanVoices en el momento del click
                      const safeVoices = Array.isArray(availableVoices) ? availableVoices : (Array.isArray(globalAvailableVoices) ? globalAvailableVoices : []);
                      const mexicanVoicesNow = safeVoices.filter(v => 
                        v.lang === 'es-MX' || 
                        v.name.toLowerCase().includes('mexico') ||
                        v.name.toLowerCase().includes('mexican')
                      );
                      
                      const femaleVoice = mexicanVoicesNow.find(v => 
                        v.name.toLowerCase().includes('female') ||
                        v.name.toLowerCase().includes('mujer') ||
                        v.name.toLowerCase().includes('paulina') ||
                        v.name.toLowerCase().includes('monica')
                      ) || mexicanVoicesNow.find(v => !v.name.toLowerCase().includes('male'));
                      
                      setSettings({
                        ...settings,
                        tts_gender: 'female',
                        tts_voice_name: femaleVoice?.name || null,
                      });
                    }}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      settings.tts_gender === 'female' 
                        ? 'border-[var(--color-accent)]' 
                        : 'border-[var(--color-border)]'
                    }`}
                    style={{
                      backgroundColor: settings.tts_gender === 'female' 
                        ? 'var(--color-accent-light)' 
                        : 'var(--color-bg-secondary)',
                    }}
                  >
                    <div className="text-2xl mb-2">👩</div>
                    <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      Mujer
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                      Voz femenina mexicana
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      // 🔥 RECALCULAR mexicanVoices en el momento del click
                      const safeVoices = Array.isArray(availableVoices) ? availableVoices : (Array.isArray(globalAvailableVoices) ? globalAvailableVoices : []);
                      const mexicanVoicesNow = safeVoices.filter(v => 
                        v.lang === 'es-MX' || 
                        v.name.toLowerCase().includes('mexico') ||
                        v.name.toLowerCase().includes('mexican')
                      );
                      
                      const maleVoice = mexicanVoicesNow.find(v => 
                        v.name.toLowerCase().includes('male') ||
                        v.name.toLowerCase().includes('hombre') ||
                        v.name.toLowerCase().includes('diego') ||
                        v.name.toLowerCase().includes('jorge')
                      );
                      
                      setSettings({
                        ...settings,
                        tts_gender: 'male',
                        tts_voice_name: maleVoice?.name || null,
                      });
                    }}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      settings.tts_gender === 'male' 
                        ? 'border-[var(--color-accent)]' 
                        : 'border-[var(--color-border)]'
                    }`}
                    style={{
                      backgroundColor: settings.tts_gender === 'male' 
                        ? 'var(--color-accent-light)' 
                        : 'var(--color-bg-secondary)',
                    }}
                  >
                    <div className="text-2xl mb-2">👨</div>
                    <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      Hombre
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                      Voz masculina mexicana
                    </div>
                  </button>
                </div>
              </div>

              {/* Selector de voz específica (opcional) */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  Voz específica (opcional)
                </label>
                <select
                  value={settings.tts_voice_name || ''}
                  onChange={(e) => setSettings({ ...settings, tts_voice_name: e.target.value || null })}
                  className="w-full px-4 py-2 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--color-bg-primary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <option value="">Automático (mejor disponible)</option>
                  
                  {mexicanVoices.length > 0 && (
                    <optgroup label="Voces Mexicanas 🇲🇽">
                      {mexicanVoices.map(voice => (
                        <option key={voice.name} value={voice.name}>
                          {voice.name} ({voice.lang})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  
                  {spanishVoices.length > 0 && (
                    <optgroup label="Otras voces en Español">
                      {spanishVoices.map(voice => (
                        <option key={voice.name} value={voice.name}>
                          {voice.name} ({voice.lang})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  
                  {safeAvailableVoices.length === 0 && (
                    <option disabled>No hay voces disponibles</option>
                  )}
                </select>
              </div>

              {/* Botón de prueba */}
              <button
                onClick={testVoice}
                disabled={testingVoice || safeAvailableVoices.length === 0}
                className="w-full px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: '#FFFFFF',
                }}
              >
                <Volume2 size={18} />
                {testingVoice ? 'Reproduciendo...' : 'Probar voz'}
              </button>
            </div>

            {/* Warning si no hay voces mexicanas */}
            {mexicanVoices.length === 0 && (
              <div className="p-4 rounded-xl border" style={{ 
                backgroundColor: 'rgba(251, 191, 36, 0.1)', 
                borderColor: 'rgba(251, 191, 36, 0.3)' 
              }}>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  ⚠️ <strong>No se encontraron voces mexicanas en tu dispositivo.</strong><br />
                  {spanishVoices.length > 0 
                    ? 'Se usarán voces en español disponibles.'
                    : 'Instala voces en español en la configuración de tu sistema operativo.'}
                </p>
              </div>
            )}

            {/* Info sobre Web Speech API */}
            <div className="p-4 rounded-xl border" style={{ 
              backgroundColor: 'var(--color-bg-tertiary)', 
              borderColor: 'var(--color-border)' 
            }}>
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                💡 Las voces dependen de tu sistema operativo y navegador. 
                Para mejores resultados, usa Chrome, Edge o Safari con voces instaladas en español mexicano.
              </p>
            </div>
          </>
        )}
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
    // Integraciones de desarrollador (solo ROOT)
    const developerIntegrations = [
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

        {/* Integraciones de Desarrollador (solo ROOT) */}
        {profile?.role === 'ROOT' && (
          <>
            <div className="pt-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full text-xs font-semibold">
                  👑 SOLO ROOT
                </span>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  Integraciones de Desarrollador
                </h3>
              </div>
              <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                Configura APIs y servicios de infraestructura
              </p>
            </div>

            <div className="space-y-3">
              {developerIntegrations.map(integration => (
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
        </>
        )}

        {/* Mensaje para usuarios ROOT */}
        {profile?.role === 'ROOT' && (
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
                    Recibe alertas de citas y eventos
                  </p>
                </div>
              </div>
              <button
                onClick={async () => {
                  const permission = getNotificationPermission();
                  
                  if (permission === 'unsupported') {
                    alert('⚠️ Tu navegador no soporta notificaciones push');
                    return;
                  }
                  
                  if (permission === 'denied') {
                    alert('❌ Las notificaciones están bloqueadas. Ve a Configuración del navegador → Permisos → Notificaciones y permite este sitio.');
                    return;
                  }
                  
                  if (permission === 'granted') {
                    // Ya están activadas, mostrar notificación de prueba
                    showNotification({
                      title: '🎉 ¡Notificaciones activas!',
                      body: 'Recibirás alertas de tus eventos y citas próximas',
                      requireInteraction: false,
                      vibrate: [200, 100, 200]
                    });
                    alert('✅ Notificaciones ya están activadas. Se mostró una prueba.');
                    return;
                  }
                  
                  // Solicitar permiso
                  const granted = await requestNotificationPermission();
                  if (granted) {
                    handleToggleNotif('push_enabled', true);
                  }
                }}
                className="px-4 py-2 rounded-2xl text-sm font-medium"
                style={{
                  backgroundColor: getNotificationPermission() === 'granted' ? '#10b981' : 'var(--color-accent)',
                  color: 'white'
                }}
              >
                {getNotificationPermission() === 'granted' ? '✅ Activado' : '🔔 Activar'}
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border" style={{ 
          backgroundColor: 'rgba(239, 68, 68, 0.1)', 
          borderColor: 'rgba(239, 68, 68, 0.3)' 
        }}>
          <p className="text-sm font-medium mb-2" style={{ color: '#ef4444' }}>
            🚨 <strong>Notificaciones URGENTES</strong>
          </p>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Los eventos próximos (5-15 min) mostrarán alertas con vibración y sonido para que no los pierdas.
          </p>
        </div>
      </div>
    );
  }

  return null;
}

