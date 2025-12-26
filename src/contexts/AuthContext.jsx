import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        console.error('❌ Error cargando perfil:', error);
        return null;
      }
      
      setUserProfile(data);
      return data;
    } catch (err) {
      console.error('❌ Error en loadUserProfile:', err);
      return null;
    }
  };

  useEffect(() => {
    // ✅ SOLUCIÓN 3: Listener global para resetear loading en back navigation
    const handlePopState = () => {
      console.log('🔙 Popstate detected - resetting loading states');
      setLoading(false);
    };
    
    window.addEventListener('popstate', handlePopState);
    
    // Verificar sesión actual
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAccessToken(session?.access_token ?? null);
      
      if (session?.user) {
        await loadUserProfile(session.user.id);
      }
      
      setLoading(false);
    }).catch(err => {
      console.error('Error getting session:', err);
      setLoading(false); // ✅ CRÍTICO: Always set loading to false
    });

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
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
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    
    setUser(data.user);
    setAccessToken(data.session.access_token);
    
    return data;
  };

  const signup = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;
      
      // Verificar que se creó el perfil (wait 2 segundos para que el trigger ejecute)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', data.user?.id)
        .single();
      
      if (profileError || !profile) {
        console.error('❌ Error: Perfil no creado automáticamente', profileError);
        throw new Error('Error creando perfil de usuario. Por favor contacta a soporte.');
      }
      
      console.log('✅ Usuario registrado correctamente con perfil');
      return data;
    } catch (err) {
      console.error('❌ Error en signup:', err);
      throw err;
    }
  };
  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Limpiar estado
      setUser(null);
      setUserProfile(null);
      setAccessToken(null);
      setLoading(false); // ✅ CRÍTICO: Asegurar que loading quede en false
      
      // Limpiar localStorage
      localStorage.clear();
      
      // ✅ SOLUCIÓN 4: Usar replace para evitar loops en history
      // NO usar window.location.href (deja historia)
      window.location.replace('/login');
    } catch (error) {
      console.error('❌ Error al cerrar sesión:', error);
      // Forzar limpieza y redirección incluso si hay error
      setUser(null);
      setUserProfile(null);
      setAccessToken(null);
      setLoading(false); // ✅ CRÍTICO
      localStorage.clear();
      window.location.replace('/login'); // ✅ replace, no href
    }
  };

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
  };

  const updateDisplayName = async (newDisplayName) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('user_profiles')
      .update({ display_name: newDisplayName })
      .eq('user_id', user.id);
    
    if (error) throw error;
    
    // Actualizar el estado local
    setUserProfile(prev => ({ ...prev, display_name: newDisplayName }));
  };

  const value = {
    user,
    userProfile,
    accessToken,
    loading,
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
