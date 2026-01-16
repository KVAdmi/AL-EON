/**
 * MessageMetadata.jsx
 * Componente para mostrar metadata de mensajes de AL-E
 * 
 * Muestra modelo y latencia en texto pequeño
 * Actualizado: 16 enero 2026
 */

import React from 'react';

/**
 * Componente de metadata del mensaje
 */
export default function MessageMetadata({ metadata, executionTime }) {
  // Si no hay metadata ni executionTime, no mostrar nada
  if (!metadata && !executionTime) {
    return null;
  }

  // Extraer modelo y limpiarlo (quitar prefijos como "groq/")
  const model = metadata?.model ? metadata.model.replace(/^(groq|openai|fireworks)\//, '') : null;
  const time = executionTime || metadata?.execution_time || 0;

  return (
    <div 
      className="text-xs mt-1"
      style={{ color: 'var(--color-text-tertiary)' }}
    >
      {model && <span>{model}</span>}
      {model && time > 0 && <span> • </span>}
      {time > 0 && <span>{time}ms</span>}
    </div>
  );
}
