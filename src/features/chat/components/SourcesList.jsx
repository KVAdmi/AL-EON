import React from 'react';
import { FileText, Image, Code, AlertCircle } from 'lucide-react';

/**
 * Componente para mostrar fuentes de conocimiento en las respuestas de AL-E
 * NO muestra nada si no hay fuentes reales del backend
 */
export function SourcesList({ sources }) {
  if (!sources || sources.length === 0) {
    return null;
  }

  const getSourceIcon = (type) => {
    switch (type) {
      case 'vision':
        return <Image size={14} />;
      case 'pdf':
      case 'docx':
      case 'md':
        return <FileText size={14} />;
      case 'code':
        return <Code size={14} />;
      default:
        return <FileText size={14} />;
    }
  };

  const getScoreColor = (score) => {
    if (score >= 0.8) return '#10b981'; // green
    if (score >= 0.6) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  return (
    <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Fuentes
        </span>
        <span className="text-xs px-2 py-0.5 rounded" style={{ 
          backgroundColor: 'var(--color-bg-tertiary)',
          color: 'var(--color-text-tertiary)'
        }}>
          {sources.length}
        </span>
      </div>
      
      <div className="space-y-2">
        {sources.map((source, idx) => (
          <div
            key={idx}
            className="flex items-start gap-2 p-2 rounded text-xs"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border)'
            }}
          >
            <div className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
              {getSourceIcon(source.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="font-mono truncate" style={{ color: 'var(--color-text-primary)' }}>
                {source.repo || 'docs'}/{source.path}
              </div>
              
              {source.type && (
                <div className="mt-1 flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-medium" style={{
                    backgroundColor: 'var(--color-bg-primary)',
                    color: 'var(--color-text-tertiary)'
                  }}>
                    {source.type}
                  </span>
                  
                  {source.score !== undefined && (
                    <span className="text-[10px] font-medium" style={{
                      color: getScoreColor(source.score)
                    }}>
                      {Math.round(source.score * 100)}% match
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Badge para mostrar cuando NO hay fuentes (backend respondió sin evidencia)
 */
export function NoSourcesBadge() {
  return (
    <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
      <div className="flex items-center gap-2 p-2 rounded text-xs" style={{
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.3)'
      }}>
        <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
        <span style={{ color: 'var(--color-text-primary)' }}>
          Sin evidencia - Respuesta sin fuentes verificadas
        </span>
      </div>
    </div>
  );
}
