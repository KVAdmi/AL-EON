/**
 * notificationsService.js
 * Servicio para gestionar notificaciones y recordatorios del sistema
 * Backend: https://api.al-eon.com
 */

const BACKEND_URL = 'https://api.al-eon.com';

/**
 * Programa una notificación/recordatorio
 * @param {Object} notificationData - Datos de la notificación
 * @param {string} notificationData.userId - ID del usuario
 * @param {string} notificationData.type - Tipo de notificación (calendar_reminder, task_reminder, etc.)
 * @param {string} notificationData.title - Título de la notificación
 * @param {string} notificationData.message - Mensaje de la notificación
 * @param {string} notificationData.scheduledFor - Fecha/hora de envío (ISO)
 * @param {string} notificationData.channel - Canal de envío (telegram, email, in_app)
 * @param {Object} [notificationData.metadata] - Metadata adicional
 * @returns {Promise<Object>} Notificación programada
 */
export async function scheduleNotification(notificationData) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/notifications/schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(notificationData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al programar notificación');
    }

    return await response.json();
  } catch (error) {
    console.error('[NotificationsService] Error en scheduleNotification:', error);
    throw error;
  }
}

/**
 * Obtiene las notificaciones del usuario
 * @param {string} userId - ID del usuario
 * @param {Object} options - Opciones de filtrado
 * @param {string} [options.status] - Estado (pending, sent, failed, cancelled)
 * @param {number} [options.limit] - Límite de resultados
 * @returns {Promise<Array>} Lista de notificaciones
 */
export async function getNotifications(userId, options = {}) {
  try {
    const params = new URLSearchParams({
      userId,
      ...options,
    });

    const response = await fetch(`${BACKEND_URL}/api/notifications?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al obtener notificaciones');
    }

    return await response.json();
  } catch (error) {
    console.error('[NotificationsService] Error en getNotifications:', error);
    throw error;
  }
}

/**
 * Cancela una notificación programada
 * @param {string} notificationId - ID de la notificación
 * @returns {Promise<void>}
 */
export async function cancelNotification(notificationId) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/notifications/${notificationId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al cancelar notificación');
    }

    return await response.json();
  } catch (error) {
    console.error('[NotificationsService] Error en cancelNotification:', error);
    throw error;
  }
}

/**
 * Marca una notificación como leída
 * @param {string} notificationId - ID de la notificación
 * @returns {Promise<void>}
 */
export async function markAsRead(notificationId) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/notifications/${notificationId}/read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al marcar notificación como leída');
    }

    return await response.json();
  } catch (error) {
    console.error('[NotificationsService] Error en markAsRead:', error);
    throw error;
  }
}

/**
 * Obtiene las notificaciones no leídas
 * @param {string} userId - ID del usuario
 * @returns {Promise<Array>} Notificaciones no leídas
 */
export async function getUnreadNotifications(userId) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/notifications/unread?userId=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al obtener notificaciones no leídas');
    }

    return await response.json();
  } catch (error) {
    console.error('[NotificationsService] Error en getUnreadNotifications:', error);
    throw error;
  }
}

/**
 * Obtiene las preferencias de notificación del usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object>} Preferencias de notificación
 */
export async function getNotificationPreferences(userId) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/notifications/preferences?userId=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al obtener preferencias de notificación');
    }

    return await response.json();
  } catch (error) {
    console.error('[NotificationsService] Error en getNotificationPreferences:', error);
    throw error;
  }
}

/**
 * Actualiza las preferencias de notificación del usuario
 * @param {string} userId - ID del usuario
 * @param {Object} preferences - Preferencias a actualizar
 * @param {boolean} [preferences.enableTelegram] - Habilitar notificaciones por Telegram
 * @param {boolean} [preferences.enableEmail] - Habilitar notificaciones por email
 * @param {boolean} [preferences.enableInApp] - Habilitar notificaciones in-app
 * @param {Object} [preferences.quietHours] - Horario de silencio
 * @returns {Promise<Object>} Preferencias actualizadas
 */
export async function updateNotificationPreferences(userId, preferences) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/notifications/preferences`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        userId,
        ...preferences,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al actualizar preferencias');
    }

    return await response.json();
  } catch (error) {
    console.error('[NotificationsService] Error en updateNotificationPreferences:', error);
    throw error;
  }
}

/**
 * Crea un recordatorio para un evento de calendario
 * @param {Object} reminderData - Datos del recordatorio
 * @param {string} reminderData.userId - ID del usuario
 * @param {string} reminderData.eventId - ID del evento
 * @param {number} reminderData.minutesBefore - Minutos antes del evento (15, 60, 1440, etc.)
 * @param {string} [reminderData.channel] - Canal preferido (telegram por defecto)
 * @returns {Promise<Object>} Recordatorio creado
 */
export async function createEventReminder(reminderData) {
  return scheduleNotification({
    ...reminderData,
    type: 'calendar_reminder',
    channel: reminderData.channel || 'telegram',
  });
}
