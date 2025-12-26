/**
 * AL-EON Memory Service
 * Permite al usuario marcar contenido como "memoria explícita"
 * 
 * REGLA: AL-EON NO decide qué se recuerda.
 * Solo solicita al Core guardar lo que el usuario confirma.
 */

import { supabase } from '@/lib/supabase';

const API_BASE = import.meta.env.VITE_ALE_CORE_BASE || import.meta.env.VITE_ALE_CORE_URL?.replace('/api/ai/chat', '');

/**
 * Guardar memoria explícita en Core
 * @param {Object} params
 * @param {string} params.content - Contenido a recordar
 * @param {string} params.type - Tipo: 'agreement' | 'fact'
 * @param {string} params.scope - Alcance: 'project' | 'user'
 * @param {string} params.projectId - ID del proyecto (opcional)
 * @param {Object} params.metadata - Metadatos adicionales (opcional)
 * @returns {Promise<Object>} Respuesta del Core
 */
export async function saveMemory({ content, type, scope = 'user', projectId, metadata = {} }) {
  try {
    // Obtener JWT del usuario actual
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('No hay sesión activa - Usuario no autenticado');
    }

    const url = `${API_BASE}/api/memory/save`;
    
    const payload = {
      content,
      type, // 'agreement' | 'fact'
      scope, // 'project' | 'user'
      ...(projectId && { projectId }),
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        source: 'al-eon',
        userInitiated: true // Siempre true - usuario decide qué se guarda
      }
    };

    console.log('💾 Guardando memoria:', { type, scope, content: content.substring(0, 50) + '...' });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Memoria guardada:', result);
    
    return result;

  } catch (error) {
    console.error('❌ Error guardando memoria:', error);
    throw error;
  }
}

/**
 * Obtener memorias guardadas (opcional - para mostrar historial)
 * @param {Object} params
 * @param {string} params.scope - Filtrar por alcance
 * @param {string} params.type - Filtrar por tipo
 * @returns {Promise<Array>} Lista de memorias
 */
export async function getMemories({ scope, type } = {}) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('No hay sesión activa');
    }

    const params = new URLSearchParams();
    if (scope) params.append('scope', scope);
    if (type) params.append('type', type);

    const url = `${API_BASE}/api/memory/list?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}`);
    }

    return await response.json();

  } catch (error) {
    console.error('❌ Error obteniendo memorias:', error);
    throw error;
  }
}

/**
 * Borrar memoria (si el usuario se arrepiente)
 * @param {string} memoryId - ID de la memoria a borrar
 * @returns {Promise<void>}
 */
export async function deleteMemory(memoryId) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('No hay sesión activa');
    }

    const url = `${API_BASE}/api/memory/${memoryId}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}`);
    }

    console.log('✅ Memoria eliminada:', memoryId);

  } catch (error) {
    console.error('❌ Error eliminando memoria:', error);
    throw error;
  }
}
