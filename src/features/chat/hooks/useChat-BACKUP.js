import { useState } from 'react';
import { sendToAleCore, extractReply } from '@/lib/aleCoreClient';
import { generateId } from '@/lib/utils';
import { uploadFiles } from '@/lib/fileUpload';

export function useChat({ currentConversation, addMessage, updateConversation, accessToken, userId }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

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
        console.log('📤 Subiendo archivos:', attachments.map(f => f.name));
        uploadedFiles = await uploadFiles(attachments, userId);
        console.log('✅ Archivos subidos:', uploadedFiles);
      }

      // 2. Add user message con archivos
      const userMessage = {
        id: generateId(),
        role: 'user',
        content: content.trim(),
        attachments: uploadedFiles.map(f => ({
          name: f.name,
          url: f.url,
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

      // Send to AL-E Core con JWT token, sessionId y archivos
      const response = await sendToAleCore({
        accessToken, // JWT de Supabase
        messages: apiMessages,
        mode: 'universal',
        workspaceId: 'al-eon',
        sessionId: currentConversation.sessionId, // ✅ Enviar sessionId si existe
        voiceMeta, // Pasar metadata de voz si existe
        files: uploadedFiles // ✅ Enviar archivos subidos
      });

      // ✅ CRÍTICO: Guardar session_id si es la primera vez
      if (response.session_id && !currentConversation.sessionId) {
        console.log('💾 Guardando session_id del backend:', response.session_id);
        updateConversation(currentConversation.id, {
          sessionId: response.session_id
        });
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
    }
  };

  return {
    sendMessage,
    isLoading,
    error
  };
}
