/**
 * useVoiceMode - Hook maestro para modo de voz con backend (AL-E Core)
 * 
 * ARQUITECTURA:
 * - Frontend: Captura audio (MediaRecorder) + reproduce respuesta (Audio API)
 * - Backend (AL-E Core): STT + contexto + intents + tools + TTS
 * 
 * FLUJO:
 * 1. Modo Texto: usuario escribe, AL-E responde texto
 * 2. Modo Voz Manos Libres (ON):
 *    a) Captura audio (push-to-talk)
 *    b) POST /api/voice/transcribe → { text }
 *    c) POST /api/ai/chat/v2 → { answer, session_id }
 *    d) POST /api/voice/tts → audio MP3
 *    e) Reproduce audio
 *    f) Vuelve a escuchar (loop)
 * 
 * ESTADOS:
 * - idle: esperando
 * - recording: grabando audio del usuario
 * - processing: enviando a backend (STT + chat + TTS)
 * - speaking: reproduciendo respuesta de AL-E
 * 
 * ANTI-DOBLE ENVÍO:
 * - isSending: bloquea grabación/envío
 * - AbortController por request (60s timeout)
 * - Deshabilitar controles mientras processing
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { generateRequestId, logRequest, logRequestError } from '../utils/requestId';

const CORE_BASE_URL = import.meta.env.VITE_CORE_BASE_URL || 'https://api.al-entity.com';
const VOICE_LOCAL_MODE = import.meta.env.VITE_VOICE_LOCAL === '1'; // Fallback DEV

export function useVoiceMode({
  accessToken, // JWT token de Supabase (REQUERIDO)
  sessionId, // ID de sesión (REQUERIDO)
  workspaceId = 'core', // ID de workspace
  enabled = true, // Flag para activar/desactivar (NUEVO)
  onResponse, // Callback con respuesta de AL-E: (text) => void
  onError, // Callback de error: (error) => void
  handsFreeEnabled = false
} = {}) {
  const [mode, setMode] = useState('text'); // 'text' | 'voice'
  const [status, setStatus] = useState('idle'); // 'idle' | 'recording' | 'processing' | 'speaking'
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [transcript, setTranscript] = useState('');
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioPlayerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const handsFreeRef = useRef(handsFreeEnabled);
  const streamRef = useRef(null);
  const sendAudioToBackendRef = useRef(null);

  // Sincronizar handsFree
  useEffect(() => {
    handsFreeRef.current = handsFreeEnabled;
  }, [handsFreeEnabled]);

  /**
   * Detener grabación
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      console.log('🛑 Deteniendo grabación...');
      mediaRecorderRef.current.stop();
    }
  }, []);

  /**
   * Detener audio que está reproduciéndose
   */
  const stopAudio = useCallback(() => {
    if (audioPlayerRef.current) {
      console.log('🔇 Deteniendo audio...');
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      audioPlayerRef.current = null;
    }
    if (status === 'speaking') {
      setStatus('idle');
    }
  }, [status]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      stopRecording();
      stopAudio();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [stopRecording, stopAudio]);

  // 🔒 Si no está habilitado, retornar versión deshabilitada (DESPUÉS de hooks)
  if (!enabled) {
    return {
      mode: 'text',
      status: 'idle',
      isListening: false,
      isSending: false,
      error: null,
      transcript: '',
      setMode: () => {},
      startListening: () => {},
      stopRecording: () => {},
      stopAudio: () => {},
      stopAll: () => {}
    };
  }

  /**
   * Iniciar grabación de audio
   */
  const startRecording = useCallback(async () => {
    if (isSending) {
      console.warn('⚠️ Ya hay un proceso en curso, esperando...');
      return;
    }

    if (!accessToken) {
      const err = new Error('No hay sesión activa');
      setError(err);
      onError?.(err);
      return;
    }

    try {
      console.log('🎤 [P0-2] Iniciando grabación...');
      
      // 🔥 P0-2: Solicitar permiso de micrófono EXPLÍCITAMENTE
      console.log('🎤 [P0-2] Solicitando permisos de micrófono...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // 🔥 P0-2: VERIFICAR que el stream tiene audio tracks
      if (!stream || stream.getAudioTracks().length === 0) {
        throw new Error('No se pudo acceder al micrófono. Verifica permisos.');
      }
      
      console.log('✅ [P0-2] Permisos concedidos, tracks activos:', stream.getAudioTracks().length);
      
      // 🔍 DEBUG: Monitorear actividad del track
      const audioTrack = stream.getAudioTracks()[0];
      console.log('🎙️ [P0-2] Track info:', {
        label: audioTrack.label,
        enabled: audioTrack.enabled,
        readyState: audioTrack.readyState,
        muted: audioTrack.muted
      });

      streamRef.current = stream;

      // Determinar formato soportado
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        console.log(`📊 [DEBUG] ondataavailable disparado - size: ${event.data.size} bytes`);
        if (event.data && event.data.size > 0) {
          console.log(`✅ [P0-2] Chunk válido recibido: ${event.data.size} bytes`);
          audioChunksRef.current.push(event.data);
        } else {
          console.error('❌ [P0-2] Chunk vacío o inválido recibido');
        }
      };

      mediaRecorder.onstop = async () => {
        // 🔥 P0-VOICE: snapshots estables para evitar TDZ/minificación en runtime
        const recorderState = mediaRecorder.state;
        const mimeTypeSnapshot = mimeType;
        const chunksSnapshot = Array.isArray(audioChunksRef.current) ? [...audioChunksRef.current] : [];

        console.log('🛑 [P0-2] Grabación detenida, procesando...');
        console.log(`📦 [P0-2] Total chunks: ${chunksSnapshot.length}`);

        // Detener stream siempre
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        // Resetear buffer temprano (ya tenemos snapshot)
        audioChunksRef.current = [];

        // 🔥 P0-2: Filtrar chunks vacíos antes de crear el Blob
        const validChunks = chunksSnapshot.filter(chunk => chunk && chunk.size > 0);
        const audioBlob = new Blob(validChunks, { type: mimeTypeSnapshot });
        const bytesGrabados = audioBlob.size;
        console.log(`🎵 [P0-2] Blob creado: ${bytesGrabados} bytes, tipo: ${audioBlob.type}`);
        console.log(`✅ [P0-2] BYTES GRABADOS: ${bytesGrabados} bytes (${chunksSnapshot.length} chunks)`);

        // 🔥 P0-2: SI BYTES < 100, mostrar error CLARO
        if (bytesGrabados < 100) {
          const errorMsg = `❌ [P0-2] GRABACIÓN FALLÓ - Solo se capturaron ${bytesGrabados} bytes`;
          console.error(errorMsg);
          console.error('🔍 [DEBUG] Información de debugging:', {
            chunks: chunksSnapshot.length,
            validChunks: validChunks.length,
            mimeType: mimeTypeSnapshot,
            recorderState
          });
          setStatus('idle');

          const finalError = new Error(
            `Error de captura: solo se grabaron ${bytesGrabados} bytes. ` +
            'Mantén presionado el botón al menos 3 segundos mientras hablas en voz alta.'
          );

          setError(finalError);
          onError?.(finalError);
          return;
        }

        console.log(`✅ [P0-2] Audio válido: ${bytesGrabados} bytes - Enviando al backend...`);
        // 🔥 P0-VOICE: llamada estable vía ref (evita TDZ/minificador con funciones const)
        const sendFn = sendAudioToBackendRef.current;
        if (typeof sendFn !== 'function') {
          const err = new Error('Voice backend sender no inicializado');
          setError(err);
          onError?.(err);
          setStatus('idle');
          return;
        }
        await sendFn(audioBlob);
      };

      // 🔥 CRÍTICO: NO usar timeslice - capturar TODO al detener
      console.log('🎤 [P0-2] Iniciando MediaRecorder SIN timeslice para capturar todo');
      mediaRecorder.start(); // SIN parámetro para que capture todo de una vez
      setStatus('recording');
      setError(null); // ✅ Resetear error al iniciar grabación exitosa
      setTranscript('');
      
      console.log('✅ [P0-2] Grabación iniciada - recording continuo');
      console.log('🎤 [P0-2] Estado del recorder:', mediaRecorder.state);
      console.log('🎙️ [P0-2] Tracks de audio:', stream.getAudioTracks().length);
      console.log('🎙️ [P0-2] Track 0 settings:', audioTrack.getSettings());
      
    } catch (err) {
      console.error('❌ [P0-2] Error al iniciar grabación:', err);
      
      // 🔥 P0-2: MENSAJE DE ERROR ESPECÍFICO PARA PERMISOS
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        const permisosError = new Error('Debes permitir el acceso al micrófono en la configuración de tu navegador.');
        setError(permisosError);
        onError?.(permisosError);
      } else if (err.name === 'NotFoundError') {
        const noMicError = new Error('No se encontró ningún micrófono. Conecta uno e intenta de nuevo.');
        setError(noMicError);
        onError?.(noMicError);
      } else {
        setError(err);
        onError?.(err);
      }
      
      setStatus('idle');
    }
  }, [isSending, accessToken, onError]);

  /**
   * Enviar audio al backend: STT → Chat → TTS → reproducir
   */
  const sendAudioToBackend = useCallback(async (audioBlob) => {
    // 🔒 VALIDACIÓN P0: No enviar audio vacío
    if (!audioBlob || audioBlob.size === 0) {
      const errorMsg = 'No se detectó audio. Verifica que tu micrófono esté funcionando y que hayas hablado.';
      console.error('❌ [Voice] Audio blob vacío:', { size: audioBlob?.size || 0 });
      const emptyError = new Error(errorMsg);
      setError(emptyError);
      setStatus('idle');
      setIsSending(false);
      onError?.(emptyError);
      return; // 🛑 NO enviar al backend
    }

    console.log('✅ [Voice] Audio válido:', { size: audioBlob.size, type: audioBlob.type });

    setIsSending(true);
    setStatus('processing');
    
    // Crear AbortController para timeout
    abortControllerRef.current = new AbortController();
    const timeoutId = setTimeout(() => abortControllerRef.current?.abort(), 60000); // 60s

    try {
      // PASO 1: STT - Convertir audio a texto
      console.log('📤 Enviando audio a /api/voice/transcribe...');
      
      // 🔥 GENERAR REQUEST-ID
      const requestId = generateRequestId();
      console.log(`[REQ-VOICE] 📤 STT - id=${requestId} sessionId=${sessionId}`);
      
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice-message.webm');
      formData.append('sessionId', sessionId);
      if (workspaceId) formData.append('workspaceId', workspaceId);
      formData.append('meta', JSON.stringify({
        platform: 'web',
        version: '1.0',
        timestamp: new Date().toISOString()
      }));

      const sttResponse = await fetch(`${CORE_BASE_URL}/api/voice/transcribe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-request-id': requestId, // 🔥 REQUEST-ID
        },
        body: formData,
        signal: abortControllerRef.current.signal
      });

      if (!sttResponse.ok) {
        const errorData = await sttResponse.json().catch(() => ({}));
        logRequestError(requestId, '/api/voice/transcribe', {
          status: sttResponse.status,
          error: errorData.error,
          sessionId
        });
        throw new Error(errorData.error || `STT Error: ${sttResponse.status}`);
      }

      const sttData = await sttResponse.json();
      const userText = sttData.text || sttData.transcript || '';

      if (!userText.trim()) {
        logRequestError(requestId, '/api/voice/transcribe', { error: 'No voice detected', sessionId });
        throw new Error('No se detectó voz en el audio');
      }

      console.log(`✅ STT: "${userText}"`);
      logRequest(requestId, '/api/voice/transcribe', sttResponse.status, {
        sessionId,
        textLength: userText.length
      });
      setTranscript(userText);

      // PASO 2: Chat - Enviar texto a AL-E Core
      console.log('💬 Enviando mensaje al chat...');
      
      // 🔥 NUEVO REQUEST-ID para chat
      const chatRequestId = generateRequestId();
      console.log(`[REQ-VOICE] 📤 CHAT - id=${chatRequestId} sessionId=${sessionId}`);
      
      const chatResponse = await fetch(`${CORE_BASE_URL}/api/ai/chat/v2`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'x-request-id': chatRequestId, // 🔥 REQUEST-ID
        },
        body: JSON.stringify({
          message: userText,
          sessionId,
          workspaceId,
          meta: {
            inputMode: 'voice',
            platform: 'web',
            handsFree: handsFreeRef.current
          }
        }),
        signal: abortControllerRef.current.signal
      });

      if (!chatResponse.ok) {
        const errorData = await chatResponse.json().catch(() => ({}));
        logRequestError(chatRequestId, '/api/ai/chat/v2', {
          status: chatResponse.status,
          error: errorData.error,
          sessionId
        });
        throw new Error(errorData.error || `Chat Error: ${chatResponse.status}`);
      }

      const chatData = await chatResponse.json();
      // v2 expected: { answer, session_id, ... }
      const assistantText = chatData.answer || chatData.response || chatData.message || '';

      // NOTE: v2 can return session_id; this hook currently doesn't persist it.
      // Keeping behavior unchanged to avoid introducing new state wiring here.

      if (!assistantText.trim()) {
        logRequestError(chatRequestId, '/api/ai/chat/v2', { error: 'Empty response', sessionId });
        throw new Error('Respuesta vacía del asistente');
      }

      console.log(`✅ Respuesta: "${assistantText.substring(0, 100)}..."`);
      logRequest(chatRequestId, '/api/ai/chat/v2', chatResponse.status, {
        sessionId,
        responseLength: assistantText.length
      });
      onResponse?.(assistantText);

      // PASO 3: TTS - Convertir respuesta a audio
      console.log('🔊 Solicitando audio con /api/voice/tts...');
      
      // 🔥 NUEVO REQUEST-ID para TTS
      const ttsRequestId = generateRequestId();
      console.log(`[REQ-VOICE] 📤 TTS - id=${ttsRequestId} sessionId=${sessionId}`);
      
      const ttsResponse = await fetch(`${CORE_BASE_URL}/api/voice/tts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'x-request-id': ttsRequestId, // 🔥 REQUEST-ID
        },
        body: JSON.stringify({
          text: assistantText,
          voice: 'mx_female_default',
          format: 'mp3'
        }),
        signal: abortControllerRef.current.signal
      });

      if (!ttsResponse.ok) {
        const errorData = await ttsResponse.json().catch(() => ({}));
        logRequestError(ttsRequestId, '/api/voice/tts', {
          status: ttsResponse.status,
          error: errorData.error,
          sessionId
        });
        throw new Error(errorData.error || `TTS Error: ${ttsResponse.status}`);
      }

      const audioBlob = await ttsResponse.blob();
      
      logRequest(ttsRequestId, '/api/voice/tts', ttsResponse.status, {
        sessionId,
        audioBlobSize: audioBlob.size
      });
      
      // PASO 4: Reproducir audio
      console.log('🎵 Reproduciendo respuesta...');
      await playAudio(audioBlob);

      console.log('✅ Ciclo de voz completado');
      
      // Si modo manos libres está activo, volver a grabar
      if (mode === 'voice' && handsFreeRef.current) {
        console.log('🔄 Modo manos libres: reiniciando grabación...');
        setTimeout(() => {
          if (mode === 'voice' && handsFreeRef.current && !isSending) {
            startRecording();
          }
        }, 500);
      } else {
        setStatus('idle');
      }

    } catch (err) {
      console.error('❌ Error en ciclo de voz:', err);
      
      if (err.name === 'AbortError') {
        const timeoutError = new Error('Timeout: La solicitud tardó más de 60 segundos');
        setError(timeoutError);
        onError?.(timeoutError);
      } else {
        setError(err);
        onError?.(err);
      }
      
      setStatus('idle');
    } finally {
      clearTimeout(timeoutId);
      setIsSending(false);
      abortControllerRef.current = null;
    }
  }, [accessToken, sessionId, workspaceId, mode, onResponse, onError, startRecording]);

  // Mantener una referencia estable para usarla desde callbacks nativos (MediaRecorder)
  useEffect(() => {
    sendAudioToBackendRef.current = sendAudioToBackend;
  }, [sendAudioToBackend]);

  /**
   * Reproducir audio
   */
  const playAudio = useCallback((audioBlob) => {
    return new Promise((resolve, reject) => {
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioPlayerRef.current = audio;

      audio.onended = () => {
        console.log('✅ Audio reproducido completamente');
        URL.revokeObjectURL(audioUrl);
        setStatus('idle');
        resolve();
      };

      audio.onerror = (err) => {
        console.error('❌ Error al reproducir audio:', err);
        URL.revokeObjectURL(audioUrl);
        setStatus('idle');
        reject(err);
      };

      setStatus('speaking');
      audio.play().catch(reject);
    });
  }, []);

  /**
   * Cambiar modo
   */
  const setVoiceMode = useCallback((newMode) => {
    console.log(`🔄 Cambiando modo: ${mode} → ${newMode}`);
    
    // Detener todo al cambiar de modo
    stopRecording();
    stopAudio();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setStatus('idle');
    setMode(newMode);
    
    // Si cambia a modo voz con handsFree, iniciar grabación
    if (newMode === 'voice' && handsFreeRef.current && !isSending) {
      setTimeout(() => startRecording(), 500);
    }
  }, [mode, stopRecording, stopAudio, isSending, startRecording]);

  /**
   * Detener todo (grabación + audio)
   */
  const stopAll = useCallback(() => {
    console.log('🛑 Deteniendo todo...');
    stopRecording();
    stopAudio();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setStatus('idle');
    setIsSending(false);
  }, [stopRecording, stopAudio]);

  return {
    // Estado
    mode,
    status,
    isSending,
    error,
    transcript,
    
    // Acciones
    setMode: setVoiceMode,
    startRecording,
    stopRecording,
    stopAll,
    
    // 🔥 ALIASES para compatibilidad con UI
    startListening: startRecording,
    isListening: status === 'recording',
    
    // Info
    isRecording: status === 'recording',
    isProcessing: status === 'processing',
    isSpeaking: status === 'speaking',
    isIdle: status === 'idle'
  };
}
