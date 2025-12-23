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
 * @param {Array} params.messages - Historial de mensajes [{role, content}]
 * @param {string} params.sessionId - ID de la sesión (opcional, null para crear nueva)
 * @param {string} params.workspaceId - ID del workspace (opcional, default: 'default')
 * @param {Object} params.voiceMeta - Metadata de voz (opcional)
 * @param {Array} params.files - Archivos adjuntos (opcional, [{url, name, type, size}])
 * @param {Array} params.rawFiles - Archivos File objects para enviar via FormData (opcional)
 * @param {Array} params.fileIds - IDs de archivos ya ingestados (opcional, para contexto)
 * @param {AbortSignal} params.signal - Señal para cancelar request (opcional)
 * @returns {Promise<Object>} Respuesta de AL-E Core con session_id
 */
export async function sendToAleCore({ accessToken, messages, sessionId, workspaceId, voiceMeta, files, rawFiles, fileIds, signal }) {
  // ✅ BASE URL desde env, SIN /api/ai/chat
  const BASE_URL = import.meta.env.VITE_ALE_CORE_BASE || import.meta.env.VITE_ALE_CORE_URL?.replace('/api/ai/chat', '');
  
  if (!BASE_URL) {
    throw new Error("❌ Missing VITE_ALE_CORE_BASE - Verifica tu archivo .env");
  }

  const url = `${BASE_URL}/api/ai/chat`;
  
  console.log("✅ ALE CORE URL =>", url);

  if (!accessToken) {
    throw new Error("❌ Missing accessToken - Usuario no autenticado");
  }

  // ✅ FORZAR workspaceId="core" para AL-E Core (no interpretativo)
  const WORKSPACE_ID = import.meta.env.VITE_WORKSPACE_ID === "core" ? "core" : "core";
  
  const finalWorkspaceId = WORKSPACE_ID;
  
  // ✅ Persistir para futuras cargas
  localStorage.setItem('workspaceId', finalWorkspaceId);
  
  console.log('🗂️ WorkspaceId:', finalWorkspaceId);

  // ✅ RequestId único para correlación de logs
  const requestId = crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  console.log('🧾 requestId:', requestId);

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

  // ✅ WIRE PROTOCOL: Decidir entre JSON o FormData
  const hasRawFiles = rawFiles && rawFiles.length > 0;

  // ✅ LIMPIAR mensajes contaminados ANTES de enviar
  const cleanedMessages = messages.filter(msg => {
    if (msg.role === 'assistant') {
      const content = msg.content || '';
      // Eliminar mensajes de error, HTML, y failed fetches
      if (
        content.startsWith('Error:') ||
        content.startsWith('Failed to fetch') ||
        content.includes('<!DOCTYPE html>')
      ) {
        console.warn('🧹 Mensaje contaminado eliminado:', content.substring(0, 50));
        return false;
      }
    }
    return true;
  });

  // Construir payload base
  const payloadData = {
    requestId,
    workspaceId: finalWorkspaceId,
    userId: userId,
    mode: "universal",
    messages: cleanedMessages,
    meta: {
      ...getRequestMetadata(),
      timestamp: new Date().toISOString(),
      ...(voiceMeta && {
        inputMode: voiceMeta.inputMode || 'text',
        localeHint: voiceMeta.localeHint || 'es-MX',
        handsFree: voiceMeta.handsFree || false
      })
    }
  };

  // Agregar sessionId si existe
  if (sessionId) {
    payloadData.sessionId = sessionId;
    console.log('🔄 Continuando sesión:', sessionId);
  } else {
    console.log('🆕 Creando nueva sesión (sessionId = null)');
  }

  // Agregar contexto con fileIds si existen (para recuperación de chunks)
  if (fileIds && fileIds.length > 0) {
    payloadData.context = { fileIds };
    console.log('📚 Contexto con fileIds:', fileIds);
  }

  // Agregar URLs de archivos ya subidos
  if (files && files.length > 0) {
    payloadData.attachments = files;
    payloadData.files = files; // Compatibilidad
    console.log('📎 Archivos ya subidos:', files.map(f => f.name).join(', '));
  }

  let fetchOptions;

  if (hasRawFiles) {
    // ✅ WIRE PROTOCOL: Multipart/form-data cuando hay archivos raw
    console.log('📤 WIRE PROTOCOL: Multipart (archivos raw)');
    const formData = new FormData();
    
    // Campos obligatorios
    formData.append('workspaceId', payloadData.workspaceId);
    formData.append('userId', payloadData.userId);
    formData.append('mode', payloadData.mode);
    formData.append('requestId', payloadData.requestId);
    formData.append('messages', JSON.stringify(payloadData.messages));
    
    // Opcional: sessionId
    if (payloadData.sessionId) {
      formData.append('sessionId', payloadData.sessionId);
    }
    
    // Opcional: context
    if (payloadData.context) {
      formData.append('context', JSON.stringify(payloadData.context));
    }
    
    // Opcional: meta
    if (payloadData.meta) {
      formData.append('meta', JSON.stringify(payloadData.meta));
    }
    
    // Archivos raw
    for (const file of rawFiles) {
      formData.append('files', file);
      console.log(`📎 Adjuntando: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
    }

    fetchOptions = {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`
        // NO incluir Content-Type, browser lo setea automático con boundary
      },
      body: formData,
      signal
    };
  } else {
    // ✅ WIRE PROTOCOL: JSON cuando NO hay archivos raw
    console.log('📤 WIRE PROTOCOL: JSON (sin archivos raw)');
    console.log('📤 PAYLOAD TO CORE:', JSON.stringify(payloadData, null, 2));

    fetchOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`
      },
      body: JSON.stringify(payloadData),
      signal
    };
  }

  try {
    // ✅ NUEVO: Fetch con 1 reintento automático en caso de 502/504/timeout
    const res = await fetchWithRetry(url, fetchOptions, 1);

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
