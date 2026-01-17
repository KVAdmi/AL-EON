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
  error = null,
  onModeChange,
  onStartRecording,
  onStopRecording,
  onStopAll,
  onToggleHandsFree,
  disabled = false
}) {
  const isBusy = Boolean(isProcessing || isSpeaking || isSending);

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
          type="button"
          onClick={() => onModeChange?.('text')}
          disabled={disabled || isBusy}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            mode === 'text' ? 'shadow-lg' : 'hover:opacity-80'
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
          type="button"
          onClick={() => onModeChange?.('voice')}
          disabled={disabled || isBusy}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            mode === 'voice' ? 'shadow-lg' : 'hover:opacity-80'
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
              type="button"
              onClick={isRecording ? onStopRecording : onStartRecording}
              disabled={disabled || isBusy}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                isRecording ? 'shadow-lg animate-pulse' : 'shadow-lg hover:opacity-90'
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
                type="button"
                onClick={onStopAll}
                className="px-4 py-3 rounded-lg font-medium transition-all hover:opacity-80"
                style={{
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF'
                }}
                aria-label="Detener todo"
                title="Detener todo"
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
            {status === 'idle' && <span>✅ Listo - presiona "Grabar" para comenzar</span>}
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
          {transcript ? (
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
          ) : null}

          {/* Error visible */}
          {error ? (
            <div
              className="text-sm px-3 py-2 rounded border flex items-start gap-2"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderColor: 'rgba(239, 68, 68, 0.3)',
                color: '#ef4444'
              }}
            >
              <span className="text-base">⚠️</span>
              <span>{error?.message || String(error)}</span>
            </div>
          ) : null}

          {/* Toggle Manos Libres */}
          <div
            className="flex items-center justify-between pt-2 border-t"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <label
              htmlFor="handsFreeToggle"
              className="text-sm font-medium cursor-pointer"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Modo Manos Libres
            </label>

            <button
              type="button"
              id="handsFreeToggle"
              onClick={onToggleHandsFree}
              disabled={disabled || isBusy}
              className={`relative w-12 h-6 rounded-full transition-all ${
                disabled || isBusy ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
              style={{
                backgroundColor: handsFree ? '#22C55E' : 'var(--color-bg-secondary)'
              }}
              aria-pressed={handsFree}
              aria-label="Alternar manos libres"
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
                <strong>Manos libres activado:</strong> AL-E volverá a escuchar automáticamente después de cada respuesta.
              </span>
            ) : (
              <span>
                <strong>Manos libres desactivado:</strong> Presiona “Grabar” cada vez que quieras hablar.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


