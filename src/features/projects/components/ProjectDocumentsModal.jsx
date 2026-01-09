import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, Trash2, Download, Eye } from 'lucide-react';
import { uploadFile } from '@/lib/fileUpload';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

/**
 * Modal para gestionar documentos de un proyecto
 * Los documentos se guardan en: user-files/{userId}/projects/{projectId}/
 */
export function ProjectDocumentsModal({ isOpen, onClose, project }) {
  const { userId } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && project) {
      loadDocuments();
    }
  }, [isOpen, project]);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      // Buscar documentos del proyecto en la carpeta específica
      const projectPath = `${userId}/projects/${project.id}/`;
      
      const { data, error } = await supabase.storage
        .from('user-files')
        .list(projectPath, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) throw error;

      setDocuments(data || []);
    } catch (error) {
      console.error('Error cargando documentos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      // Subir cada archivo a la carpeta del proyecto
      for (const file of files) {
        // ✅ MANTENER NOMBRE ORIGINAL (sin renombrar)
        const fileName = file.name;
        const filePath = `${userId}/projects/${project.id}/${fileName}`;

        const { error } = await supabase.storage
          .from('user-files')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true // ✅ Permitir sobrescribir si subes el mismo archivo
          });

        if (error) throw error;
      }

      await loadDocuments();
    } catch (error) {
      console.error('Error subiendo archivos:', error);
      alert('Error subiendo archivos: ' + error.message);
    } finally {
      setIsUploading(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleDeleteDocument = async (documentName) => {
    if (!confirm(`¿Eliminar "${documentName}"?`)) return;

    try {
      const filePath = `${userId}/projects/${project.id}/${documentName}`;
      
      const { error } = await supabase.storage
        .from('user-files')
        .remove([filePath]);

      if (error) throw error;

      await loadDocuments();
    } catch (error) {
      console.error('Error eliminando documento:', error);
      alert('Error eliminando documento: ' + error.message);
    }
  };

  const handleDownloadDocument = async (documentName) => {
    try {
      const filePath = `${userId}/projects/${project.id}/${documentName}`;
      
      const { data, error } = await supabase.storage
        .from('user-files')
        .download(filePath);

      if (error) throw error;

      // Crear URL temporal y descargar
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = documentName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error descargando documento:', error);
      alert('Error descargando documento: ' + error.message);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div 
        className="w-full max-w-2xl max-h-[80vh] rounded-xl shadow-2xl flex flex-col"
        style={{ 
          backgroundColor: 'var(--color-bg-primary)',
          border: '1px solid var(--color-border)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{project?.icon || '📁'}</span>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Documentos de {project?.name}
              </h2>
              <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                {documents.length} documento{documents.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-all"
            style={{ color: 'var(--color-text-secondary)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Upload Area */}
        <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <label 
            className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer transition-all hover:bg-[var(--color-bg-secondary)]"
            style={{ 
              borderColor: isUploading ? 'var(--color-accent)' : 'var(--color-border)',
              color: 'var(--color-text-secondary)'
            }}
          >
            <Upload size={20} />
            <span>{isUploading ? 'Subiendo...' : 'Haz clic o arrastra archivos aquí'}</span>
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.md,.csv,.xlsx,.xls"
            />
          </label>
        </div>

        {/* Documents List */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" 
                style={{ borderColor: 'var(--color-accent)' }} 
              />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--color-text-tertiary)' }}>
              <FileText size={48} className="mx-auto mb-3 opacity-50" />
              <p>No hay documentos en este proyecto</p>
              <p className="text-sm mt-1">Sube archivos para que AL-E pueda accederlos</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.name}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-[var(--color-bg-secondary)] transition-all"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <FileText size={20} style={{ color: 'var(--color-accent)' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {doc.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                      {formatFileSize(doc.metadata?.size || 0)} • {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDownloadDocument(doc.name)}
                      className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-all"
                      style={{ color: 'var(--color-text-secondary)' }}
                      title="Descargar"
                    >
                      <Download size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteDocument(doc.name)}
                      className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-all"
                      style={{ color: 'var(--color-error, #ef4444)' }}
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            💡 Los documentos se guardan en el bucket de Supabase. AL-E puede acceder a ellos cuando los menciones en el chat.
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectDocumentsModal;
