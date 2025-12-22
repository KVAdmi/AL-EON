/**
 * WebSearchToggle - Toggle para activar búsqueda web
 * 
 * CARACTERÍSTICAS:
 * - Toggle On/Off
 * - Muestra fuentes cuando está activo
 * - Citas al final de respuestas
 */

import React from 'react';
import { Globe, ExternalLink } from 'lucide-react';

export default function WebSearchToggle({ enabled, onToggle, disabled }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
        enabled
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={enabled ? 'Búsqueda web activada' : 'Activar búsqueda web'}
    >
      <Globe size={18} />
      <span>Web</span>
      {enabled && (
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
      )}
    </button>
  );
}

/**
 * WebSources - Panel de fuentes web
 */
export function WebSources({ sources }) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-4 p-4 rounded-lg border border-blue-700 bg-blue-900/20">
      <div className="flex items-center gap-2 mb-3">
        <Globe size={18} className="text-blue-400" />
        <span className="font-medium text-blue-300">Fuentes Web</span>
      </div>

      <div className="space-y-2">
        {sources.map((source, index) => (
          <a
            key={index}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-2 p-2 rounded hover:bg-blue-900/30 transition-colors group"
          >
            <ExternalLink size={14} className="text-blue-400 mt-1 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-blue-300 group-hover:underline truncate">
                {source.title || source.url}
              </div>
              {source.snippet && (
                <div className="text-xs text-gray-400 mt-1 line-clamp-2">
                  {source.snippet}
                </div>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

/**
 * WebCitations - Citas al final de mensajes
 */
export function WebCitations({ citations }) {
  if (!citations || citations.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-gray-700">
      <div className="text-xs text-gray-500 space-y-1">
        {citations.map((citation, index) => (
          <div key={index}>
            <a
              href={citation.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-400 hover:underline"
            >
              [{index + 1}] {citation.title || citation.url}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
