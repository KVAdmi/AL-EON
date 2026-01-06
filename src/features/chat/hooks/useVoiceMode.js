/**
 * useVoiceMode.js
 * Hook para manejo de modo de voz con Web Speech API
 */

import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/ui/use-toast';

export function useVoiceMode() {
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Verificar soporte del navegador
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      
      // Crear instancia de reconocimiento
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'es-ES';
      
      recognition.onstart = () => {
        console.log('🎤 Reconocimiento de voz iniciado');
        setIsListening(true);
      };
      
      recognition.onend = () => {
        console.log('🎤 Reconocimiento de voz detenido');
        setIsListening(false);
      };
      
      recognition.onerror = (event) => {
        console.error('❌ Error en reconocimiento de voz:', event.error);
        setIsListening(false);
        
        let errorMessage = 'Error en reconocimiento de voz';
        
        switch (event.error) {
          case 'not-allowed':
            errorMessage = 'Permiso de micrófono denegado. Por favor permite el acceso en la configuración del navegador.';
            break;
          case 'no-speech':
            errorMessage = 'No se detectó voz. Intenta hablar más cerca del micrófono.';
            break;
          case 'audio-capture':
            errorMessage = 'No se pudo capturar audio. Verifica que tu micrófono esté conectado.';
            break;
          case 'network':
            errorMessage = 'Error de red. Verifica tu conexión a internet.';
            break;
        }
        
        toast({
          variant: 'destructive',
          title: 'Error de voz',
          description: errorMessage,
        });
      };
      
      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
        if (finalTranscript) {
          setTranscript(prev => prev + finalTranscript);
        }
      };
      
      recognitionRef.current = recognition;
    } else {
      setIsSupported(false);
      console.warn('⚠️ Web Speech API no soportada en este navegador');
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startListening = async () => {
    if (!isSupported) {
      toast({
        variant: 'destructive',
        title: 'No soportado',
        description: 'Tu navegador no soporta reconocimiento de voz. Usa Chrome, Edge o Safari.',
      });
      return;
    }

    try {
      // Solicitar permiso del micrófono explícitamente
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Detener el stream inmediatamente (solo queríamos el permiso)
      stream.getTracks().forEach(track => track.stop());
      
      // Iniciar reconocimiento
      if (recognitionRef.current) {
        setTranscript(''); // Limpiar transcript anterior
        recognitionRef.current.start();
        
        toast({
          title: '🎤 Modo voz activado',
          description: 'Habla claramente cerca del micrófono',
        });
      }
    } catch (error) {
      console.error('Error solicitando permiso de micrófono:', error);
      
      let errorMessage = 'No se pudo acceder al micrófono';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Permiso denegado. Por favor permite el acceso al micrófono en la configuración de tu navegador.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No se encontró ningún micrófono. Verifica que esté conectado.';
      }
      
      toast({
        variant: 'destructive',
        title: 'Error de micrófono',
        description: errorMessage,
      });
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      
      toast({
        title: 'Modo voz desactivado',
        description: 'Volviendo a modo texto',
      });
    }
  };

  const clearTranscript = () => {
    setTranscript('');
  };

  return {
    isListening,
    transcript,
    isSupported,
    startListening,
    stopListening,
    clearTranscript
  };
}
