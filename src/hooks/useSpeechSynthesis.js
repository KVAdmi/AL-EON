/**
 * useSpeechSynthesis - Hook para Text-to-Speech con Web SpeechSynthesis API
 * 
 * CARACTERÍSTICAS:
 * - Detección automática de idioma del texto
 * - Selección de voz preferida por idioma
 * - Control de reproducción (play, pause, cancel)
 * - Estados: idle, speaking, paused
 * - Eventos: onStart, onEnd, onError
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export function useSpeechSynthesis() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState([]);
  const [error, setError] = useState(null);
  
  const utteranceRef = useRef(null);

  // Inicializar SpeechSynthesis
  useEffect(() => {
    if ('speechSynthesis' in window) {
      setIsSupported(true);

      // Cargar voces disponibles
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
        console.log('🔊 Voces disponibles:', availableVoices.length);
      };

      loadVoices();
      
      // Chrome necesita este evento para cargar voces
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    } else {
      setIsSupported(false);
      console.warn('⚠️ SpeechSynthesis no soportado en este navegador');
    }

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Detectar idioma del texto (simple heurística)
  const detectLanguage = useCallback((text) => {
    // Palabras comunes en español
    const spanishWords = ['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'ser', 'se', 'no', 'haber', 'por', 'con', 'para', 'como', 'está', 'qué', 'sí', 'cómo'];
    
    // Palabras comunes en inglés
    const englishWords = ['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this'];

    const words = text.toLowerCase().split(/\s+/);
    
    let spanishScore = 0;
    let englishScore = 0;

    words.forEach(word => {
      if (spanishWords.includes(word)) spanishScore++;
      if (englishWords.includes(word)) englishScore++;
    });

    // Si tiene acentos españoles, probablemente es español
    if (/[áéíóúñ¿¡]/i.test(text)) {
      spanishScore += 3;
    }

    if (spanishScore > englishScore) return 'es';
    if (englishScore > spanishScore) return 'en';
    return 'es'; // Default español
  }, []);

  // Seleccionar mejor voz para el idioma
  const selectVoice = useCallback((language) => {
    if (voices.length === 0) return null;

    // PRIORIDAD 1: Voz femenina mexicana para español
    if (language === 'es') {
      // Buscar específicamente voces femeninas mexicanas
      const femaleVoices = voices.filter(v => 
        v.lang.includes('es-MX') && 
        (v.name.toLowerCase().includes('female') || 
         v.name.toLowerCase().includes('mujer') ||
         v.name.toLowerCase().includes('paulina') ||
         v.name.toLowerCase().includes('mónica') ||
         v.name.toLowerCase().includes('angelica'))
      );
      
      if (femaleVoices.length > 0) {
        console.log(`🎙️ Voz femenina mexicana seleccionada: ${femaleVoices[0].name} (${femaleVoices[0].lang})`);
        return femaleVoices[0];
      }
      
      // PRIORIDAD 2: Cualquier voz mexicana
      const mexicanVoice = voices.find(v => v.lang.includes('es-MX'));
      if (mexicanVoice) {
        console.log(`🎙️ Voz mexicana seleccionada: ${mexicanVoice.name} (${mexicanVoice.lang})`);
        return mexicanVoice;
      }
      
      // PRIORIDAD 3: Voz española
      const spanishVoice = voices.find(v => v.lang.startsWith('es'));
      if (spanishVoice) {
        console.log(`🎙️ Voz española seleccionada: ${spanishVoice.name} (${spanishVoice.lang})`);
        return spanishVoice;
      }
    }

    // Preferencias para otros idiomas
    const preferences = {
      'en': ['en-US', 'en-GB', 'en-', 'en']
    };

    const patterns = preferences[language] || ['es-MX', 'es-', 'es'];

    // Buscar voz que coincida con las preferencias
    for (const pattern of patterns) {
      const voice = voices.find(v => v.lang.startsWith(pattern));
      if (voice) {
        console.log(`🎙️ Voz seleccionada: ${voice.name} (${voice.lang})`);
        return voice;
      }
    }

    // Fallback: primera voz disponible
    console.log(`🎙️ Voz fallback: ${voices[0].name} (${voices[0].lang})`);
    return voices[0];
  }, [voices]);

  // Hablar texto
  const speak = useCallback((text, options = {}) => {
    if (!isSupported) {
      setError('La síntesis de voz no está disponible en este navegador.');
      return;
    }

    if (!text || text.trim() === '') {
      console.warn('⚠️ Texto vacío, no hay nada que decir');
      return;
    }

    // Cancelar cualquier reproducción previa
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Detectar idioma si no se especifica
    const language = options.language || detectLanguage(text);
    const voice = selectVoice(language);
    
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = language === 'es' ? 'es-MX' : 'en-US';
    }

    // Configuración
    utterance.rate = options.rate || 1.0;
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 1.0;

    // Eventos
    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
      setError(null);
      console.log('🔊 Comenzando a hablar...');
      options.onStart?.();
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      console.log('🔊 Finalizó de hablar');
      options.onEnd?.();
    };

    utterance.onerror = (event) => {
      console.error('❌ Error en síntesis de voz:', event.error);
      setError(`Error de voz: ${event.error}`);
      setIsSpeaking(false);
      setIsPaused(false);
      options.onError?.(event);
    };

    utterance.onpause = () => {
      setIsPaused(true);
      console.log('⏸️ Voz pausada');
    };

    utterance.onresume = () => {
      setIsPaused(false);
      console.log('▶️ Voz reanudada');
    };

    utteranceRef.current = utterance;
    
    try {
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('❌ Error al iniciar síntesis:', err);
      setError('No se pudo iniciar la síntesis de voz.');
    }
  }, [isSupported, detectLanguage, selectVoice]);

  // Pausar
  const pause = useCallback(() => {
    if (isSpeaking && !isPaused) {
      window.speechSynthesis.pause();
    }
  }, [isSpeaking, isPaused]);

  // Reanudar
  const resume = useCallback(() => {
    if (isSpeaking && isPaused) {
      window.speechSynthesis.resume();
    }
  }, [isSpeaking, isPaused]);

  // Cancelar/Detener
  const cancel = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  }, []);

  return {
    isSupported,
    isSpeaking,
    isPaused,
    voices,
    error,
    speak,
    pause,
    resume,
    cancel
  };
}
