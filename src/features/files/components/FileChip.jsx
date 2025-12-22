
import React from 'react';
import { X, FileText } from 'lucide-react';

function FileChip({ file, onRemove }) {
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 hover:opacity-80"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        color: 'var(--color-text-primary)',
        border: '1px solid var(--color-border)'
      }}
    >
      <FileText size={16} style={{ color: 'var(--color-text-secondary)' }} />
      <div className="flex flex-col min-w-0">
        <span className="truncate max-w-[200px] font-medium">{file.name}</span>
        <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          {formatFileSize(file.size)}
        </span>
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 hover:opacity-70 transition-opacity"
          type="button"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

export default FileChip;
