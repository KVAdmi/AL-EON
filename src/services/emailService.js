/**
 * emailService.js
 * Servicio para gestionar cuentas de email SMTP/IMAP manuales (sin Google OAuth)
 * Backend: https://api.al-eon.com
 */

import { supabase } from '../lib/supabase';

const BACKEND_URL = 'https://api.al-eon.com';

/**
 * =====================================================
 * CUENTAS DE EMAIL
 * =====================================================
 */

/**
 * Obtiene todas las cuentas de email del usuario
 * @param {string} userId - ID del usuario
 * @param {string} accessToken - Token de autenticación Supabase
 * @returns {Promise<Array>} Lista de cuentas de email
 */
export async function getEmailAccounts(userId, accessToken) {
  try {
    console.log('[EmailService] Obteniendo cuentas para userId:', userId);
    
    // 🔥 TEMPORAL: Leer directo de Supabase mientras backend implementa endpoint
    const { data: accounts, error } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('owner_user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[EmailService] Error de Supabase:', error);
      return [];
    }
    
    console.log('[EmailService] ✅ Cuentas obtenidas de Supabase:', accounts);
    return accounts || [];
    
  } catch (error) {
    console.error('[EmailService] Error en getEmailAccounts:', error);
    return [];
  }
}

/**
 * =====================================================
 * FOLDERS (CARPETAS)
 * =====================================================
 */

/**
 * Obtiene todas las carpetas de una cuenta
 * @param {string} accountId - ID de la cuenta
 * @param {string} userId - ID del usuario
 * @param {string} accessToken - Token de autenticación Supabase
 * @returns {Promise<Array>} Lista de carpetas
 */
export async function getFolders(accountId, userId, accessToken) {
  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${BACKEND_URL}/api/mail/folders/${accountId}?ownerUserId=${userId}`, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al obtener carpetas');
    }

    const data = await response.json();
    return data.folders || [];
  } catch (error) {
    console.error('[EmailService] Error en getFolders:', error);
    throw error;
  }
}

/**
 * Crea una carpeta personalizada
 * @param {Object} folderData - Datos de la carpeta
 * @returns {Promise<Object>} Carpeta creada
 */
export async function createFolder(folderData) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/mail/folders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(folderData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al crear carpeta');
    }

    return await response.json();
  } catch (error) {
    console.error('[EmailService] Error en createFolder:', error);
    throw error;
  }
}

/**
 * =====================================================
 * DRAFTS (BORRADORES)
 * =====================================================
 */

/**
 * Obtiene los borradores del usuario
 * @param {string} userId - ID del usuario
 * @param {string} accountId - ID de la cuenta (opcional)
 * @returns {Promise<Array>} Lista de borradores
 */
export async function getDrafts(userId, accountId = null) {
  try {
    const url = accountId 
      ? `${BACKEND_URL}/api/mail/drafts?ownerUserId=${userId}&accountId=${accountId}`
      : `${BACKEND_URL}/api/mail/drafts?ownerUserId=${userId}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al obtener borradores');
    }

    const data = await response.json();
    return data.drafts || [];
  } catch (error) {
    console.error('[EmailService] Error en getDrafts:', error);
    throw error;
  }
}

/**
 * Crea un borrador
 * @param {Object} draftData - Datos del borrador
 * @returns {Promise<Object>} Borrador creado
 */
export async function createDraft(draftData) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/mail/drafts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(draftData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al crear borrador');
    }

    return await response.json();
  } catch (error) {
    console.error('[EmailService] Error en createDraft:', error);
    throw error;
  }
}

/**
 * Actualiza un borrador
 * @param {string} draftId - ID del borrador
 * @param {Object} updates - Campos a actualizar
 * @returns {Promise<Object>} Borrador actualizado
 */
export async function updateDraft(draftId, updates) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/mail/drafts/${draftId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al actualizar borrador');
    }

    return await response.json();
  } catch (error) {
    console.error('[EmailService] Error en updateDraft:', error);
    throw error;
  }
}

/**
 * Elimina un borrador
 * @param {string} draftId - ID del borrador
 * @returns {Promise<Object>} Confirmación
 */
export async function deleteDraft(draftId) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/mail/drafts/${draftId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al eliminar borrador');
    }

    return await response.json();
  } catch (error) {
    console.error('[EmailService] Error en deleteDraft:', error);
    throw error;
  }
}

/**
 * Envía un borrador
 * @param {string} draftId - ID del borrador
 * @returns {Promise<Object>} Resultado del envío
 */
export async function sendDraft(draftId) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/mail/drafts/${draftId}/send`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al enviar borrador');
    }

    return await response.json();
  } catch (error) {
    console.error('[EmailService] Error en sendDraft:', error);
    throw error;
  }
}

/**
 * =====================================================
 * ATTACHMENTS (ADJUNTOS)
 * =====================================================
 */

/**
 * Sube un archivo adjunto
 * @param {File} file - Archivo a subir
 * @param {string} ownerUserId - ID del usuario
 * @param {string} draftId - ID del borrador (opcional)
 * @param {string} messageId - ID del mensaje (opcional)
 * @returns {Promise<Object>} Attachment creado
 */
export async function uploadAttachment(file, ownerUserId, draftId = null, messageId = null) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('ownerUserId', ownerUserId);
    if (draftId) formData.append('draftId', draftId);
    if (messageId) formData.append('messageId', messageId);
    
    const response = await fetch(`${BACKEND_URL}/api/mail/attachments/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al subir archivo');
    }

    return await response.json();
  } catch (error) {
    console.error('[EmailService] Error en uploadAttachment:', error);
    throw error;
  }
}

/**
 * Obtiene la URL de descarga de un adjunto
 * @param {string} attachmentId - ID del attachment
 * @returns {string} URL de descarga
 */
export function getAttachmentDownloadUrl(attachmentId) {
  return `${BACKEND_URL}/api/mail/attachments/${attachmentId}/download`;
}

/**
 * Elimina un attachment
 * @param {string} attachmentId - ID del attachment
 * @returns {Promise<Object>} Confirmación
 */
export async function deleteAttachment(attachmentId) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/mail/attachments/${attachmentId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al eliminar adjunto');
    }

    return await response.json();
  } catch (error) {
    console.error('[EmailService] Error en deleteAttachment:', error);
    throw error;
  }
}

/**
 * Crea una nueva cuenta de email SMTP/IMAP
 * @param {Object} accountData - Datos de la cuenta
 * @param {string} accountData.userId - ID del usuario
 * @param {string} accountData.fromName - Nombre del remitente
 * @param {string} accountData.fromEmail - Email del remitente
 * @param {Object} accountData.smtp - Configuración SMTP
 * @param {string} accountData.smtp.host - Host SMTP
 * @param {number} accountData.smtp.port - Puerto SMTP
 * @param {boolean} accountData.smtp.secure - Usar SSL/TLS
 * @param {string} accountData.smtp.user - Usuario SMTP
 * @param {string} accountData.smtp.password - Contraseña SMTP
 * @param {Object} [accountData.imap] - Configuración IMAP (opcional)
 * @returns {Promise<Object>} Cuenta creada
 */
export async function createEmailAccount(accountData) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/email/accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(accountData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al crear cuenta de email');
    }

    return await response.json();
  } catch (error) {
    console.error('[EmailService] Error en createEmailAccount:', error);
    throw error;
  }
}

/**
 * Actualiza una cuenta de email existente
 * @param {string} accountId - ID de la cuenta
 * @param {Object} accountData - Datos a actualizar
 * @returns {Promise<Object>} Cuenta actualizada
 */
export async function updateEmailAccount(accountId, accountData) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/email/accounts/${accountId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(accountData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al actualizar cuenta de email');
    }

    return await response.json();
  } catch (error) {
    console.error('[EmailService] Error en updateEmailAccount:', error);
    throw error;
  }
}

/**
 * Elimina una cuenta de email
 * @param {string} accountId - ID de la cuenta
 * @returns {Promise<void>}
 */
export async function deleteEmailAccount(accountId) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/email/accounts/${accountId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al eliminar cuenta de email');
    }

    return await response.json();
  } catch (error) {
    console.error('[EmailService] Error en deleteEmailAccount:', error);
    throw error;
  }
}

/**
 * Prueba la conexión de una cuenta de email
 * @param {string} accountId - ID de la cuenta
 * @returns {Promise<Object>} Resultado de la prueba con success y mensaje
 */
export async function testEmailConnection(accountId) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/email/accounts/${accountId}/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    // Verificar si la respuesta es JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('[EmailService] ⚠️ Endpoint no implementado - respuesta HTML');
      return {
        success: false,
        message: '⚠️ El backend aún no tiene implementado el test de conexión IMAP. Guarda la cuenta y verifica manualmente.',
      };
    }

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.message || result.error || 'Error al probar conexión',
      };
    }

    return {
      success: true,
      message: result.message || 'Conexión exitosa',
    };
  } catch (error) {
    console.error('[EmailService] Error en testEmailConnection:', error);
    
    // Si el error es de parsing JSON, significa que el endpoint no existe
    if (error.message.includes('JSON') || error.message.includes('Unexpected token')) {
      return {
        success: false,
        message: '⚠️ El backend aún no tiene implementado este endpoint. Puedes guardar la cuenta de todas formas.',
      };
    }
    
    return {
      success: false,
      message: error.message || 'Error de red al probar conexión',
    };
  }
}

/**
 * Envía un email usando una cuenta configurada
 * @param {Object} mailData - Datos del email
 * @param {string} mailData.accountId - ID de la cuenta a usar
 * @param {string} mailData.to - Destinatario
 * @param {string} mailData.subject - Asunto
 * @param {string} mailData.body - Cuerpo del mensaje (HTML o texto)
 * @param {Array} [mailData.cc] - CC (opcional)
 * @param {Array} [mailData.bcc] - BCC (opcional)
 * @param {Array} [mailData.attachments] - Adjuntos (opcional)
 * @returns {Promise<Object>} Resultado con { success, messageId?, message? }
 */
export async function sendEmail(mailData) {
  try {
    console.log('[EmailService] 📤 Enviando email...', mailData);
    
    // Obtener sesión y userId
    const { data: { session, user } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    const userId = user?.id;
    
    if (!accessToken || !userId) {
      console.error('[EmailService] ❌ No hay autenticación');
      throw new Error('No estás autenticado. Por favor inicia sesión.');
    }
    
    console.log('[EmailService] ✅ Usuario autenticado:', userId);
    
    // Agregar ownerUserId al payload
    const payload = {
      ...mailData,
      ownerUserId: userId,
    };
    
    console.log('[EmailService] 📦 Payload completo:', payload);
    
    const response = await fetch(`${BACKEND_URL}/api/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[EmailService] ❌ Error del servidor:', response.status, data);
      throw new Error(data.message || 'Error al enviar email');
    }
    
    console.log('[EmailService] ✅ Email enviado:', data);
    return data;

    // RETORNAR RESPUESTA DEL CORE TAL CUAL
    return data;
  } catch (error) {
    console.error('[EmailService] Error en sendEmail:', error);
    throw error;
  }
}

/**
 * Obtiene la bandeja de entrada (IMAP)
 * @param {string} accountId - ID de la cuenta
 * @param {Object} options - Opciones de paginación
 * @returns {Promise<Object>} Mensajes de la bandeja
 */
export async function getInbox(accountId, options = {}) {
  try {
    const params = new URLSearchParams({
      accountId,
      ...options,
    });

    const response = await fetch(`${BACKEND_URL}/api/mail/inbox?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al obtener inbox');
    }

    return await response.json();
  } catch (error) {
    console.error('[EmailService] Error en getInbox:', error);
    throw error;
  }
}

/**
 * Obtiene un mensaje específico
 * @param {string} accountId - ID de la cuenta
 * @param {string} messageId - ID del mensaje
 * @returns {Promise<Object>} Detalles del mensaje
 */
export async function getMessage(accountId, messageId) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/mail/messages/${messageId}?accountId=${accountId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al obtener mensaje');
    }

    return await response.json();
  } catch (error) {
    console.error('[EmailService] Error en getMessage:', error);
    throw error;
  }
}

/**
 * Marca un mensaje como leído
 * @param {string} accountId - ID de la cuenta
 * @param {string} messageId - ID del mensaje
 * @returns {Promise<Object>} Confirmación
 */
export async function markAsRead(accountId, messageId) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/mail/messages/${messageId}/read`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ accountId, is_read: true }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al marcar como leído');
    }

    return await response.json();
  } catch (error) {
    console.error('[EmailService] Error en markAsRead:', error);
    throw error;
  }
}

/**
 * Toggle estrella en un mensaje
 * @param {string} accountId - ID de la cuenta
 * @param {string} messageId - ID del mensaje
 * @returns {Promise<Object>} Confirmación
 */
export async function toggleStar(accountId, messageId) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/mail/messages/${messageId}/star`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ accountId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al actualizar estrella');
    }

    return await response.json();
  } catch (error) {
    console.error('[EmailService] Error en toggleStar:', error);
    throw error;
  }
}

/**
 * Mueve un mensaje a otra carpeta
 * @param {string} accountId - ID de la cuenta
 * @param {string} messageId - ID del mensaje
 * @param {string} folderName - Nombre de la carpeta destino
 * @returns {Promise<Object>} Confirmación
 */
export async function moveToFolder(accountId, messageId, folderName) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/mail/messages/${messageId}/move`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ accountId, folder: folderName }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al mover mensaje');
    }

    return await response.json();
  } catch (error) {
    console.error('[EmailService] Error en moveToFolder:', error);
    throw error;
  }
}

/**
 * Sincroniza una cuenta de email (descarga nuevos mensajes)
 * @param {string} accountId - ID de la cuenta
 * @returns {Promise<Object>} Resultado de la sincronización
 */
export async function syncEmailAccount(accountId) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/email/accounts/${accountId}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al sincronizar cuenta');
    }

    return await response.json();
  } catch (error) {
    console.error('[EmailService] Error en syncEmailAccount:', error);
    throw error;
  }
}

/**
 * Guarda un borrador
 * @param {string} accountId - ID de la cuenta
 * @param {Object} draftData - Datos del borrador
 * @returns {Promise<Object>} Borrador guardado
 */
export async function saveDraft(accountId, draftData) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/mail/drafts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ accountId, ...draftData }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al guardar borrador');
    }

    return await response.json();
  } catch (error) {
    console.error('[EmailService] Error en saveDraft:', error);
    throw error;
  }
}
