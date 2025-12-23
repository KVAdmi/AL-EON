
import React, { useRef, useEffect, useState } from 'react';
import { 
  Plus, MessageSquare, Trash2, Edit3, Check, X, Search,
  LogOut, User, Settings, ChevronDown, ChevronRight,
  Folder, FolderPlus, Calendar, Sparkles, Zap, Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import Logo from '@/components/Logo';
import ThemeToggle from '@/components/ThemeToggle';

function Sidebar({
  conversations,
  currentConversationId,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
  isOpen,
  currentUser,
  onLogout
}) {
  const scrollRef = useRef(null);
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
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
  }, [conversations.length]);

  if (!isOpen) return null;

  // Agrupar conversaciones por fecha
  const groupedConversations = groupConversationsByDate(conversations);
  
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

  return (
    <div 
      className="h-full flex flex-col w-[280px] md:w-[300px] border-r" 
      style={{ 
        backgroundColor: 'var(--color-bg-primary)',
        borderColor: 'var(--color-border)'
      }}
    >
      {/* Header con Logo y botón nuevo chat */}
      <div className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <Logo className="h-5 md:h-6 w-auto" />
          <ThemeToggle />
        </div>

        {/* Botón Nuevo Chat */}
        <button
          onClick={onNewConversation}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg transition-all duration-200 hover:opacity-90"
          style={{
            backgroundColor: 'var(--color-accent)',
            color: 'var(--color-text-primary)'
          }}
        >
          <Plus size={18} strokeWidth={2.5} />
          <span className="font-medium">Nuevo chat</span>
        </button>

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
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm transition-all focus:outline-none"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)'
            }}
          />
        </div>
      </div>

      {/* Lista de conversaciones agrupadas */}
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
                onDeleteConversation={onDeleteConversation}
              />
            )}
          </div>
        )}
      </div>

      {/* Sección Explorar (como ChatGPT) */}
      <div className="px-2 py-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <button
          onClick={() => navigate('/explore')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all hover:bg-[var(--color-bg-secondary)]"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <Sparkles size={18} />
          <span className="text-sm font-medium">Explorar GPTs</span>
        </button>
      </div>

      {/* User Info */}
      {currentUser && <UserInfo currentUser={currentUser} onLogout={onLogout} navigate={navigate} />}
    </div>
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
function ConversationGroup({ title, conversations, isExpanded, onToggle, currentConversationId, onSelectConversation, onDeleteConversation }) {
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
              onDelete={() => onDeleteConversation(conversation.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}


function ConversationItem({ conversation, isActive, onSelect, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(conversation.title);
  const [isHovered, setIsHovered] = useState(false);

  const handleDelete = (e) => {
    e.stopPropagation();
    if (confirm('¿Eliminar esta conversación?')) {
      onDelete();
    }
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleSave = (e) => {
    e.stopPropagation();
    // TODO: Implementar actualización de título
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
        'group relative px-3 py-2 rounded-lg cursor-pointer transition-all duration-150',
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
              className="flex-1 px-2 py-1 text-sm rounded bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-accent)]"
              style={{ color: 'var(--color-text-primary)' }}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave(e);
                if (e.key === 'Escape') handleCancel(e);
              }}
            />
            <button onClick={handleSave} className="p-1 hover:bg-[var(--color-bg-tertiary)] rounded">
              <Check size={14} style={{ color: 'var(--color-accent)' }} />
            </button>
            <button onClick={handleCancel} className="p-1 hover:bg-[var(--color-bg-tertiary)] rounded">
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
                  className="p-1.5 rounded hover:bg-[var(--color-bg-tertiary)] transition-all"
                  style={{ color: 'var(--color-text-tertiary)' }}
                  title="Renombrar"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-1.5 rounded hover:bg-red-500/10 transition-all"
                  style={{ color: 'var(--color-text-tertiary)' }}
                  title="Eliminar"
                >
                  <Trash2 size={14} />
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
    <div className="p-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-all"
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

export default Sidebar;
