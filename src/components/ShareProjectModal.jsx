import React, { useState, useEffect } from 'react';
import { X, UserPlus, Trash2, Crown, Edit3, Eye } from 'lucide-react';
import { 
  getProjectMembers, 
  inviteUserToProject, 
  removeUserFromProject,
  updateMemberRole,
  isProjectOwner 
} from '@/services/projectCollaboration';

const ROLES = {
  owner: { label: 'Propietario', icon: Crown, color: 'text-yellow-500' },
  editor: { label: 'Editor', icon: Edit3, color: 'text-blue-500' },
  viewer: { label: 'Visor', icon: Eye, color: 'text-gray-500' }
};

export default function ShareProjectModal({ isOpen, onClose, project }) {
  const [members, setMembers] = useState([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('editor');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (isOpen && project) {
      loadMembers();
      checkOwnership();
    }
  }, [isOpen, project]);

  const checkOwnership = async () => {
    if (!project) return;
    const owner = await isProjectOwner(project.id);
    setIsOwner(owner);
  };

  const loadMembers = async () => {
    try {
      setIsLoading(true);
      const data = await getProjectMembers(project.id);
      setMembers(data);
      setError(null);
    } catch (err) {
      console.error('Error cargando miembros:', err);
      setError('No se pudo cargar la lista de miembros');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!newUserEmail.trim()) return;

    try {
      setIsLoading(true);
      setError(null);

      const result = await inviteUserToProject(project.id, newUserEmail, selectedRole);
      
      if (result.success) {
        setNewUserEmail('');
        setSelectedRole('editor');
        await loadMembers();
      } else {
        setError(result.error || 'Error al invitar usuario');
      }
    } catch (err) {
      console.error('Error invitando usuario:', err);
      setError(err.message || 'No se pudo enviar la invitación');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('¿Eliminar este miembro del proyecto?')) return;

    try {
      setIsLoading(true);
      await removeUserFromProject(project.id, userId);
      await loadMembers();
    } catch (err) {
      console.error('Error removiendo miembro:', err);
      setError('No se pudo eliminar el miembro');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    try {
      setIsLoading(true);
      await updateMemberRole(project.id, userId, newRole);
      await loadMembers();
    } catch (err) {
      console.error('Error cambiando rol:', err);
      setError('No se pudo cambiar el rol');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--color-surface)] rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Compartir proyecto
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {project?.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Invite form */}
          {isOwner && (
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Invitar usuario por email
                </label>
                <div className="flex gap-3">
                  <input
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="usuario@ejemplo.com"
                    className="flex-1 bg-[var(--color-bg)] text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:border-[var(--color-accent)] focus:outline-none"
                    disabled={isLoading}
                  />
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="bg-[var(--color-bg)] text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:border-[var(--color-accent)] focus:outline-none"
                    disabled={isLoading}
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Visor</option>
                  </select>
                  <button
                    type="submit"
                    disabled={isLoading || !newUserEmail.trim()}
                    className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-lg px-6 py-2.5 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Invitar
                  </button>
                </div>
              </div>
            </form>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Members list */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3">
              Miembros del proyecto ({members.length})
            </h3>
            
            {isLoading && members.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                Cargando miembros...
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No hay miembros aún
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((member) => {
                  const RoleIcon = ROLES[member.role]?.icon || Edit3;
                  const roleColor = ROLES[member.role]?.color || 'text-gray-500';
                  
                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 bg-[var(--color-bg)] rounded-lg border border-gray-700"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-white font-medium flex-shrink-0">
                          {member.display_name?.[0]?.toUpperCase() || member.email[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white truncate">
                            {member.display_name || member.email.split('@')[0]}
                          </div>
                          <div className="text-sm text-gray-400 truncate">
                            {member.email}
                          </div>
                        </div>
                        <div className={`flex items-center gap-1.5 ${roleColor} flex-shrink-0`}>
                          <RoleIcon className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            {ROLES[member.role]?.label || member.role}
                          </span>
                        </div>
                      </div>
                      
                      {isOwner && member.role !== 'owner' && (
                        <div className="flex items-center gap-2 ml-4">
                          <select
                            value={member.role}
                            onChange={(e) => handleChangeRole(member.user_id, e.target.value)}
                            className="bg-[var(--color-surface)] text-white text-sm rounded px-2 py-1 border border-gray-700 focus:border-[var(--color-accent)] focus:outline-none"
                            disabled={isLoading}
                          >
                            <option value="editor">Editor</option>
                            <option value="viewer">Visor</option>
                          </select>
                          <button
                            onClick={() => handleRemoveMember(member.user_id)}
                            className="text-red-400 hover:text-red-300 transition-colors p-1"
                            disabled={isLoading}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-400 mb-2">
              ℹ️ Roles y permisos
            </h4>
            <ul className="text-sm text-blue-300 space-y-1">
              <li><strong>Propietario:</strong> Control total del proyecto</li>
              <li><strong>Editor:</strong> Puede chatear y ver documentos</li>
              <li><strong>Visor:</strong> Solo puede ver conversaciones</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
