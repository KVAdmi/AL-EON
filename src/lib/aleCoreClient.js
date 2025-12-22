/**
 * AL-EON → AL-E Core Client
 * 
 * REGLAS:
 * - NO usa OpenAI keys (esas viven en AL-E Core)
 * - NO concatena URLs
 * - Solo POST al endpoint configurado
 * - Manejo de errores claro
 * - Incluye metadata de origen (Infinity Kode)
 */

import { getRequestMetadata } from '@/config/identity';

/**
 * Envía mensajes a AL-E Core
 * @param {Object} params
 * @param {string} params.accessToken - JWT token de Supabase (REQUERIDO)
 * @param {Array} params.messages - Historial de mensajes [{role, content}]
 * @param {string} params.sessionId - ID de la sesión (opcional, null para crear nueva)
 * @param {string} params.workspaceId - ID del workspace (opcional, default: 'default')
 * @param {Object} params.voiceMeta - Metadata de voz (opcional)
 * @param {Array} params.files - Archivos adjuntos (opcional, [{url, name, type, size}])
 * @param {AbortSignal} params.signal - Señal para cancelar request (opcional)
 * @returns {Promise<Object>} Respuesta de AL-E Core con session_id
 */
export async function sendToAleCore({ accessToken, messages, sessionId, workspaceId, voiceMeta, files, signal }) {
  const url = import.meta.env.VITE_ALE_CORE_URL;
  
  if (!url) {
    throw new Error("❌ Missing VITE_ALE_CORE_URL - Verifica tu archivo .env");
  }

  if (!accessToken) {
    throw new Error("❌ Missing accessToken - Usuario no autenticado");
  }

  // ✅ WorkspaceId obligatorio para AL-E Core
  const finalWorkspaceId =
    workspaceId ||
    localStorage.getItem('workspaceId') ||
    'default';
  
  // ✅ Persistir para futuras cargas
  localStorage.setItem('workspaceId', finalWorkspaceId);
  
  console.log('🗂️ WorkspaceId:', finalWorkspaceId);

  // Extraer userId del JWT token (payload está en base64)
  let userId;
  try {
    const tokenParts = accessToken.split('.');
    const payload = JSON.parse(atob(tokenParts[1]));
    userId = payload.sub || payload.email; // UUID de Supabase auth.users
    console.log('👤 UserId extraído del token:', userId);
  } catch (error) {
    console.error('❌ Error extrayendo userId del token:', error);
    throw new Error('Token inválido - no se pudo extraer userId');
  }

  const payload = {
    workspaceId: finalWorkspaceId, // ✅ CRÍTICO: SIEMPRE definido
    userId: userId, // ✅ CRÍTICO: Enviar userId explícitamente
    mode: "universal", // ✅ OBLIGATORIO: AL-EON usa modo universal
    messages,
    meta: {
      ...getRequestMetadata(),
      timestamp: new Date().toISOString(),
      // Agregar metadata de voz si existe
      ...(voiceMeta && {
        inputMode: voiceMeta.inputMode || 'text',
        localeHint: voiceMeta.localeHint || 'es-MX',
        handsFree: voiceMeta.handsFree || false
      })
    }
  };

  // Agregar archivos si existen
  if (files && files.length > 0) {
    payload.files = files;
    console.log('📎 Enviando archivos:', files.map(f => f.name).join(', '));
  }

  // Agregar sessionId si existe (null o undefined = crear nueva sesión)
  if (sessionId) {
    payload.sessionId = sessionId;
    console.log('🔄 Continuando sesión:', sessionId);
  } else {
    console.log('🆕 Creando nueva sesión (sessionId = null)');
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}` // JWT de Supabase
      },
      body: JSON.stringify(payload),
      signal // ✅ Pasar AbortSignal para poder cancelar
    });

    const text = await res.text();
    
    if (!res.ok) {
      throw new Error(`AL-E Core respondió ${res.status}: ${text}`);
    }

    return JSON.parse(text);

  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('🛑 Request cancelado por el usuario');
      throw new Error('Request cancelado');
    }
    console.error("❌ Error comunicándose con AL-E Core:", error);
    throw error;
  }
}

/**
 * Extrae el contenido de la respuesta de AL-E Core
 * Maneja diferentes formatos de respuesta
 * 
 * FORMATO ESPERADO DEL BACKEND:
 * {
 *   answer: string,
 *   memories_to_add: [],
 *   actions?: [],
 *   artifacts?: []
 * }
 * 
 * REGLA AL-E: Solo extraer y mostrar el campo "answer".
 * El usuario NUNCA ve JSON. AL-E conversa, no expone su estructura interna.
 */
export function extractReply(data) {
  console.log('📥 Respuesta completa de AL-E Core:', data);
  
  // Si data es string, devolverlo directamente
  if (typeof data === 'string') {
    console.log('✅ Respuesta ya es string:', data);
    return data;
  }
  
  // Si data no es un objeto, convertir a string
  if (typeof data !== 'object' || data === null) {
    console.warn('⚠️ Respuesta no es objeto, convirtiendo a string:', data);
    return String(data);
  }
  
  // PRIORIDAD 1: Campo "answer" (formato estándar de AL-E Core)
  if (data.answer && typeof data.answer === 'string') {
    console.log('✅ Extrayendo data.answer:', data.answer);
    console.log('🗑️ Ignorando metadata:', { 
      memories_to_add: data.memories_to_add?.length || 0,
      actions: data.actions?.length || 0,
      artifacts: data.artifacts?.length || 0
    });
    return data.answer;
  }
  
  // PRIORIDAD 2: Otros formatos alternativos
  const reply = 
    data.displayText?.answer ||
    data.message ||
    data.content ||
    data.reply ||
    data.response ||
    data.text;
  
  if (reply && typeof reply === 'string') {
    console.log('✅ Respuesta extraída de campo alternativo:', reply);
    return reply;
  }
  
  // Si llegamos aquí, el formato es incorrecto
  console.error('❌ FORMATO INVÁLIDO - No se encontró campo "answer"');
  console.error('❌ Estructura recibida:', Object.keys(data));
  console.error('❌ Objeto completo:', data);
  
  return 'Lo siento, hubo un error procesando mi respuesta.';
}
