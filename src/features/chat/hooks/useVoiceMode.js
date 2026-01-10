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
  const shouldContinueRef = useRef(false); // Track if we want continuous listening

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
        console.log('🛑 Reconocimiento de voz terminado');
        setIsListening(false);
        
        // Si shouldContinue está activado, reiniciar automáticamente
        // Esto mantiene el reconocimiento activo incluso después de silencios
        if (shouldContinueRef.current && recognitionRef.current) {
          console.log('🔄 Reiniciando reconocimiento automáticamente');
          try {
            setTimeout(() => {
              recognitionRef.current?.start();
            }, 100); // Pequeño delay para evitar errores
          } catch (error) {
            console.error('Error al reiniciar reconocimiento:', error);
          }
        }
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
      // 🆕 VERIFICAR PERMISO ACTUAL
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
        console.log('🎤 [VoiceMode] Permiso de micrófono:', permissionStatus.state);

        if (permissionStatus.state === 'denied') {
          toast({
            variant: 'destructive',
            title: 'Permiso denegado',
            description: 'Ve a Configuración del navegador → Privacidad → Micrófono y permite el acceso a este sitio.',
            duration: 8000,
          });
          return;
        }
      } catch (permError) {
        console.warn('⚠️ No se pudo verificar permiso de micrófono:', permError);
      }

      // Solicitar permiso del micrófono explícitamente
      console.log('[VoiceMode] Solicitando acceso al micrófono...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ [VoiceMode] Micrófono accedido correctamente');
      
      // Detener el stream inmediatamente (solo queríamos el permiso)
      stream.getTracks().forEach(track => track.stop());
      
      // Activar el flag para reinicio automático
      shouldContinueRef.current = true;
      
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
      console.error('❌ [VoiceMode] Error solicitando permiso de micrófono:', error);
      
      let errorMessage = 'No se pudo acceder al micrófono';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Permiso denegado. Por favor permite el acceso al micrófono en la configuración de tu navegador.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No se encontró ningún micrófono. Verifica que esté conectado.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'El micrófono está siendo usado por otra aplicación. Cierra otras apps que puedan estar usándolo.';
      }
      
      toast({
        variant: 'destructive',
        title: 'Error de micrófono',
        description: errorMessage,
        duration: 8000,
      });
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      // Desactivar el flag para que no se reinicie automáticamente
      shouldContinueRef.current = false;
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
