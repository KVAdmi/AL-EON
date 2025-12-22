import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

const UserProfileContext = createContext();

export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile debe usarse dentro de UserProfileProvider');
  }
  return context;
}

export function UserProfileProvider({ children }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [settings, setSettings] = useState(null);
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);

  // 👑 VERIFICACIÓN ROOT
  const isRoot = profile?.role === 'ROOT' || profile?.email === 'pgaribay@infinitykode.com';

  // 🔐 CARGAR PERFIL (solo del usuario autenticado)
  useEffect(() => {
    if (!user) {
      setProfile(null);
      setSettings(null);
      setIntegrations([]);
      setLoading(false);
      return;
    }

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
          user_id: user.id,
          email: user.email,
          display_name: user.email?.split('@')[0] || 'Usuario',
          theme: 'system'
        });
        setSettings({
          user_id: user.id,
          ai_model: 'gpt-4',
          voice_enabled: false
        });
        setIntegrations([]);
        setLoading(false);
        return;
      }

      // ✅ SOLO SI HAY SESIÓN: hacer fetch a user_profiles
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (profileError) {
        if (profileError.code === '42501' || profileError.message?.includes('permission denied')) {
          // 403 Forbidden - usar defaults y continuar
          console.warn('Perfil no accesible (403), usando defaults');
          setProfile({
            user_id: session.user.id,
            email: session.user.email,
            display_name: session.user.email?.split('@')[0] || 'Usuario',
            theme: 'system'
          });
        } else if (profileError.code !== 'PGRST116') {
          console.warn('Error cargando perfil:', profileError.message);
        }
      } else if (profileData) {
        setProfile(profileData);
      }

      // ✅ SOLO SI HAY SESIÓN: hacer fetch a user_settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (settingsError) {
        if (settingsError.code === '42501' || settingsError.message?.includes('permission denied')) {
          // 403 Forbidden - usar defaults y continuar
          console.warn('Settings no accesibles (403), usando defaults');
          setSettings({
            user_id: session.user.id,
            ai_model: 'gpt-4',
            voice_enabled: false
          });
        } else if (settingsError.code !== 'PGRST116') {
          console.warn('Error cargando settings:', settingsError.message);
        }
      } else if (settingsData) {
        setSettings(settingsData);
      }

      // NO cargar integraciones - tabla no existe aún
      setIntegrations([]);
    } catch (error) {
      console.warn('Error cargando datos de usuario:', error.message);
    } finally {
      setLoading(false);
    }
  }

  // 🔐 ACTUALIZAR PERFIL (solo del usuario autenticado)
  async function updateProfile(updates) {
    try {
      // ✅ VERIFICAR SESIÓN ANTES DE ACTUALIZAR
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user?.id) {
        console.warn('⚠️ No se puede actualizar perfil sin sesión activa');
        return { success: false, error: 'No hay sesión activa' };
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('user_id', session.user.id)
        .select()
        .single();

      if (error) {
        // Ignorar 403 silenciosamente
        if (error.code === '42501' || error.message?.includes('permission denied')) {
          console.warn('⚠️ Sin permisos para actualizar perfil (403)');
          return { success: false, error: 'Sin permisos' };
        }
        throw error;
      }

      setProfile(data);
      return { success: true, data };
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      return { success: false, error: error.message };
    }
  }

  // 🔐 ACTUALIZAR SETTINGS (solo del usuario autenticado)
  async function updateSettings(updates) {
    try {
      // ✅ VERIFICAR SESIÓN ANTES DE ACTUALIZAR
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user?.id) {
        console.warn('⚠️ No se puede actualizar settings sin sesión activa');
        return { success: false, error: 'No hay sesión activa' };
      }

      const { data, error } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('user_id', session.user.id)
        .select()
        .single();

      if (error) {
        // Ignorar 403 silenciosamente
        if (error.code === '42501' || error.message?.includes('permission denied')) {
          console.warn('⚠️ Sin permisos para actualizar settings (403)');
          return { success: false, error: 'Sin permisos' };
        }
        throw error;
      }

      setSettings(data);
      return { success: true, data };
    } catch (error) {
      console.error('Error actualizando settings:', error);
      return { success: false, error: error.message };
    }
  }

  const value = {
    profile,
    settings,
    integrations,
    loading,
    isRoot,
    updateProfile,
    updateSettings,
    reload: loadUserData,
  };

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
}
