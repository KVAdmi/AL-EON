/**
 * AL-EON Sessions Service
 * Maneja las sesiones (conversaciones) con AL-E Core Backend
 * NO toca Supabase directamente - todo via API
 */

const API_BASE = import.meta.env.VITE_ALE_CORE_BASE;
const WORKSPACE_ID = import.meta.env.VITE_WORKSPACE_ID || 'al-eon';
const USER_ID = import.meta.env.VITE_USER_ID || 'patty';

/**
 * Crear nueva sesión
 */
export async function createSession({ mode = 'universal', assistantId = null }) {
  try {
    const response = await fetch(`${API_BASE}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspace_id: WORKSPACE_ID,
        user_id: USER_ID,
        mode,
        assistant_id: assistantId
      })
    });

    if (!response.ok) {
      throw new Error(`Error creando sesión: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Error creando sesión:', error);
    throw error;
  }
}

/**
 * Obtener lista de sesiones (para sidebar)
 */
export async function getSessions() {
  try {
    const response = await fetch(
      `${API_BASE}/api/sessions?workspaceId=${WORKSPACE_ID}&userId=${USER_ID}`
    );

    if (!response.ok) {
      throw new Error(`Error obteniendo sesiones: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Error obteniendo sesiones:', error);
    return []; // Devolver array vacío si falla
  }
}

/**
 * Obtener mensajes de una sesión
 */
export async function getSession(sessionId) {
  try {
    const response = await fetch(`${API_BASE}/api/sessions/${sessionId}`);

    if (!response.ok) {
      throw new Error(`Error obteniendo sesión: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Error obteniendo sesión:', error);
    throw error;
  }
}

/**
 * Actualizar sesión (título, pinned, archived)
 */
export async function updateSession(sessionId, updates) {
  try {
    const response = await fetch(`${API_BASE}/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error(`Error actualizando sesión: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Error actualizando sesión:', error);
    throw error;
  }
}

/**
 * Eliminar sesión
 */
export async function deleteSession(sessionId) {
  try {
    const response = await fetch(`${API_BASE}/api/sessions/${sessionId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`Error eliminando sesión: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('❌ Error eliminando sesión:', error);
    throw error;
  }
}
