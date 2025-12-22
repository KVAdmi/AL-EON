/**
 * useVoiceMode - Hook maestro para modo de voz completo
 * 
 * FLUJO:
 * 1. Modo Texto: usuario escribe, AL-E responde (puede leer respuesta opcionalmente)
 * 2. Modo Voz Total: escuchar → enviar → TTS → auto-escuchar (manos libres)
 * 
 * ESTADOS:
 * - idle: esperando
 * - listening: escuchando al usuario
 * - processing: enviando mensaje a backend
 * - speaking: AL-E hablando
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSpeechRecognition } from './useSpeechRecognition';
import { useSpeechSynthesis } from './useSpeechSynthesis';

export function useVoiceMode({
  onMessage, // Función para enviar mensaje: (text, meta) => Promise<response>
  language = 'es-MX',
  handsFreeEnabled = false
} = {}) {
  const [mode, setMode] = useState('text'); // 'text' | 'voice'
  const [status, setStatus] = useState('idle'); // 'idle' | 'listening' | 'processing' | 'speaking'
  const [lastResponse, setLastResponse] = useState('');
  
  const handsFreeRef = useRef(handsFreeEnabled);
  const isProcessingRef = useRef(false);

  // Hooks de voz
  const stt = useSpeechRecognition({
    language,
    continuous: false,
    interimResults: true
  });

  const tts = useSpeechSynthesis();

  // Sincronizar handsFree
  useEffect(() => {
    handsFreeRef.current = handsFreeEnabled;
  }, [handsFreeEnabled]);

  // Manejar cambio de estado STT
  useEffect(() => {
    if (stt.isListening) {
      setStatus('listening');
    } else if (status === 'listening' && !stt.isListening && !isProcessingRef.current) {
      setStatus('idle');
    }
  }, [stt.isListening, status]);

  // Manejar cambio de estado TTS
  useEffect(() => {
    if (tts.isSpeaking) {
      setStatus('speaking');
    } else if (status === 'speaking' && !tts.isSpeaking) {
      setStatus('idle');
      
      // Si es modo voz y handsFree está activo, volver a escuchar
      if (mode === 'voice' && handsFreeRef.current) {
        console.log('🔄 Modo manos libres: reiniciando escucha...');
        setTimeout(() => {
          if (mode === 'voice' && handsFreeRef.current && !isProcessingRef.current) {
            startListening();
          }
        }, 500); // Pequeño delay para evitar captar el eco
      }
    }
  }, [tts.isSpeaking, status, mode]);

  // Cambiar modo
  const setVoiceMode = useCallback((newMode) => {
    console.log(`🔄 Cambiando modo: ${mode} → ${newMode}`);
    
    // Detener todo al cambiar de modo
    stt.stopListening();
    tts.cancel();
    setStatus('idle');
    setMode(newMode);
    
    // Si cambia a modo voz con handsFree, iniciar escucha
    if (newMode === 'voice' && handsFreeRef.current) {
      setTimeout(() => startListening(), 300);
    }
  }, [mode, stt, tts]);

  // Iniciar escucha
  const startListening = useCallback(() => {
    if (!stt.isSupported) {
      console.error('❌ Reconocimiento de voz no soportado');
      return;
    }

    if (tts.isSpeaking) {
      console.warn('⚠️ AL-E está hablando, esperando...');
      return;
    }

    if (isProcessingRef.current) {
      console.warn('⚠️ Procesando mensaje, esperando...');
      return;
    }

    console.log('🎤 Iniciando escucha...');
    stt.resetTranscript();
    stt.startListening();
  }, [stt, tts.isSpeaking]);

  // Detener escucha
  const stopListening = useCallback(() => {
    console.log('🛑 Deteniendo escucha...');
    stt.stopListening();
  }, [stt]);

  // Enviar mensaje por voz
  const sendVoiceMessage = useCallback(async (text) => {
    if (!text || text.trim() === '') {
      console.warn('⚠️ Texto vacío, no se envía');
      return;
    }

    console.log(`📤 Enviando mensaje por voz: "${text}"`);
    
    setStatus('processing');
    isProcessingRef.current = true;

    try {
      const meta = {
        inputMode: 'voice',
        localeHint: language,
        handsFree: handsFreeRef.current
      };

      const response = await onMessage?.(text, meta);
      
      if (response) {
        setLastResponse(response);
        
        // Leer respuesta con TTS
        console.log('🔊 Leyendo respuesta de AL-E...');
        tts.speak(response, {
          onEnd: () => {
            console.log('✅ Respuesta leída completamente');
          },
          onError: (error) => {
            console.error('❌ Error al leer respuesta:', error);
            setStatus('idle');
          }
        });
      } else {
        setStatus('idle');
      }
    } catch (error) {
      console.error('❌ Error al enviar mensaje:', error);
      setStatus('idle');
    } finally {
      isProcessingRef.current = false;
    }
  }, [onMessage, language, tts]);

  // Cuando termine de escuchar, enviar automáticamente
  useEffect(() => {
    if (mode === 'voice' && !stt.isListening && stt.transcript && !isProcessingRef.current) {
      const finalText = stt.transcript.trim();
      
      if (finalText) {
        console.log(`✅ Transcripción final: "${finalText}"`);
        sendVoiceMessage(finalText);
      }
    }
  }, [stt.isListening, stt.transcript, mode, sendVoiceMessage]);

  // Detener todo (TTS + STT)
  const stopAll = useCallback(() => {
    console.log('🛑 Deteniendo todo...');
    stt.stopListening();
    tts.cancel();
    isProcessingRef.current = false;
    setStatus('idle');
  }, [stt, tts]);

  // Leer texto (para modo texto con TTS opcional)
  const speakText = useCallback((text) => {
    if (!text) return;
    
    console.log(`🔊 Leyendo texto: "${text.substring(0, 50)}..."`);
    tts.speak(text);
  }, [tts]);

  return {
    // Estado
    mode,
    status,
    lastResponse,
    
    // STT
    isListening: stt.isListening,
    transcript: stt.transcript,
    interimTranscript: stt.interimTranscript,
    sttError: stt.error,
    sttSupported: stt.isSupported,
    
    // TTS
    isSpeaking: tts.isSpeaking,
    isPaused: tts.isPaused,
    ttsError: tts.error,
    ttsSupported: tts.isSupported,
    
    // Acciones
    setMode: setVoiceMode,
    startListening,
    stopListening,
    stopAll,
    speakText,
    pauseSpeech: tts.pause,
    resumeSpeech: tts.resume,
    cancelSpeech: tts.cancel
  };
}
