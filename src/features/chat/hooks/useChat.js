import { useState, useRef, useEffect } from 'react';
import { sendToAleCore, extractReply, extractFullResponse } from '@/lib/aleCoreClient';
import { generateId } from '@/lib/utils';
import { uploadFiles } from '@/lib/fileUpload';
import { supabase } from '@/lib/supabase';
import { speak, stopSpeaking } from '@/utils/tts';

export function useChat({ currentConversation, addMessage, updateConversation, accessToken, userId }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false); // ✅ NUEVO: estado de upload
  const [error, setError] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [userDisplayName, setUserDisplayName] = useState(null);
  const [ttsSettings, setTtsSettings] = useState({ enabled: false, gender: 'female', voice_name: null, lang: 'es-MX' });
  const abortControllerRef = useRef(null); // ✅ Para cancelar requests

  // ✅ Obtener info del usuario + settings de TTS al montar
  useEffect(() => {
    const loadUserInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email);
        setUserDisplayName(user.user_metadata?.display_name || user.email?.split('@')[0]);

        // Cargar preferencias de TTS
        const { data: settings } = await supabase
          .from('user_settings')
          .select('tts_enabled, tts_gender, tts_voice_name, tts_lang')
          .eq('user_id', user.id)
          .single();

        if (settings) {
          setTtsSettings({
            enabled: settings.tts_enabled ?? false,
            gender: settings.tts_gender || 'female',
            voice_name: settings.tts_voice_name || null,
            lang: settings.tts_lang || 'es-MX',
          });
          console.log('[TTS] Preferencias cargadas:', settings);
        }
      }
    };
    loadUserInfo();
  }, []);

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
      // 0. Obtener documentos del proyecto si existe
      let projectDocuments = [];
      if (currentConversation.project_id && userId) {
        console.log('📁 Buscando documentos del proyecto:', currentConversation.project_id);
        try {
          const projectPath = `${userId}/projects/${currentConversation.project_id}/`;
          const { data, error: docsError } = await supabase.storage
            .from('user-files')
            .list(projectPath, {
              limit: 100,
              offset: 0
            });

          if (!docsError && data && data.length > 0) {
            console.log(`✅ Encontrados ${data.length} documentos del proyecto`);
            
            // Obtener URLs públicas de los documentos
            projectDocuments = data.map(doc => {
              const { data: { publicUrl } } = supabase.storage
                .from('user-files')
                .getPublicUrl(`${projectPath}${doc.name}`);
              
              return {
                name: doc.name,
                url: publicUrl,
                size: doc.metadata?.size || 0,
                type: doc.metadata?.mimetype || 'application/octet-stream'
              };
            });

            console.log('📄 Documentos del proyecto que se enviarán:', projectDocuments.map(d => d.name));
          }
        } catch (error) {
          console.warn('⚠️ Error obteniendo documentos del proyecto:', error);
        }
      }

      // 1. Subir archivos adjuntos si existen
      let uploadedFiles = [];
      if (attachments && attachments.length > 0) {
        setIsUploading(true);
        console.log('📤 Subiendo archivos adjuntos:', attachments.map(f => f.name));
        uploadedFiles = await uploadFiles(attachments, userId);
        console.log('✅ Archivos adjuntos subidos:', uploadedFiles);
        setIsUploading(false);
      }

      // Combinar documentos del proyecto + archivos adjuntos
      const allFiles = [...projectDocuments, ...uploadedFiles.map(f => ({
        name: f.name,
        url: f.url,
        type: f.type,
        size: f.size
      }))];

      console.log(`📦 Total de archivos a enviar: ${allFiles.length} (${projectDocuments.length} del proyecto + ${uploadedFiles.length} adjuntos)`);

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
        userId, // ✅ USER ID real (UUID)
        message: content.trim(), // ✅ SOLO mensaje actual
        sessionId: finalSessionId,
        workspaceId,
        projectId: currentConversation.project_id || null, // ✅ ID del proyecto para RAG
        userEmail, // ✅ COLABORACIÓN: Email del usuario que escribe
        userDisplayName, // ✅ COLABORACIÓN: Nombre para mostrar
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
        files: allFiles.length > 0 ? allFiles : undefined, // ✅ Enviar TODOS los archivos (proyecto + adjuntos)
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

      // 🔥 NUEVO: Extraer respuesta completa con metadata
      const fullResponse = extractFullResponse(response);
      
      if (!fullResponse.answer || typeof fullResponse.answer !== 'string') {
        console.error('❌ Respuesta inválida del asistente');
        throw new Error('Respuesta inválida del asistente');
      }

      // 🔥 NUEVO: Add AL-E response con metadata completa
      const assistantMessage = {
        id: generateId(),
        role: 'assistant',
        content: fullResponse.answer,
        timestamp: Date.now(),
        // Nuevos campos de metadata
        toolsUsed: fullResponse.toolsUsed,
        executionTime: fullResponse.executionTime,
        metadata: fullResponse.metadata,
        debug: fullResponse.debug
      };

      addMessage(currentConversation.id, assistantMessage);

      // ✅ TTS: Hablar respuesta si está habilitado
      if (ttsSettings.enabled && response.should_speak !== false) {
        console.log('[TTS] 🔊 Hablando respuesta del asistente...');
        
        speak(fullResponse.answer, {
          lang: ttsSettings.lang,
          voiceName: ttsSettings.voice_name,
          gender: ttsSettings.gender,
        }).catch(err => {
          console.error('[TTS] ❌ Error al hablar:', err);
        });
      }

      return fullResponse.answer;
    } catch (err) {
      console.error('❌ Error enviando mensaje:', err);
      setError(err.message);
      
      // 🚫 AL-EON NO INTERPRETA ERRORES
      // Mostrar el mensaje tal cual viene del error
      const errorMessage = {
        id: generateId(),
        role: 'assistant',
        content: err.message || 'Error desconocido',
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
    // Detener TTS si está hablando
    stopSpeaking();
    
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
