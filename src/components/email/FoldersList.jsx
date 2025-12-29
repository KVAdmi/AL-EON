import React from 'react';
import { Inbox, Send, FileText, AlertCircle, Trash2, Folder } from 'lucide-react';

const FOLDER_ICONS = {
  INBOX: Inbox,
  Sent: Send,
  Drafts: FileText,
  Spam: AlertCircle,
  Trash: Trash2,
};

export default function FoldersList({ folders, selectedFolder, onSelectFolder, isLoading }) {
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
    <div className="bg-white border-r border-gray-200 w-64 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Carpetas</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
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
              
              return (
                <button
                  key={folder.folder_id}
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
