/**
 * tts.js
 * Text-to-Speech usando Web Speech API (navegador)
 * Core entrega speak_text, Frontend lo habla
 */

/**
 * Habla un texto usando Web Speech API
 * @param {string} text - Texto a hablar
 * @param {Object} options - Opciones de TTS
 * @param {string} options.lang - Idioma (default: 'es-MX')
 * @param {string} options.voiceName - Nombre de voz específica (opcional)
 * @param {string} options.gender - 'male' | 'female' (fallback)
 * @returns {Promise<void>}
 */
export function speak(text, options = {}) {
  return new Promise((resolve, reject) => {
    if (!window.speechSynthesis) {
      console.error('[TTS] Web Speech API no disponible');
      reject(new Error('Web Speech API no disponible en este navegador'));
      return;
    }

    if (!text || text.trim() === '') {
      console.warn('[TTS] Texto vacío, no hay nada que hablar');
      resolve();
      return;
    }

    // Cancelar cualquier habla en curso
    window.speechSynthesis.cancel();

    const {
      lang = 'es-MX',
      voiceName = null,
      gender = 'female',
    } = options;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;

    // Seleccionar voz
    const voices = window.speechSynthesis.getVoices();
    
    let selectedVoice = null;

    // 1. Intentar usar voz específica si se proporciona
    if (voiceName) {
      selectedVoice = voices.find(v => v.name === voiceName);
      if (selectedVoice) {
        console.log('[TTS] Usando voz específica:', selectedVoice.name);
      }
    }

    // 2. Si no, buscar voz mexicana del género solicitado
    if (!selectedVoice) {
      const mexicanVoices = voices.filter(v => 
        v.lang === 'es-MX' || 
        v.name.toLowerCase().includes('mexico') ||
        v.name.toLowerCase().includes('mexican')
      );

      if (gender === 'female') {
        selectedVoice = mexicanVoices.find(v => 
          v.name.toLowerCase().includes('female') ||
          v.name.toLowerCase().includes('mujer') ||
          v.name.toLowerCase().includes('paulina') ||
          v.name.toLowerCase().includes('monica')
        );
      } else {
        selectedVoice = mexicanVoices.find(v => 
          v.name.toLowerCase().includes('male') ||
          v.name.toLowerCase().includes('hombre') ||
          v.name.toLowerCase().includes('diego') ||
          v.name.toLowerCase().includes('jorge')
        );
      }

      if (selectedVoice) {
        console.log('[TTS] Usando voz mexicana:', selectedVoice.name);
      }
    }

    // 3. Fallback: cualquier voz en español
    if (!selectedVoice) {
      selectedVoice = voices.find(v => v.lang.startsWith('es'));
      if (selectedVoice) {
        console.log('[TTS] Fallback a voz en español:', selectedVoice.name);
      }
    }

    // 4. Último fallback: voz por defecto del navegador
    if (!selectedVoice && voices.length > 0) {
      selectedVoice = voices[0];
      console.log('[TTS] Usando voz por defecto:', selectedVoice.name);
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onend = () => {
      console.log('[TTS] ✅ Finalizado');
      resolve();
    };

    utterance.onerror = (event) => {
      console.error('[TTS] ❌ Error:', event.error);
      reject(new Error(`Error de TTS: ${event.error}`));
    };

    window.speechSynthesis.speak(utterance);
    console.log('[TTS] 🔊 Hablando:', text.substring(0, 50) + '...');
  });
}

/**
 * Detiene cualquier habla en curso
 */
export function stopSpeaking() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    console.log('[TTS] ⏹️ Detenido');
  }
}

/**
 * Verifica si TTS está disponible en el navegador
 * @returns {boolean}
 */
export function isTTSAvailable() {
  return typeof window !== 'undefined' && !!window.speechSynthesis;
}

/**
 * Obtiene lista de voces disponibles
 * @returns {Promise<SpeechSynthesisVoice[]>}
 */
export function getAvailableVoices() {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      resolve([]);
      return;
    }

    let voices = window.speechSynthesis.getVoices();

    if (voices.length > 0) {
      resolve(voices);
      return;
    }

    // Esperar evento voiceschanged (Safari)
    const handler = () => {
      voices = window.speechSynthesis.getVoices();
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
      resolve(voices);
    };

    window.speechSynthesis.addEventListener('voiceschanged', handler);

    // Timeout de 2 segundos
    setTimeout(() => {
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
      resolve(window.speechSynthesis.getVoices());
    }, 2000);
  });
}
