/**
 * AL-EON Conversations Sync Service
 * Sincroniza conversaciones entre localStorage y Supabase
 * Permite usar AL-EON en múltiples dispositivos (mobile + desktop)
 */

import { supabase } from '../lib/supabase';

/**
 * Cargar conversaciones desde Supabase
 * @returns {Promise<Array>} Lista de conversaciones del usuario
 */
export async function loadConversationsFromSupabase() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('⚠️ No hay usuario autenticado - usando localStorage');
      return null;
    }

    const { data, error } = await supabase
      .from('user_conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('❌ Error cargando conversaciones de Supabase:', error);
      return null;
    }

    // Convertir formato Supabase → localStorage
    const conversations = data.map(row => ({
      id: row.conversation_id,
      title: row.title,
      messages: row.messages,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString()
    }));

    console.log(`✅ Cargadas ${conversations.length} conversaciones de Supabase`);
    return conversations;

  } catch (error) {
    console.error('❌ Error en loadConversationsFromSupabase:', error);
    return null;
  }
}

/**
 * Guardar una conversación en Supabase
 * @param {Object} conversation - Conversación a guardar
 * @returns {Promise<boolean>} True si se guardó exitosamente
 */
export async function saveConversationToSupabase(conversation) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('⚠️ No hay usuario autenticado - guardando solo en localStorage');
      return false;
    }

    // Formato localStorage → Supabase
    const { error } = await supabase
      .from('user_conversations')
      .upsert({
        user_id: user.id,
        conversation_id: conversation.id,
        title: conversation.title,
        messages: conversation.messages,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,conversation_id'
      });

    if (error) {
      console.error('❌ Error guardando conversación en Supabase:', error);
      return false;
    }

    console.log(`✅ Conversación ${conversation.id} guardada en Supabase`);
    return true;

  } catch (error) {
    console.error('❌ Error en saveConversationToSupabase:', error);
    return false;
  }
}

/**
 * Borrar una conversación de Supabase
 * @param {string} conversationId - ID de la conversación a borrar
 * @returns {Promise<boolean>} True si se borró exitosamente
 */
export async function deleteConversationFromSupabase(conversationId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('⚠️ No hay usuario autenticado');
      return false;
    }

    // PRIMERO: Eliminar de user_conversations (relación muchos a muchos)
    const { error: userConvError } = await supabase
      .from('user_conversations')
      .delete()
      .eq('user_id', user.id)
      .eq('conversation_id', conversationId);

    if (userConvError) {
      console.error('❌ Error borrando relación usuario-conversación:', userConvError);
      return false;
    }

    // SEGUNDO: Eliminar la conversación principal de ae_conversations
    // (solo si no hay otros usuarios vinculados a esta conversación)
    const { data: otherUsers, error: checkError } = await supabase
      .from('user_conversations')
      .select('user_id')
      .eq('conversation_id', conversationId);

    if (checkError) {
      console.error('❌ Error verificando otros usuarios:', checkError);
      // Continuar de todas formas para eliminar la conversación principal
    }

    // Si no hay otros usuarios, eliminar la conversación principal
    if (!otherUsers || otherUsers.length === 0) {
      const { error: convError } = await supabase
        .from('ae_conversations')
        .delete()
        .eq('id', conversationId);

      if (convError) {
        console.error('❌ Error borrando conversación principal:', convError);
        return false;
      }
      
      console.log(`✅ Conversación ${conversationId} eliminada completamente (incluyendo ae_conversations)`);
    } else {
      console.log(`ℹ️ Conversación ${conversationId} eliminada para el usuario, pero otros usuarios aún la tienen`);
    }

    return true;

  } catch (error) {
    console.error('❌ Error en deleteConversationFromSupabase:', error);
    return false;
  }
}

/**
 * Sincronizar localStorage → Supabase
 * Migrar conversaciones existentes de localStorage a Supabase
 * @param {Array} conversations - Conversaciones en localStorage
 * @returns {Promise<number>} Número de conversaciones migradas
 */
export async function migrateLocalStorageToSupabase(conversations) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('⚠️ No hay usuario autenticado - no se puede migrar');
      return 0;
    }

    console.log(`🔄 Migrando ${conversations.length} conversaciones a Supabase...`);

    let migrated = 0;
    for (const conv of conversations) {
      const success = await saveConversationToSupabase(conv);
      if (success) migrated++;
    }

    console.log(`✅ Migradas ${migrated}/${conversations.length} conversaciones`);
    return migrated;

  } catch (error) {
    console.error('❌ Error en migrateLocalStorageToSupabase:', error);
    return 0;
  }
}

/**
 * Estrategia de sincronización: Last Write Wins
 * Compara timestamps y mantiene la versión más reciente
 * @param {Array} localConversations - Conversaciones en localStorage
 * @param {Array} supabaseConversations - Conversaciones en Supabase
 * @returns {Array} Lista consolidada (versión más reciente de cada conversación)
 */
export function mergeConversations(localConversations, supabaseConversations) {
  const merged = new Map();

  // Agregar conversaciones de Supabase
  supabaseConversations.forEach(conv => {
    merged.set(conv.id, conv);
  });

  // Sobrescribir con localStorage si es más reciente
  localConversations.forEach(conv => {
    const existing = merged.get(conv.id);
    
    if (!existing) {
      // No existe en Supabase, agregar
      merged.set(conv.id, conv);
    } else {
      // Comparar timestamps
      const localTime = new Date(conv.updatedAt || conv.createdAt).getTime();
      const supabaseTime = new Date(existing.updatedAt || existing.createdAt).getTime();
      
      if (localTime > supabaseTime) {
        // localStorage es más reciente
        merged.set(conv.id, conv);
      }
    }
  });

  return Array.from(merged.values())
    .sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt).getTime();
      return timeB - timeA; // Más reciente primero
    });
}
