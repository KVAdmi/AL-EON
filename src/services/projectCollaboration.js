import { supabase } from '@/lib/supabase';

/**
 * Obtiene todos los miembros de un proyecto
 */
export async function getProjectMembers(projectId) {
  const { data, error } = await supabase
    .from('project_members_view')
    .select('*')
    .eq('project_id', projectId)
    .order('role', { ascending: false }); // owner primero

  if (error) throw error;
  return data || [];
}

/**
 * Invita un usuario a un proyecto por email
 */
export async function inviteUserToProject(projectId, userEmail, role = 'member') {
  const { data, error } = await supabase.rpc('invite_user_to_project', {
    p_project_id: projectId,
    p_user_email: userEmail,
    p_role: role
  });

  if (error) throw error;
  return data;
}

/**
 * Remueve un usuario de un proyecto
 */
export async function removeUserFromProject(projectId, userId) {
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId);

  if (error) throw error;
  return { success: true };
}

/**
 * Actualiza el rol de un miembro
 */
export async function updateMemberRole(projectId, userId, newRole) {
  const { error } = await supabase
    .from('project_members')
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq('project_id', projectId)
    .eq('user_id', userId);

  if (error) throw error;
  return { success: true };
}

/**
 * Verifica si el usuario actual es owner del proyecto
 */
export async function isProjectOwner(projectId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('user_projects')
    .select('user_id')
    .eq('id', projectId)
    .single();

  return data?.user_id === user.id;
}

/**
 * Obtiene todos los proyectos donde el usuario es miembro (no owner)
 */
export async function getSharedProjects() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('project_members_view')
    .select('*')
    .eq('user_id', user.id)
    .neq('role', 'owner');

  if (error) throw error;
  return data || [];
}
