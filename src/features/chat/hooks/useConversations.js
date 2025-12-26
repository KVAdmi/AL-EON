
import { useState, useEffect } from 'react';
import { storage } from '@/lib/storage';
import { generateId, generateTitle } from '@/lib/utils';
import { deleteSession } from '@/services/sessionsService';
import {
  loadConversationsFromSupabase,
  saveConversationToSupabase,
  deleteConversationFromSupabase,
  migrateLocalStorageToSupabase,
  mergeConversations
} from '@/services/conversationsService';

export function useConversations() {
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // 🔄 SYNC: Load conversations from Supabase + localStorage on mount
  useEffect(() => {
    const initConversations = async () => {
      setIsSyncing(true);
      
      try {
        // 🧹 Limpiar JSON de localStorage
        storage.cleanMessagesFromJSON();
        
        // Cargar de localStorage
        const localConversations = storage.getConversations();
        console.log(`📱 localStorage: ${localConversations.length} conversaciones`);
        
        // Cargar de Supabase
        const supabaseConversations = await loadConversationsFromSupabase();
        
        if (supabaseConversations) {
          console.log(`☁️ Supabase: ${supabaseConversations.length} conversaciones`);
          
          // Estrategia: Last Write Wins (merge por timestamp)
          const merged = mergeConversations(localConversations, supabaseConversations);
          console.log(`✅ Merged: ${merged.length} conversaciones`);
          
          setConversations(merged);
          
          // Guardar merged en localStorage (para offline)
          storage.saveConversations(merged);
          
          // Si hay conversaciones locales que no están en Supabase, migrarlas
          if (localConversations.length > supabaseConversations.length) {
            console.log('🔄 Migrando conversaciones locales a Supabase...');
            await migrateLocalStorageToSupabase(merged);
          }
          
          // Restaurar conversación actual (USAR merged, NO conversations)
          const savedCurrentId = storage.getCurrentConversationId();
          if (savedCurrentId && merged.find(c => c.id === savedCurrentId)) {
            setCurrentConversationId(savedCurrentId);
          } else if (merged.length > 0) {
            setCurrentConversationId(merged[0].id);
          }
        } else {
          // Sin Supabase (offline o no autenticado), usar localStorage
          console.log('⚠️ Modo offline - usando solo localStorage');
          setConversations(localConversations);
          
          // Restaurar conversación actual
          const savedCurrentId = storage.getCurrentConversationId();
          if (savedCurrentId && localConversations.find(c => c.id === savedCurrentId)) {
            setCurrentConversationId(savedCurrentId);
          } else if (localConversations.length > 0) {
            setCurrentConversationId(localConversations[0].id);
          }
        }
        
      } catch (error) {
        console.error('❌ Error inicializando conversaciones:', error);
        // Fallback a localStorage
        const localConversations = storage.getConversations();
        setConversations(localConversations);
      } finally {
        setIsSyncing(false);
      }
    };
    
    initConversations();
  }, []);

  // 💾 SYNC: Save conversations to Supabase + localStorage whenever they change
  useEffect(() => {
    if (conversations.length === 0 || isSyncing) return;
    
    // Guardar en localStorage (inmediato)
    storage.saveConversations(conversations);
    
    // Guardar en Supabase (async)
    const syncToSupabase = async () => {
      for (const conv of conversations) {
        await saveConversationToSupabase(conv);
      }
    };
    
    syncToSupabase();
  }, [conversations, isSyncing]);

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

  const deleteConversation = async (id) => {
    try {
      // Delete from backend if this conversation has a sessionId
      const conversation = conversations.find(conv => conv.id === id);
      if (conversation?.sessionId) {
        await deleteSession(conversation.sessionId);
        console.log('✅ Sesión eliminada del backend:', conversation.sessionId);
      }
      
      // ☁️ Delete from Supabase
      await deleteConversationFromSupabase(id);
      
    } catch (error) {
      console.error('⚠️ Error eliminando sesión:', error);
      // Continue with local deletion even if backend fails
    }

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
