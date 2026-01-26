import React from 'react';
import { Mic, MicOff } from 'lucide-react';

/**
 * 🎤 Switch visible para activar/desactivar modo voz
 * 
 * Funciona igual que ChatGPT:
 * - ON: Escucha y responde con voz
 * - OFF: Solo texto, sin audio
 * 
 * Props:
 * - enabled: boolean (estado actual)
 * - onChange: (newState: boolean) => void
 * - disabled: boolean (opcional, si no hay permisos de micrófono)
 */
export function VoiceModeSwitch({ enabled, onChange, disabled = false }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Icono */}
      <div className={`transition-colors ${enabled ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
        {enabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
      </div>

      {/* Label */}
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Modo Voz
      </span>

      {/* Toggle Switch */}
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={disabled}
        onClick={() => onChange(!enabled)}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full
          transition-colors duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${enabled 
            ? 'bg-blue-600 dark:bg-blue-500' 
            : 'bg-gray-300 dark:bg-gray-600'
          }
        `}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white
            transition-transform duration-200 ease-in-out
            ${enabled ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>

      {/* Estado (opcional, solo para debug) */}
      {process.env.NODE_ENV === 'development' && (
        <span className="text-xs text-gray-500">
          {enabled ? 'ON' : 'OFF'}
        </span>
      )}
    </div>
  );
}
