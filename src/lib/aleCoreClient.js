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
 * Fetch con reintentos automáticos para errores de timeout/502
 * @param {string} url - URL del endpoint
 * @param {object} options - Opciones del fetch
 * @param {number} retries - Número de reintentos (default: 1)
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, options, retries = 1) {
  try {
    const res = await fetch(url, options);
    
    // Si es 502/504 (Gateway errors) y quedan reintentos, reintentar
    if (!res.ok && (res.status === 502 || res.status === 504) && retries > 0) {
      console.log(`⚠️ Error ${res.status}, reintentando... (${retries} reintentos restantes)`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1 segundo
      return fetchWithRetry(url, options, retries - 1);
    }
    
    return res;
  } catch (error) {
    // Si es error de red/timeout y quedan reintentos, reintentar
    if (retries > 0 && (error.name === 'TypeError' || error.message.includes('timeout'))) {
      console.log(`⚠️ Error de red, reintentando... (${retries} reintentos restantes)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

/**
 * Envía mensajes a AL-E Core
 * @param {Object} params
 * @param {string} params.accessToken - JWT token de Supabase (REQUERIDO)
 * @param {string} params.message - Mensaje actual del usuario (SOLO UNO, SIN HISTORIAL)
 * @param {string} params.sessionId - ID de la sesión (opcional, null para crear nueva)
 * @param {string} params.workspaceId - ID del workspace (opcional, default: 'core')
 * @param {string} params.userEmail - Email del usuario que escribe (para colaboración)
 * @param {string} params.userDisplayName - Nombre del usuario que escribe
 * @param {Object} params.meta - Metadata (platform, version, source, timestamp)
 * @param {Array} params.files - Archivos adjuntos (opcional)
 * @param {AbortSignal} params.signal - Señal para cancelar request (opcional)
 * @returns {Promise<Object>} Respuesta de AL-E Core con session_id
 */
export async function sendToAleCore({ accessToken, userId, message, sessionId, workspaceId, projectId, userEmail, userDisplayName, meta, files, signal }) {
  const BASE_URL = import.meta.env.VITE_ALE_CORE_BASE || import.meta.env.VITE_ALE_CORE_URL?.replace('/api/ai/chat', '');
  
  if (!BASE_URL) {
    throw new Error("❌ Missing VITE_ALE_CORE_BASE");
  }

  // ✅ CORE mandate: use /api/ai/chat/v2 (avoid legacy orch)
  const url = `${BASE_URL}/api/ai/chat/v2`;
  
  console.log("✅ ALE CORE URL (chat/v2) =>", url);

  if (!accessToken) {
    throw new Error("❌ Missing accessToken");
  }

  if (!message || !message.trim()) {
    throw new Error("❌ Message is required");
  }

  // ✅ PAYLOAD PARA /api/ai/chat/v2
  // Contract (CORE): { message, sessionId, workspaceId?, meta?, userEmail?, userDisplayName? }
  const payloadData = {
    message: message.trim(),
    sessionId: sessionId || undefined,
    workspaceId: workspaceId || 'core',
    ...(userEmail ? { userEmail } : {}),
    ...(userDisplayName ? { userDisplayName } : {}),
    meta: meta || {
      platform: "AL-EON",
      version: "1.0.0",
      source: "al-eon-console",
      timestamp: new Date().toISOString()
    }
  };

  // Agregar archivos si existen (v2: commonly accepted as `files`; keep `attachments` for backward compat)
  if (files && files.length > 0) {
    payloadData.files = files;
    payloadData.attachments = files;
    console.log('📎 Archivos adjuntos:', files.length, files);
  }

  console.log('📤 PAYLOAD (v2):', JSON.stringify(payloadData, null, 2));

  // ✅ NO incluir signal en el body - solo en fetchOptions
  const fetchOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`
    },
    body: JSON.stringify(payloadData),
  };

  // ✅ Agregar signal DESPUÉS, fuera del objeto que se serializa
  if (signal) {
    fetchOptions.signal = signal;
  }

  try {
    const res = await fetchWithRetry(url, fetchOptions, 1);
    const text = await res.text();
    
    if (!res.ok) {
      // ✅ P0: Intentar parsear JSON para extraer safe_message
      let errorMsg = `Error ${res.status}`;
      try {
        const errorData = JSON.parse(text);
        // PRIORIDAD: safe_message > error > message > status code
        errorMsg = errorData?.safe_message || errorData?.error || errorData?.message || errorMsg;
      } catch (e) {
        // No es JSON, usar texto plano si es corto
        if (text && text.length < 200) {
          errorMsg = text;
        } else {
          errorMsg = `Error ${res.status}: No se pudo procesar la respuesta`;
        }
      }
      throw new Error(errorMsg);
    }

    return JSON.parse(text);
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('🛑 Request cancelado');
      throw new Error('Request cancelado');
    }
    console.error("❌ Error comunicándose con AL-E Core:", error);
    throw error;
  }
}

/**
 * Extrae el contenido de la respuesta de AL-E Core
 * 
 * AL-EON NO INTERPRETA. SOLO EXTRAE Y MUESTRA.
 * 
 * FORMATO ESPERADO DEL BACKEND:
 * {
 *   answer: string,
 *   success: boolean,
 *   userMessage: string (opcional - mensaje del CORE para el usuario)
 * }
 * 
 * REGLA: 
 * - Si success=false Y existe userMessage -> mostrar userMessage
 * - Si existe answer -> mostrar answer
 * - NO adornar, NO reformular, NO sugerir acciones
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
  
  // 🚫 SI success=false Y existe userMessage, MOSTRAR userMessage
  if (data.success === false && data.userMessage) {
    console.log('⚠️ success=false -> mostrando userMessage del CORE');
    return data.userMessage;
  }
  
  // PRIORIDAD 1: Campo "answer" (formato estándar de AL-E Core)
  if (data.answer && typeof data.answer === 'string') {
    console.log('✅ Extrayendo data.answer');
    return data.answer;
  }
  
  // PRIORIDAD 2: userMessage (mensajes del sistema)
  if (data.userMessage && typeof data.userMessage === 'string') {
    console.log('✅ Extrayendo data.userMessage');
    return data.userMessage;
  }
  
  // PRIORIDAD 3: Otros formatos alternativos
  const reply = 
    data.message ||
    data.content ||
    data.reply ||
    data.response ||
    data.text;
  
  if (reply && typeof reply === 'string') {
    console.log('✅ Respuesta extraída de campo alternativo');
    return reply;
  }
  
  // Si llegamos aquí, el formato es incorrecto
  console.error('❌ FORMATO INVÁLIDO - No se encontró campo "answer" o "userMessage"');
  console.error('❌ Estructura recibida:', Object.keys(data));
  
  return 'Error: respuesta inválida del servidor';
}

/**
 * 🔥 NUEVA FUNCIÓN: Extrae respuesta completa con metadata
 * 
 * Retorna un objeto con:
 * - answer: texto de la respuesta
 * - toolsUsed: array de tools ejecutados
 * - executionTime: tiempo de ejecución en ms
 * - metadata: objeto con request_id, timestamp, model, etc
 * - debug: objeto con detalles de tools ejecutados
 * 
 * @param {Object} data - Respuesta del backend
 * @returns {Object} { answer, toolsUsed, executionTime, metadata, debug }
 */
export function extractFullResponse(data) {
  console.log('📥 Extrayendo respuesta completa con metadata:', data);
  
  // Extraer el texto de la respuesta usando la función existente
  const answer = extractReply(data);
  
  // Extraer campos adicionales del backend
  const fullResponse = {
    answer,
    toolsUsed: data.toolsUsed || [],
    executionTime: data.executionTime || 0,
    metadata: data.metadata || null,
    debug: data.debug || null
  };
  
  console.log('✅ Respuesta completa extraída:', {
    answer: answer.substring(0, 100) + '...',
    toolsUsed: fullResponse.toolsUsed,
    executionTime: fullResponse.executionTime,
    hasMetadata: !!fullResponse.metadata,
    hasDebug: !!fullResponse.debug
  });
  
  return fullResponse;
}

