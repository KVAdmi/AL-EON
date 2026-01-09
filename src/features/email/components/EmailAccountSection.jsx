/**
 * EmailAccountSection - Sección colapsable de cuenta con sus carpetas
 * Agrupa una cuenta de email con todas sus carpetas (Inbox, Sent, etc)
 */
import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, 
  ChevronRight,
  InboxIcon,
  Send,
  Star,
  Archive,
  Trash2,
  Mail
} from 'lucide-react';

export default function EmailAccountSection({ 
  account, 
  currentFolder, 
  onFolderSelect,
  isOnlyAccount = false 
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Si es la única cuenta, mantenerla siempre expandida
  useEffect(() => {
    if (isOnlyAccount) {
      setIsExpanded(true);
    } else {
      // Cargar estado de localStorage
      const savedState = localStorage.getItem(`email-account-${account.id}-expanded`);
      if (savedState !== null) {
        setIsExpanded(savedState === 'true');
      }
    }
  }, [account.id, isOnlyAccount]);

  const toggleExpand = () => {
    if (!isOnlyAccount) {
      const newState = !isExpanded;
      setIsExpanded(newState);
      localStorage.setItem(`email-account-${account.id}-expanded`, newState.toString());
    }
  };

  const folders = [
    { id: 'inbox', name: 'Bandeja de entrada', icon: InboxIcon, color: 'var(--color-primary)' },
    { id: 'sent', name: 'Enviados', icon: Send, color: 'var(--color-text-secondary)' },
    { id: 'starred', name: 'Destacados', icon: Star, color: 'var(--color-accent)' },
    { id: 'archive', name: 'Archivados', icon: Archive, color: 'var(--color-text-secondary)' },
    { id: 'trash', name: 'Papelera', icon: Trash2, color: 'var(--color-text-secondary)' },
  ];

  return (
    <div className="mb-4">
      {/* Header de la cuenta */}
      <button
        onClick={toggleExpand}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:opacity-80 transition-all"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          color: 'var(--color-text-primary)',
        }}
      >
        {!isOnlyAccount && (
          isExpanded ? (
            <ChevronDown className="w-4 h-4 shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 shrink-0" />
          )
        )}
        <Mail className="w-4 h-4 shrink-0" style={{ color: 'var(--color-primary)' }} />
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-semibold truncate">
            {account.from_name || account.fromName || 'Mi cuenta'}
          </p>
          <p className="text-xs truncate" style={{ color: 'var(--color-text-tertiary)' }}>
            {account.from_email || account.fromEmail || 'sin-email@example.com'}
          </p>
        </div>
      </button>

      {/* Carpetas (colapsables) */}
      {isExpanded && (
        <div className="mt-2 ml-4 space-y-1">
          {folders.map((folder) => {
            const FolderIcon = folder.icon;
            const isActive = currentFolder === folder.id;
            
            return (
              <button
                key={folder.id}
                onClick={() => onFolderSelect(account, folder.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                  isActive ? 'ring-2' : ''
                }`}
                style={{
                  backgroundColor: isActive 
                    ? 'var(--color-bg-secondary)' 
                    : 'transparent',
                  ringColor: 'var(--color-primary)',
                }}
              >
                <FolderIcon className="w-4 h-4 shrink-0" style={{ color: folder.color }} />
                <span 
                  className="text-sm font-medium truncate"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {folder.name}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
