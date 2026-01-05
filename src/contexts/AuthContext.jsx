import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useCapabilities } from '@/contexts/CapabilitiesContext';

const AuthContext = createContext(null);

// 🔥 HELPER: Timeout para evitar loaders infinitos
function withTimeout(promise, ms = 8000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('BOOT_TIMEOUT')), ms)
    )
  ]);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState(null); // 🔥 NUEVO: Estado de error
  
  // 🔥 CAPABILITIES: Cargar capacidades del CORE al iniciar sesión
  const { loadCapabilities, resetCapabilities } = useCapabilities();

  const loadUserProfile = async (userId) => {
    try {
      console.log('[BOOT] fetching profile for user:', userId);
      
      // 🔥 CON TIMEOUT: Si el fetch tarda más de 5s, abortar
      const profilePromise = supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      const { data, error } = await withTimeout(profilePromise, 5000);
      
      if (error) {
        console.error('[BOOT] ❌ Error cargando perfil:', error);
        return null;
      }
      
      console.log('[BOOT] ✅ profile loaded:', data?.display_name || data?.email);
      setUserProfile(data);
      return data;
    } catch (err) {
      console.error('[BOOT] ❌ Exception en loadUserProfile:', err);
      return null;
    }
  };

  // 🔥 NUEVO: Función para reintentar boot
  const retryBoot = () => {
    console.log('[BOOT] � Retry requested');
    setBootError(null);
    setLoading(true);
    initAuth();
  };

  // 🔥 FUNCIÓN PRINCIPAL DE INICIALIZACIÓN
  const initAuth = async () => {
    try {
      console.log('[BOOT] start');
      console.log('[BOOT] route=', window.location.pathname);
      
      // 🔥 CON TIMEOUT: Si tarda más de 8s, lanzar error
      await withTimeout(
        (async () => {
          const { data: { session } } = await supabase.auth.getSession();
          
          console.log('[BOOT] session=', !!session, 'user=', session?.user?.id);
          
          setUser(session?.user ?? null);
          setAccessToken(session?.access_token ?? null);
          
          if (session?.user) {
            await loadUserProfile(session.user.id);
            
            // ⚡ CARGAR CAPABILITIES EN BACKGROUND (NO BLOQUEAR)
            if (session.access_token) {
              console.log('[BOOT] 📡 Cargando capabilities en background...');
              loadCapabilities(session.access_token).catch(err => {
                console.warn('[BOOT] ⚠️ Capabilities falló, continuando sin bloquear:', err);
              });
            }
          }
          
          console.log('[BOOT] ✅ done -> ready');
        })(),
        8000
      );
      
      setBootError(null);
    } catch (err) {
      console.error('[BOOT] ❌ error:', err.message || err);
      setBootError(err.message || 'ERROR_DESCONOCIDO');
    } finally {
      // 🔥 GARANTIZADO: Siempre apagar loading
      console.log('[BOOT] finally -> loading=false');
      setLoading(false);
    }
  };

  useEffect(() => {
    // 🔥 Listener para back/popstate
    const handlePopState = () => {
      console.log('[BOOT] 🔙 Popstate detected - aborting & resetting');
      setLoading(false);
      setBootError(null);
    };
    
    window.addEventListener('popstate', handlePopState);
    
    // 🔥 INICIAR AUTH CON TIMEOUT
    initAuth();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('[AUTH] state change:', _event);
      setUser(session?.user ?? null);
      setAccessToken(session?.access_token ?? null);
      
      if (session?.user) {
        await loadUserProfile(session.user.id);
      } else {
        setUserProfile(null);
      }
    });

    return () => {
      window.removeEventListener('popstate', handlePopState);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    try {
      console.log('[AUTH] login attempt for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      console.log('[AUTH] ✅ login success');
      setUser(data.user);
      setAccessToken(data.session.access_token);
      
      return data;
    } catch (err) {
      console.error('[AUTH] ❌ login error:', err);
      throw err;
    }
  };

  const signup = async (email, password) => {
    try {
      console.log('[AUTH] 🔵 Iniciando registro para:', email);
      setLoading(true);
      
      // 1. Crear usuario en Supabase Auth
      console.log('[AUTH] 🔵 Paso 1: Creando usuario en Supabase Auth...');
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error('[AUTH] ❌ ERROR EN SUPABASE AUTH:', error);
        console.error('[AUTH] ❌ Código:', error.status);
        console.error('[AUTH] ❌ Mensaje:', error.message);
        
        // Mensajes de error más claros
        if (error.message.includes('Email')) {
          throw new Error('⚠️ Las confirmaciones por email están habilitadas. Contacta al administrador.');
        }
        if (error.message.includes('rate limit')) {
          throw new Error('⚠️ Demasiados intentos. Espera 1 minuto e intenta de nuevo.');
        }
        if (error.message.includes('already')) {
          throw new Error('⚠️ Este email ya está registrado. Intenta iniciar sesión.');
        }
        if (error.status === 0 || error.message.includes('fetch')) {
          throw new Error('⚠️ Error de conexión. Verifica tu internet o contacta al administrador (CORS).');
        }
        
        throw new Error(`⚠️ Error de autenticación: ${error.message}`);
      }
      
      if (!data.user) {
        console.error('[AUTH] ❌ No se recibió información del usuario');
        throw new Error('⚠️ No se pudo crear el usuario. Intenta de nuevo.');
      }
      
      console.log('[AUTH] ✅ Usuario auth creado exitosamente:', data.user.id);
      console.log('[AUTH] ✅ Email:', data.user.email);
      
      // 2. Crear perfil DIRECTAMENTE (sin depender de trigger)
      console.log('[AUTH] 🔵 Paso 2: Creando perfil en user_profiles...');
      
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: data.user.id,
          email: email,
          display_name: email.split('@')[0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      
      if (profileError) {
        console.error('[AUTH] ❌ ERROR CREANDO PERFIL:', profileError);
        console.error('[AUTH] ❌ Código:', profileError.code);
        console.error('[AUTH] ❌ Mensaje:', profileError.message);
        
        // Si el error es porque ya existe, continuar (el trigger lo creó)
        if (profileError.message.includes('duplicate') || profileError.message.includes('already exists')) {
          console.log('[AUTH] ℹ️ Perfil ya existía (el trigger lo creó primero)');
        } else if (profileError.message.includes('policy') || profileError.code === '42501') {
          throw new Error('⚠️ Error de permisos en la base de datos. Contacta al administrador (RLS Policy).');
        } else {
          throw new Error(`⚠️ Error guardando perfil: ${profileError.message}`);
        }
      } else {
        console.log('[AUTH] ✅ Perfil creado exitosamente en user_profiles');
      }
      
      console.log('[AUTH] ✅✅✅ REGISTRO COMPLETADO EXITOSAMENTE');
      console.log('[AUTH] ✅ Usuario:', data.user.email);
      console.log('[AUTH] ✅ ID:', data.user.id);
      
      setUser(data.user);
      setAccessToken(data.session?.access_token);
      return data;
    } catch (err) {
      console.error('[AUTH] ❌❌❌ ERROR FINAL EN SIGNUP:', err);
      console.error('[AUTH] ❌ Tipo:', err.constructor.name);
      console.error('[AUTH] ❌ Mensaje:', err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  const logout = async () => {
    try {
      console.log('[AUTH] logout attempt');
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      console.log('[AUTH] ✅ logout success');
      
      // Limpiar estado
      setUser(null);
      setUserProfile(null);
      setAccessToken(null);
      setBootError(null);
      
      // 🔥 RESETEAR CAPABILITIES
      resetCapabilities();
      
      // Limpiar localStorage
      localStorage.clear();
      
      // ✅ Usar replace para evitar loops en history
      window.location.replace('/login');
    } catch (error) {
      console.error('[AUTH] ❌ logout error:', error);
      
      // Forzar limpieza y redirección incluso si hay error
      setUser(null);
      setUserProfile(null);
      setAccessToken(null);
      setBootError(null);
      resetCapabilities();
      localStorage.clear();
      window.location.replace('/login');
    } finally {
      // 🔥 GARANTIZADO: Apagar loading
      setLoading(false);
    }
  };

  const resetPassword = async (email) => {
    try {
      console.log('[AUTH] reset password for:', email);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      
      console.log('[AUTH] ✅ reset email sent');
    } catch (err) {
      console.error('[AUTH] ❌ reset password error:', err);
      throw err;
    }
  };

  const updateDisplayName = async (newDisplayName) => {
    if (!user) return;
    
    try {
      console.log('[AUTH] updating display name to:', newDisplayName);
      
      const { error } = await supabase
        .from('user_profiles')
        .update({ display_name: newDisplayName })
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      console.log('[AUTH] ✅ display name updated');
      
      // Actualizar el estado local
      setUserProfile(prev => ({ ...prev, display_name: newDisplayName }));
    } catch (err) {
      console.error('[AUTH] ❌ update display name error:', err);
      throw err;
    }
  };

  const value = {
    user,
    userProfile,
    accessToken,
    loading,
    bootError,      // 🔥 NUEVO: Exponer error
    retryBoot,      // 🔥 NUEVO: Exponer función de reintento
    login,
    signup,
    logout,
    resetPassword,
    updateDisplayName,
    refreshProfile: () => user && loadUserProfile(user.id)
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
