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
 * @param {Object} params.meta - Metadata (platform, version, source, timestamp)
 * @param {Array} params.files - Archivos adjuntos (opcional)
 * @param {AbortSignal} params.signal - Señal para cancelar request (opcional)
 * @returns {Promise<Object>} Respuesta de AL-E Core con session_id
 */
export async function sendToAleCore({ accessToken, message, sessionId, workspaceId, meta, files, signal }) {
  const BASE_URL = import.meta.env.VITE_ALE_CORE_BASE || import.meta.env.VITE_ALE_CORE_URL?.replace('/api/ai/chat', '');
  
  if (!BASE_URL) {
    throw new Error("❌ Missing VITE_ALE_CORE_BASE");
  }

  const url = `${BASE_URL}/api/ai/chat`;
  
  console.log("✅ ALE CORE URL =>", url);

  if (!accessToken) {
    throw new Error("❌ Missing accessToken");
  }

  if (!message || !message.trim()) {
    throw new Error("❌ Message is required");
  }

  // ✅ P0: PAYLOAD LIMPIO - SOLO mensaje actual
  const payloadData = {
    message: message.trim(),
    sessionId: sessionId || undefined,
    workspaceId: workspaceId || 'core',
    meta: meta || {
      platform: "AL-EON",
      version: "1.0.0",
      source: "al-eon-console",
      timestamp: new Date().toISOString()
    }
  };

  // Agregar archivos si existen
  if (files && files.length > 0) {
    payloadData.files = files;
    console.log('📎 Archivos adjuntos:', files.length);
  }

  console.log('📤 PAYLOAD:', JSON.stringify(payloadData, null, 2));

  const fetchOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`
    },
    body: JSON.stringify(payloadData),
    signal
  };

  try {
    const res = await fetchWithRetry(url, fetchOptions, 1);
    const text = await res.text();
    
    if (!res.ok) {
      throw new Error(`AL-E Core respondió ${res.status}: ${text}`);
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
    let answer = data.answer;
    
    // � DETECTAR SI answer CONTIENE JSON STRINGIFICADO
    if (answer.trim().startsWith('{') && answer.trim().endsWith('}')) {
      try {
        console.log('🔍 String JSON detectado en el chat - intentando parsear');
        const parsed = JSON.parse(answer);
        
        // Si el JSON parseado tiene un campo "answer", usar ese
        if (parsed.answer && typeof parsed.answer === 'string') {
          console.log('✅ JSON parseado exitosamente, extrayendo answer interno');
          answer = parsed.answer;
        } else if (parsed.message && typeof parsed.message === 'string') {
          console.log('✅ JSON parseado exitosamente, extrayendo message');
          answer = parsed.message;
        } else {
          console.log('ℹ️ JSON parseado pero no tiene campo answer/message válido');
          // Mantener el JSON original como texto
        }
      } catch (e) {
        console.log('ℹ️ String parece JSON pero no se pudo parsear, usando como texto');
        // Si falla el parse, usar el string original
      }
    }
    
    console.log('✅ Extrayendo data.answer:', answer.substring(0, 100));
    console.log('🗑️ Ignorando metadata:', { 
      memories_to_add: data.memories_to_add?.length || 0,
      actions: data.actions?.length || 0,
      artifacts: data.artifacts?.length || 0
    });
    return answer;
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
