/**
 * VoiceStatusIndicator - Indicador visual del estado de voz
 * 
 * Muestra el estado actual del sistema de voz:
 * - Escuchando...
 * - Procesando...
 * - AL-E hablando...
 * - (idle: no muestra nada)
 */

import React from 'react';
import { Mic, Loader2, Volume2, MessagesSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function VoiceStatusIndicator({
  status = 'idle',
  transcript = '',
  interimTranscript = ''
}) {
  if (status === 'idle') return null;

  const statusConfig = {
    listening: {
      icon: Mic,
      text: 'Escuchando...',
      color: 'text-green-400',
      bgColor: 'bg-green-900/30',
      borderColor: 'border-green-700',
      animation: 'pulse'
    },
    processing: {
      icon: Loader2,
      text: 'Procesando...',
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/30',
      borderColor: 'border-blue-700',
      animation: 'spin'
    },
    speaking: {
      icon: Volume2,
      text: 'AL-E hablando...',
      color: 'text-purple-400',
      bgColor: 'bg-purple-900/30',
      borderColor: 'border-purple-700',
      animation: 'pulse'
    }
  };

  const config = statusConfig[status] || statusConfig.processing;
  const Icon = config.icon;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`flex items-start gap-3 p-4 rounded-lg border ${config.bgColor} ${config.borderColor}`}
      >
        {/* Icono animado */}
        <div className={`flex-shrink-0 ${config.color}`}>
          <Icon 
            size={20} 
            className={config.animation === 'spin' ? 'animate-spin' : 'animate-pulse'}
          />
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <div className={`font-medium ${config.color}`}>
            {config.text}
          </div>

          {/* Transcripción en tiempo real */}
          {status === 'listening' && (transcript || interimTranscript) && (
            <div className="mt-2 space-y-1">
              {transcript && (
                <div className="text-sm text-white font-medium">
                  "{transcript}"
                </div>
              )}
              {interimTranscript && (
                <div className="text-sm text-gray-400 italic">
                  {interimTranscript}...
                </div>
              )}
            </div>
          )}

          {/* Consejos por estado */}
          {status === 'listening' && !transcript && !interimTranscript && (
            <div className="mt-1 text-xs text-gray-400">
              Habla ahora para que AL-E te escuche
            </div>
          )}

          {status === 'processing' && (
            <div className="mt-1 text-xs text-gray-400">
              Enviando tu mensaje a AL-E...
            </div>
          )}

          {status === 'speaking' && (
            <div className="mt-1 text-xs text-gray-400">
              Escucha la respuesta de AL-E
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
