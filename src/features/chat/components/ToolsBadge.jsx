/**
 * ToolsBadge.jsx
 * Componente para mostrar badges de tools ejecutados por AL-E
 * 
 * Muestra badges verdes con checkmark para cada tool ejecutado
 * + Badge de recuperación automática si hubo fallback
 * Actualizado: 16 enero 2026 - P0 metadata compliance
 */

import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

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
 * Badge de recuperación automática
 * Se muestra cuando tool_call_parsed=fail o fallback_invoked=true
 */
function RecoveryBadge() {
  return (
    <div
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium"
      style={{
        backgroundColor: 'rgba(251, 191, 36, 0.1)', // amber-400 con opacidad
        border: '1px solid rgba(251, 191, 36, 0.3)',
        color: 'rgb(251, 191, 36)' // amber-400
      }}
      title="AL-E ajustó automáticamente la respuesta para continuar"
    >
      <AlertCircle className="w-3 h-3" />
      <span>Recuperación automática</span>
    </div>
  );
}

/**
 * Contenedor de badges de tools
 */
export default function ToolsBadge({ toolsUsed, metadata }) {
  // Verificar si hubo recuperación automática
  const hadRecovery = metadata?.tool_call_parsed === 'fail' || metadata?.fallback_invoked === true;
  
  // Si no hay tools ni recovery, no mostrar nada
  const hasTools = toolsUsed && Array.isArray(toolsUsed) && toolsUsed.length > 0;
  if (!hasTools && !hadRecovery) {
    return null;
  }

  return (
    <div className="flex gap-1 flex-wrap mt-2">
      {/* Tools ejecutados exitosamente */}
      {hasTools && toolsUsed.map((tool, index) => (
        <ToolBadge key={`${tool}-${index}`} toolName={tool} />
      ))}
      
      {/* Badge de recuperación si aplica */}
      {hadRecovery && <RecoveryBadge />}
    </div>
  );
}
