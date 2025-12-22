
const STORAGE_KEYS = {
  CONVERSATIONS: 'ale_conversations',
  CURRENT_CONVERSATION: 'ale_current_conversation',
  USER_ID: 'ale_user_id',
  WORKSPACE_ID: 'ale_workspace_id'
};

export const storage = {
  getConversations() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading conversations:', error);
      return [];
    }
  },

  saveConversations(conversations) {
    try {
      localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
    } catch (error) {
      console.error('Error saving conversations:', error);
    }
  },

  getCurrentConversationId() {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_CONVERSATION);
  },

  setCurrentConversationId(id) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_CONVERSATION, id);
  },

  getUserId() {
    let userId = localStorage.getItem(STORAGE_KEYS.USER_ID);
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(STORAGE_KEYS.USER_ID, userId);
    }
    return userId;
  },

  getWorkspaceId() {
    let workspaceId = localStorage.getItem(STORAGE_KEYS.WORKSPACE_ID);
    if (!workspaceId) {
      workspaceId = `workspace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(STORAGE_KEYS.WORKSPACE_ID, workspaceId);
    }
    return workspaceId;
  },

  /**
   * MIGRACIÓN: Limpia mensajes que tengan JSON en content
   * Extrae solo el campo "answer" si el content es un objeto
   * 
   * REGLA AL-E: El usuario NUNCA debe ver JSON en el chat
   */
  cleanMessagesFromJSON() {
    try {
      const conversations = this.getConversations();
      let cleaned = false;

      const cleanedConversations = conversations.map(conv => {
        const cleanedMessages = conv.messages.map(msg => {
          // Si el content es un objeto (JSON), extraer solo "answer"
          if (typeof msg.content === 'object' && msg.content !== null) {
            console.warn('🧹 Limpiando mensaje con JSON:', msg.id);
            
            // Extraer answer
            const textContent = msg.content.answer || 
                               msg.content.message || 
                               msg.content.text ||
                               JSON.stringify(msg.content);
            
            cleaned = true;
            return {
              ...msg,
              content: textContent // ✅ Solo texto
            };
          }
          
          return msg;
        });

        return {
          ...conv,
          messages: cleanedMessages
        };
      });

      if (cleaned) {
        console.log('✅ Mensajes limpiados - JSON eliminado del chat');
        this.saveConversations(cleanedConversations);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error limpiando mensajes:', error);
      return false;
    }
  }
};
