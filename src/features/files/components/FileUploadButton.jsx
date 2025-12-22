/**
 * FileUploadButton - Componente para subir archivos
 * 
 * CARACTERÍSTICAS:
 * - Botón "Adjuntar"
 * - Chips con estado (subiendo/procesando/listo/error)
 * - Tipos soportados: PDF, DOCX, TXT, MD, imágenes
 * - Tamaño máximo: 50MB
 */

import React, { useRef, useState } from 'react';
import { Paperclip, X, FileText, Image as ImageIcon, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { uploadAndIngestFile } from '@/services/filesService';

const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp']
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export default function FileUploadButton({ sessionId, onFilesUploaded, disabled }) {
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    // Validar archivos
    const validFiles = selectedFiles.filter(file => {
      if (file.size > MAX_FILE_SIZE) {
        console.warn(`⚠️ Archivo muy grande: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Agregar archivos al estado con status "uploading"
    const newFiles = validFiles.map(file => ({
      id: `temp-${Date.now()}-${Math.random()}`,
      file,
      name: file.name,
      type: file.type,
      size: file.size,
      status: 'uploading',
      progress: 0,
      error: null
    }));

    setFiles(prev => [...prev, ...newFiles]);

    // Subir archivos
    for (const fileData of newFiles) {
      try {
        // Actualizar estado a "processing"
        setFiles(prev =>
          prev.map(f =>
            f.id === fileData.id ? { ...f, status: 'processing', progress: 50 } : f
          )
        );

        // Subir y ingerir
        const result = await uploadAndIngestFile(fileData.file, sessionId);

        // Actualizar estado a "success"
        setFiles(prev =>
          prev.map(f =>
            f.id === fileData.id
              ? { ...f, ...result, status: 'success', progress: 100 }
              : f
          )
        );

        // Notificar archivo subido
        onFilesUploaded?.([result]);
      } catch (error) {
        console.error(`❌ Error subiendo ${fileData.name}:`, error);

        // Actualizar estado a "error"
        setFiles(prev =>
          prev.map(f =>
            f.id === fileData.id
              ? { ...f, status: 'error', error: error.message }
              : f
          )
        );
      }
    }

    // Limpiar input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) {
      return <ImageIcon size={16} />;
    }
    return <FileText size={16} />;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <Loader2 size={14} className="animate-spin" />;
      case 'success':
        return <CheckCircle size={14} className="text-green-400" />;
      case 'error':
        return <AlertCircle size={14} className="text-red-400" />;
      default:
        return null;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Botón Adjuntar */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || !sessionId}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Adjuntar archivo (PDF, DOCX, TXT, MD, imágenes)"
      >
        <Paperclip size={18} />
        <span>Adjuntar archivo</span>
      </button>

      {/* Input oculto */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={Object.keys(ACCEPTED_FILE_TYPES).join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Chips de archivos */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map(fileData => (
            <div
              key={fileData.id}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
                fileData.status === 'error'
                  ? 'bg-red-900/20 border-red-700 text-red-300'
                  : fileData.status === 'success'
                  ? 'bg-green-900/20 border-green-700 text-green-300'
                  : 'bg-blue-900/20 border-blue-700 text-blue-300'
              }`}
            >
              {/* Icono de tipo */}
              {getFileIcon(fileData.type)}

              {/* Info del archivo */}
              <div className="flex flex-col min-w-0">
                <span className="truncate max-w-[200px] font-medium">
                  {fileData.name}
                </span>
                <span className="text-xs opacity-75">
                  {formatFileSize(fileData.size)}
                  {fileData.status === 'uploading' && ' • Subiendo...'}
                  {fileData.status === 'processing' && ' • Procesando...'}
                  {fileData.status === 'success' && ' • Listo'}
                  {fileData.status === 'error' && ` • Error: ${fileData.error}`}
                </span>
              </div>

              {/* Icono de estado */}
              {getStatusIcon(fileData.status)}

              {/* Botón eliminar */}
              {fileData.status !== 'uploading' && (
                <button
                  type="button"
                  onClick={() => removeFile(fileData.id)}
                  className="hover:opacity-70 transition-opacity ml-1"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
