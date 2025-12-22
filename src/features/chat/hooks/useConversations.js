
import { useState, useEffect } from 'react';
import { storage } from '@/lib/storage';
import { generateId, generateTitle } from '@/lib/utils';

export function useConversations() {
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);

  // Load conversations from localStorage on mount
  useEffect(() => {
    // 🧹 MIGRACIÓN: Limpiar cualquier JSON que se haya guardado por error
    storage.cleanMessagesFromJSON();
    
    const savedConversations = storage.getConversations();
    setConversations(savedConversations);
    
    const savedCurrentId = storage.getCurrentConversationId();
    if (savedCurrentId && savedConversations.find(c => c.id === savedCurrentId)) {
      setCurrentConversationId(savedCurrentId);
    } else if (savedConversations.length > 0) {
      setCurrentConversationId(savedConversations[0].id);
    }
  }, []);

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    if (conversations.length > 0) {
      storage.saveConversations(conversations);
    }
  }, [conversations]);

  // Save current conversation ID
  useEffect(() => {
    if (currentConversationId) {
      storage.setCurrentConversationId(currentConversationId);
    }
  }, [currentConversationId]);

  const createConversation = () => {
    const newConversation = {
      id: generateId(),
      title: 'New conversation',
      messages: [],
      sessionId: null, // ✅ NUEVO: Guardará el session_id del backend
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    setConversations(prev => [newConversation, ...prev]);
    setCurrentConversationId(newConversation.id);
    
    return newConversation;
  };

  const updateConversation = (id, updates) => {
    setConversations(prev => prev.map(conv => 
      conv.id === id 
        ? { ...conv, ...updates, updatedAt: Date.now() }
        : conv
    ));
  };

  const deleteConversation = (id) => {
    setConversations(prev => {
      const filtered = prev.filter(conv => conv.id !== id);
      
      // If we're deleting the current conversation, switch to another one
      if (id === currentConversationId) {
        if (filtered.length > 0) {
          setCurrentConversationId(filtered[0].id);
        } else {
          setCurrentConversationId(null);
        }
      }
      
      return filtered;
    });
  };

  const addMessage = (conversationId, message) => {
    setConversations(prev => prev.map(conv => {
      if (conv.id === conversationId) {
        const newMessages = [...conv.messages, message];
        const title = conv.messages.length === 0 ? generateTitle(message.content) : conv.title;
        
        return {
          ...conv,
          messages: newMessages,
          title,
          updatedAt: Date.now()
        };
      }
      return conv;
    }));
  };

  const getCurrentConversation = () => {
    return conversations.find(c => c.id === currentConversationId);
  };

  return {
    conversations,
    currentConversationId,
    currentConversation: getCurrentConversation(),
    setCurrentConversationId,
    createConversation,
    updateConversation,
    deleteConversation,
    addMessage
  };
}
