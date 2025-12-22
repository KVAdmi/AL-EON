/**
 * filesService.js - Servicio para manejo de archivos
 * 
 * FUNCIONES:
 * - Obtener URL firmada para upload
 * - Subir archivo al storage
 * - Ingestar archivo (asociar a sesión/mensaje)
 * - Listar archivos de una sesión
 */

const BASE_URL = import.meta.env.VITE_ALE_CORE_BASE;

/**
 * Obtener URL firmada para subir archivo
 */
export async function getUploadUrl(fileName, fileType, fileSize) {
  const response = await fetch(`${BASE_URL}/api/files/upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName,
      fileType,
      fileSize,
      workspaceId: import.meta.env.VITE_WORKSPACE_ID || 'al-eon'
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Error obteniendo URL de subida: ${error}`);
  }

  return response.json();
}

/**
 * Subir archivo usando URL firmada
 */
export async function uploadFile(file, uploadUrl) {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'application/octet-stream'
    },
    body: file
  });

  if (!response.ok) {
    throw new Error(`Error subiendo archivo: ${response.statusText}`);
  }

  return true;
}

/**
 * Ingestar archivo (asociar a sesión/mensaje)
 */
export async function ingestFile({
  fileId,
  fileName,
  fileType,
  fileSize,
  fileUrl,
  sessionId,
  messageId,
  workspaceId
}) {
  const response = await fetch(`${BASE_URL}/api/files/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileId,
      fileName,
      fileType,
      fileSize,
      fileUrl,
      sessionId,
      messageId,
      workspaceId: workspaceId || import.meta.env.VITE_WORKSPACE_ID || 'al-eon'
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Error ingiriendo archivo: ${error}`);
  }

  return response.json();
}

/**
 * Listar archivos de una sesión
 */
export async function getSessionFiles(sessionId) {
  const response = await fetch(
    `${BASE_URL}/api/files?sessionId=${sessionId}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Error obteniendo archivos: ${error}`);
  }

  return response.json();
}

/**
 * Proceso completo: obtener URL → subir → ingestar
 */
export async function uploadAndIngestFile(file, sessionId, messageId = null) {
  try {
    console.log(`📤 Iniciando subida de archivo: ${file.name}`);

    // 1. Obtener URL firmada
    const { uploadUrl, fileId, fileUrl } = await getUploadUrl(
      file.name,
      file.type,
      file.size
    );

    console.log(`✅ URL de subida obtenida: ${fileId}`);

    // 2. Subir archivo
    await uploadFile(file, uploadUrl);
    console.log(`✅ Archivo subido exitosamente`);

    // 3. Ingestar (asociar a sesión)
    const result = await ingestFile({
      fileId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      fileUrl,
      sessionId,
      messageId,
      workspaceId: import.meta.env.VITE_WORKSPACE_ID || 'al-eon'
    });

    console.log(`✅ Archivo ingerido: ${result.id}`);

    return {
      id: result.id,
      fileId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      fileUrl,
      status: 'success'
    };
  } catch (error) {
    console.error(`❌ Error en proceso de subida:`, error);
    throw error;
  }
}
