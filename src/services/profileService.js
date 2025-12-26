/**
 * Servicio para manejar el perfil de usuario y personalización
 */

import { supabase } from '@/lib/supabase';

const API_BASE = import.meta.env.VITE_ALE_CORE_BASE || import.meta.env.VITE_ALE_CORE_URL || 'https://api.al-eon.com';

/**
 * Obtener perfil completo del usuario desde Core
 * (incluye preferencias de personalización)
 */
export async function getProfile() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('No hay sesión activa');
    }

    const response = await fetch(`${API_BASE}/api/profile/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al cargar perfil');
    }

    const profile = await response.json();
    console.log('✅ Perfil cargado:', profile);
    return profile;
  } catch (error) {
    console.error('❌ Error en getProfile:', error);
    throw error;
  }
}

/**
 * Actualizar preferencias de personalización
 */
export async function updatePersonalization({ preferred_name, assistant_name, tone_pref }) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('No hay sesión activa');
    }

    const body = {};
    if (preferred_name !== undefined) body.preferred_name = preferred_name;
    if (assistant_name !== undefined) body.assistant_name = assistant_name;
    if (tone_pref !== undefined) body.tone_pref = tone_pref;

    const response = await fetch(`${API_BASE}/api/profile/me`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al actualizar perfil');
    }

    const updatedProfile = await response.json();
    console.log('✅ Perfil actualizado:', updatedProfile);
    return updatedProfile;
  } catch (error) {
    console.error('❌ Error en updatePersonalization:', error);
    throw error;
  }
}

/**
 * Cargar preferencias desde Supabase directo (fallback)
 * Solo para mostrar en UI mientras Core no esté listo
 */
export async function getPersonalizationLocal() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No hay usuario autenticado');
    }

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('display_name, preferred_name, assistant_name, tone_pref')
      .eq('user_id', user.id)
      .single();

    if (error) throw error;

    return {
      display_name: profile.display_name,
      preferred_name: profile.preferred_name || profile.display_name,
      assistant_name: profile.assistant_name || 'Luma',
      tone_pref: profile.tone_pref || 'barrio'
    };
  } catch (error) {
    console.error('❌ Error en getPersonalizationLocal:', error);
    throw error;
  }
}

/**
 * Actualizar preferencias directamente en Supabase (fallback)
 * Solo mientras Core no esté listo
 */
export async function updatePersonalizationLocal({ preferred_name, assistant_name, tone_pref }) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No hay usuario autenticado');
    }

    const updates = {};
    if (preferred_name !== undefined) updates.preferred_name = preferred_name;
    if (assistant_name !== undefined) updates.assistant_name = assistant_name;
    if (tone_pref !== undefined) updates.tone_pref = tone_pref;

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Preferencias actualizadas (local):', data);
    return data;
  } catch (error) {
    console.error('❌ Error en updatePersonalizationLocal:', error);
    throw error;
  }
}
