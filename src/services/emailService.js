/**
 * emailService.js
 * Servicio para gestionar cuentas de email SMTP/IMAP manuales (sin Google OAuth)
 * Backend: https://api.al-eon.com
 */

import { supabase } from '../lib/supabase';

const BACKEND_URL = 'https://api.al-eon.com';

/**
 * 🔐 Obtiene el token de autenticación JWT desde Supabase
 * @returns {Promise<string|null>} Access token o null si no hay sesión
 */
async function getAuthToken() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.warn('[EmailService] ⚠️ Error obteniendo sesión:', error.message);
      return null;
    }
    
    if (!session?.access_token) {
      console.warn('[EmailService] ⚠️ No hay sesión activa');
      return null;
    }
    
    return session.access_token;
  } catch (error) {
    console.error('[EmailService] ❌ Error en getAuthToken:', error);
    return null;
  }
}

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
    console.log('[EmailService] 🔍 Obteniendo cuentas para userId:', userId);
    
    // 🔥 TEMPORAL: Leer directo de Supabase mientras backend implementa endpoint
    // ✅ ELIMINAR filtro is_active para debugging
    const { data: accounts, error } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('owner_user_id', userId)
      // .eq('is_active', true) // ❌ COMENTADO para ver TODAS las cuentas
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[EmailService] ❌ Error de Supabase:', error);
      return [];
    }
    
    console.log('[EmailService] ✅ Cuentas encontradas:', accounts?.length || 0);
    console.log('[EmailService] 📋 Detalle de cuentas:', accounts?.map(a => ({
      id: a.id,
      email: a.from_email, // ✅ Corregido: from_email, no email_address
      provider: a.provider,
      is_active: a.is_active
    })));
    
    return accounts || [];
    
  } catch (error) {
    console.error('[EmailService] ❌ Error en getEmailAccounts:', error);
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
    // 🔐 Obtener token JWT
    const token = accessToken || await getAuthToken();
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`, // ✅ Token incluido
    };

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
    // 🔐 Obtener token JWT
    const token = await getAuthToken();
    
    const response = await fetch(`${BACKEND_URL}/api/mail/folders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // ✅ Token incluido
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
    // 🔐 Obtener token JWT
    const token = await getAuthToken();
    
    const url = accountId 
      ? `${BACKEND_URL}/api/mail/drafts?ownerUserId=${userId}&accountId=${accountId}`
      : `${BACKEND_URL}/api/mail/drafts?ownerUserId=${userId}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // ✅ Token incluido
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
    // 🔐 Obtener token JWT
    const token = await getAuthToken();
    
    const response = await fetch(`${BACKEND_URL}/api/mail/drafts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // ✅ Token incluido
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
    // 🔐 Obtener token JWT
    const token = await getAuthToken();
    
    const response = await fetch(`${BACKEND_URL}/api/mail/drafts/${draftId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // ✅ Token incluido
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
    // 🔐 Obtener token JWT
    const token = await getAuthToken();
    
    const response = await fetch(`${BACKEND_URL}/api/mail/drafts/${draftId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`, // ✅ Token incluido
      },
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
    // 🔐 Obtener token JWT
    const token = await getAuthToken();
    
    const response = await fetch(`${BACKEND_URL}/api/mail/drafts/${draftId}/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`, // ✅ Token incluido
      },
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
    // 🔐 Obtener token JWT
    const token = await getAuthToken();
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('ownerUserId', ownerUserId);
    if (draftId) formData.append('draftId', draftId);
    if (messageId) formData.append('messageId', messageId);
    
    const response = await fetch(`${BACKEND_URL}/api/mail/attachments/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`, // ✅ Token incluido (NO Content-Type con FormData)
      },
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
    // 🔐 Obtener token JWT
    const token = await getAuthToken();
    
    const response = await fetch(`${BACKEND_URL}/api/mail/attachments/${attachmentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`, // ✅ Token incluido
      },
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
    // 🔐 Obtener token JWT
    const token = await getAuthToken();
    
    const response = await fetch(`${BACKEND_URL}/api/email/accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // ✅ Token incluido
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
    // 🔐 Obtener token JWT
    const token = await getAuthToken();
    
    const response = await fetch(`${BACKEND_URL}/api/email/accounts/${accountId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // ✅ Token incluido
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
    // 🔐 Obtener token JWT
    const token = await getAuthToken();
    
    const response = await fetch(`${BACKEND_URL}/api/email/accounts/${accountId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // ✅ Token incluido
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
    // 🔐 Obtener token JWT
    const token = await getAuthToken();
    
    const response = await fetch(`${BACKEND_URL}/api/email/accounts/${accountId}/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // ✅ Token incluido
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
 * @param {string} [accessToken] - Token de autenticación (opcional, se obtiene de sesión si no se pasa)
 * @returns {Promise<Object>} Resultado con { success, messageId?, message? }
 */
export async function sendEmail(mailData, accessToken = null) {
  try {
    console.log('[EmailService] 📤 Enviando email...', mailData);
    
    let token = accessToken;
    let userId = null;
    
    // Si no se pasó token, intentar obtenerlo de la sesión
    if (!token) {
      console.log('[EmailService] 🔍 No se pasó token, obteniendo de sesión...');
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('[EmailService] ❌ Error obteniendo sesión:', sessionError);
        throw new Error('Error de autenticación. Intenta cerrar sesión y volver a iniciar.');
      }
      
      const session = sessionData?.session;
      token = session?.access_token;
      userId = session?.user?.id;
      
      console.log('[EmailService] 🔍 Session existe:', !!session);
      console.log('[EmailService] 🔍 Token obtenido:', token ? token.substring(0, 20) + '...' : 'NO');
      console.log('[EmailService] 🔍 User ID:', userId);
    } else {
      console.log('[EmailService] ✅ Token recibido como parámetro');
      // Si se pasó token, extraer userId del token (decodificar JWT)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.sub;
        console.log('[EmailService] 🔍 User ID del token:', userId);
      } catch (e) {
        console.error('[EmailService] ⚠️ No se pudo extraer userId del token');
      }
    }
    
    if (!token) {
      console.error('[EmailService] ❌ NO HAY TOKEN DE AUTENTICACIÓN');
      throw new Error('No estás autenticado. Por favor cierra sesión y vuelve a iniciar.');
    }
    
    console.log('[EmailService] ✅ Token disponible, preparando envío...');
    
    // ✅ VALIDACIÓN FUERTE (antes de pegarle al backend)
    const toRaw = Array.isArray(mailData.to) ? mailData.to : String(mailData.to || '');
    const toList = Array.isArray(toRaw)
      ? toRaw.map(e => String(e || '').trim()).filter(Boolean)
      : toRaw.split(',').map(e => e.trim()).filter(Boolean);

    const subject = String(mailData.subject || '').trim();
    const body = String(mailData.body || '').trim(); // texto o html

    if (!mailData.accountId) {
      throw new Error('Selecciona una cuenta de correo antes de enviar.');
    }
    if (!toList.length) {
      throw new Error('Falta el destinatario (to).');
    }
    if (!subject) {
      throw new Error('Falta el asunto (subject).');
    }
    if (!body) {
      throw new Error('Falta el contenido del correo (body/html).');
    }
    
    // Transformar el payload al formato que espera el backend
    const payload = {
      accountId: mailData.accountId,
      to: toList,             // ✅ array limpio
      subject,
      body,                   // ✅ siempre string no vacío
    };
    
    // Agregar campos opcionales
    if (mailData.cc) {
      const ccList = Array.isArray(mailData.cc)
        ? mailData.cc.map(e => String(e || '').trim()).filter(Boolean)
        : String(mailData.cc).split(',').map(e => e.trim()).filter(Boolean);
      if (ccList.length) payload.cc = ccList;
    }

    if (mailData.bcc) {
      const bccList = Array.isArray(mailData.bcc)
        ? mailData.bcc.map(e => String(e || '').trim()).filter(Boolean)
        : String(mailData.bcc).split(',').map(e => e.trim()).filter(Boolean);
      if (bccList.length) payload.bcc = bccList;
    }
    
    if (mailData.attachments) {
      payload.attachments = mailData.attachments;
    }
    
    console.log('[EmailService] 📦 Payload transformado:', payload);
    
    const response = await fetch(`${BACKEND_URL}/api/mail/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
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
    
    // ✅ NO guardar aquí - el BACKEND ya lo guarda en Sent folder
    // ❌ ELIMINADO: insert a email_messages desde frontend
    // El backend guarda automáticamente en folder_id correcto
    
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
    console.log('[EmailService] 📬 getInbox llamado con:', { accountId, options });
    
    // 🔥 LEER DIRECTO DE SUPABASE con JOIN a email_folders
    const { data: messages, error } = await supabase
      .from('email_messages')
      .select(`
        *,
        folder:email_folders!folder_id(id, folder_name, folder_type, imap_path)
      `)
      .eq('account_id', accountId)
      .order('date', { ascending: false })
      .limit(options.limit || 50);
    
    if (error) {
      console.error('[EmailService] Error de Supabase:', error);
      throw new Error('Error al obtener mensajes de Supabase');
    }
    
    console.log(`[EmailService] ✅ ${messages?.length || 0} mensajes obtenidos de Supabase`);
    
    // Transformar al formato esperado
    return {
      messages: (messages || []).map(msg => ({
        id: msg.id,
        message_id: msg.id,
        from_address: msg.from_address,
        from_name: msg.from_name,
        from_email: msg.from_address,
        to_addresses: msg.to_addresses,
        subject: msg.subject,
        preview: msg.body_preview,
        body_preview: msg.body_preview,
        date: msg.date,
        received_at: msg.date,
        is_read: msg.is_read,
        is_starred: msg.is_starred,
        has_attachments: msg.has_attachments,
        account_id: msg.account_id,
        folder: msg.folder?.folder_name || msg.folder?.folder_type || 'Unknown', // ✅ Usar folder del JOIN
        folder_id: msg.folder_id,
        folder_type: msg.folder?.folder_type,
      }))
    };
  } catch (error) {
    console.error('[EmailService] Error en getInbox:', error);
    throw error;
  }
}

/**
 * Obtiene un mensaje específico CON CONTENIDO COMPLETO desde el backend
 * 🔥 NUEVO: Llama al endpoint correcto del backend
 * @param {string} messageId - ID del mensaje
 * @returns {Promise<Object>} Detalles del mensaje con body_html y body_text
 */
export async function getEmailById(messageId) {
  try {
    console.log('[EmailService] 📧 getEmailById - Obteniendo contenido completo:', messageId);
    
    // 🔐 Obtener token JWT
    const token = await getAuthToken();
    
    const response = await fetch(`${BACKEND_URL}/api/mail/messages/${messageId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(error.message || 'Error al obtener mensaje');
    }

    const message = await response.json();
    
    console.log('[EmailService] ✅ Mensaje con contenido completo obtenido:', {
      id: message.id,
      has_body_html: !!message.body_html,
      has_body_text: !!message.body_text,
      body_html_length: message.body_html?.length || 0,
      body_text_length: message.body_text?.length || 0,
      subject: message.subject
    });
    
    return message;
  } catch (error) {
    console.error('[EmailService] ❌ Error en getEmailById:', error);
    throw error;
  }
}

/**
 * Obtiene un mensaje específico (LEGACY - usa Supabase directo)
 * @deprecated Usar getEmailById() en su lugar para obtener contenido completo
 * @param {string} accountId - ID de la cuenta
 * @param {string} messageId - ID del mensaje
 * @returns {Promise<Object>} Detalles del mensaje
 */
export async function getMessage(accountId, messageId) {
  try {
    console.log('[EmailService] 📧 getMessage - Leyendo DIRECTO de Supabase:', { accountId, messageId });
    
    // ✅ LEER DIRECTO DE SUPABASE (donde SÍ está el contenido completo)
    const { data: message, error } = await supabase
      .from('email_messages')
      .select('*')
      .eq('id', messageId)
      .eq('account_id', accountId)
      .single();
    
    if (error) {
      console.error('[EmailService] ❌ Error Supabase:', error);
      throw new Error('Error al obtener mensaje de base de datos');
    }
    
    if (!message) {
      throw new Error('Mensaje no encontrado');
    }
    
    console.log('[EmailService] ✅ Mensaje obtenido de Supabase:', {
      id: message.id,
      has_body_html: !!message.body_html,
      has_body_text: !!message.body_text,
      body_html_length: message.body_html?.length || 0,
      body_text_length: message.body_text?.length || 0,
      subject: message.subject
    });
    
    // Transformar formato de Supabase a formato esperado
    return {
      id: message.id,
      from: message.from_address || message.from_name || 'Desconocido',
      from_address: message.from_address,
      from_name: message.from_name,
      to_addresses: message.to_addresses || [],
      cc_addresses: message.cc_addresses || [],
      bcc_addresses: message.bcc_addresses || [],
      subject: message.subject || '(Sin asunto)',
      body_text: message.body_text || '',
      body_html: message.body_html || '',
      body_preview: message.body_preview || '',
      date: message.date || message.created_at,
      sent_at: message.date,
      is_read: message.is_read || false,
      is_starred: message.is_starred || false,
      has_attachments: message.has_attachments || false,
      attachment_count: message.attachment_count || 0,
      account_id: message.account_id,
      folder: message.folder,
    };
    
  } catch (error) {
    console.error('[EmailService] ❌ Error en getMessage:', error);
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
    // 🔐 Obtener token JWT
    const token = await getAuthToken();
    
    const response = await fetch(`${BACKEND_URL}/api/mail/messages/${messageId}/read`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // ✅ Token incluido
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
    // 🔐 Obtener token JWT
    const token = await getAuthToken();
    
    const response = await fetch(`${BACKEND_URL}/api/mail/messages/${messageId}/star`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // ✅ Token incluido
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
    // 🔐 Obtener token JWT
    const token = await getAuthToken();
    
    const response = await fetch(`${BACKEND_URL}/api/mail/messages/${messageId}/move`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // ✅ Token incluido
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
    console.log('[EmailService] 🔄 Iniciando sincronización para cuenta:', accountId);
    
    // 🔐 Obtener token JWT usando helper
    const token = await getAuthToken();
    
    const response = await fetch(`${BACKEND_URL}/api/email/accounts/${accountId}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // ✅ Token incluido
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
      
      console.error('[EmailService] ❌ Error del servidor:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      // Mensajes de error más descriptivos
      if (response.status === 500 && errorData.message?.includes('Invalid credentials')) {
        throw new Error('❌ Credenciales IMAP inválidas. Por favor verifica tu usuario y contraseña en la configuración de la cuenta.');
      } else if (response.status === 500) {
        throw new Error('❌ Error del servidor al sincronizar. El backend puede estar desconectado o las credenciales son incorrectas.');
      } else {
        throw new Error(errorData.message || 'Error al sincronizar cuenta');
      }
    }

    const result = await response.json();
    console.log('[EmailService] ✅ Sincronización exitosa:', result);
    return result;
    
  } catch (error) {
    console.error('[EmailService] ❌ Error en syncEmailAccount:', error);
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
    // 🔐 Obtener token JWT
    const token = await getAuthToken();
    
    const response = await fetch(`${BACKEND_URL}/api/mail/drafts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // ✅ Token incluido
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

/**
 * Obtiene todos los contactos del usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<Array>} Lista de contactos
 */
export async function getContacts(userId) {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('owner_user_id', userId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[EmailService] Error obteniendo contactos:', error);
    throw error;
  }
}

/**
 * Crea un nuevo contacto
 * @param {string} userId - ID del usuario
 * @param {Object} contactData - Datos del contacto
 * @returns {Promise<Object>} Contacto creado
 */
export async function createContact(userId, contactData) {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .insert([{
        owner_user_id: userId,
        name: contactData.name,
        email: contactData.email,
        phone: contactData.phone || null,
        company: contactData.company || null,
        notes: contactData.notes || null,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[EmailService] Error creando contacto:', error);
    throw error;
  }
}

/**
 * Actualiza un contacto existente
 * @param {string} contactId - ID del contacto
 * @param {Object} contactData - Datos actualizados
 * @returns {Promise<Object>} Contacto actualizado
 */
export async function updateContact(contactId, contactData) {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .update({
        name: contactData.name,
        email: contactData.email,
        phone: contactData.phone || null,
        company: contactData.company || null,
        notes: contactData.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contactId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[EmailService] Error actualizando contacto:', error);
    throw error;
  }
}

/**
 * Elimina un contacto
 * @param {string} contactId - ID del contacto
 * @returns {Promise<void>}
 */
export async function deleteContact(contactId) {
  try {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', contactId);

    if (error) throw error;
  } catch (error) {
    console.error('[EmailService] Error eliminando contacto:', error);
    throw error;
  }
}

/**
 * Importa contactos desde un archivo vCard
 * @param {File} file - Archivo vCard
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object>} Resultado de la importación
 */
export async function importVCard(file, userId) {
  try {
    const text = await file.text();
    const contacts = parseVCard(text);
    
    console.log(`📇 Importando ${contacts.length} contactos desde vCard...`);
    
    const results = {
      success: 0,
      errors: 0,
      imported: []
    };

    for (const contact of contacts) {
      try {
        const created = await createContact(userId, contact);
        results.success++;
        results.imported.push(created);
      } catch (error) {
        console.error('Error importando contacto:', contact, error);
        results.errors++;
      }
    }
    
    console.log(`✅ Importación completada: ${results.success} éxitos, ${results.errors} errores`);
    return results;
  } catch (error) {
    console.error('[EmailService] Error importando vCard:', error);
    throw error;
  }
}

/**
 * Parsea un archivo vCard y extrae los contactos
 * VERSIÓN ROBUSTA que maneja múltiples formatos
 * ✅ Acepta contactos SIN email (solo teléfono)
 * @param {string} vcardText - Contenido del archivo vCard
 * @returns {Array<Object>} Lista de contactos parseados
 */
function parseVCard(vcardText) {
  const contacts = [];
  
  // Normalizar saltos de línea
  vcardText = vcardText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Dividir por BEGIN:VCARD
  const vcards = vcardText.split(/BEGIN:VCARD/i);
  
  console.log(`📇 Encontrados ${vcards.length - 1} posibles vCards en el archivo`);
  
  for (let i = 1; i < vcards.length; i++) {
    try {
      const vcard = 'BEGIN:VCARD' + vcards[i];
      const contact = {
        name: '',
        email: '',
        phone: '',
        company: '',
        notes: ''
      };
      
      // Extraer nombre (FN o N) - MEJORADO para manejar CHARSET y emojis
      let fnMatch = vcard.match(/\nFN[^:]*:([^\n]+)/i);
      if (fnMatch) {
        contact.name = cleanVCardValue(fnMatch[1]);
      } else {
        let nMatch = vcard.match(/\nN[^:]*:([^\n]+)/i);
        if (nMatch) {
          const parts = nMatch[1].split(';');
          // Construir nombre desde componentes: Apellido, Nombre, Segundo nombre
          const lastName = parts[0] || '';
          const firstName = parts[1] || '';
          const middleName = parts[2] || '';
          contact.name = `${firstName} ${middleName} ${lastName}`.trim();
          contact.name = cleanVCardValue(contact.name);
        }
      }
      
      // Extraer email - MÚLTIPLES FORMATOS
      let emailMatch = vcard.match(/\nEMAIL[^:]*:([^\n]+)/i);
      if (emailMatch) {
        contact.email = cleanVCardValue(emailMatch[1]).toLowerCase();
        // Limpiar posibles <>
        contact.email = contact.email.replace(/[<>\"']/g, '').trim();
      }
      
      // Extraer teléfono - MÚLTIPLES FORMATOS (TEL, item1.TEL, etc)
      let telMatch = vcard.match(/\n(?:item\d+\.)?TEL[^:]*:([^\n]+)/i);
      if (telMatch) {
        contact.phone = cleanVCardValue(telMatch[1]).trim();
      }
      
      // Extraer empresa (ORG)
      let orgMatch = vcard.match(/\nORG[^:]*:([^\n]+)/i);
      if (orgMatch) {
        contact.company = cleanVCardValue(orgMatch[1]);
      }
      
      // Extraer notas (NOTE o CATEGORIES)
      let noteMatch = vcard.match(/\nNOTE[^:]*:([^\n]+)/i);
      if (noteMatch) {
        contact.notes = cleanVCardValue(noteMatch[1]);
      } else {
        // Usar CATEGORIES como notas si no hay NOTE
        let catMatch = vcard.match(/\nCATEGORIES[^:]*:([^\n]+)/i);
        if (catMatch) {
          contact.notes = cleanVCardValue(catMatch[1]);
        }
      }
      
      // ✅ VALIDACIÓN FLEXIBLE: Nombre + (Email O Teléfono)
      const hasValidName = contact.name && contact.name.length >= 1;
      const hasValidEmail = contact.email && 
                           contact.email.includes('@') && 
                           contact.email.length >= 5 &&
                           !contact.email.includes(' ');
      const hasValidPhone = contact.phone && contact.phone.length >= 7;
      
      // Aceptar si tiene nombre Y (email O teléfono)
      if (hasValidName && (hasValidEmail || hasValidPhone)) {
        // Si no hay email, usar teléfono como identificador único
        if (!contact.email && contact.phone) {
          contact.email = `tel_${contact.phone.replace(/[^0-9]/g, '')}@phone.local`;
        }
        contacts.push(contact);
      } else {
        console.warn(`⚠️ vCard ${i} ignorado:`, {
          name: contact.name?.substring(0, 30),
          email: contact.email?.substring(0, 40),
          phone: contact.phone?.substring(0, 20),
          hasValidName,
          hasValidEmail,
          hasValidPhone
        });
      }
    } catch (error) {
      console.error(`❌ Error en vCard ${i}:`, error.message);
    }
  }
  
  console.log(`✅ ${contacts.length} de ${vcards.length - 1} contactos válidos encontrados`);
  return contacts;
}

/**
 * Limpia valores de vCard que pueden tener encoding QUOTED-PRINTABLE
 * ✅ ELIMINA EMOJIS Y CARACTERES ESPECIALES
 */
function cleanVCardValue(value) {
  if (!value) return '';
  
  // Decodificar QUOTED-PRINTABLE (=XX donde XX es hexadecimal)
  if (value.includes('=')) {
    try {
      value = value.replace(/=([0-9A-F]{2})/gi, (match, hex) => {
        return String.fromCharCode(parseInt(hex, 16));
      });
      // Quitar = al final de líneas (continuación)
      value = value.replace(/=$/g, '');
    } catch (e) {
      // Si falla, continuar con el valor original
    }
  }
  
  // 🔥 ELIMINAR EMOJIS (rangos Unicode de emojis)
  value = value.replace(/[\u{1F300}-\u{1F9FF}]/gu, ''); // Emojis y símbolos
  value = value.replace(/[\u{1F600}-\u{1F64F}]/gu, ''); // Emoticones
  value = value.replace(/[\u{1F680}-\u{1F6FF}]/gu, ''); // Transporte y símbolos
  value = value.replace(/[\u{2600}-\u{26FF}]/gu, '');   // Símbolos misceláneos
  value = value.replace(/[\u{2700}-\u{27BF}]/gu, '');   // Dingbats
  value = value.replace(/[\u{FE00}-\u{FE0F}]/gu, '');   // Selectores de variación
  value = value.replace(/[\u{1F900}-\u{1F9FF}]/gu, ''); // Símbolos y pictogramas suplementarios
  value = value.replace(/[\u{1FA70}-\u{1FAFF}]/gu, ''); // Símbolos y pictogramas extendidos-A
  
  // 🔥 ELIMINAR SÍMBOLOS EXTRA (círculos de colores, flechas, etc)
  value = value.replace(/[⚛️♉️🏻☘️]/g, '');
  value = value.replace(/[\u{FE00}-\u{FE0F}\u{E0100}-\u{E01EF}]/gu, ''); // Variation selectors
  
  // 🔥 ELIMINAR SIGNOS DE INTERROGACIÓN Y CARACTERES RAROS
  value = value.replace(/\?+/g, '');
  
  // Limpiar espacios múltiples, tabs, y caracteres de control
  value = value.replace(/[\x00-\x1F\x7F]/g, '');
  value = value.replace(/\s+/g, ' ');
  
  // Trim final
  return value.trim();
}
