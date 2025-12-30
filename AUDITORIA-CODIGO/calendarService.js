/**
 * calendarService.js
 * Servicio para gestionar agenda interna (sin Google Calendar)
 * Backend: https://api.al-eon.com
 */

const BACKEND_URL = 'https://api.al-eon.com';

/**
 * Obtiene todos los eventos del usuario
 * @param {string} userId - ID del usuario
 * @param {Object} options - Opciones de filtrado
 * @param {Date} [options.startDate] - Fecha de inicio
 * @param {Date} [options.endDate] - Fecha de fin
 * @returns {Promise<Array>} Lista de eventos
 */
export async function getEvents(userId, options = {}) {
  try {
    const params = new URLSearchParams({
      ownerUserId: userId, // Backend espera ownerUserId
      ...(options.startDate && { startDate: options.startDate.toISOString() }),
      ...(options.endDate && { endDate: options.endDate.toISOString() }),
    });

    const response = await fetch(`${BACKEND_URL}/api/calendar/events?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al obtener eventos');
    }

    return await response.json();
  } catch (error) {
    console.error('[CalendarService] Error en getEvents:', error);
    throw error;
  }
}

/**
 * Crea un nuevo evento
 * @param {Object} eventData - Datos del evento
 * @param {string} eventData.userId - ID del usuario
 * @param {string} eventData.title - Título del evento
 * @param {string} eventData.startTime - Fecha/hora de inicio (ISO)
 * @param {string} eventData.endTime - Fecha/hora de fin (ISO)
 * @param {string} [eventData.description] - Descripción
 * @param {string} [eventData.location] - Ubicación
 * @param {Array<string>} [eventData.attendees] - Lista de emails de asistentes
 * @param {Object} [eventData.reminder] - Configuración de recordatorio
 * @returns {Promise<Object>} Evento creado
 */
export async function createEvent(eventData) {
  try {
    // Transformar userId a ownerUserId para el backend
    const payload = {
      ...eventData,
      ownerUserId: eventData.userId || eventData.ownerUserId,
    };
    delete payload.userId; // Remover userId si existe
    
    const response = await fetch(`${BACKEND_URL}/api/calendar/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al crear evento');
    }

    return await response.json();
  } catch (error) {
    console.error('[CalendarService] Error en createEvent:', error);
    throw error;
  }
}

/**
 * Actualiza un evento existente
 * @param {string} eventId - ID del evento
 * @param {Object} eventData - Datos a actualizar
 * @returns {Promise<Object>} Evento actualizado
 */
export async function updateEvent(eventId, eventData) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/calendar/events/${eventId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(eventData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al actualizar evento');
    }

    return await response.json();
  } catch (error) {
    console.error('[CalendarService] Error en updateEvent:', error);
    throw error;
  }
}

/**
 * Cancela un evento
 * @param {string} eventId - ID del evento
 * @returns {Promise<void>}
 */
export async function cancelEvent(eventId) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/calendar/events/${eventId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al cancelar evento');
    }

    return await response.json();
  } catch (error) {
    console.error('[CalendarService] Error en cancelEvent:', error);
    throw error;
  }
}

/**
 * Elimina un evento permanentemente
 * @param {string} eventId - ID del evento
 * @returns {Promise<void>}
 */
export async function deleteEvent(eventId) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/calendar/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al eliminar evento');
    }

    return await response.json();
  } catch (error) {
    console.error('[CalendarService] Error en deleteEvent:', error);
    throw error;
  }
}

/**
 * Obtiene eventos del día actual
 * @param {string} userId - ID del usuario
 * @returns {Promise<Array>} Eventos de hoy
 */
export async function getTodayEvents(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return getEvents(userId, {
    startDate: today,
    endDate: tomorrow,
  });
}

/**
 * Obtiene eventos de la semana actual
 * @param {string} userId - ID del usuario
 * @returns {Promise<Array>} Eventos de la semana
 */
export async function getWeekEvents(userId) {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // Domingo
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  return getEvents(userId, {
    startDate: startOfWeek,
    endDate: endOfWeek,
  });
}
