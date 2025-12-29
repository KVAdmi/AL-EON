import React from 'react';
import { FileText, Download, X, Image, FileIcon } from 'lucide-react';
import { getAttachmentDownloadUrl } from '@/services/emailService';

export default function AttachmentsList({ attachments, onDelete }) {
  const getFileIcon = (mimeType) => {
    if (mimeType.startsWith('image/')) return Image;
    return FileIcon;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-gray-700">
        Adjuntos ({attachments.length})
      </div>
      <div className="grid grid-cols-1 gap-2">
        {attachments.map((attachment) => {
          const Icon = getFileIcon(attachment.mime_type);
          const downloadUrl = getAttachmentDownloadUrl(attachment.attachment_id);
          
          return (
            <div
              key={attachment.attachment_id}
              className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Icon className="w-5 h-5 text-gray-500 flex-shrink-0" />
              
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">
                  {attachment.filename}
                </div>
                <div className="text-xs text-gray-500">
                  {formatFileSize(attachment.file_size)}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <a
                  href={downloadUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Descargar"
                >
                  <Download className="w-4 h-4" />
                </a>
                
                {onDelete && (
                  <button
                    onClick={() => onDelete(attachment.attachment_id)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Eliminar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
