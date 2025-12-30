/**
 * webService.js - Servicio para búsqueda web
 * 
 * FUNCIONES:
 * - Buscar en web
 * - Obtener contenido de URL
 */

const BASE_URL = import.meta.env.VITE_ALE_CORE_BASE;

/**
 * Buscar en la web
 */
export async function searchWeb({ query, sessionId, userId }) {
  console.log(`🔍 Buscando en web: "${query}"`);

  const response = await fetch(`${BASE_URL}/api/web/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      sessionId,
      userId: userId || import.meta.env.VITE_USER_ID || 'patty',
      workspaceId: import.meta.env.VITE_WORKSPACE_ID || 'al-eon'
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Error buscando en web: ${error}`);
  }

  const result = await response.json();
  console.log(`✅ Búsqueda completada: ${result.sources?.length || 0} fuentes encontradas`);

  return result;
}

/**
 * Obtener contenido de URL
 */
export async function fetchUrl({ url, sessionId, userId }) {
  console.log(`🌐 Obteniendo contenido de: ${url}`);

  const response = await fetch(`${BASE_URL}/api/web/fetch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      sessionId,
      userId: userId || import.meta.env.VITE_USER_ID || 'patty',
      workspaceId: import.meta.env.VITE_WORKSPACE_ID || 'al-eon'
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Error obteniendo URL: ${error}`);
  }

  const result = await response.json();
  console.log(`✅ Contenido obtenido: ${result.content?.length || 0} caracteres`);

  return result;
}
