
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
import { supabase } from '@/lib/supabase';

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

  // 🔴 REALTIME: Escuchar cambios en user_conversations
  useEffect(() => {
    let channel;

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('⚠️ No hay usuario autenticado, saltando realtime');
        return;
      }

      console.log('🔴 Iniciando listener de conversaciones en tiempo real para user:', user.id);

      channel = supabase
        .channel('conversations-changes')
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'user_conversations',
            filter: `user_id=eq.${user.id}` // Solo escuchar mis conversaciones
          },
          (payload) => {
            console.log('🗑️ Conversación eliminada detectada:', payload.old.id);
            
            // Eliminar del estado local
            setConversations(prev => {
              const updated = prev.filter(c => c.id !== payload.old.id);
              
              // Si era la conversación actual, cambiar a otra
              if (currentConversationId === payload.old.id) {
                const newCurrent = updated.length > 0 ? updated[0].id : null;
                setCurrentConversationId(newCurrent);
                storage.saveCurrentConversationId(newCurrent);
              }
              
              // Actualizar localStorage
              storage.saveConversations(updated);
              
              return updated;
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_conversations',
            filter: `user_id=eq.${user.id}`
          },
          async (payload) => {
            console.log('➕ Nueva conversación detectada:', payload.new.id);
            
            // Recargar conversaciones para obtener la nueva
            const updated = await loadConversationsFromSupabase();
            if (updated) {
              setConversations(updated);
              storage.saveConversations(updated);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'user_conversations',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('✏️ Conversación actualizada:', payload.new.id);
            
            // Actualizar en el estado local
            setConversations(prev => {
              const updated = prev.map(c => 
                c.id === payload.new.id 
                  ? { ...c, ...payload.new } 
                  : c
              );
              storage.saveConversations(updated);
              return updated;
            });
          }
        )
        .subscribe();
    };

    setupRealtime();

    // Cleanup
    return () => {
      if (channel) {
        console.log('🔴 Desuscribiendo listener de conversaciones');
        supabase.removeChannel(channel);
      }
    };
  }, [currentConversationId]); // Re-subscribe si cambia la conversación actual

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

  const createConversation = (projectId = null) => {
    const newConversation = {
      id: generateId(),
      title: 'New conversation',
      messages: [],
      sessionId: null, // ✅ NUEVO: Guardará el session_id del backend
      project_id: projectId, // ✅ Asociar con proyecto si se proporciona
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
      const conversation = conversations.find(conv => conv.id === id);
      
      // ☁️ PRIMERO: Delete from Supabase (crítico)
      console.log('🗑️ Eliminando conversación de Supabase:', id);
      const supabaseDeleted = await deleteConversationFromSupabase(id);
      
      if (!supabaseDeleted) {
        console.error('❌ No se pudo eliminar la conversación de Supabase');
        throw new Error('No se pudo eliminar la conversación del servidor');
      }
      
      // SEGUNDO: Delete from backend session if exists
      if (conversation?.sessionId) {
        try {
          await deleteSession(conversation.sessionId);
          console.log('✅ Sesión eliminada del backend:', conversation.sessionId);
        } catch (sessionError) {
          console.warn('⚠️ Error eliminando sesión del backend (no crítico):', sessionError);
          // No bloquear si falla esto
        }
      }
      
      // TERCERO: Update local state SOLO si todo salió bien
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
      
      console.log('✅ Conversación eliminada completamente:', id);
      return true;
      
    } catch (error) {
      console.error('❌ Error eliminando conversación:', error);
      // NO eliminar del estado local si falló
      throw error; // Re-throw para que el componente pueda mostrar error
    }
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
