
import React, { useRef, useEffect, useState } from 'react';
import { 
  Plus, MessageSquare, Trash2, Edit3, Check, X, Search,
  LogOut, User, Settings, ChevronDown, ChevronRight,
  Folder, FolderPlus, Calendar, Sparkles, Zap, Users, MoreVertical, Share2, FileText,
  Mail, Send, Bell, Loader2, Mic, MicOff, Camera
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import Logo from '@/components/Logo';
import ThemeToggle from '@/components/ThemeToggle';
import { ProjectModal } from '@/features/projects/components/ProjectModal';
import ShareProjectModal from '@/components/ShareProjectModal';
import { ProjectDocumentsModal } from '@/features/projects/components/ProjectDocumentsModal';
import NotificationBell from '@/components/NotificationBell';
import { createProject, getProjects, deleteProject } from '@/services/projectsService';
import { useToast } from '@/ui/use-toast';
import { useCapability } from '@/components/CapabilitiesGate';
import { useVoiceMode } from '@/features/chat/hooks/useVoiceMode';
import { useAuth } from '@/contexts/AuthContext';

function Sidebar({
  conversations,
  currentConversationId,
  onNewConversation,
  onSelectConversation,
  onUpdateConversation,
  onDeleteConversation,
  isOpen,
  currentUser,
  onLogout
}) {
  const scrollRef = useRef(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userProfile } = useAuth();
  
  // 🔒 VERIFICAR CAPACIDADES
  const canSendEmail = useCapability('mail.send');
  
  // 🎤 Hook de modo de voz
  const { isListening, transcript, startListening, stopListening, clearTranscript } = useVoiceMode();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [projectToShare, setProjectToShare] = useState(null);
  const [projectForDocs, setProjectForDocs] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    today: true,
    yesterday: true,
    last7days: true,
    last30days: true,
    projects: true
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, []);
  
  // Cargar proyectos al montar el componente
  useEffect(() => {
    loadProjects();
    checkNotificationPermission();
  }, []);

  const checkNotificationPermission = () => {
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast({
        variant: 'destructive',
        title: 'No soportado',
        description: 'Tu navegador no soporta notificaciones',
      });
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        toast({
          title: 'Notificaciones activadas',
          description: 'Recibirás notificaciones de correos y agenda',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Permiso denegado',
          description: 'No podrás recibir notificaciones',
        });
      }
    } catch (error) {
      console.error('Error solicitando permiso:', error);
    }
  };

  const toggleVoiceMode = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const loadProjects = async () => {
    try {
      const projectsList = await getProjects();
      setProjects(projectsList || []);
    } catch (error) {
      console.error('Error cargando proyectos:', error);
    }
  };

  if (!isOpen) return null;

  // Separar conversaciones con y sin proyecto
  const conversationsWithoutProject = conversations.filter(c => !c.project_id);
  const conversationsWithProject = conversations.filter(c => c.project_id);

  // Agrupar conversaciones sin proyecto por fecha
  const groupedConversations = groupConversationsByDate(conversationsWithoutProject);
  
  // Filtrar por búsqueda
  const filteredConversations = searchQuery
    ? conversations.filter(conv => 
        conv.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleCreateProject = async (projectData) => {
    try {
      await createProject(projectData);
      toast({
        title: "Proyecto creado",
        description: `${projectData.icon} ${projectData.name} ha sido creado exitosamente`,
        duration: 3000,
      });
      setShowCreateProjectModal(false);
      // Recargar proyectos
      await loadProjects();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo crear el proyecto",
        duration: 5000,
      });
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!confirm('¿Eliminar este proyecto? Las conversaciones se mantendrán pero quedarán sin proyecto.')) {
      return;
    }
    try {
      await deleteProject(projectId);
      toast({
        title: "Proyecto eliminado",
        description: "El proyecto ha sido eliminado",
        duration: 3000,
      });
      await loadProjects();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo eliminar el proyecto",
        duration: 5000,
      });
    }
  };

  const handleNewChatInProject = (projectId) => {
    // Llamar a onNewConversation pasando el projectId
    onNewConversation(projectId);
  };

  return (
    <>
      {/* Modal de crear proyecto */}
      <ProjectModal
        isOpen={showCreateProjectModal}
        onClose={() => setShowCreateProjectModal(false)}
        onSave={handleCreateProject}
      />
      
      <div 
        className="h-full flex flex-col w-[280px] md:w-[300px] border-r" 
        style={{ 
          backgroundColor: 'var(--color-bg-primary)',
          borderColor: 'var(--color-border)'
        }}
      >
        {/* Header con Logo y botón nuevo chat */}
        <div className="p-3 space-y-3">
        
        {/* Tarjeta cristal con avatar y efecto neón azul */}
        <div className="relative">
          {/* Tarjeta glassmorphism */}
          <div 
            className="relative p-5 rounded-2xl border backdrop-blur-xl overflow-hidden"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              borderColor: 'rgba(99, 179, 237, 0.4)',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(99, 179, 237, 0.1)'
            }}
          >
            <div className="flex items-center gap-4">
              {/* Avatar con efecto neón azul */}
              <div className="relative flex-shrink-0">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden border-2 relative"
                  style={{
                    borderColor: '#63B3ED',
                    boxShadow: '0 0 25px rgba(99, 179, 237, 0.7), 0 0 50px rgba(99, 179, 237, 0.4), inset 0 0 20px rgba(99, 179, 237, 0.2)',
                    backgroundColor: userProfile?.assistant_avatar_url ? 'transparent' : 'var(--color-accent)'
                  }}
                >
                  {userProfile?.assistant_avatar_url ? (
                    <img 
                      src={userProfile.assistant_avatar_url} 
                      alt={userProfile.assistant_name || 'AL-E'}
                      className="w-full h-full object-cover"
                      style={{
                        filter: 'drop-shadow(0 0 12px rgba(99, 179, 237, 0.6))'
                      }}
                    />
                  ) : (
                    <Camera 
                      size={28} 
                      style={{ color: '#FFFFFF' }}
                    />
                  )}
                </div>
                {/* Efecto de pulso neón */}
                <div 
                  className="absolute inset-0 rounded-full animate-pulse"
                  style={{
                    boxShadow: '0 0 40px rgba(99, 179, 237, 0.5), 0 0 60px rgba(99, 179, 237, 0.3)',
                    pointerEvents: 'none'
                  }}
                />
              </div>
              
              {/* Información del asistente */}
              <div className="flex-1 min-w-0">
                <h3 
                  className="font-bold text-lg truncate"
                  style={{ 
                    color: '#FFFFFF',
                    textShadow: '0 0 12px rgba(99, 179, 237, 0.6), 0 2px 4px rgba(0, 0, 0, 0.5)'
                  }}
                >
                  {userProfile?.assistant_name || 'AL-E'}
                </h3>
                <p 
                  className="text-xs truncate mt-0.5"
                  style={{ 
                    color: 'rgba(255, 255, 255, 0.8)',
                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)'
                  }}
                >
                  Tu asistente inteligente
                </p>
              </div>
              
              {/* Theme Toggle */}
              <div className="flex-shrink-0">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>

        {/* Botones: Nuevo Chat + Nuevo Proyecto + Voz + Notificaciones */}
        <div className="flex gap-2">
          <button
            onClick={onNewConversation}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl transition-all duration-200 hover:opacity-90"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: '#FFFFFF'
            }}
          >
            <Plus size={18} strokeWidth={2.5} />
            <span className="font-medium" style={{ color: '#FFFFFF' }}>Nuevo chat</span>
          </button>
          
          <button
            onClick={toggleVoiceMode}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl transition-all duration-200"
            style={{
              backgroundColor: isListening ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              color: isListening ? '#FFFFFF' : 'var(--color-text-primary)'
            }}
            title={isListening ? "Desactivar modo voz" : "Activar modo voz"}
          >
            {isListening ? <Mic size={18} className="animate-pulse" /> : <MicOff size={18} />}
          </button>

          {!notificationsEnabled && (
            <button
              onClick={requestNotificationPermission}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl transition-all duration-200"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid #ef4444',
                color: '#ef4444'
              }}
              title="Activar notificaciones"
            >
              <Bell size={18} />
            </button>
          )}
          
          <button
            onClick={() => setShowCreateProjectModal(true)}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl transition-all duration-200"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)'
            }}
            title="Nuevo proyecto"
          >
            <FolderPlus size={18} />
          </button>
        </div>

        {/* Barra de búsqueda */}
        <div className="relative">
          <Search 
            size={16} 
            className="absolute left-3 top-1/2 -translate-y-1/2" 
            style={{ color: 'var(--color-text-tertiary)' }}
          />
          <input
            type="text"
            placeholder="Buscar chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-2xl text-sm transition-all focus:outline-none"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)'
            }}
          />
        </div>

        {/* Navegación rápida: Email, Calendar, Telegram, Reuniones */}
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => navigate('/correo')}
            className="flex items-center justify-center py-3 px-2 rounded-xl transition-all hover:opacity-80"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)'
            }}
            title="Email"
          >
            <Mail size={22} />
          </button>
          
          <button
            onClick={() => navigate('/calendar')}
            className="flex items-center justify-center py-3 px-2 rounded-xl transition-all hover:opacity-80"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)'
            }}
            title="Agenda"
          >
            <Calendar size={22} />
          </button>
          
          <button
            onClick={() => navigate('/telegram')}
            className="flex items-center justify-center py-3 px-2 rounded-xl transition-all hover:opacity-80"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)'
            }}
            title="Telegram"
          >
            <Send size={22} />
          </button>
          
          <button
            onClick={() => navigate('/reuniones')}
            className="flex items-center justify-center py-3 px-2 rounded-xl transition-all hover:opacity-80"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)'
            }}
            title="Reuniones"
          >
            <Mic size={22} />
          </button>
        </div>
      </div>

      {/* Sección de Proyectos */}
      {projects.length > 0 && (
        <div className="px-2 py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <button
            onClick={() => toggleSection('projects')}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--color-bg-secondary)] transition-all"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            {expandedSections.projects ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Folder size={14} />
            <span className="text-xs font-semibold uppercase tracking-wide">Proyectos</span>
            <span className="text-xs">({projects.length})</span>
          </button>

          {expandedSections.projects && (
            <div className="mt-2 space-y-1">
              {projects.map((project) => (
                <ProjectItem
                  key={project.id}
                  project={project}
                  conversations={conversations.filter(c => c.project_id === project.id)}
                  currentConversationId={currentConversationId}
                  onSelectConversation={onSelectConversation}
                  onUpdateConversation={onUpdateConversation}
                  onDeleteConversation={onDeleteConversation}
                  onNewChatInProject={() => handleNewChatInProject(project.id)}
                  onDeleteProject={() => handleDeleteProject(project.id)}
                  onShareProject={() => {
                    setProjectToShare(project);
                    setShowShareModal(true);
                  }}
                  onManageDocuments={() => {
                    setProjectForDocs(project);
                    setShowDocumentsModal(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modales */}
      <ShareProjectModal
        isOpen={showShareModal}
        onClose={() => {
          setShowShareModal(false);
          setProjectToShare(null);
        }}
        project={projectToShare}
      />

      <ProjectDocumentsModal
        isOpen={showDocumentsModal}
        onClose={() => {
          setShowDocumentsModal(false);
          setProjectForDocs(null);
        }}
        project={projectForDocs}
      />

      {/* Lista de conversaciones agrupadas (sin proyecto) */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-2"
      >
        {conversations.length === 0 ? (
          <div className="p-6 text-center space-y-3" style={{ color: 'var(--color-text-tertiary)' }}>
            <MessageSquare size={40} className="mx-auto opacity-40" />
            <div>
              <p className="text-sm font-medium">No hay conversaciones</p>
              <p className="text-xs mt-1">Inicia un nuevo chat para comenzar</p>
            </div>
          </div>
        ) : filteredConversations ? (
          // Resultados de búsqueda
          <div className="space-y-1 py-2">
            {filteredConversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isActive={conversation.id === currentConversationId}
                onSelect={() => onSelectConversation(conversation.id)}
                onUpdate={(title) => onUpdateConversation(conversation.id, { title })}
                onDelete={() => onDeleteConversation(conversation.id)}
              />
            ))}
          </div>
        ) : (
          // Vista agrupada por fecha
          <div className="space-y-1 py-2">
            {groupedConversations.today.length > 0 && (
              <ConversationGroup
                title="Hoy"
                conversations={groupedConversations.today}
                isExpanded={expandedSections.today}
                onToggle={() => toggleSection('today')}
                currentConversationId={currentConversationId}
                onSelectConversation={onSelectConversation}
                onUpdateConversation={onUpdateConversation}
                onDeleteConversation={onDeleteConversation}
              />
            )}

            {groupedConversations.yesterday.length > 0 && (
              <ConversationGroup
                title="Ayer"
                conversations={groupedConversations.yesterday}
                isExpanded={expandedSections.yesterday}
                onToggle={() => toggleSection('yesterday')}
                currentConversationId={currentConversationId}
                onSelectConversation={onSelectConversation}
                onUpdateConversation={onUpdateConversation}
                onDeleteConversation={onDeleteConversation}
              />
            )}

            {groupedConversations.last7days.length > 0 && (
              <ConversationGroup
                title="Últimos 7 días"
                conversations={groupedConversations.last7days}
                isExpanded={expandedSections.last7days}
                onToggle={() => toggleSection('last7days')}
                currentConversationId={currentConversationId}
                onSelectConversation={onSelectConversation}
                onUpdateConversation={onUpdateConversation}
                onDeleteConversation={onDeleteConversation}
              />
            )}

            {groupedConversations.last30days.length > 0 && (
              <ConversationGroup
                title="Últimos 30 días"
                conversations={groupedConversations.last30days}
                isExpanded={expandedSections.last30days}
                onToggle={() => toggleSection('last30days')}
                currentConversationId={currentConversationId}
                onSelectConversation={onSelectConversation}
                onUpdateConversation={onUpdateConversation}
                onDeleteConversation={onDeleteConversation}
              />
            )}

            {groupedConversations.older.length > 0 && (
              <ConversationGroup
                title="Más antiguo"
                conversations={groupedConversations.older}
                isExpanded={expandedSections.older}
                onToggle={() => toggleSection('older')}
                currentConversationId={currentConversationId}
                onSelectConversation={onSelectConversation}
                onUpdateConversation={onUpdateConversation}
                onDeleteConversation={onDeleteConversation}
              />
            )}
          </div>
        )}
      </div>

      {/* Notifications + User Info */}
      <div className="border-t" style={{ borderColor: 'var(--color-border)' }}>
        {/* Notification Bell */}
        <div className="p-2 flex justify-end">
          <NotificationBell />
        </div>
        
        {/* User Info */}
        {currentUser && <UserInfo currentUser={currentUser} onLogout={onLogout} navigate={navigate} />}
      </div>
    </div>
    </>
  );
}

// Función para agrupar conversaciones por fecha
function groupConversationsByDate(conversations) {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const sevenDays = 7 * oneDay;
  const thirtyDays = 30 * oneDay;

  return conversations.reduce((groups, conv) => {
    const age = now - conv.updatedAt;

    if (age < oneDay) {
      groups.today.push(conv);
    } else if (age < 2 * oneDay) {
      groups.yesterday.push(conv);
    } else if (age < sevenDays) {
      groups.last7days.push(conv);
    } else if (age < thirtyDays) {
      groups.last30days.push(conv);
    } else {
      groups.older.push(conv);
    }

    return groups;
  }, {
    today: [],
    yesterday: [],
    last7days: [],
    last30days: [],
    older: []
  });
}

// Componente para grupo de conversaciones
function ConversationGroup({ title, conversations, isExpanded, onToggle, currentConversationId, onSelectConversation, onUpdateConversation, onDeleteConversation }) {
  return (
    <div className="mb-2">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--color-bg-secondary)] transition-all"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span className="text-xs font-semibold uppercase tracking-wide">{title}</span>
        <span className="text-xs">({conversations.length})</span>
      </button>

      {isExpanded && (
        <div className="space-y-0.5 mt-1">
          {conversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isActive={conversation.id === currentConversationId}
              onSelect={() => onSelectConversation(conversation.id)}
              onUpdate={(title) => onUpdateConversation(conversation.id, { title })}
              onDelete={() => onDeleteConversation(conversation.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}


function ConversationItem({ conversation, isActive, onSelect, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(conversation.title);
  const [isHovered, setIsHovered] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e) => {
    e.stopPropagation();
    
    if (!confirm('¿Eliminar esta conversación? Esta acción no se puede deshacer.')) {
      return;
    }
    
    try {
      setIsDeleting(true);
      await onDelete();
      console.log('✅ Conversación eliminada exitosamente');
    } catch (error) {
      console.error('❌ Error eliminando conversación:', error);
      alert('Error al eliminar la conversación. Por favor intenta de nuevo.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleSave = (e) => {
    e.stopPropagation();
    if (editedTitle.trim() && editedTitle !== conversation.title) {
      onUpdate(editedTitle.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = (e) => {
    e.stopPropagation();
    setEditedTitle(conversation.title);
    setIsEditing(false);
  };

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'group relative px-3 py-2 rounded-2xl cursor-pointer transition-all duration-150',
        'hover:bg-[var(--color-bg-secondary)]'
      )}
      style={{
        backgroundColor: isActive ? 'var(--color-bg-secondary)' : 'transparent'
      }}
    >
      <div className="flex items-center gap-3">
        <MessageSquare size={16} className="flex-shrink-0 opacity-70" style={{ color: 'var(--color-text-secondary)' }} />
        
        {isEditing ? (
          <div className="flex-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="flex-1 px-2 py-1 text-sm rounded-xl bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-accent)]"
              style={{ color: 'var(--color-text-primary)' }}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave(e);
                if (e.key === 'Escape') handleCancel(e);
              }}
            />
            <button onClick={handleSave} className="p-1 hover:bg-[var(--color-bg-tertiary)] rounded-xl">
              <Check size={14} style={{ color: 'var(--color-accent)' }} />
            </button>
            <button onClick={handleCancel} className="p-1 hover:bg-[var(--color-bg-tertiary)] rounded-xl">
              <X size={14} style={{ color: 'var(--color-text-tertiary)' }} />
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                {conversation.title}
              </p>
            </div>
            
            {/* Botones de acción (aparecen al hover) */}
            {(isHovered || isActive) && (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleEdit}
                  className="p-1.5 rounded-xl hover:bg-[var(--color-bg-tertiary)] transition-all"
                  style={{ color: 'var(--color-text-tertiary)' }}
                  title="Renombrar"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="p-1.5 rounded-xl hover:bg-red-500/10 transition-all disabled:opacity-50"
                  style={{ color: isDeleting ? 'var(--color-text-tertiary)' : 'var(--color-text-tertiary)' }}
                  title={isDeleting ? 'Eliminando...' : 'Eliminar'}
                >
                  {isDeleting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function UserInfo({ currentUser, onLogout, navigate }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="p-2">
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-[var(--color-bg-secondary)] transition-all"
        >
          {/* Avatar */}
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            <User size={16} style={{ color: 'var(--color-text-primary)' }} />
          </div>
          
          {/* User name */}
          <span className="text-sm font-medium truncate flex-1 text-left" style={{ color: 'var(--color-text-primary)' }}>
            {currentUser}
          </span>
          
          {/* More icon */}
          <ChevronDown size={16} style={{ color: 'var(--color-text-tertiary)' }} />
        </button>

        {/* Menú desplegable tipo ChatGPT */}
        {showMenu && (
          <>
            {/* Backdrop para cerrar */}
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowMenu(false)}
            />
            
            <div 
              className="absolute bottom-full left-0 right-0 mb-2 rounded-xl shadow-2xl overflow-hidden z-20 border"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)'
              }}
            >
              {/* Header del menú */}
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-tertiary)' }}>
                  Mi cuenta
                </p>
              </div>

              {/* Opciones */}
              <div className="py-2">
                <MenuButton
                  icon={<User size={16} />}
                  label="Mi perfil"
                  onClick={() => {
                    setShowMenu(false);
                    navigate('/profile');
                  }}
                />
                <MenuButton
                  icon={<Settings size={16} />}
                  label="Configuración"
                  onClick={() => {
                    setShowMenu(false);
                    navigate('/settings');
                  }}
                />
              </div>

              <div className="border-t" style={{ borderColor: 'var(--color-border)' }} />

              {/* Logout */}
              <div className="py-2">
                <MenuButton
                  icon={<LogOut size={16} />}
                  label="Cerrar sesión"
                  onClick={() => {
                    setShowMenu(false);
                    onLogout();
                  }}
                  danger
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MenuButton({ icon, label, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--color-bg-tertiary)] transition-all"
      style={{ 
        color: danger ? 'var(--color-error, #ef4444)' : 'var(--color-text-primary)'
      }}
    >
      {icon}
      <span className="text-sm">{label}</span>
    </button>
  );
}

// Componente para mostrar un proyecto con sus conversaciones
function ProjectItem({ project, conversations, currentConversationId, onSelectConversation, onUpdateConversation, onDeleteConversation, onNewChatInProject, onDeleteProject, onShareProject, onManageDocuments }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="mb-2">
      <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-[var(--color-bg-secondary)] transition-all group">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 flex-1 text-left"
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span className="text-lg">{project.icon || '📁'}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
              {project.name}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--color-text-tertiary)' }}>
              {conversations.length} chat{conversations.length !== 1 ? 's' : ''}
            </p>
          </div>
        </button>

        {/* Botones de acción */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onNewChatInProject}
            className="p-1.5 rounded-xl hover:bg-[var(--color-bg-tertiary)] transition-all"
            style={{ color: 'var(--color-text-tertiary)' }}
            title="Nuevo chat en este proyecto"
          >
            <Plus size={14} />
          </button>
          
          <button
            onClick={onManageDocuments}
            className="p-1.5 rounded-xl hover:bg-[var(--color-bg-tertiary)] transition-all"
            style={{ color: 'var(--color-text-tertiary)' }}
            title="Documentos del proyecto"
          >
            <FileText size={14} />
          </button>
          
          <button
            onClick={onShareProject}
            className="p-1.5 rounded-xl hover:bg-[var(--color-bg-tertiary)] transition-all"
            style={{ color: 'var(--color-text-tertiary)' }}
            title="Compartir proyecto"
          >
            <Share2 size={14} />
          </button>
          
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-xl hover:bg-[var(--color-bg-tertiary)] transition-all"
              style={{ color: 'var(--color-text-tertiary)' }}
              title="Más opciones"
            >
              <MoreVertical size={14} />
            </button>
            
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div 
                  className="absolute right-0 top-full mt-1 rounded-xl shadow-lg overflow-hidden z-20 border"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderColor: 'var(--color-border)',
                    minWidth: '150px'
                  }}
                >
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDeleteProject();
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-bg-tertiary)] transition-all"
                    style={{ color: 'var(--color-error, #ef4444)' }}
                  >
                    Eliminar proyecto
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Conversaciones del proyecto */}
      {isExpanded && conversations.length > 0 && (
        <div className="ml-6 mt-1 space-y-0.5">
          {conversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isActive={conversation.id === currentConversationId}
              onSelect={() => onSelectConversation(conversation.id)}
              onUpdate={(title) => onUpdateConversation(conversation.id, { title })}
              onDelete={() => onDeleteConversation(conversation.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Sidebar;
