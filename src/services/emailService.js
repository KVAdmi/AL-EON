/**
 * emailService.js
 * Servicio para gestionar cuentas de email SMTP/IMAP manuales (sin Google OAuth)
 * Backend: https://api.al-eon.com
 */

const BACKEND_URL = 'https://api.al-eon.com';

/**
 * Obtiene todas las cuentas de email del usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<Array>} Lista de cuentas de email
 */
export async function getEmailAccounts(userId) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/email/accounts?userId=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al obtener cuentas de email');
    }

    return await response.json();
  } catch (error) {
    console.error('[EmailService] Error en getEmailAccounts:', error);
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
 * @returns {Promise<Object>} Resultado con provider_message_id
 */
export async function sendEmail(mailData) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/mail/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(mailData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al enviar email');
    }

    return await response.json();
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
