/**
 * ToolsBadge.jsx
 * Componente para mostrar badges de tools ejecutados por AL-E
 * 
 * Muestra badges verdes con checkmark para cada tool ejecutado
 * Actualizado: 16 enero 2026
 */

import React from 'react';
import { CheckCircle } from 'lucide-react';

/**
 * Badge individual para un tool
 */
function ToolBadge({ toolName }) {
  // Convertir snake_case a espacios legibles
  const displayName = toolName.replace(/_/g, ' ');
  
  return (
    <div
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium"
      style={{
        backgroundColor: 'rgba(34, 197, 94, 0.1)', // green-500 con opacidad
        border: '1px solid rgba(34, 197, 94, 0.3)',
        color: 'rgb(34, 197, 94)' // green-500
      }}
    >
      <CheckCircle className="w-3 h-3" />
      <span>{displayName}</span>
    </div>
  );
}

/**
 * Contenedor de badges de tools
 */
export default function ToolsBadge({ toolsUsed }) {
  // Si no hay tools, no mostrar nada
  if (!toolsUsed || !Array.isArray(toolsUsed) || toolsUsed.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-1 flex-wrap mt-2">
      {toolsUsed.map((tool, index) => (
        <ToolBadge key={`${tool}-${index}`} toolName={tool} />
      ))}
    </div>
  );
}
