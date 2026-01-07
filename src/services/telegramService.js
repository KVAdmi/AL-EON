/**
 * telegramService.js
 * Servicio para gestionar bots de Telegram por usuario
 * Backend: https://api.al-eon.com
 */

import { supabase } from '@/lib/supabase';

const BACKEND_URL = 'https://api.al-eon.com';

/**
 * Obtiene el token de autenticación JWT desde Supabase
 * @returns {Promise<string>} Access token
 * @throws {Error} Si no hay sesión activa
 */
async function getAuthToken() {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('[TelegramService] Error obteniendo sesión:', error);
    throw new Error('Error de autenticación');
  }
  
  if (!session?.access_token) {
    throw new Error('No hay sesión activa. Por favor inicia sesión.');
  }
  
  return session.access_token;
}

/**
 * Conecta un bot de Telegram para el usuario
 * @param {Object} botData - Datos del bot
 * @param {string} botData.ownerUserId - ID del usuario
 * @param {string} botData.botUsername - Username del bot
 * @param {string} botData.botToken - Token del bot de @BotFather
 * @returns {Promise<Object>} Bot conectado con instrucciones
 */
export async function connectBot(botData) {
  try {
    // 🔐 Obtener token JWT
    const token = await getAuthToken();
    
    const response = await fetch(`${BACKEND_URL}/api/telegram/bots/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // ✅ Token incluido
      },
      credentials: 'include',
      body: JSON.stringify(botData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al conectar bot de Telegram');
    }

    return await response.json();
  } catch (error) {
    console.error('[TelegramService] Error en connectBot:', error);
    throw error;
  }
}

/**
 * Obtiene los bots conectados del usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<Array>} Lista de bots conectados
 */
export async function getUserBots(userId) {
  try {
    // 🔐 Obtener token JWT
    const token = await getAuthToken();
    
    const response = await fetch(`${BACKEND_URL}/api/telegram/bots?userId=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // ✅ Token incluido
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al obtener bots');
    }

    return await response.json();
  } catch (error) {
    console.error('[TelegramService] Error en getUserBots:', error);
    throw error;
  }
}

/**
 * Desconecta un bot de Telegram
 * @param {string} botId - ID del bot
 * @returns {Promise<void>}
 */
export async function disconnectBot(botId) {
  try {
    // 🔐 Obtener token JWT
    const token = await getAuthToken();
    
    const response = await fetch(`${BACKEND_URL}/api/telegram/bots/${botId}/disconnect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // ✅ Token incluido
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al desconectar bot');
    }

    return await response.json();
  } catch (error) {
    console.error('[TelegramService] Error en disconnectBot:', error);
    throw error;
  }
}

/**
 * Actualiza la configuración de un bot (auto-send, notificaciones, etc.)
 * @param {string} botId - ID del bot
 * @param {Object} settings - Configuración a actualizar
 * @param {boolean} [settings.auto_send_enabled] - Permitir envío automático
 * @param {boolean} [settings.notifications_enabled] - Habilitar notificaciones
 * @returns {Promise<Object>} Bot actualizado
 */
export async function updateBotSettings(botId, settings) {
  try {
    // 🔐 Obtener token JWT
    const token = await getAuthToken();
    
    const response = await fetch(`${BACKEND_URL}/api/telegram/bots/${botId}/settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // ✅ Token incluido
      },
      credentials: 'include',
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al actualizar configuración del bot');
    }

    return await response.json();
  } catch (error) {
    console.error('[TelegramService] Error en updateBotSettings:', error);
    throw error;
  }
}

/**
 * Obtiene la lista de chats/conversaciones de Telegram
 * @param {string} userId - ID del usuario
 * @param {string} [botId] - ID del bot (opcional, si no se especifica usa el bot activo)
 * @returns {Promise<Array>} Lista de chats
 */
export async function getChats(userId, botId = null) {
  try {
    // 🔐 Obtener token JWT
    const token = await getAuthToken();
    
    const params = new URLSearchParams({ ownerUserId: userId });
    if (botId) params.append('botId', botId);

    const response = await fetch(`${BACKEND_URL}/api/telegram/chats?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // ✅ Token incluido
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al obtener chats');
    }

    return await response.json();
  } catch (error) {
    console.error('[TelegramService] Error en getChats:', error);
    throw error;
  }
}

/**
 * Obtiene los mensajes de un chat específico
 * @param {string} chatId - ID del chat
 * @param {Object} options - Opciones de paginación
 * @returns {Promise<Array>} Mensajes del chat
 */
export async function getMessages(chatId, options = {}) {
  try {
    // 🔐 Obtener token JWT
    const token = await getAuthToken();
    
    const params = new URLSearchParams({
      chatId,
      ...options,
    });

    const response = await fetch(`${BACKEND_URL}/api/telegram/messages?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // ✅ Token incluido
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al obtener mensajes');
    }

    return await response.json();
  } catch (error) {
    console.error('[TelegramService] Error en getMessages:', error);
    throw error;
  }
}

/**
 * Envía un mensaje a un chat de Telegram
 * @param {Object} messageData - Datos del mensaje
 * @param {string} messageData.chatId - ID del chat
 * @param {string} messageData.text - Texto del mensaje
 * @param {Object} [messageData.options] - Opciones adicionales (parse_mode, reply_markup, etc.)
 * @returns {Promise<Object>} Mensaje enviado
 */
export async function sendMessage(messageData) {
  try {
    // 🔐 Obtener token JWT
    const token = await getAuthToken();
    
    const response = await fetch(`${BACKEND_URL}/api/telegram/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // ✅ Token incluido
      },
      credentials: 'include',
      body: JSON.stringify(messageData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al enviar mensaje');
    }

    return await response.json();
  } catch (error) {
    console.error('[TelegramService] Error en sendMessage:', error);
    throw error;
  }
}

/**
 * Verifica el estado de conexión de un bot
 * @param {string} botId - ID del bot
 * @returns {Promise<Object>} Estado de la conexión
 */
export async function checkBotStatus(botId) {
  try {
    // 🔐 Obtener token JWT
    const token = await getAuthToken();
    
    const response = await fetch(`${BACKEND_URL}/api/telegram/bots/${botId}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // ✅ Token incluido
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al verificar estado del bot');
    }

    return await response.json();
  } catch (error) {
    console.error('[TelegramService] Error en checkBotStatus:', error);
    throw error;
  }
}
