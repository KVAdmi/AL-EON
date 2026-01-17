import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import MessageThread from '@/features/chat/components/MessageThread';
import MessageComposer from '@/features/chat/components/MessageComposer';
import Sidebar from '@/features/chat/components/Sidebar';
import { useConversations } from '@/features/chat/hooks/useConversations';
import { useChat } from '@/features/chat/hooks/useChat';
import { useVoiceMode } from '@/hooks/useVoiceMode';
import { useAuth } from '@/contexts/AuthContext';
import { useCapability } from '@/components/CapabilitiesGate';
import { useEventNotifications } from '@/hooks/useEventNotifications';
import ErrorBoundary from '@/components/ErrorBoundary';
import { supabase } from '@/lib/supabase';

function ChatPage() {
  const { user, userProfile, accessToken, logout } = useAuth();
  const [searchParams] = useSearchParams();
  const [handsFree, setHandsFree] = useState(false);
  
  // 🎤 Detectar si se activó modo voz desde URL
  const voiceModeFromURL = searchParams.get('mode') === 'voice';
  
  // 🔔 Sistema de notificaciones de eventos
  useEventNotifications(user?.id);
  
  // 🔍 DEBUG: Ver qué datos tenemos del perfil
  console.log('🔍 [ChatPage] userProfile:', userProfile);
  console.log('🔍 [ChatPage] assistant_avatar_url:', userProfile?.assistant_avatar_url);
  console.log('🔍 [ChatPage] assistant_name:', userProfile?.assistant_name);
  
  // �🔒 VERIFICAR SI VOZ ESTÁ HABILITADA
  const canUseVoice = useCapability('voice');
  
  // ✅ Sidebar cerrado por default en móvil, abierto en desktop
  const [showSidebar, setShowSidebar] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768; // md breakpoint
    }
    return false;
  });
  
  const {
    conversations,
    currentConversationId,
    currentConversation,
    setCurrentConversationId,
    createConversation,
    updateConversation,
    deleteConversation,
    addMessage
  } = useConversations();

  const { sendMessage, stopResponse, isLoading, isUploading } = useChat({
    currentConversation,
    addMessage,
    updateConversation, // ✅ Pasar updateConversation para guardar sessionId
    accessToken,
    userId: user?.id // ✅ Pasar userId para subir archivos
  });

  // 🔒 Sistema de voz - SIEMPRE ejecutar hook (no condicional)
  const [voiceError, setVoiceError] = useState(null); // 🔥 NUEVO: Estado para error de voz
  
  // 🔊 Cargar settings de voz desde DB (para ttsGender)
  const [userSettings, setUserSettings] = useState({ tts_gender: 'female' });
  
  useEffect(() => {
    async function loadVoiceSettings() {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('tts_gender')
          .eq('user_id', user.id)
          .single();
        
        if (error) {
          console.warn('[Voice Settings] No se pudieron cargar settings:', error.message);
          return;
        }
        
        if (data?.tts_gender) {
          setUserSettings(prev => ({ ...prev, tts_gender: data.tts_gender }));
          console.log('[Voice Settings] Género TTS cargado:', data.tts_gender);
        }
      } catch (err) {
        console.error('[Voice Settings] Error cargando settings:', err);
      }
    }
    
    loadVoiceSettings();
  }, [user?.id]);
  
  const voiceMode = useVoiceMode({
    accessToken,                    // ✅ JWT token de Supabase (REQUERIDO)
    sessionId: currentConversation?.session_id || currentConversation?.id, // ✅ ID de sesión (REQUERIDO)
    workspaceId: 'core',           // ✅ Workspace ID
    enabled: canUseVoice,          // ✅ Flag para activar/desactivar
    ttsGender: userSettings?.tts_gender || 'female', // 🔥 GÉNERO DE VOZ DESDE SETTINGS
    onResponse: (responseText) => { // ✅ Callback correcto - respuesta de AL-E
      console.log('✅ [Voice] Respuesta de AL-E:', responseText.substring(0, 100));
      setVoiceError(null); // 🔥 Limpiar error cuando hay respuesta exitosa
      // El mensaje ya se agregó al conversation por el backend
      // Aquí solo actualizamos UI si es necesario
    },
    onError: (error) => {           // 🔥 MEJORADO: Guardar error en estado
      console.error('❌ [Voice] Error:', error);
      setVoiceError(error); // 🔥 Mostrar error en UI en vez de alert
    },
    handsFreeEnabled: handsFree     // ✅ Modo manos libres
  });

  // 🎤 Activar modo voz automáticamente si viene desde URL
  useEffect(() => {
    if (voiceModeFromURL && voiceMode && voiceMode.mode !== 'voice') {
      console.log('🎤 Activando modo voz desde URL...');
      voiceMode.setMode('voice');
    }
  }, [voiceModeFromURL, voiceMode]);

  const handleNewConversation = (projectId = null) => {
    createConversation(projectId);
  };

  const handleSelectConversation = (id) => {
    setCurrentConversationId(id);
  };

  const handleSendMessage = async (content, attachments) => {
    if (!currentConversation) {
      createConversation();
    }
    await sendMessage(content, attachments);
  };

  const handleToggleHandsFree = () => {
    setHandsFree(!handsFree);
  };

  const handleStopResponse = () => {
    stopResponse(); // ✅ Llamar a la función del hook
  };

  const handleRegenerateResponse = async () => {
    if (!currentConversation || currentConversation.messages.length < 2) return;
    
    // Eliminar último mensaje del asistente
    const messagesWithoutLast = currentConversation.messages.slice(0, -1);
    updateConversation(currentConversation.id, {
      messages: messagesWithoutLast
    });
    
    // Reenviar el último mensaje del usuario
    const lastUserMessage = messagesWithoutLast[messagesWithoutLast.length - 1];
    if (lastUserMessage && lastUserMessage.role === 'user') {
      await sendMessage(lastUserMessage.content, lastUserMessage.attachments || []);
    }
  };

  return (
    <div className="h-full flex overflow-hidden" style={{ backgroundColor: 'var(--color-bg-primary)', width: '100vw', maxWidth: '100vw' }}>
      {/* SIDEBAR REDISEÑADO - Desktop siempre visible, Mobile overlay */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
        md:relative md:transform-none
        ${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <Sidebar
          conversations={conversations}
          currentConversationId={currentConversationId}
          onNewConversation={handleNewConversation}
          onSelectConversation={handleSelectConversation}
          onUpdateConversation={updateConversation}
          onDeleteConversation={deleteConversation}
          isOpen={showSidebar}
          currentUser={userProfile?.display_name || user?.email}
          onLogout={logout}
        />
      </div>

      {/* Overlay oscuro en mobile cuando sidebar está abierto */}
      {showSidebar && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* ÁREA DE CHAT */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ width: '100%', maxWidth: '100%' }}>
        <ErrorBoundary>
          <MessageThread
            conversation={currentConversation}
            isLoading={isLoading}
            voiceMode={voiceMode}
            voiceError={voiceError} // 🔥 NUEVO: Pasar error de voz
            handsFree={handsFree}
            onToggleHandsFree={handleToggleHandsFree}
            onToggleSidebar={() => setShowSidebar(!showSidebar)}
            onStopResponse={handleStopResponse}
            onRegenerateResponse={handleRegenerateResponse}
            currentUser={userProfile?.display_name || user?.email || 'Usuario'}
            assistantName={userProfile?.assistant_name || 'Luma'}
            assistantAvatar={userProfile?.assistant_avatar_url}
            userAvatar={userProfile?.user_avatar_url}
          />
        </ErrorBoundary>
        <MessageComposer
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          isUploading={isUploading}
          disabled={voiceMode?.mode === 'voice'}
        />
      </div>
    </div>
  );
}

export default ChatPage;
