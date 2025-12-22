/**
 * Cliente para streaming de respuestas con Server-Sent Events (SSE)
 * 
 * NOTA: Requiere que el backend implemente endpoint SSE
 * Endpoint esperado: POST /api/ai/chat/stream
 */

/**
 * Envía mensaje con streaming de respuesta
 * @param {Object} params
 * @param {string} params.accessToken - JWT token
 * @param {Array} params.messages - Historial de mensajes
 * @param {string} params.sessionId - ID de sesión
 * @param {Array} params.files - Archivos adjuntos
 * @param {Function} params.onChunk - Callback para cada chunk recibido
 * @param {Function} params.onComplete - Callback cuando termine
 * @param {Function} params.onError - Callback de error
 * @param {AbortSignal} params.signal - Señal para cancelar
 */
export async function sendWithStreaming({ 
  accessToken, 
  messages, 
  sessionId, 
  files, 
  onChunk, 
  onComplete, 
  onError,
  signal 
}) {
  const url = `${import.meta.env.VITE_ALE_CORE_URL}/stream`; // ← Backend debe implementar este endpoint
  
  if (!url) {
    throw new Error("❌ Missing VITE_ALE_CORE_URL");
  }

  // Extraer userId del JWT
  let userId;
  try {
    const tokenParts = accessToken.split('.');
    const payload = JSON.parse(atob(tokenParts[1]));
    userId = payload.sub || payload.email;
  } catch (error) {
    throw new Error('Token inválido - no se pudo extraer userId');
  }

  const payload = {
    mode: "universal",
    workspaceId: "default",
    userId,
    messages,
    sessionId: sessionId || null,
    files: files || [],
    meta: {
      origin: "AL-EON",
      timestamp: new Date().toISOString()
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'text/event-stream' // ← Indicar que esperamos SSE
      },
      body: JSON.stringify(payload),
      signal
    });

    if (!response.ok) {
      throw new Error(`Backend respondió ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullAnswer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Guardar línea incompleta

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          if (data === '[DONE]') {
            onComplete({ answer: fullAnswer, session_id: sessionId });
            return;
          }

          try {
            const chunk = JSON.parse(data);
            fullAnswer += chunk.delta || '';
            onChunk(chunk.delta || '', fullAnswer);
          } catch (e) {
            console.warn('Error parseando chunk SSE:', e);
          }
        }
      }
    }

    onComplete({ answer: fullAnswer, session_id: sessionId });

  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('🛑 Streaming cancelado');
      throw new Error('Streaming cancelado');
    }
    onError(error);
    throw error;
  }
}

/**
 * Función helper para detectar si el backend soporta streaming
 */
export async function supportsStreaming(backendUrl) {
  try {
    const response = await fetch(`${backendUrl}/capabilities`, {
      method: 'GET'
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.streaming === true;
    }
    
    return false;
  } catch {
    return false;
  }
}
