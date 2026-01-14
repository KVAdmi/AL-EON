/**
 * LiveAssistantPanel.jsx
 * Panel de asistente en vivo con TTS
 * SIN EMOJIS - Diseño enterprise
 */

import React, { useState, useRef } from 'react';
import { MessageSquare, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { speak, stopSpeaking, isTTSAvailable } from '@/utils/tts';

export default function LiveAssistantPanel({ meetingId, meetingResult }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const handleAsk = async () => {
    if (!question.trim()) return;

    try {
      setIsAsking(true);
      setError('');
      
      // Para demo: generar respuesta local basada en el resultado de la reunión
      // TODO: Integrar con endpoint de chat cuando esté disponible
      const localAnswer = generateLocalAnswer(question, meetingResult);
      setAnswer(localAnswer);
      setQuestion('');
      
    } catch (err) {
      console.error('[LiveAssistant] Error:', err);
      setError(err.message || 'No se pudo procesar la consulta');
    } finally {
      setIsAsking(false);
    }
  };

  const generateLocalAnswer = (q, result) => {
    const qLower = q.toLowerCase();
    
    // Buscar palabras clave
    if (qLower.includes('resum') || qLower.includes('qué') || qLower.includes('que pasó')) {
      return result?.summary || 'Esta reunión aún no tiene resumen disponible.';
    }
    
    if (qLower.includes('acuerdo') || qLower.includes('decidió')) {
      if (result?.acuerdos && result.acuerdos.length > 0) {
        return `Se llegaron a ${result.acuerdos.length} acuerdos principales: ${result.acuerdos.slice(0, 3).join('. ')}`;
      }
      return 'No se registraron acuerdos específicos en esta reunión.';
    }
    
    if (qLower.includes('tarea') || qLower.includes('acción') || qLower.includes('pendiente')) {
      if (result?.tareas && result.tareas.length > 0) {
        const tareasTexto = result.tareas
          .slice(0, 3)
          .map(t => typeof t === 'string' ? t : t.description || t.task)
          .join('. ');
        return `Hay ${result.tareas.length} acciones pendientes: ${tareasTexto}`;
      }
      return 'No se asignaron tareas específicas en esta reunión.';
    }
    
    if (qLower.includes('riesgo') || qLower.includes('problema')) {
      if (result?.riesgos && result.riesgos.length > 0) {
        return `Se identificaron ${result.riesgos.length} riesgos: ${result.riesgos.slice(0, 2).join('. ')}`;
      }
      return 'No se identificaron riesgos específicos en esta reunión.';
    }
    
    // Respuesta genérica
    return `Basándome en la reunión: ${result?.summary || 'La reunión se completó correctamente. Consulta la transcripción y minuta completas para más detalles.'}`;
  };

  const handleSpeak = async () => {
    if (!answer) return;
    
    if (!isTTSAvailable()) {
      setError('La síntesis de voz no está disponible en este navegador');
      return;
    }

    try {
      if (isSpeaking) {
        stopSpeaking();
        setIsSpeaking(false);
      } else {
        setIsSpeaking(true);
        setError('');
        await speak(answer, { lang: 'es-MX', gender: 'female' });
        setIsSpeaking(false);
      }
    } catch (err) {
      console.error('[TTS] Error:', err);
      setError('Error al reproducir audio');
      setIsSpeaking(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  return (
    <div
      className="p-6 rounded-xl border space-y-4"
      style={{
        backgroundColor: 'var(--color-bg-tertiary)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="flex items-center gap-2">
        <MessageSquare size={20} style={{ color: 'var(--color-accent)' }} />
        <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Asistente en Vivo
        </h3>
      </div>

      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        Pregunta sobre la reunión y obtén respuestas basadas en la transcripción y minuta
      </p>

      {/* Input */}
      <div className="space-y-3">
        <textarea
          ref={inputRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="¿Qué se acordó sobre el presupuesto?"
          className="w-full p-3 rounded-lg border text-sm resize-none"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
          rows={2}
          disabled={isAsking}
        />

        <button
          onClick={handleAsk}
          disabled={!question.trim() || isAsking}
          className="w-full px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          style={{
            backgroundColor: 'var(--color-accent)',
            color: '#FFFFFF',
          }}
        >
          {isAsking ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Consultando...
            </>
          ) : (
            'Consultar'
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          className="p-3 rounded-lg border text-sm"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderColor: 'rgba(239, 68, 68, 0.3)',
            color: 'var(--color-text-primary)',
          }}
        >
          {error}
        </div>
      )}

      {/* Answer */}
      {answer && (
        <div
          className="p-4 rounded-lg border space-y-3"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            borderColor: 'var(--color-border)',
          }}
        >
          <div className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-text-secondary)' }}>
            {answer}
          </div>

          <button
            onClick={handleSpeak}
            disabled={isSpeaking}
            className="px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90 flex items-center gap-2 text-sm"
            style={{
              backgroundColor: isSpeaking ? '#EF4444' : 'var(--color-accent)',
              color: '#FFFFFF',
            }}
          >
            {isSpeaking ? (
              <>
                <VolumeX size={18} />
                Detener
              </>
            ) : (
              <>
                <Volume2 size={18} />
                Responder en Voz Alta
              </>
            )}
          </button>
        </div>
      )}

      {/* Empty State */}
      {!answer && !error && !isAsking && (
        <div
          className="p-4 rounded-lg border text-center text-sm"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-tertiary)',
          }}
        >
          Haz una pregunta para obtener información de la reunión
        </div>
      )}
    </div>
  );
}
