/**
 * calendarService.js
 * Servicio para gestionar agenda interna (sin Google Calendar)
 * Backend: https://api.al-eon.com
 */

const BACKEND_URL = 'https://api.al-eon.com';

/**
 * Transforma eventos de la BD al formato del frontend
 * BD usa: start_at, end_at
 * Frontend usa: from, to, startTime, endTime
 */
function normalizeEvent(event) {
  return {
    ...event,
    from: event.start_at || event.from,
    to: event.end_at || event.to,
    startTime: event.start_at || event.from || event.startTime,
    endTime: event.end_at || event.to || event.endTime,
  };
}

/**
 * Obtiene todos los eventos del usuario
 * @param {string} userId - ID del usuario
 * @param {Object} options - Opciones de filtrado
 * @param {Date} [options.startDate] - Fecha de inicio
 * @param {Date} [options.endDate] - Fecha de fin
 * @param {string} [options.accessToken] - Token de autenticación
 * @returns {Promise<Array>} Lista de eventos
 */
export async function getEvents(userId, options = {}) {
  try {
    const params = new URLSearchParams({
      ownerUserId: userId, // Backend espera ownerUserId
      ...(options.startDate && { startDate: options.startDate.toISOString() }),
      ...(options.endDate && { endDate: options.endDate.toISOString() }),
    });

    const headers = {
      'Content-Type': 'application/json',
    };

    // Agregar Authorization header si hay token
    if (options.accessToken) {
      headers['Authorization'] = `Bearer ${options.accessToken}`;
    }

    const response = await fetch(`${BACKEND_URL}/api/calendar/events?${params}`, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al obtener eventos');
    }

    const events = await response.json();
    
    // Normalizar eventos para que tengan campos consistentes
    return Array.isArray(events) ? events.map(normalizeEvent) : [];
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
 * @param {string} eventData.from - Fecha/hora de inicio (ISO) - PARÁMETRO OBLIGATORIO
 * @param {string} eventData.to - Fecha/hora de fin (ISO) - PARÁMETRO OBLIGATORIO
 * @param {string} [eventData.description] - Descripción (se usa como reason si está presente)
 * @param {string} [eventData.location] - Ubicación
 * @param {Array<string>} [eventData.attendees] - Lista de emails de asistentes
 * @param {Object} [eventData.reminder] - Configuración de recordatorio
 * @param {string} accessToken - Token de autenticación del usuario
 * @returns {Promise<Object>} Respuesta del CORE con { success, eventId?, message? }
 */
export async function createEvent(eventData, accessToken) {
  try {
    // Transformar campos del frontend a los nombres que espera la BD
    const payload = {
      title: eventData.title,
      start_at: eventData.from, // ← BD usa start_at
      end_at: eventData.to,     // ← BD usa end_at
      ownerUserId: eventData.userId || eventData.ownerUserId,
      reason: eventData.description || eventData.title, // ← OBLIGATORIO
      description: eventData.description,
      location: eventData.location,
      attendees: eventData.attendees,
      notification_minutes: eventData.reminder ? parseInt(eventData.reminder) : null
    };
    
    console.log('🚀 [CalendarService] Payload ANTES de enviar:', JSON.stringify(payload, null, 2));
    console.log('🔑 [CalendarService] Token presente:', !!accessToken, 'Length:', accessToken?.length);
    
    const response = await fetch(`${BACKEND_URL}/api/calendar/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    
    console.log('📥 [CalendarService] Respuesta del backend:', {
      status: response.status,
      ok: response.ok,
      data: data
    });
    
    if (!response.ok) {
      throw new Error(data.message || 'Error al crear evento');
    }

    // El backend devuelve { success, action, evidence, userMessage, event }
    // Extraer eventId del objeto event si existe
    const eventId = data.event?.id || data.eventId;
    
    // RETORNAR en formato esperado por el frontend
    return {
      success: data.success || response.ok,
      eventId: eventId,
      message: data.userMessage || data.message,
      event: data.event
    };
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

// ❌ FUNCIÓN cancelEvent ELIMINADA - NO SE USA /cancel
// El CORE maneja cancelaciones internamente via deleteEvent o updateEvent

/**
 * Obtiene eventos del día actual
 * @param {string} userId - ID del usuario
 * @param {string} accessToken - Token de autenticación
 * @returns {Promise<Array>} Eventos de hoy
 */
export async function getTodayEvents(userId, accessToken) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return getEvents(userId, {
    startDate: today,
    endDate: tomorrow,
    accessToken,
  });
}

/**
 * Obtiene eventos de la semana actual
 * @param {string} userId - ID del usuario
 * @param {string} accessToken - Token de autenticación
 * @returns {Promise<Array>} Eventos de la semana
 */
export async function getWeekEvents(userId, accessToken) {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // Domingo
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  return getEvents(userId, {
    startDate: startOfWeek,
    endDate: endOfWeek,
    accessToken,
  });
}
