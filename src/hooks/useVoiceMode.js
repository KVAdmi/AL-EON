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
 *    b) POST /api/voice/stt → { text }
 *    c) POST /api/ai/chat → { response }
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

  // Sincronizar handsFree
  useEffect(() => {
    handsFreeRef.current = handsFreeEnabled;
  }, [handsFreeEnabled]);

  // Cleanup al desmontar
  useEffect(() => {
    if (!enabled) return; // Skip cleanup si disabled
    return () => {
      if (typeof stopRecording === 'function') stopRecording();
      if (typeof stopAudio === 'function') stopAudio();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [enabled]);

  /**
   * Iniciar grabación de audio
   */
  const startRecording = useCallback(async () => {
    if (!enabled) {
      console.warn('⚠️ Voice mode disabled');
      return;
    }
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
        if (event.data.size > 0) {
          console.log(`📊 [P0-2] Chunk recibido: ${event.data.size} bytes`);
          audioChunksRef.current.push(event.data);
        } else {
          console.warn('⚠️ [P0-2] Chunk vacío recibido');
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('🛑 [P0-2] Grabación detenida, procesando...');
        console.log(`📦 [P0-2] Total chunks: ${audioChunksRef.current.length}`);
        
        // Detener stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const bytesGrabados = audioBlob.size;
        console.log(`🎵 [P0-2] Blob creado: ${bytesGrabados} bytes, tipo: ${audioBlob.type}`);
        
        // 🔥 P0-2: MOSTRAR BYTES GRABADOS (debug UI)
        console.log(`✅ [P0-2] BYTES GRABADOS: ${bytesGrabados} bytes (${audioChunksRef.current.length} chunks)`);
        
        audioChunksRef.current = [];

        // 🔥 P0-2: SI BYTES = 0, NO MANDAR REQUEST
        if (bytesGrabados === 0) {
          const errorMsg = `⚠️ [P0-2] NO SE GRABÓ AUDIO (bytes: 0)`;
          console.error(errorMsg);
          setStatus('idle');
          setError(new Error('No se capturó audio'));
          onError?.(new Error('No se capturó audio (0 bytes). Verifica que tu micrófono esté funcionando y habla más tiempo.'));
          return; // 🔥 NO ENVIAR REQUEST
        }

        console.log(`✅ [P0-2] Audio válido: ${bytesGrabados} bytes - Enviando al backend...`);
        await sendAudioToBackend(audioBlob);
      };

      // 🔥 CRÍTICO: Capturar chunks cada 1 segundo (no esperar al stop)
      mediaRecorder.start(1000);
      setStatus('recording');
      setError(null);
      setTranscript('');
      
      console.log('✅ [P0-2] Grabación iniciada con chunks cada 1 segundo');
      console.log('🎤 [P0-2] Estado del recorder:', mediaRecorder.state);
      console.log('🎙️ [P0-2] Tracks de audio:', stream.getAudioTracks().length);
      
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
   * Detener grabación
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      console.log('🛑 Deteniendo grabación...');
      mediaRecorderRef.current.stop();
    }
  }, []);

  /**
   * Enviar audio al backend: STT → Chat → TTS → reproducir
   */
  const sendAudioToBackend = useCallback(async (audioBlob) => {
    setIsSending(true);
    setStatus('processing');
    
    // Crear AbortController para timeout
    abortControllerRef.current = new AbortController();
    const timeoutId = setTimeout(() => abortControllerRef.current?.abort(), 60000); // 60s

    try {
      // PASO 1: STT - Convertir audio a texto
      console.log('📤 Enviando audio a /api/voice/stt...');
      
      // 🔥 GENERAR REQUEST-ID
      const requestId = generateRequestId();
      console.log(`[REQ-VOICE] 📤 STT - id=${requestId} sessionId=${sessionId}`);
      
      const formData = new FormData();
      formData.append('file', audioBlob, 'voice.webm');
      formData.append('sessionId', sessionId);
      if (workspaceId) formData.append('workspaceId', workspaceId);
      formData.append('meta', JSON.stringify({
        platform: 'web',
        version: '1.0',
        timestamp: new Date().toISOString()
      }));

      const sttResponse = await fetch(`${CORE_BASE_URL}/api/voice/stt`, {
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
        logRequestError(requestId, '/api/voice/stt', {
          status: sttResponse.status,
          error: errorData.error,
          sessionId
        });
        throw new Error(errorData.error || `STT Error: ${sttResponse.status}`);
      }

      const sttData = await sttResponse.json();
      const userText = sttData.text || sttData.transcript || '';

      if (!userText.trim()) {
        logRequestError(requestId, '/api/voice/stt', { error: 'No voice detected', sessionId });
        throw new Error('No se detectó voz en el audio');
      }

      console.log(`✅ STT: "${userText}"`);
      logRequest(requestId, '/api/voice/stt', sttResponse.status, {
        sessionId,
        textLength: userText.length
      });
      setTranscript(userText);

      // PASO 2: Chat - Enviar texto a AL-E Core
      console.log('💬 Enviando mensaje al chat...');
      
      // 🔥 NUEVO REQUEST-ID para chat
      const chatRequestId = generateRequestId();
      console.log(`[REQ-VOICE] 📤 CHAT - id=${chatRequestId} sessionId=${sessionId}`);
      
      const chatResponse = await fetch(`${CORE_BASE_URL}/api/ai/chat`, {
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
        logRequestError(chatRequestId, '/api/ai/chat', {
          status: chatResponse.status,
          error: errorData.error,
          sessionId
        });
        throw new Error(errorData.error || `Chat Error: ${chatResponse.status}`);
      }

      const chatData = await chatResponse.json();
      const assistantText = chatData.response || chatData.message || '';

      if (!assistantText.trim()) {
        logRequestError(chatRequestId, '/api/ai/chat', { error: 'Empty response', sessionId });
        throw new Error('Respuesta vacía del asistente');
      }

      console.log(`✅ Respuesta: "${assistantText.substring(0, 100)}..."`);
      logRequest(chatRequestId, '/api/ai/chat', chatResponse.status, {
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
   * Detener audio
   */
  const stopAudio = useCallback(() => {
    if (audioPlayerRef.current) {
      console.log('🛑 Deteniendo audio...');
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      audioPlayerRef.current = null;
    }
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
    
    // Info
    isRecording: status === 'recording',
    isProcessing: status === 'processing',
    isSpeaking: status === 'speaking',
    isIdle: status === 'idle'
  };
}
