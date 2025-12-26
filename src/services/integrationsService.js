/**
 * integrationsService.js
 * 
 * Servicio para gestionar integraciones OAuth globales (Gmail, Calendar, etc.)
 * Lee las credenciales de la tabla global_integrations en Supabase
 */

import { supabase } from '../lib/supabase';

/**
 * Obtiene la configuración de una integración global
 * @param {string} integrationType - Tipo de integración ('gmail', 'google_calendar', etc.)
 * @returns {Promise<Object>} Configuración de la integración
 */
export async function getGlobalIntegration(integrationType) {
  try {
    const { data, error } = await supabase
      .from('global_integrations')
      .select('config, is_active')
      .eq('integration_type', integrationType)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error(`[IntegrationsService] Error obteniendo ${integrationType}:`, error);
      throw new Error(`No se pudo obtener la configuración de ${integrationType}`);
    }

    if (!data) {
      throw new Error(`Integración ${integrationType} no encontrada o inactiva`);
    }

    return data.config;
  } catch (error) {
    console.error(`[IntegrationsService] Error:`, error);
    throw error;
  }
}

/**
 * Obtiene un Access Token fresco usando el Refresh Token
 * @param {string} clientId - Client ID de Google OAuth
 * @param {string} clientSecret - Client Secret de Google OAuth
 * @param {string} refreshToken - Refresh Token de larga duración
 * @returns {Promise<string>} Access Token temporal (válido por 1 hora)
 */
async function getAccessToken(clientId, clientSecret, refreshToken) {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[IntegrationsService] Error obteniendo access token:', error);
      throw new Error('Error al obtener access token de Google');
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('[IntegrationsService] Error en getAccessToken:', error);
    throw error;
  }
}

/**
 * Envía un email usando Gmail API
 * @param {Object} options - Opciones del email
 * @param {string} options.to - Destinatario
 * @param {string} options.subject - Asunto
 * @param {string} options.body - Cuerpo del mensaje (texto plano o HTML)
 * @param {string} [options.from] - Remitente (opcional, usa el email de la cuenta OAuth)
 * @returns {Promise<Object>} Respuesta de Gmail API
 */
export async function sendEmail({ to, subject, body, from }) {
  try {
    console.log('[IntegrationsService] Enviando email a:', to);

    // Obtener credenciales de Gmail
    const gmailConfig = await getGlobalIntegration('gmail');
    const { client_id, client_secret, refresh_token } = gmailConfig;

    // Obtener access token fresco
    const accessToken = await getAccessToken(client_id, client_secret, refresh_token);

    // Construir el mensaje en formato RFC 2822
    const fromHeader = from || 'me';
    const emailContent = [
      `From: ${fromHeader}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      body,
    ].join('\n');

    // Codificar en base64url (sin padding)
    const encodedMessage = btoa(unescape(encodeURIComponent(emailContent)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Enviar el email
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: encodedMessage,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[IntegrationsService] Error enviando email:', error);
      throw new Error(`Error al enviar email: ${error.error?.message || 'Unknown error'}`);
    }

    const result = await response.json();
    console.log('[IntegrationsService] Email enviado exitosamente:', result.id);
    return result;
  } catch (error) {
    console.error('[IntegrationsService] Error en sendEmail:', error);
    throw error;
  }
}

/**
 * Crea un evento en Google Calendar
 * @param {Object} options - Opciones del evento
 * @param {string} options.summary - Título del evento
 * @param {string} options.description - Descripción del evento
 * @param {string} options.startDateTime - Fecha/hora inicio (ISO 8601)
 * @param {string} options.endDateTime - Fecha/hora fin (ISO 8601)
 * @param {string} [options.timeZone] - Zona horaria (default: America/Mexico_City)
 * @param {Array<string>} [options.attendees] - Lista de emails de asistentes
 * @returns {Promise<Object>} Respuesta de Calendar API
 */
export async function createCalendarEvent({
  summary,
  description,
  startDateTime,
  endDateTime,
  timeZone = 'America/Mexico_City',
  attendees = [],
}) {
  try {
    console.log('[IntegrationsService] Creando evento:', summary);

    // Obtener credenciales de Calendar
    const calendarConfig = await getGlobalIntegration('google_calendar');
    const { client_id, client_secret, refresh_token } = calendarConfig;

    // Obtener access token fresco
    const accessToken = await getAccessToken(client_id, client_secret, refresh_token);

    // Construir el evento
    const event = {
      summary,
      description,
      start: {
        dateTime: startDateTime,
        timeZone,
      },
      end: {
        dateTime: endDateTime,
        timeZone,
      },
      attendees: attendees.map(email => ({ email })),
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 día antes
          { method: 'popup', minutes: 30 }, // 30 min antes
        ],
      },
    };

    // Crear el evento en el calendario principal
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('[IntegrationsService] Error creando evento:', error);
      throw new Error(`Error al crear evento: ${error.error?.message || 'Unknown error'}`);
    }

    const result = await response.json();
    console.log('[IntegrationsService] Evento creado exitosamente:', result.id);
    return result;
  } catch (error) {
    console.error('[IntegrationsService] Error en createCalendarEvent:', error);
    throw error;
  }
}

/**
 * Lista próximos eventos del calendario
 * @param {Object} options - Opciones de búsqueda
 * @param {number} [options.maxResults] - Máximo de eventos a retornar (default: 10)
 * @param {string} [options.timeMin] - Fecha mínima ISO 8601 (default: ahora)
 * @returns {Promise<Array>} Lista de eventos
 */
export async function listCalendarEvents({ maxResults = 10, timeMin } = {}) {
  try {
    console.log('[IntegrationsService] Listando eventos del calendario');

    // Obtener credenciales de Calendar
    const calendarConfig = await getGlobalIntegration('google_calendar');
    const { client_id, client_secret, refresh_token } = calendarConfig;

    // Obtener access token fresco
    const accessToken = await getAccessToken(client_id, client_secret, refresh_token);

    // Construir query params
    const params = new URLSearchParams({
      maxResults: maxResults.toString(),
      orderBy: 'startTime',
      singleEvents: 'true',
      timeMin: timeMin || new Date().toISOString(),
    });

    // Obtener eventos
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('[IntegrationsService] Error listando eventos:', error);
      throw new Error(`Error al listar eventos: ${error.error?.message || 'Unknown error'}`);
    }

    const result = await response.json();
    console.log('[IntegrationsService] Eventos obtenidos:', result.items?.length || 0);
    return result.items || [];
  } catch (error) {
    console.error('[IntegrationsService] Error en listCalendarEvents:', error);
    throw error;
  }
}

/**
 * Verifica si las integraciones están configuradas
 * @returns {Promise<Object>} Estado de las integraciones
 */
export async function checkIntegrationsStatus() {
  try {
    const { data, error } = await supabase
      .from('global_integrations')
      .select('integration_type, integration_name, is_active')
      .eq('is_active', true);

    if (error) {
      console.error('[IntegrationsService] Error verificando estado:', error);
      return { available: false, integrations: [] };
    }

    return {
      available: data && data.length > 0,
      integrations: data || [],
    };
  } catch (error) {
    console.error('[IntegrationsService] Error en checkIntegrationsStatus:', error);
    return { available: false, integrations: [] };
  }
}
