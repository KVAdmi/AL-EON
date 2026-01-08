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
    console.log('[TelegramService] 🔍 Iniciando conexión de bot...');
    console.log('[TelegramService] Datos recibidos:', {
      ...botData,
      botToken: botData.botToken ? '***HIDDEN***' : 'NO_TOKEN'
    });
    
    // 🔐 Obtener token JWT
    const token = await getAuthToken();
    console.log('[TelegramService] ✅ Token JWT obtenido:', token ? token.substring(0, 20) + '...' : 'NO_TOKEN');
    
    console.log('[TelegramService] 📤 Enviando request a:', `${BACKEND_URL}/api/telegram/bots/connect`);
    
    const response = await fetch(`${BACKEND_URL}/api/telegram/bots/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // ✅ Token incluido
      },
      credentials: 'include',
      body: JSON.stringify(botData),
    });

    console.log('[TelegramService] 📥 Response status:', response.status, response.statusText);

    // Si el bot ya existe o hay error, manejar respuesta
    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
        console.error('[TelegramService] ⚠️ Error response:', errorText);
      } catch (textError) {
        console.error('[TelegramService] No se pudo leer el texto del error:', textError);
      }
      
      // Si el bot ya existe (código 409 o mensaje que lo indique)
      if (response.status === 409 || errorText.includes('already exists') || errorText.includes('ya existe')) {
        console.log('[TelegramService] ℹ️ Bot ya existe, buscando en BD...');
        
        // Intentar leer desde Supabase directamente
        try {
          const { data, error } = await supabase
            .from('telegram_bots')
            .select('*')
            .eq('bot_username', botData.botUsername)
            .eq('owner_user_id', botData.ownerUserId)
            .single();

          if (!error && data) {
            console.log('[TelegramService] ✅ Bot encontrado en Supabase:', data);
            return {
              id: data.id,
              botUsername: data.bot_username,
              botToken: data.bot_token_enc,
              ownerUserId: data.owner_user_id,
              isConnected: true,
              webhook: data.webhook_url,
              createdAt: data.created_at,
            };
          }
        } catch (supabaseError) {
          console.error('[TelegramService] Error consultando Supabase:', supabaseError);
        }
      }
      
      // Verificar si el bot existe en la base de datos consultando el endpoint
      try {
        const botsResponse = await fetch(`${BACKEND_URL}/api/telegram/bots?userId=${botData.ownerUserId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
        });
        
        if (botsResponse.ok) {
          const bots = await botsResponse.json();
          if (Array.isArray(bots)) {
            const justCreatedBot = bots.find(b => 
              (b.bot_username === botData.botUsername || b.botUsername === botData.botUsername)
            );
            
            if (justCreatedBot) {
              console.log('[TelegramService] ✅ Bot encontrado via endpoint:', justCreatedBot);
              return justCreatedBot;
            }
          }
        }
      } catch (verifyError) {
        console.error('[TelegramService] No se pudo verificar via endpoint:', verifyError);
      }
      
      // Si no se encontró el bot, lanzar error
      let error;
      try {
        error = JSON.parse(errorText);
      } catch (e) {
        // Si no es JSON válido, usar el texto como mensaje
        error = { message: errorText.includes('<!DOCTYPE') ? 'Error del servidor (HTML response)' : errorText };
      }
      
      throw new Error(error.message || 'Error al conectar bot de Telegram');
    }

    // Respuesta exitosa - parsear JSON
    let result;
    try {
      result = await response.json();
      console.log('[TelegramService] ✅ Bot conectado exitosamente:', result);
      return result;
    } catch (jsonError) {
      console.error('[TelegramService] Error parseando JSON de respuesta exitosa:', jsonError);
      
      // Si hay error parseando pero la respuesta fue OK, intentar leer desde BD
      const { data, error } = await supabase
        .from('telegram_bots')
        .select('*')
        .eq('bot_username', botData.botUsername)
        .eq('owner_user_id', botData.ownerUserId)
        .single();

      if (!error && data) {
        console.log('[TelegramService] ✅ Bot recuperado desde Supabase después de error de parsing:', data);
        return {
          id: data.id,
          botUsername: data.bot_username,
          botToken: data.bot_token_enc,
          ownerUserId: data.owner_user_id,
          isConnected: true,
          webhook: data.webhook_url,
          createdAt: data.created_at,
        };
      }
      
      throw new Error('Bot conectado pero no se pudo obtener la información');
    }
  } catch (error) {
    console.error('[TelegramService] ❌ Error en connectBot:', error);
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
    console.log('[TelegramService] 🔍 Obteniendo bots para userId:', userId);
    
    // 🔐 Obtener token JWT
    const token = await getAuthToken();
    
    // 🔥 OPCIÓN 1: Intentar obtener desde backend
    try {
      const response = await fetch(`${BACKEND_URL}/api/telegram/bots?userId=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (response.ok) {
        const bots = await response.json();
        console.log('[TelegramService] ✅ Bots obtenidos desde backend:', bots);
        
        // Validar que sea un array, si no, ir directo a Supabase
        if (Array.isArray(bots) && bots.length > 0) {
          return bots;
        }
        
        console.warn('[TelegramService] ⚠️ Backend devolvió formato inválido o vacío, usando Supabase');
      }
    } catch (backendError) {
      console.warn('[TelegramService] ⚠️ Backend no disponible, usando Supabase directamente:', backendError.message);
    }

    // 🔥 OPCIÓN 2: Si backend falla, leer directamente de Supabase
    const { data, error } = await supabase
      .from('telegram_bots')
      .select('*')
      .eq('owner_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[TelegramService] ❌ Error en Supabase:', error);
      throw new Error(error.message || 'Error al obtener bots');
    }

    console.log('[TelegramService] ✅ Bots obtenidos desde Supabase:', data);
    
    // Mapear campos de Supabase a formato esperado por el frontend
    const mappedBots = data.map(bot => ({
      id: bot.id,
      botUsername: bot.bot_username,
      botToken: bot.bot_token_enc,
      ownerUserId: bot.owner_user_id,
      isConnected: true, // Si está en la BD, está conectado
      webhook: bot.webhook_url,
      createdAt: bot.created_at,
    }));

    return mappedBots;
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
    console.log('[TelegramService] 🔍 Obteniendo chats para userId:', userId, 'botId:', botId);
    
    // 🔐 Obtener token JWT
    const token = await getAuthToken();
    
    // 🔥 OPCIÓN 1: Intentar obtener desde backend
    try {
      const params = new URLSearchParams({ ownerUserId: userId });
      if (botId) params.append('botId', botId);

      const response = await fetch(`${BACKEND_URL}/api/telegram/chats?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (response.ok) {
        const chats = await response.json();
        console.log('[TelegramService] ✅ Chats obtenidos desde backend:', chats);
        return chats;
      }
    } catch (backendError) {
      console.warn('[TelegramService] ⚠️ Backend no disponible, usando Supabase directamente:', backendError.message);
    }

    // 🔥 OPCIÓN 2: Si backend falla, leer directamente de Supabase
    let query = supabase
      .from('telegram_chats')
      .select('*')
      .eq('owner_user_id', userId)
      .order('last_message_at', { ascending: false });

    if (botId) {
      query = query.eq('bot_id', botId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[TelegramService] ❌ Error en Supabase:', error);
      throw new Error(error.message || 'Error al obtener chats');
    }

    console.log('[TelegramService] ✅ Chats obtenidos desde Supabase:', data);
    
    // Mapear campos de Supabase a formato esperado por el frontend
    const mappedChats = data.map(chat => ({
      id: chat.id,
      chatId: chat.chat_id,
      name: chat.chat_name,
      username: chat.chat_username,
      lastMessage: chat.last_message_text,
      lastMessageDate: chat.last_message_at,
      botId: chat.bot_id,
      ownerUserId: chat.owner_user_id,
    }));

    return mappedChats;
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
