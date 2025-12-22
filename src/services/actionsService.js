/**
 * actionsService.js - Servicio para ejecutar acciones/tareas
 * 
 * FUNCIONES:
 * - Ejecutar acción
 * - Listar acciones disponibles
 */

const BASE_URL = import.meta.env.VITE_ALE_CORE_BASE;

/**
 * Ejecutar acción
 */
export async function runAction({ actionId, payload, sessionId, userId }) {
  console.log(`⚡ Ejecutando acción: ${actionId}`);

  const response = await fetch(`${BASE_URL}/api/actions/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      actionId,
      payload,
      sessionId,
      userId: userId || import.meta.env.VITE_USER_ID || 'patty',
      workspaceId: import.meta.env.VITE_WORKSPACE_ID || 'al-eon'
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Error ejecutando acción: ${error}`);
  }

  const result = await response.json();
  console.log(`✅ Acción ejecutada: ${actionId}`, result);

  return result;
}

/**
 * Listar acciones disponibles
 */
export async function getAvailableActions(sessionId) {
  const response = await fetch(
    `${BASE_URL}/api/actions?sessionId=${sessionId}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Error obteniendo acciones: ${error}`);
  }

  return response.json();
}
