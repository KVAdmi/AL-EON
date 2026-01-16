/**
 * DebugInfo.jsx
 * Componente colapsable para mostrar información de debug
 * 
 * Muestra el JSON completo con metadata y debug del backend
 * Solo visible cuando el usuario activa "Debug Mode"
 * 
 * Actualizado: 16 enero 2026
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Code } from 'lucide-react';

export default function DebugInfo({ message }) {
  const [isOpen, setIsOpen] = useState(false);

  // Si no hay metadata o debug, no mostrar nada
  if (!message.metadata && !message.debug && !message.toolsUsed) {
    return null;
  }

  const debugData = {
    metadata: message.metadata || null,
    debug: message.debug || null,
    toolsUsed: message.toolsUsed || [],
    executionTime: message.executionTime || 0,
  };

  return (
    <div className="mt-2 border-t pt-2" style={{ borderColor: 'var(--color-border)' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-xs hover:opacity-80 transition-opacity"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        <Code className="w-3 h-3" />
        <span>Ver logs técnicos</span>
        {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {isOpen && (
        <div className="mt-2">
          <pre
            className="text-xs p-2 rounded overflow-x-auto"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {JSON.stringify(debugData, null, 2)}
          </pre>

          {message.metadata && (
            <div 
              className="mt-2 space-y-1 text-xs"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              <div>Request ID: {message.metadata.request_id}</div>
              <div>Timestamp: {message.metadata.timestamp}</div>
              <div>Tools executed: {message.metadata.tools_executed}</div>
              <div>Source: {message.metadata.source}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
