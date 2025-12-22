/**
 * VoiceControls - Controles de interfaz para modo de voz
 * 
 * CARACTERÍSTICAS:
 * - Toggle: Modo Texto / Modo Voz Total
 * - Botón micrófono (push-to-talk)
 * - Botón detener (stop all)
 * - Botón silenciar (mute TTS)
 * - Toggle manos libres
 * - Todo en español
 */

import React from 'react';
import { Mic, MicOff, Square, Volume2, VolumeX, MessageSquare, Waves } from 'lucide-react';

export default function VoiceControls({
  mode = 'text',
  status = 'idle',
  handsFree = false,
  isListening = false,
  isSpeaking = false,
  sttSupported = true,
  ttsSupported = true,
  onModeChange,
  onStartListening,
  onStopAll,
  onToggleMute,
  onToggleHandsFree,
  disabled = false
}) {
  const isBusy = status === 'processing' || isSpeaking;

  return (
    <div className="flex flex-col gap-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
      {/* Selector de Modo */}
      <div className="flex gap-2">
        <button
          onClick={() => onModeChange?.('text')}
          disabled={disabled || isBusy}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            mode === 'text'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          } ${disabled || isBusy ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <MessageSquare size={18} />
          <span>Modo Texto</span>
        </button>
        
        <button
          onClick={() => onModeChange?.('voice')}
          disabled={disabled || isBusy || !sttSupported || !ttsSupported}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            mode === 'voice'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          } ${disabled || isBusy || !sttSupported || !ttsSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Waves size={18} />
          <span>Modo Voz Total</span>
        </button>
      </div>

      {/* Mensaje de soporte */}
      {(!sttSupported || !ttsSupported) && (
        <div className="text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-800 rounded px-3 py-2">
          {!sttSupported && !ttsSupported && (
            <span>⚠️ Tu navegador no soporta reconocimiento de voz ni síntesis de voz.</span>
          )}
          {sttSupported && !ttsSupported && (
            <span>⚠️ Tu navegador no soporta síntesis de voz.</span>
          )}
          {!sttSupported && ttsSupported && (
            <span>⚠️ Tu navegador no soporta reconocimiento de voz.</span>
          )}
        </div>
      )}

      {/* Controles de Voz */}
      {mode === 'voice' && (
        <div className="flex flex-col gap-2">
          {/* Botones principales */}
          <div className="flex gap-2">
            {/* Botón Micrófono */}
            <button
              onClick={isListening ? onStopAll : onStartListening}
              disabled={disabled || !sttSupported || isBusy}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                isListening
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/50 animate-pulse'
                  : 'bg-green-600 text-white hover:bg-green-500 shadow-lg shadow-green-600/30'
              } ${disabled || !sttSupported || isBusy ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isListening ? (
                <>
                  <MicOff size={20} />
                  <span>Detener</span>
                </>
              ) : (
                <>
                  <Mic size={20} />
                  <span>Hablar</span>
                </>
              )}
            </button>

            {/* Botón Detener Todo */}
            <button
              onClick={onStopAll}
              disabled={disabled || (!isListening && !isSpeaking)}
              className={`px-4 py-3 rounded-lg font-medium transition-all ${
                isListening || isSpeaking
                  ? 'bg-red-600 text-white hover:bg-red-500'
                  : 'bg-gray-700 text-gray-400'
              } ${disabled || (!isListening && !isSpeaking) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Square size={20} />
            </button>

            {/* Botón Silenciar */}
            <button
              onClick={onToggleMute}
              disabled={disabled || !ttsSupported}
              className={`px-4 py-3 rounded-lg font-medium transition-all ${
                isSpeaking
                  ? 'bg-orange-600 text-white hover:bg-orange-500'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              } ${disabled || !ttsSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSpeaking ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
          </div>

          {/* Toggle Manos Libres */}
          <div className="flex items-center justify-between px-3 py-2 bg-gray-700/50 rounded-lg">
            <span className="text-sm text-gray-300 font-medium">
              Modo Manos Libres
            </span>
            <button
              onClick={onToggleHandsFree}
              disabled={disabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                handsFree ? 'bg-green-600' : 'bg-gray-600'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  handsFree ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Descripción Manos Libres */}
          {handsFree && (
            <div className="text-xs text-gray-400 px-3 py-2 bg-green-900/20 border border-green-800 rounded">
              ✨ AL-E volverá a escuchar automáticamente después de cada respuesta
            </div>
          )}
        </div>
      )}

      {/* Controles de Modo Texto */}
      {mode === 'text' && ttsSupported && (
        <div className="text-xs text-gray-400 px-3 py-2 bg-blue-900/20 border border-blue-800 rounded">
          💬 Escribe tus mensajes. AL-E puede leer sus respuestas si lo deseas.
        </div>
      )}
    </div>
  );
}
