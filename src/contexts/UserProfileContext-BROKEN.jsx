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

      // Cargar perfil
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error cargando perfil:', profileError);
      } else if (profileData) {
        setProfile(profileData);
      }

      // Cargar settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') {
        console.error('Error cargando settings:', settingsError);
      } else if (settingsData) {
        setSettings(settingsData);
      }

      // NO cargar integraciones - tabla no existe aún
      setIntegrations([]);
    } catch (error) {
      console.error('Error cargando datos de usuario:', error);
    } finally {
      setLoading(false);
    }
  }

  // 🔐 ACTUALIZAR PERFIL (solo del usuario autenticado)
  async function updateProfile(updates) {
    if (!user) return { success: false, error: 'No autenticado' };

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      return { success: true, data };
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      return { success: false, error: error.message };
    }
  }

  // 🔐 ACTUALIZAR SETTINGS (solo del usuario autenticado)
  async function updateSettings(updates) {
    if (!user) return { success: false, error: 'No autenticado' };

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setSettings(data);
      return { success: true, data };
    } catch (error) {
      console.error('Error actualizando settings:', error);
      return { success: false, error: error.message };
    }
  }

  // 🔐 CONECTAR INTEGRACIÓN (solo del usuario autenticado)
  async function connectIntegration(integrationType, config) {
    if (!user) return { success: false, error: 'No autenticado' };

    try {
      const { data, error } = await supabase
        .from('user_integrations')
        .upsert({
          user_id: user.id,
          integration_type: integrationType,
          integration_name: integrationType.toUpperCase(),
          config: config,
          status: 'connected',
          last_checked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      await loadUserData(); // Recargar integraciones
      return { success: true, data };
    } catch (error) {
      console.error('Error conectando integración:', error);
      return { success: false, error: error.message };
    }
  }

  // 🔐 DESCONECTAR INTEGRACIÓN (solo del usuario autenticado)
  async function disconnectIntegration(integrationType) {
    if (!user) return { success: false, error: 'No autenticado' };

    try {
      const { error } = await supabase
        .from('user_integrations')
        .delete()
        .eq('user_id', user.id)
        .eq('integration_type', integrationType);

      if (error) throw error;

      await loadUserData(); // Recargar integraciones
      return { success: true };
    } catch (error) {
      console.error('Error desconectando integración:', error);
      return { success: false, error: error.message };
    }
  }

  // 🔐 VERIFICAR INTEGRACIÓN (solo del usuario autenticado)
  function hasIntegration(integrationType) {
    return integrations.some(
      (int) => int.integration_type === integrationType && int.status === 'connected'
    );
  }

  const value = {
    profile,
    settings,
    integrations,
    loading,
    isRoot,
    updateProfile,
    updateSettings,
    connectIntegration,
    disconnectIntegration,
    hasIntegration,
    reload: loadUserData,
  };

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
}
