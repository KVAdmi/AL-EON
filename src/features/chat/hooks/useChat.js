import { useState, useRef, useEffect } from 'react';
import { sendToAleCore, extractReply } from '@/lib/aleCoreClient';
import { generateId } from '@/lib/utils';
import { uploadFiles } from '@/lib/fileUpload';

export function useChat({ currentConversation, addMessage, updateConversation, accessToken, userId }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false); // ✅ NUEVO: estado de upload
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null); // ✅ Para cancelar requests

  // ✅ SOLUCIÓN 2: Limpiar requests al desmontar componente
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        console.log('🛑 useChat: Aborting request on unmount');
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const sendMessage = async (content, attachments = [], voiceMeta = null) => {
    if (!currentConversation || !content.trim()) {
      return;
    }

    if (!accessToken) {
      throw new Error('No hay sesión activa');
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Subir archivos si existen
      let uploadedFiles = [];
      if (attachments && attachments.length > 0) {
        setIsUploading(true);
        console.log('📤 Subiendo archivos:', attachments.map(f => f.name));
        uploadedFiles = await uploadFiles(attachments, userId);
        console.log('✅ Archivos subidos:', uploadedFiles);
        setIsUploading(false);
      }

      // 2. Add user message con archivos
      const userMessage = {
        id: generateId(),
        role: 'user',
        content: content.trim(),
        attachments: uploadedFiles.map(f => ({
          bucket: f.bucket,
          path: f.path,
          name: f.name,
          url: f.url,
          type: f.type,
          size: f.size
        })),
        timestamp: Date.now()
      };

      addMessage(currentConversation.id, userMessage);

      console.log('📤 Enviando a AL-E Core - SOLO mensaje actual');

      // ✅ Crear AbortController para poder cancelar
      abortControllerRef.current = new AbortController();
      
      // ✅ P1: Timeout de 60 segundos con mensaje claro
      const timeoutId = setTimeout(() => {
        if (abortControllerRef.current) {
          console.warn('⏰ Timeout de 60s alcanzado, cancelando request...');
          abortControllerRef.current.abort();
        }
      }, 60000);

      // ✅ WORKSPACE_ID obligatorio
      const workspaceId = import.meta.env.VITE_WORKSPACE_ID || "core";

      // ✅ SessionId persistente
      const storedSessionId = localStorage.getItem(`sessionId:${currentConversation.id}`);
      const finalSessionId = currentConversation.sessionId || storedSessionId || null;
      
      if (finalSessionId) {
        console.log('🔄 Usando sessionId persistente:', finalSessionId);
      }

      // ✅ P0: ENVIAR SOLO EL MENSAJE ACTUAL, SIN HISTORIAL
      const response = await sendToAleCore({
        accessToken, // JWT de Supabase
        message: content.trim(), // ✅ SOLO mensaje actual
        sessionId: finalSessionId,
        workspaceId,
        meta: {
          platform: "AL-EON",
          version: "1.0.0",
          source: "al-eon-console",
          timestamp: new Date().toISOString(),
          ...(voiceMeta && {
            inputMode: voiceMeta.inputMode || 'text',
            localeHint: voiceMeta.localeHint || 'es-MX',
            handsFree: voiceMeta.handsFree || false
          })
        },
        files: uploadedFiles,
        signal: abortControllerRef.current.signal
      });

      clearTimeout(timeoutId);

      // ✅ Guardar session_id
      if (response.session_id && !currentConversation.sessionId) {
        console.log('💾 Guardando session_id del backend:', response.session_id);
        updateConversation(currentConversation.id, {
          sessionId: response.session_id
        });
        localStorage.setItem(`sessionId:${currentConversation.id}`, response.session_id);
      }

      // Extract reply text
      const replyText = extractReply(response);
      
      if (!replyText || typeof replyText !== 'string') {
        console.error('❌ Respuesta inválida del asistente');
        throw new Error('Respuesta inválida del asistente');
      }

      // Add AL-E response
      const assistantMessage = {
        id: generateId(),
        role: 'assistant',
        content: replyText,
        timestamp: Date.now()
      };

      addMessage(currentConversation.id, assistantMessage);

      return replyText;
    } catch (err) {
      console.error('❌ Error enviando mensaje:', err);
      setError(err.message);
      
      // ✅ P0: DETECTAR ERRORES DE OAUTH DEL BACKEND
      let errorContent = `Error: ${err.message}`;
      
      // Detectar error de timeout/abort
      if (err.name === 'AbortError' || err.message.includes('Request cancelado') || err.message.includes('aborted')) {
        errorContent = '⏱️ **La solicitud tardó demasiado y fue cancelada**.\n\nEsto puede ocurrir cuando:\n- AL-E está procesando tareas complejas (enviar emails, consultar calendario)\n- Hay problemas de conexión\n\n**Sugerencia**: Intenta de nuevo o simplifica tu solicitud.';
      } else {
        // Intentar parsear si el error viene del backend en JSON
        try {
          const errorMsg = err.message.toLowerCase();
          
          if (errorMsg.includes('oauth_not_connected') || errorMsg.includes('oauth not connected')) {
            errorContent = '🔗 Gmail/Calendar no está conectado.\n\nVe a Configuración > Integraciones para conectar tu cuenta de Google.';
          } else if (errorMsg.includes('oauth_tokens_missing') || errorMsg.includes('tokens missing') || errorMsg.includes('token inválido')) {
            errorContent = '⚠️ Gmail/Calendar está conectado pero los tokens están incompletos o expirados.\n\n**Solución**: Ve a Configuración > Integraciones, desconecta Gmail/Calendar y vuelve a conectarlo.';
          } else if (errorMsg.includes('oauth_token_expired') || errorMsg.includes('token expired')) {
            errorContent = '⏰ Los tokens de Gmail/Calendar expiraron.\n\nVe a Configuración > Integraciones, desconecta y vuelve a conectar tu cuenta.';
          } else if (errorMsg.includes('gmail') || errorMsg.includes('calendar') || errorMsg.includes('google')) {
            errorContent = `❌ Error de integración Google: ${err.message}\n\nIntenta desconectar y volver a conectar Gmail/Calendar en Configuración.`;
          } else if (errorMsg.includes('failed to fetch') || errorMsg.includes('network')) {
            errorContent = '🌐 **Error de conexión**.\n\nNo se pudo conectar con AL-E Core. Verifica tu conexión a internet e intenta de nuevo.';
          } else {
            errorContent = `❌ Error: ${err.message}.\n\nAL-E no pudo responder. Intenta de nuevo.`;
          }
        } catch (parseError) {
          // Si falla el parseo, usar mensaje genérico
          errorContent = `❌ Error: ${err.message}.\n\nAL-E no pudo responder.`;
        }
      }
      
      const errorMessage = {
        id: generateId(),
        role: 'assistant',
        content: errorContent,
        timestamp: Date.now(),
        isError: true
      };

      addMessage(currentConversation.id, errorMessage);
      
      return null;
    } finally {
      setIsLoading(false);
      setIsUploading(false);
      abortControllerRef.current = null;
    }
  };

  const stopResponse = () => {
    if (abortControllerRef.current) {
      console.log('🛑 Cancelando request...');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setIsUploading(false); // ✅ NUEVO: Limpiar estado de upload también
    }
  };

  return {
    sendMessage,
    stopResponse, // ✅ Nueva función para detener
    isLoading,
    isUploading, // ✅ NUEVO: Exportar estado de upload
    error
  };
}
