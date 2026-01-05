import React from 'react';
import { FileText, Image, Loader2, CheckCircle2, XCircle } from 'lucide-react';

/**
 * Muestra el estado de procesamiento de un archivo adjunto
 * Estados: processing | indexed | error | vision_extracted
 */
export function AttachmentStatus({ attachment }) {
  const { name, type, status, extractedText, processingStatus } = attachment;
  
  const getIcon = () => {
    if (type?.startsWith('image/')) {
      return <Image size={14} />;
    }
    return <FileText size={14} />;
  };

  const getStatusDisplay = () => {
    if (status === 'processing' || processingStatus === 'processing') {
      return {
        icon: <Loader2 size={14} className="animate-spin" />,
        text: 'Procesando',
        color: 'var(--color-text-secondary)',
        bg: 'var(--color-bg-tertiary)'
      };
    }
    
    if (status === 'indexed' || processingStatus === 'indexed') {
      return {
        icon: <CheckCircle2 size={14} />,
        text: 'Indexado en Knowledge Core',
        color: '#10b981',
        bg: 'rgba(16, 185, 129, 0.1)'
      };
    }
    
    if (status === 'vision_extracted' || processingStatus === 'vision_extracted') {
      return {
        icon: <CheckCircle2 size={14} />,
        text: 'Texto extraído',
        color: '#10b981',
        bg: 'rgba(16, 185, 129, 0.1)'
      };
    }
    
    if (status === 'error' || processingStatus === 'error') {
      return {
        icon: <XCircle size={14} />,
        text: 'Error al procesar',
        color: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.1)'
      };
    }
    
    return null;
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className="flex items-start gap-3 p-3 rounded text-xs" style={{
      backgroundColor: 'var(--color-bg-secondary)',
      border: '1px solid var(--color-border)'
    }}>
      <div className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
        {getIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate mb-1" style={{ color: 'var(--color-text-primary)' }}>
          {name}
        </div>
        
        {statusDisplay && (
          <div className="flex items-center gap-2 mb-2">
            <div style={{ color: statusDisplay.color }}>
              {statusDisplay.icon}
            </div>
            <span style={{ color: statusDisplay.color }}>
              {statusDisplay.text}
            </span>
          </div>
        )}
        
        {extractedText && (
          <div className="mt-2 p-2 rounded text-[11px] font-mono" style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            color: 'var(--color-text-secondary)',
            maxHeight: '120px',
            overflowY: 'auto'
          }}>
            <div className="font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
              Texto detectado:
            </div>
            <div className="whitespace-pre-wrap">
              {extractedText}
            </div>
          </div>
        )}
        
        {(status === 'indexed' || processingStatus === 'indexed') && (
          <button
            className="mt-2 px-2 py-1 rounded text-[11px] font-medium transition-all"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: '#FFFFFF'
            }}
            onClick={() => {
              // TODO: Implementar "usar como contexto"
              console.log('Usar documento como contexto:', name);
            }}
          >
            Usar este documento como contexto
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Lista de archivos adjuntos con su estado de procesamiento
 */
export function AttachmentsList({ attachments }) {
  if (!attachments || attachments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 mb-3">
      {attachments.map((attachment, idx) => (
        <AttachmentStatus key={idx} attachment={attachment} />
      ))}
    </div>
  );
}
