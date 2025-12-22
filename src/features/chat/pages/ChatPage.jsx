import React, { useState } from 'react';
import MessageThread from '@/features/chat/components/MessageThread';
import MessageComposer from '@/features/chat/components/MessageComposer';
import Sidebar from '@/features/chat/components/Sidebar';
import { useConversations } from '@/features/chat/hooks/useConversations';
import { useChat } from '@/features/chat/hooks/useChat';
import { useVoiceMode } from '@/hooks/useVoiceMode';
import { useAuth } from '@/contexts/AuthContext';

function ChatPage() {
  const { user, accessToken, logout } = useAuth();
  const [handsFree, setHandsFree] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  
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

  const { sendMessage, stopResponse, isLoading } = useChat({
    currentConversation,
    addMessage,
    updateConversation, // ✅ Pasar updateConversation para guardar sessionId
    accessToken,
    userId: user?.id // ✅ Pasar userId para subir archivos
  });

  // Sistema de voz
  const voiceMode = useVoiceMode({
    onMessage: async (text, meta) => {
      if (!currentConversation) {
        createConversation();
      }
      const response = await sendMessage(text, null, meta);
      return response;
    },
    language: 'es-MX',
    handsFreeEnabled: handsFree
  });

  const handleNewConversation = () => {
    createConversation();
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
    <div className="h-full flex" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* SIDEBAR REDISEÑADO */}
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onNewConversation={handleNewConversation}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={deleteConversation}
        isOpen={showSidebar}
        currentUser={user?.email}
        onLogout={logout}
      />

      {/* ÁREA DE CHAT */}
      <div className="flex-1 flex flex-col">
        <MessageThread
          conversation={currentConversation}
          isLoading={isLoading}
          voiceMode={voiceMode}
          handsFree={handsFree}
          onToggleHandsFree={handleToggleHandsFree}
          onToggleSidebar={() => setShowSidebar(!showSidebar)}
          onStopResponse={handleStopResponse}
          onRegenerateResponse={handleRegenerateResponse}
        />
        <MessageComposer
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          disabled={voiceMode.mode === 'voice'}
        />
      </div>
    </div>
  );
}

export default ChatPage;
