/**
 * AL-EON Projects Service
 * Maneja proyectos para organizar conversaciones (como ChatGPT)
 */

import { supabase } from '@/lib/supabase';

/**
 * Obtener todos los proyectos del usuario (propios + compartidos)
 * @returns {Promise<Array>} Lista de proyectos ordenados
 */
export async function getProjects() {
  try {
    console.log('[ProjectsService] 🔍 Obteniendo proyectos...');
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('[ProjectsService] ❌ Error obteniendo usuario:', userError);
      return [];
    }
    
    if (!user) {
      console.warn('[ProjectsService] ⚠️ No hay usuario autenticado');
      return [];
    }

    console.log('[ProjectsService] ✅ Usuario autenticado:', user.id);

    // ✅ INCLUIR PROYECTOS COMPARTIDOS
    // Gracias a las RLS policies, esta query automáticamente incluye:
    // 1. Proyectos propios (user_id = auth.uid())
    // 2. Proyectos compartidos aceptados (project_members con accepted_at)
    const { data, error } = await supabase
      .from('user_projects')
      .select(`
        *,
        project_members!left(
          user_id,
          role,
          accepted_at
        )
      `)
      .eq('is_archived', false)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[ProjectsService] ❌ Error obteniendo proyectos:', error);
      throw error;
    }

    console.log('[ProjectsService] 📦 Datos recibidos:', data?.length || 0, 'proyectos');

    // Marcar cuáles son compartidos vs propios
    const projectsWithOwnership = (data || []).map(project => {
      const isOwner = project.user_id === user.id;
      const membership = project.project_members?.find(m => m.user_id === user.id);
      
      return {
        ...project,
        isOwner,
        isShared: !isOwner,
        myRole: membership?.role || (isOwner ? 'owner' : null)
      };
    });

    console.log(`[ProjectsService] ✅ Procesados ${projectsWithOwnership.length} proyectos (${projectsWithOwnership.filter(p => p.isOwner).length} propios, ${projectsWithOwnership.filter(p => p.isShared).length} compartidos)`);
    return projectsWithOwnership;

  } catch (error) {
    console.error('[ProjectsService] ❌ Error en getProjects:', error);
    throw error;
  }
}

/**
 * Crear nuevo proyecto
 * @param {Object} params
 * @param {string} params.name - Nombre del proyecto
 * @param {string} params.description - Descripción (opcional)
 * @param {string} params.color - Color hex (opcional)
 * @param {string} params.icon - Emoji o ícono (opcional)
 * @returns {Promise<Object>} Proyecto creado
 */
export async function createProject({ name, description = '', color = '#3B82F6', icon = '📁' }) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No hay usuario autenticado');
    }

    const { data, error } = await supabase
      .from('user_projects')
      .insert({
        user_id: user.id,
        name,
        description,
        color,
        icon
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creando proyecto:', error);
      throw error;
    }

    console.log('✅ Proyecto creado:', data.name);
    return data;

  } catch (error) {
    console.error('❌ Error en createProject:', error);
    throw error;
  }
}

/**
 * Actualizar proyecto
 * @param {string} projectId - ID del proyecto
 * @param {Object} updates - Campos a actualizar
 * @returns {Promise<Object>} Proyecto actualizado
 */
export async function updateProject(projectId, updates) {
  try {
    const { data, error } = await supabase
      .from('user_projects')
      .update(updates)
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error actualizando proyecto:', error);
      throw error;
    }

    console.log('✅ Proyecto actualizado:', data.name);
    return data;

  } catch (error) {
    console.error('❌ Error en updateProject:', error);
    throw error;
  }
}

/**
 * Archivar proyecto (soft delete)
 * @param {string} projectId - ID del proyecto
 * @returns {Promise<void>}
 */
export async function archiveProject(projectId) {
  try {
    const { error } = await supabase
      .from('user_projects')
      .update({ is_archived: true })
      .eq('id', projectId);

    if (error) {
      console.error('❌ Error archivando proyecto:', error);
      throw error;
    }

    console.log('✅ Proyecto archivado:', projectId);

  } catch (error) {
    console.error('❌ Error en archiveProject:', error);
    throw error;
  }
}

/**
 * Borrar proyecto permanentemente
 * @param {string} projectId - ID del proyecto
 * @returns {Promise<void>}
 */
export async function deleteProject(projectId) {
  try {
    const { error } = await supabase
      .from('user_projects')
      .delete()
      .eq('id', projectId);

    if (error) {
      console.error('❌ Error borrando proyecto:', error);
      throw error;
    }

    console.log('✅ Proyecto eliminado:', projectId);

  } catch (error) {
    console.error('❌ Error en deleteProject:', error);
    throw error;
  }
}

/**
 * Mover conversación a un proyecto
 * @param {string} conversationId - ID de la conversación
 * @param {string} projectId - ID del proyecto destino (null = sin proyecto)
 * @returns {Promise<void>}
 */
export async function moveConversationToProject(conversationId, projectId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No hay usuario autenticado');
    }

    const { error } = await supabase
      .from('user_conversations')
      .update({ project_id: projectId })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id);

    if (error) {
      console.error('❌ Error moviendo conversación:', error);
      throw error;
    }

    console.log(`✅ Conversación ${conversationId} movida a proyecto ${projectId}`);

  } catch (error) {
    console.error('❌ Error en moveConversationToProject:', error);
    throw error;
  }
}

/**
 * Obtener conversaciones de un proyecto
 * @param {string} projectId - ID del proyecto (null = sin proyecto)
 * @returns {Promise<Array>} Lista de conversaciones
 */
export async function getProjectConversations(projectId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return [];
    }

    let query = supabase
      .from('user_conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    // Si projectId es null, buscar conversaciones sin proyecto
    if (projectId === null) {
      query = query.is('project_id', null);
    } else {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error obteniendo conversaciones del proyecto:', error);
      throw error;
    }

    return data;

  } catch (error) {
    console.error('❌ Error en getProjectConversations:', error);
    throw error;
  }
}
