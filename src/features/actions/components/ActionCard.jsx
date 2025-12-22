/**
 * ActionCard - Tarjeta para ejecutar acciones
 * 
 * CARACTERÍSTICAS:
 * - Renderiza acciones sugeridas por AL-E
 * - Botón "Ejecutar"
 * - Muestra estado y resultado
 */

import React, { useState } from 'react';
import { Play, Loader2, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { runAction } from '@/services/actionsService';

export default function ActionCard({ action, sessionId, onActionExecuted }) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleExecute = async () => {
    setIsExecuting(true);
    setError(null);
    setResult(null);

    try {
      const response = await runAction({
        actionId: action.id,
        payload: action.payload || {},
        sessionId
      });

      setResult(response);
      onActionExecuted?.(action, response);
    } catch (err) {
      console.error('❌ Error ejecutando acción:', err);
      setError(err.message);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="rounded-lg border border-purple-700 bg-purple-900/20 p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 p-2 rounded-lg bg-purple-800/50">
            <Zap size={20} className="text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-purple-300 mb-1">
              {action.title || action.name || 'Acción'}
            </h4>
            {action.description && (
              <p className="text-sm text-gray-400">
                {action.description}
              </p>
            )}
          </div>
        </div>

        {/* Botón Ejecutar */}
        {!result && !error && (
          <button
            onClick={handleExecute}
            disabled={isExecuting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExecuting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Ejecutando...</span>
              </>
            ) : (
              <>
                <Play size={16} />
                <span>Ejecutar</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Parámetros (si existen) */}
      {action.parameters && Object.keys(action.parameters).length > 0 && (
        <div className="mb-3 p-3 rounded bg-purple-900/30 border border-purple-800">
          <div className="text-xs text-purple-400 font-medium mb-2">Parámetros:</div>
          <div className="space-y-1 text-xs text-gray-400">
            {Object.entries(action.parameters).map(([key, value]) => (
              <div key={key}>
                <span className="text-purple-300">{key}:</span> {JSON.stringify(value)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resultado */}
      {result && (
        <div className="mt-3 p-3 rounded bg-green-900/30 border border-green-800">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={16} className="text-green-400" />
            <span className="text-sm font-medium text-green-300">Completado</span>
          </div>
          {result.message && (
            <p className="text-sm text-gray-300">{result.message}</p>
          )}
          {result.data && (
            <pre className="mt-2 text-xs text-gray-400 overflow-x-auto">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-3 p-3 rounded bg-red-900/30 border border-red-800">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={16} className="text-red-400" />
            <span className="text-sm font-medium text-red-300">Error</span>
          </div>
          <p className="text-sm text-gray-300">{error}</p>
        </div>
      )}
    </div>
  );
}

/**
 * ActionsPanel - Panel con múltiples acciones
 */
export function ActionsPanel({ actions, sessionId, onActionExecuted }) {
  if (!actions || actions.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Zap size={16} className="text-purple-400" />
        <span>Acciones sugeridas:</span>
      </div>
      {actions.map((action, index) => (
        <ActionCard
          key={action.id || index}
          action={action}
          sessionId={sessionId}
          onActionExecuted={onActionExecuted}
        />
      ))}
    </div>
  );
}
