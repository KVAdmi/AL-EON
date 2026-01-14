/**
 * meetingsService.js
 * Servicio para gestionar reuniones presenciales y grabaciones
 */

import { supabase } from '../lib/supabase';

const BACKEND_URL = import.meta.env.VITE_ALE_CORE_BASE || import.meta.env.VITE_ALE_CORE_URL || 'https://api.al-eon.com';

/**
 * Obtener token de autenticación
 */
async function getAuthToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/**
 * Headers para peticiones autenticadas
 */
async function authHeaders(includeContentType = true) {
  const token = await getAuthToken();
  const headers = {
    'Authorization': `Bearer ${token}`
  };
  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

/**
 * =====================================================
 * LISTADO Y OBTENCIÓN
 * =====================================================
 */

/**
 * Obtener todas las reuniones del usuario
 */
export async function getMeetings() {
  try {
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[MeetingsService] Error obteniendo reuniones:', error);
    throw error;
  }
}

/**
 * Obtener una reunión específica
 */
export async function getMeetingById(meetingId) {
  try {
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', meetingId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[MeetingsService] Error obteniendo reunión:', error);
    throw error;
  }
}

/**
 * =====================================================
 * SUBIR GRABACIÓN (archivo)
 * =====================================================
 */

/**
 * Subir archivo de audio para procesar
 */
export async function uploadMeeting(file, title) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) throw new Error('No hay sesión activa');

    // 1. Crear registro en DB
    const { data: meeting, error: dbError } = await supabase
      .from('meetings')
      .insert({
        owner_user_id: session.user.id,
        title: title || `Reunión ${new Date().toLocaleDateString('es-ES')}`,
        meeting_type: 'upload',
        status: 'uploading',
        audio_file_size: file.size
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // 2. Subir archivo a Storage
    const fileName = `${session.user.id}/${meeting.id}/${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('meeting-recordings')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    // 3. Obtener URL del archivo
    const { data: { publicUrl } } = supabase.storage
      .from('meeting-recordings')
      .getPublicUrl(fileName);

    // 4. Actualizar meeting con URL
    const { error: updateError } = await supabase
      .from('meetings')
      .update({ 
        audio_url: publicUrl,
        status: 'processing'
      })
      .eq('id', meeting.id);

    if (updateError) throw updateError;

    // 5. Enviar al backend para procesar
    const response = await fetch(`${BACKEND_URL}/api/meetings/upload`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({
        meetingId: meeting.id,
        audioUrl: publicUrl,
        title: meeting.title
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al procesar reunión');
    }

    return meeting;
  } catch (error) {
    console.error('[MeetingsService] Error subiendo reunión:', error);
    throw error;
  }
}

/**
 * =====================================================
 * MODO ALTAVOZ (LIVE)
 * =====================================================
 */

/**
 * Iniciar reunión en modo altavoz
 */
export async function startLiveMeeting(title) {
  try {
    console.log('[MeetingsService] Iniciando reunión live...');
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) throw new Error('No hay sesión activa');

    console.log('[MeetingsService] Usuario autenticado:', session.user.id);
    console.log('[MeetingsService] Backend URL:', BACKEND_URL);

    // ⚠️ CORE: Primero crear en backend, luego guardar en DB
    const payload = {
      title: title || `Reunión en vivo ${new Date().toLocaleTimeString('es-ES')}`,
      mode: 'live',
      auto_send_enabled: false,
      send_email: false,
      send_telegram: false,
      participants: []
    };
    
    console.log('[MeetingsService] Enviando payload:', payload);

    const response = await fetch(`${BACKEND_URL}/api/meetings/live/start`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(payload)
    });

    console.log('[MeetingsService] Response status:', response.status);

    if (!response.ok) {
      let errorMsg = `Error ${response.status}: Failed to create meeting`;
      try {
        const errorData = await response.json();
        console.error('[MeetingsService] Error response:', errorData);
        if (errorData?.error || errorData?.message) {
          errorMsg = errorData.error || errorData.message;
        }
      } catch (e) {
        // Response no es JSON válido
        const textError = await response.text();
        console.error('[MeetingsService] Error response (text):', textError);
        errorMsg = `Error ${response.status}: ${textError || 'Failed to create meeting'}`;
      }
      throw new Error(errorMsg);
    }

    const responseData = await response.json();
    console.log('[MeetingsService] ✅ Reunión creada:', responseData);
    const { meetingId } = responseData;

    // Sincronizar con DB local (opcional, CORE ya lo maneja)
    const { data: meeting } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', meetingId)
      .single();

    console.log('[MeetingsService] ✅ Reunión sincronizada en DB local');

    return { id: meetingId, ...meeting };
  } catch (error) {
    console.error('[MeetingsService] ❌ Error iniciando reunión live:', error);
    throw error;
  }
}

/**
 * Enviar chunk de audio durante reunión live
 */
export async function uploadLiveChunk(meetingId, audioBlob, chunkIndex, startedAtMs) {
  try {
    const formData = new FormData();
    formData.append('chunk', audioBlob, `chunk-${chunkIndex}-${Date.now()}.webm`);
    formData.append('chunkIndex', chunkIndex.toString());
    if (startedAtMs) {
      formData.append('startedAt', startedAtMs.toString());
    }

    const headers = await authHeaders(false);
    const response = await fetch(`${BACKEND_URL}/api/meetings/live/${meetingId}/chunk`, {
      method: 'POST',
      headers,
      body: formData
    });

    if (!response.ok) {
      let errorMsg = `Error ${response.status} enviando chunk`;
      try {
        const errorData = await response.json();
        errorMsg = errorData?.error || errorData?.message || errorMsg;
      } catch (e) {
        const textError = await response.text();
        errorMsg = textError || errorMsg;
      }
      throw new Error(errorMsg);
    }

    const result = await response.json();
    console.log(`[MeetingsService] Chunk ${chunkIndex} enviado correctamente`);
    return result;
  } catch (error) {
    console.error(`[MeetingsService] Error enviando chunk ${chunkIndex}:`, error);
    throw error;
  }
}

/**
 * Alias para compatibilidad con código existente
 */
export async function sendLiveChunk(meetingId, audioBlob) {
  return uploadLiveChunk(meetingId, audioBlob, Date.now(), Date.now());
}

/**
 * Finalizar reunión en modo altavoz
 */
export async function stopLiveMeeting(meetingId) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/meetings/live/${meetingId}/stop`, {
      method: 'POST',
      headers: await authHeaders()
    });

    if (!response.ok) {
      let errorMsg = `Error ${response.status} finalizando reunión`;
      try {
        const errorData = await response.json();
        errorMsg = errorData?.error || errorData?.message || errorMsg;
      } catch (e) {
        const textError = await response.text();
        errorMsg = textError || errorMsg;
      }
      throw new Error(errorMsg);
    }

    const result = await response.json();
    console.log('[MeetingsService] Reunión finalizada correctamente');
    return result;
  } catch (error) {
    console.error('[MeetingsService] Error finalizando reunión:', error);
    throw error;
  }
}

/**
 * Obtener estado en vivo de la reunión (transcripción parcial)
 */
export async function getLiveStatus(meetingId) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/meetings/live/${meetingId}/status`, {
      headers: await authHeaders()
    });

    if (!response.ok) {
      let errorMsg = `Error ${response.status} obteniendo estado`;
      try {
        const errorData = await response.json();
        errorMsg = errorData?.error || errorData?.message || errorMsg;
      } catch (e) {
        const textError = await response.text();
        errorMsg = textError || errorMsg;
      }
      throw new Error(errorMsg);
    }

    return await response.json();
  } catch (error) {
    console.error('[MeetingsService] Error obteniendo estado:', error);
    throw error;
  }
}

/**
 * Obtener resultado final de la reunión (transcripción + minuta)
 */
export async function getMeetingResult(meetingId) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/meetings/${meetingId}/result`, {
      headers: await authHeaders()
    });

    if (!response.ok) {
      let errorMsg = `Error ${response.status} obteniendo resultado`;
      try {
        const errorData = await response.json();
        errorMsg = errorData?.error || errorData?.message || errorMsg;
      } catch (e) {
        const textError = await response.text();
        errorMsg = textError || errorMsg;
      }
      throw new Error(errorMsg);
    }

    return await response.json();
  } catch (error) {
    console.error('[MeetingsService] Error obteniendo resultado:', error);
    throw error;
  }
}

/**
 * =====================================================
 * POLLING Y ESTADO
 * =====================================================
 */

/**
 * Hacer polling del estado de una reunión
 */
export async function pollMeetingStatus(meetingId, onUpdate, maxAttempts = 60) {
  let attempts = 0;
  
  const poll = async () => {
    try {
      const meeting = await getMeetingById(meetingId);
      
      if (onUpdate) {
        onUpdate(meeting);
      }

      // Si ya está done o error, parar
      if (meeting.status === 'done' || meeting.status === 'error') {
        return meeting;
      }

      // Si alcanzamos max attempts
      if (attempts >= maxAttempts) {
        throw new Error('Timeout esperando procesamiento');
      }

      attempts++;
      
      // Esperar 5 segundos y volver a intentar
      await new Promise(resolve => setTimeout(resolve, 5000));
      return poll();
      
    } catch (error) {
      console.error('[MeetingsService] Error en polling:', error);
      throw error;
    }
  };

  return poll();
}

/**
 * =====================================================
 * ACCIONES
 * =====================================================
 */

/**
 * Enviar minuta por correo
 */
export async function sendMeetingSummary(meetingId, payload = {}) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/meetings/${meetingId}/send`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({
        email: payload.email !== false,
        telegram: payload.telegram || false,
        recipients: payload.recipients || []
      })
    });

    if (!response.ok) {
      let errorMsg = `Error ${response.status} enviando minuta`;
      try {
        const errorData = await response.json();
        errorMsg = errorData?.error || errorData?.message || errorMsg;
      } catch (e) {
        const textError = await response.text();
        errorMsg = textError || errorMsg;
      }
      throw new Error(errorMsg);
    }

    return await response.json();
  } catch (error) {
    console.error('[MeetingsService] Error enviando minuta:', error);
    throw error;
  }
}

/**
 * Alias para compatibilidad
 */
export async function sendMinutesByEmail(meetingId, recipients) {
  return sendMeetingSummary(meetingId, { email: true, recipients });
}

/**
 * Enviar resumen por Telegram
 */
export async function sendMinutesByTelegram(meetingId) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/meetings/${meetingId}/send`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({
        telegram: true
      })
    });

    if (!response.ok) {
      throw new Error('Error al enviar por Telegram');
    }

    return await response.json();
  } catch (error) {
    console.error('[MeetingsService] Error enviando por Telegram:', error);
    throw error;
  }
}

/**
 * Enviar minuta por canal específico (wrapper)
 */
export async function sendMinutes(meetingId, channel) {
  if (channel === 'email') {
    return await sendMinutesByEmail(meetingId, []);
  } else if (channel === 'telegram') {
    return await sendMinutesByTelegram(meetingId);
  }
  throw new Error(`Canal desconocido: ${channel}`);
}

/**
 * Crear eventos de calendario desde acuerdos
 */
export async function addMeetingToCalendar(meetingId, payload = {}) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/meetings/${meetingId}/calendar`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let errorMsg = `Error ${response.status} creando eventos de calendario`;
      try {
        const errorData = await response.json();
        errorMsg = errorData?.error || errorData?.message || errorMsg;
      } catch (e) {
        const textError = await response.text();
        errorMsg = textError || errorMsg;
      }
      throw new Error(errorMsg);
    }

    return await response.json();
  } catch (error) {
    console.error('[MeetingsService] Error creando eventos:', error);
    throw error;
  }
}

/**
 * Alias para compatibilidad
 */
export async function createCalendarEvents(meetingId) {
  return addMeetingToCalendar(meetingId);
}

/**
 * Eliminar reunión
 */
export async function deleteMeeting(meetingId) {
  try {
    // 1. Eliminar archivo de storage si existe
    const meeting = await getMeetingById(meetingId);
    if (meeting.audio_url) {
      const fileName = meeting.audio_url.split('/').slice(-3).join('/');
      await supabase.storage
        .from('meeting-recordings')
        .remove([fileName]);
    }

    // 2. Eliminar registro de DB
    const { error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', meetingId);

    if (error) throw error;
  } catch (error) {
    console.error('[MeetingsService] Error eliminando reunión:', error);
    throw error;
  }
}
