/**
 * VoiceControls - Controles de interfaz para modo de voz (backend-first)
 * 
 * CARACTERÍSTICAS:
 * - Toggle: Modo Texto / Modo Voz Manos Libres
 * - Botón micrófono (push-to-talk para grabar)
 * - Botón detener (stop all)
 * - Indicador de estado (grabando, procesando, hablando)
 * - Todo en español
 * 
 * ARQUITECTURA:
 * - Frontend: captura audio + reproduce respuesta
 * - Backend (AL-E Core): STT + chat + TTS
 */

import React from 'react';
import { Mic, MicOff, Square, MessageSquare, Waves, Loader } from 'lucide-react';

export default function VoiceControls({
  mode = 'text',
  status = 'idle',
  handsFree = false,
  isRecording = false,
  isProcessing = false,
  isSpeaking = false,
  isSending = false,
  transcript = '',
  onModeChange,
  onStartRecording,
  onStopRecording,
  onStopAll,
  onToggleHandsFree,
  disabled = false
}) {
  const isBusy = isProcessing || isSpeaking || isSending;

  return (
    <div 
      className="flex flex-col gap-3 p-4 rounded-lg border" 
      style={{ 
        backgroundColor: 'var(--color-bg-tertiary)', 
        borderColor: 'var(--color-border)' 
      }}
    >
      {/* Selector de Modo */}
      <div className="flex gap-2">
        <button
          onClick={() => onModeChange?.('text')}
          disabled={disabled || isBusy}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            mode === 'text'
              ? 'shadow-lg'
              : 'hover:opacity-80'
          } ${disabled || isBusy ? 'opacity-50 cursor-not-allowed' : ''}`}
          style={{
            backgroundColor: mode === 'text' ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
            color: mode === 'text' ? '#FFFFFF' : 'var(--color-text-secondary)'
          }}
        >
          <MessageSquare size={18} />
          <span>Modo Texto</span>
        </button>
        
        <button
          onClick={() => onModeChange?.('voice')}
          disabled={disabled || isBusy}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            mode === 'voice'
              ? 'shadow-lg'
              : 'hover:opacity-80'
          } ${disabled || isBusy ? 'opacity-50 cursor-not-allowed' : ''}`}
          style={{
            backgroundColor: mode === 'voice' ? '#9333EA' : 'var(--color-bg-secondary)',
            color: mode === 'voice' ? '#FFFFFF' : 'var(--color-text-secondary)'
          }}
        >
          <Waves size={18} />
          <span>Modo Voz Manos Libres</span>
        </button>
      </div>

      {/* Controles de Voz */}
      {mode === 'voice' && (
        <div className="flex flex-col gap-2">
          {/* Botón Micrófono */}
          <div className="flex gap-2">
            <button
              onClick={isRecording ? onStopRecording : onStartRecording}
              disabled={disabled || isBusy}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                isRecording
                  ? 'shadow-lg animate-pulse'
                  : 'shadow-lg hover:opacity-90'
              } ${disabled || isBusy ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{
                backgroundColor: isRecording ? '#EF4444' : '#22C55E',
                color: '#FFFFFF'
              }}
            >
              {isRecording ? (
                <>
                  <MicOff size={20} />
                  <span>Detener Grabación</span>
                </>
              ) : (
                <>
                  <Mic size={20} />
                  <span>Grabar</span>
                </>
              )}
            </button>

            {/* Botón Detener Todo */}
            {(isRecording || isBusy) && (
              <button
                onClick={onStopAll}
                className="px-4 py-3 rounded-lg font-medium transition-all hover:opacity-80"
                style={{
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF'
                }}
              >
                <Square size={20} />
              </button>
            )}
          </div>

          {/* Indicador de Estado */}
          <div 
            className="text-sm px-3 py-2 rounded border flex items-center gap-2"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)'
            }}
          >
            {status === 'idle' && (
              <span>✅ Listo - presiona "Grabar" para comenzar</span>
            )}
            {status === 'recording' && (
              <>
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span>🎤 Grabando tu voz...</span>
              </>
            )}
            {status === 'processing' && (
              <>
                <Loader size={14} className="animate-spin" />
                <span>⚙️ Procesando (STT → Chat → TTS)...</span>
              </>
            )}
            {status === 'speaking' && (
              <>
                <Waves size={14} className="animate-pulse" />
                <span>🔊 AL-E está hablando...</span>
              </>
            )}
          </div>

          {/* Transcripción */}
          {transcript && (
            <div 
              className="text-xs px-3 py-2 rounded border"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-tertiary)'
              }}
            >
              <strong>Transcripción:</strong> {transcript}
            </div>
          )}

          {/* Toggle Manos Libres */}
          <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <label 
              htmlFor="handsFreeToggle" 
              className="text-sm font-medium cursor-pointer"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Modo Manos Libres
            </label>
            <button
              id="handsFreeToggle"
              onClick={onToggleHandsFree}
              disabled={disabled || isBusy}
              className={`relative w-12 h-6 rounded-full transition-all ${
                disabled || isBusy ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
              style={{
                backgroundColor: handsFree ? '#22C55E' : 'var(--color-bg-secondary)'
              }}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  handsFree ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Descripción Manos Libres */}
          <div 
            className="text-xs px-3 py-2 rounded border"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-tertiary)'
            }}
          >
            {handsFree ? (
              <span>
                ✅ <strong>Manos libres activado:</strong> AL-E volverá a escuchar automáticamente después de cada respuesta.
              </span>
            ) : (
              <span>
                ℹ️ <strong>Manos libres desactivado:</strong> Deberás presionar "Grabar" para cada turno de voz.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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

