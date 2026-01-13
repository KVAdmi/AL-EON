/**
 * useVoiceModeCore.js
 * Hook para Voice Chat usando AL-E Core backend (NO Web Speech API)
 * Reemplaza a useSpeechRecognition.js
 */

import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { generateRequestId, logRequest, logRequestError } from '@/utils/requestId';

const CORE_BASE_URL = import.meta.env.VITE_CORE_BASE_URL || 'https://api.al-eon.com';

export function useVoiceModeCore() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const { accessToken, user } = useAuth();

  const startRecording = async () => {
    try {
      setError(null);
      
      // Verificar permisos de micrófono
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      console.log('[VOICE] 🎤 Micrófono activado');

      // Crear MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log('[VOICE] 📦 Chunk recibido:', event.data.size, 'bytes');
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('[VOICE] 🛑 Grabación detenida, procesando...');
        setIsProcessing(true);

        try {
          // Crear blob de audio
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          
          // Validar que el blob tenga contenido
          if (audioBlob.size === 0) {
            throw new Error('No se grabó audio. Intenta de nuevo.');
          }

          console.log('[VOICE] 📤 Enviando audio a Core:', audioBlob.size, 'bytes');

          // Enviar a Core endpoint
          const requestId = generateRequestId();
          const formData = new FormData();
          formData.append('audio', audioBlob, 'voice.webm');
          formData.append('language', 'es'); // Español

          const response = await fetch(`${CORE_BASE_URL}/api/voice/stt`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'x-request-id': requestId,
            },
            body: formData,
          });

          logRequest(requestId, '/api/voice/stt', response.status);

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Error ${response.status}`);
          }

          const data = await response.json();

          if (data.text || data.transcript) {
            const transcriptText = data.text || data.transcript;
            setTranscript(transcriptText);
            console.log('[VOICE] ✅ Transcripción recibida:', transcriptText);
          } else {
            throw new Error('No se recibió transcripción del servidor');
          }

        } catch (err) {
          console.error('[VOICE] ❌ Error procesando audio:', err);
          setError(err.message);
          logRequestError(generateRequestId(), '/api/voice/stt', err);
        } finally {
          setIsProcessing(false);
          
          // Limpiar stream
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      console.log('[VOICE] ▶️ Grabación iniciada');

    } catch (err) {
      console.error('[VOICE] ❌ Error accediendo al micrófono:', err);
      
      if (err.name === 'NotAllowedError') {
        setError('Permiso de micrófono denegado. Por favor permite el acceso en la configuración del navegador.');
      } else if (err.name === 'NotFoundError') {
        setError('No se encontró micrófono. Verifica que esté conectado.');
      } else {
        setError(`Error al acceder al micrófono: ${err.message}`);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      console.log('[VOICE] ⏸️ Deteniendo grabación...');
    }
  };

  const clearTranscript = () => {
    setTranscript('');
    setError(null);
  };

  return {
    isRecording,
    transcript,
    isProcessing,
    error,
    startRecording,
    stopRecording,
    clearTranscript,
    isSupported: typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia,
  };
}
