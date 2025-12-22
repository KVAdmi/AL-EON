/**
 * imagesService.js - Servicio para generación de imágenes
 * 
 * FUNCIONES:
 * - Generar imagen con DALL-E
 * - Listar imágenes de una sesión
 */

const BASE_URL = import.meta.env.VITE_ALE_CORE_BASE;

/**
 * Generar imagen
 */
export async function generateImage({ prompt, size = '1024x1024', sessionId, userId }) {
  console.log(`🎨 Generando imagen: "${prompt.substring(0, 50)}..."`);

  const response = await fetch(`${BASE_URL}/api/images/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      size,
      sessionId,
      userId: userId || import.meta.env.VITE_USER_ID || 'patty',
      workspaceId: import.meta.env.VITE_WORKSPACE_ID || 'al-eon'
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Error generando imagen: ${error}`);
  }

  const result = await response.json();
  console.log(`✅ Imagen generada: ${result.imageUrl}`);

  return result;
}

/**
 * Listar imágenes de una sesión
 */
export async function getSessionImages(sessionId) {
  const response = await fetch(
    `${BASE_URL}/api/images?sessionId=${sessionId}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Error obteniendo imágenes: ${error}`);
  }

  return response.json();
}
