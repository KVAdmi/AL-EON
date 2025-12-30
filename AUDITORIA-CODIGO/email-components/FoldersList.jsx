import React, { useState } from 'react';
import { Inbox, Send, FileText, AlertCircle, Trash2, Folder, Plus, Edit2, X, Check } from 'lucide-react';

const FOLDER_ICONS = {
  INBOX: Inbox,
  Sent: Send,
  Drafts: FileText,
  Spam: AlertCircle,
  Trash: Trash2,
};

const SYSTEM_FOLDERS = ['INBOX', 'Sent', 'Drafts', 'Spam', 'Trash'];

export default function FoldersList({ 
  folders, 
  selectedFolder, 
  onSelectFolder, 
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  isLoading 
}) {
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [contextMenu, setContextMenu] = useState(null);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    
    try {
      await onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setShowNewFolder(false);
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleRenameFolder = async (folderId) => {
    if (!editingName.trim()) return;
    
    try {
      await onRenameFolder(folderId, editingName.trim());
      setEditingFolderId(null);
      setEditingName('');
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleDeleteFolder = async (folderId) => {
    if (!confirm('¿Eliminar esta carpeta? Los emails se moverán a la papelera.')) return;
    
    try {
      await onDeleteFolder(folderId);
      setContextMenu(null);
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleContextMenu = (e, folder) => {
    e.preventDefault();
    if (SYSTEM_FOLDERS.includes(folder.folder_name)) return;
    
    setContextMenu({
      folderId: folder.folder_id,
      x: e.clientX,
      y: e.clientY,
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white border-r border-gray-200 w-64 p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-8 bg-gray-200 rounded"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white border-r border-gray-200 w-64 flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Carpetas</h2>
          <button
            onClick={() => setShowNewFolder(!showNewFolder)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            title="Nueva carpeta"
          >
            <Plus className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {/* New Folder Input */}
          {showNewFolder && (
            <div className="mb-2 p-2 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
                  placeholder="Nombre..."
                  autoFocus
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleCreateFolder}
                  className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  onClick={() => {
                    setShowNewFolder(false);
                    setNewFolderName('');
                  }}
                  className="p-1.5 bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {folders.length === 0 ? (
            <div className="text-center text-gray-500 text-sm mt-4">
              No hay carpetas
            </div>
          ) : (
            <div className="space-y-1">
              {folders.map((folder) => {
                const Icon = FOLDER_ICONS[folder.folder_name] || Folder;
                const isSelected = selectedFolder?.folder_id === folder.folder_id;
                const unreadCount = folder.unread_count || 0;
                const isSystemFolder = SYSTEM_FOLDERS.includes(folder.folder_name);
                const isEditing = editingFolderId === folder.folder_id;
                
                return (
                  <div
                    key={folder.folder_id}
                    className="relative"
                    onContextMenu={(e) => handleContextMenu(e, folder)}
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-1 px-2 py-1 bg-yellow-50 rounded-lg">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleRenameFolder(folder.folder_id)}
                          autoFocus
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => handleRenameFolder(folder.folder_id)}
                          className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingFolderId(null);
                            setEditingName('');
                          }}
                          className="p-1 bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => onSelectFolder(folder)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                          isSelected
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <span className="text-sm">{folder.folder_name}</span>
                        </div>
                        
                        {unreadCount > 0 && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            isSelected
                              ? 'bg-blue-700 text-white'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {unreadCount}
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1"
            style={{
              left: `${contextMenu.x}px`,
              top: `${contextMenu.y}px`,
            }}
          >
            <button
              onClick={() => {
                const folder = folders.find(f => f.folder_id === contextMenu.folderId);
                setEditingFolderId(folder.folder_id);
                setEditingName(folder.folder_name);
                setContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Renombrar
            </button>
            <button
              onClick={() => handleDeleteFolder(contextMenu.folderId)}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar
            </button>
          </div>
        </>
      )}
    </>
  );
}
