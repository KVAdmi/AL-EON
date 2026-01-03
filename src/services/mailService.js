/**
 * Servicio para gestión de correos con AWS SES
 */

const API_BASE = 'https://api.al-eon.com';

/**
 * Obtener lista de mensajes de correo
 * @param {string} accessToken - JWT token
 * @param {Object} params - Parámetros de consulta
 * @returns {Promise<Array>}
 */
export async function getMailMessages(accessToken, params = {}) {
  const queryParams = new URLSearchParams({
    limit: params.limit || '50',
    offset: params.offset || '0',
    status: params.status || '',
    folder: params.folder || 'inbox',
  });

  const response = await fetch(`${API_BASE}/api/mail/messages?${queryParams}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Error al cargar mensajes');
  }

  const data = await response.json();
  return data.messages || data || [];
}

/**
 * Obtener detalle de un mensaje específico
 * @param {string} accessToken - JWT token
 * @param {string} messageId - ID del mensaje
 * @returns {Promise<Object>}
 */
export async function getMailMessage(accessToken, messageId) {
  const response = await fetch(`${API_BASE}/api/mail/messages/${messageId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Error al cargar mensaje');
  }

  const data = await response.json();
  return data.message || data;
}

/**
 * Marcar mensaje como leído
 * @param {string} accessToken - JWT token
 * @param {string} messageId - ID del mensaje
 * @returns {Promise<Object>}
 */
export async function markMailAsRead(accessToken, messageId) {
  const response = await fetch(`${API_BASE}/api/mail/messages/${messageId}/read`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Error al marcar como leído');
  }

  return await response.json();
}

/**
 * Generar respuesta con IA
 * @param {string} accessToken - JWT token
 * @param {string} messageId - ID del mensaje
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<Object>}
 */
export async function generateAIReply(accessToken, messageId, options = {}) {
  const response = await fetch(`${API_BASE}/api/mail/messages/${messageId}/ai-reply`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Error al generar respuesta');
  }

  const data = await response.json();
  return data;
}

/**
 * Guardar o actualizar borrador
 * @param {string} accessToken - JWT token
 * @param {string} messageId - ID del mensaje original
 * @param {Object} draftData - Datos del borrador
 * @returns {Promise<Object>}
 */
export async function saveDraft(accessToken, messageId, draftData) {
  const response = await fetch(`${API_BASE}/api/mail/messages/${messageId}/draft`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(draftData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Error al guardar borrador');
  }

  return await response.json();
}

/**
 * Obtener borradores pendientes
 * @param {string} accessToken - JWT token
 * @returns {Promise<Array>}
 */
export async function getPendingDrafts(accessToken) {
  const response = await fetch(`${API_BASE}/api/mail/drafts?status=pending_send`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Error al cargar borradores');
  }

  const data = await response.json();
  return data.drafts || data || [];
}

/**
 * Actualizar flag/bandera de un mensaje
 * @param {string} accessToken - JWT token
 * @param {string} messageId - ID del mensaje
 * @param {string} flag - Tipo de bandera
 * @returns {Promise<Object>}
 */
export async function updateMailFlag(accessToken, messageId, flag) {
  const response = await fetch(`${API_BASE}/api/mail/messages/${messageId}/flag`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ flag }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Error al actualizar bandera');
  }

  return await response.json();
}

/**
 * Marcar mensaje como spam
 * @param {string} accessToken - JWT token
 * @param {string} messageId - ID del mensaje
 * @returns {Promise<Object>}
 */
export async function markAsSpam(accessToken, messageId) {
  const response = await fetch(`${API_BASE}/api/mail/messages/${messageId}/spam`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Error al marcar como spam');
  }

  return await response.json();
}
