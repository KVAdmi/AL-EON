/**
 * useSpeechRecognition - Hook para Speech-to-Text con Web Speech API
 * 
 * CARACTERÍSTICAS:
 * - Soporte para español mexicano (es-MX) como default
 * - Reconocimiento continuo o single-shot
 * - Transcripción interim y final
 * - Manejo de errores y fallbacks
 * - Estados: idle, listening, processing, error
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export function useSpeechRecognition({
  language = 'es-MX',
  continuous = false,
  interimResults = true
} = {}) {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');

  // Inicializar Web Speech API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      const recognition = new SpeechRecognition();
      
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.lang = language;
      recognition.maxAlternatives = 1;

      // Evento: resultado de reconocimiento
      recognition.onresult = (event) => {
        let interimText = '';
        let finalText = finalTranscriptRef.current;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPiece = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            finalText += transcriptPiece + ' ';
          } else {
            interimText += transcriptPiece;
          }
        }

        finalTranscriptRef.current = finalText;
        setTranscript(finalText.trim());
        setInterimTranscript(interimText);
      };

      // Evento: inicio
      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
        console.log('🎤 Reconocimiento de voz iniciado');
      };

      // Evento: fin
      recognition.onend = () => {
        setIsListening(false);
        console.log('🎤 Reconocimiento de voz detenido');
      };

      // Evento: error
      recognition.onerror = (event) => {
        console.error('❌ Error de reconocimiento de voz:', event.error);
        
        const errorMessages = {
          'no-speech': 'No se detectó voz. Intenta hablar más cerca del micrófono.',
          'audio-capture': 'No se pudo acceder al micrófono. Verifica los permisos.',
          'not-allowed': 'Acceso al micrófono denegado. Activa los permisos en tu navegador.',
          'network': 'Error de red. Verifica tu conexión a internet.',
          'aborted': 'Reconocimiento de voz cancelado.',
          'service-not-allowed': 'Servicio de reconocimiento no disponible.',
        };

        setError(errorMessages[event.error] || `Error: ${event.error}`);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      setIsSupported(false);
      console.warn('⚠️ Web Speech API no soportada en este navegador');
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore
        }
      }
    };
  }, [language, continuous, interimResults]);

  // Iniciar reconocimiento
  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('El reconocimiento de voz no está disponible en este navegador.');
      return;
    }

    if (isListening) {
      console.warn('⚠️ Ya está escuchando');
      return;
    }

    try {
      finalTranscriptRef.current = '';
      setTranscript('');
      setInterimTranscript('');
      setError(null);
      recognitionRef.current?.start();
    } catch (err) {
      console.error('❌ Error al iniciar reconocimiento:', err);
      setError('No se pudo iniciar el reconocimiento de voz.');
    }
  }, [isSupported, isListening]);

  // Detener reconocimiento
  const stopListening = useCallback(() => {
    if (!isListening) return;

    try {
      recognitionRef.current?.stop();
    } catch (err) {
      console.error('❌ Error al detener reconocimiento:', err);
    }
  }, [isListening]);

  // Reiniciar (limpiar transcripción)
  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript
  };
}
