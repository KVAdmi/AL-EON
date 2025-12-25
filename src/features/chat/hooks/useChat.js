import { useState, useRef } from 'react';
import { sendToAleCore, extractReply } from '@/lib/aleCoreClient';
import { generateId } from '@/lib/utils';
import { uploadFiles } from '@/lib/fileUpload';

export function useChat({ currentConversation, addMessage, updateConversation, accessToken, userId }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false); // ✅ NUEVO: estado de upload
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null); // ✅ Para cancelar requests

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
        setIsUploading(true); // ✅ NUEVO: Mostrar "Procesando documentos..."
        console.log('📤 Subiendo archivos:', attachments.map(f => f.name));
        uploadedFiles = await uploadFiles(attachments, userId);
        console.log('✅ Archivos subidos:', uploadedFiles);
        setIsUploading(false); // ✅ Upload completado
      }

      // 2. Add user message con archivos
      const userMessage = {
        id: generateId(),
        role: 'user',
        content: content.trim(),
        attachments: uploadedFiles.map(f => ({
          bucket: f.bucket,  // ✅ AL-E Core necesita bucket
          path: f.path,      // ✅ AL-E Core necesita path
          name: f.name,
          url: f.url,        // Opcional (backward compatibility)
          type: f.type,
          size: f.size
        })),
        timestamp: Date.now()
      };

      addMessage(currentConversation.id, userMessage);

      // 3. Prepare messages for AL-E Core
      const apiMessages = [
        ...currentConversation.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: 'user',
          content: content.trim()
        }
      ];

      console.log('📤 Enviando a AL-E Core:', {
        sessionId: currentConversation.sessionId || 'null (creará nueva)',
        messageCount: apiMessages.length
      });

      // ✅ Crear AbortController para poder cancelar
      abortControllerRef.current = new AbortController();

      // ✅ FORZAR workspaceId="core" para AL-E Core
      const WORKSPACE_ID = import.meta.env.VITE_WORKSPACE_ID === "core" ? "core" : "core";
      const workspaceId = WORKSPACE_ID;

      // ✅ NUEVO: sessionId persistente en localStorage (sobrevive refresh)
      const storedSessionId = localStorage.getItem(`sessionId:${currentConversation.id}`);
      const finalSessionId = currentConversation.sessionId || storedSessionId || null;
      
      if (finalSessionId) {
        console.log('🔄 Usando sessionId persistente:', finalSessionId);
      }

      // Send to AL-E Core con JWT token, sessionId y archivos
      const response = await sendToAleCore({
        accessToken, // JWT de Supabase
        messages: apiMessages,
        sessionId: finalSessionId, // ✅ sessionId desde estado O localStorage
        workspaceId, // ✅ CRÍTICO: SIEMPRE enviar workspaceId
        voiceMeta, // Pasar metadata de voz si existe
        files: uploadedFiles, // ✅ Enviar archivos subidos
        signal: abortControllerRef.current.signal // ✅ Señal para cancelar
      });

      // ✅ CRÍTICO: Guardar session_id en estado Y localStorage
      if (response.session_id && !currentConversation.sessionId) {
        console.log('💾 Guardando session_id del backend:', response.session_id);
        
        // Guardar en estado
        updateConversation(currentConversation.id, {
          sessionId: response.session_id
        });
        
        // ✅ NUEVO: Persistir en localStorage (sobrevive refresh)
        localStorage.setItem(`sessionId:${currentConversation.id}`, response.session_id);
      }

      // Extract reply text (SOLO el campo "answer")
      const replyText = extractReply(response);
      
      // VALIDACIÓN SIMPLE: Solo verificar que sea string
      if (!replyText || typeof replyText !== 'string') {
        console.error('❌ CRÍTICO: extractReply() no devolvió string:', replyText);
        throw new Error('Respuesta inválida del asistente (no es texto)');
      }
      
      console.log('✅ Texto extraído para renderizar:', replyText.substring(0, 100));

      // Add AL-E response
      const assistantMessage = {
        id: generateId(),
        role: 'assistant',
        content: replyText, // ✅ SIEMPRE texto limpio, NUNCA JSON
        timestamp: Date.now()
      };

      addMessage(currentConversation.id, assistantMessage);

      // Retornar el texto para que TTS lo pueda leer
      return replyText;
    } catch (err) {
      console.error('❌ Error enviando mensaje a AL-E Core:', err);
      setError(err.message);
      
      // Add error message
      const errorMessage = {
        id: generateId(),
        role: 'assistant',
        content: `Error: ${err.message}. AL-E no pudo responder.`,
        timestamp: Date.now(),
        isError: true
      };

      addMessage(currentConversation.id, errorMessage);
      
      return null;
    } finally {
      setIsLoading(false);
      setIsUploading(false); // ✅ NUEVO: Asegurar que se limpie el estado
      abortControllerRef.current = null; // ✅ Limpiar referencia
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
