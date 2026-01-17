/**
 * FIX: Validación de procesamiento de archivos
 * 
 * PROBLEMAS QUE RESUELVE:
 * 1. Chips muestran "success" aunque el backend no procesó el archivo
 * 2. No se distingue entre "subido" y "procesado correctamente"
 * 3. PDFs/imágenes fallan silenciosamente sin error visible
 * 
 * CAMBIOS:
 * - Validar que backend devuelva `processed: true`
 * - Mostrar error si archivo se subió pero no se procesó
 * - Agregar botón "Reintentar" en archivos fallidos
 * - Loggear detalles de procesamiento
 */

import React, { useRef, useState } from 'react';
import { Paperclip, X, FileText, Image as ImageIcon, Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
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

export default function FileUploadButtonFixed({ sessionId, onFilesUploaded, disabled }) {
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
      error: null,
      processed: false, // 🔥 NUEVO: Flag de procesamiento
      retryCount: 0 // 🔥 NUEVO: Contador de reintentos
    }));

    setFiles(prev => [...prev, ...newFiles]);

    // Subir archivos
    for (const fileData of newFiles) {
      await uploadFile(fileData);
    }

    // Limpiar input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 🔥 NUEVA FUNCIÓN: Upload con validación de procesamiento
  const uploadFile = async (fileData) => {
    try {
      // Paso 1: Actualizar a "processing"
      setFiles(prev =>
        prev.map(f =>
          f.id === fileData.id ? { ...f, status: 'processing', progress: 50 } : f
        )
      );

      console.log(`[FileUpload] 📤 Subiendo archivo: ${fileData.name}`);

      // Paso 2: Subir y procesar
      const result = await uploadAndIngestFile(fileData.file, sessionId);

      console.log(`[FileUpload] ✅ Respuesta del backend:`, result);

      // 🔥 VALIDAR QUE EL ARCHIVO FUE PROCESADO CORRECTAMENTE
      if (!result.processed && !result.ok) {
        throw new Error(result.error || 'El archivo se subió pero no se pudo procesar');
      }

      // 🔥 VALIDAR QUE PARA PDFs SE EXTRAJO TEXTO
      if (fileData.type === 'application/pdf' && !result.extractedText && !result.text) {
        console.warn(`[FileUpload] ⚠️ PDF subido pero sin texto extraído:`, fileData.name);
        throw new Error('No se pudo extraer texto del PDF. Verifica que sea un PDF válido.');
      }

      // Paso 3: Actualizar a "success"
      setFiles(prev =>
        prev.map(f =>
          f.id === fileData.id
            ? { 
                ...f, 
                ...result, 
                status: 'success', 
                progress: 100,
                processed: true,
                error: null
              }
            : f
        )
      );

      console.log(`[FileUpload] ✅ Archivo procesado correctamente: ${fileData.name}`);

      // Notificar archivo subido
      onFilesUploaded?.([result]);

    } catch (error) {
      console.error(`[FileUpload] ❌ Error con archivo ${fileData.name}:`, error);

      // Actualizar a "error"
      setFiles(prev =>
        prev.map(f =>
          f.id === fileData.id
            ? { 
                ...f, 
                status: 'error', 
                error: error.message,
                processed: false
              }
            : f
        )
      );
    }
  };

  // 🔥 NUEVA FUNCIÓN: Reintentar archivo fallido
  const retryFile = async (fileId) => {
    const fileData = files.find(f => f.id === fileId);
    if (!fileData || fileData.retryCount >= 3) {
      console.warn(`[FileUpload] ⚠️ Máximo de reintentos alcanzado para: ${fileData?.name}`);
      return;
    }

    console.log(`[FileUpload] 🔄 Reintentando archivo: ${fileData.name} (intento ${fileData.retryCount + 1})`);

    // Actualizar contador de reintentos
    setFiles(prev =>
      prev.map(f =>
        f.id === fileId ? { ...f, retryCount: f.retryCount + 1, status: 'uploading' } : f
      )
    );

    await uploadFile(fileData);
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

  const getStatusIcon = (fileData) => {
    switch (fileData.status) {
      case 'uploading':
      case 'processing':
        return <Loader2 size={14} className="animate-spin" />;
      case 'success':
        return <CheckCircle size={14} />;
      case 'error':
        return <AlertCircle size={14} />;
      default:
        return null;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Botón adjuntar */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
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
                  {fileData.status === 'success' && fileData.processed && ' • ✅ Procesado'}
                  {fileData.status === 'success' && !fileData.processed && ' • ⚠️ Subido sin procesar'}
                  {fileData.status === 'error' && ` • ❌ ${fileData.error}`}
                </span>
              </div>

              {/* Icono de estado */}
              {getStatusIcon(fileData)}

              {/* 🔥 NUEVO: Botón reintentar (si falló) */}
              {fileData.status === 'error' && fileData.retryCount < 3 && (
                <button
                  type="button"
                  onClick={() => retryFile(fileData.id)}
                  className="hover:opacity-70 transition-opacity ml-1"
                  title="Reintentar"
                >
                  <RefreshCw size={14} />
                </button>
              )}

              {/* Botón eliminar */}
              {fileData.status !== 'uploading' && fileData.status !== 'processing' && (
                <button
                  type="button"
                  onClick={() => removeFile(fileData.id)}
                  className="hover:opacity-70 transition-opacity ml-1"
                  title="Eliminar"
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
