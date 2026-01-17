/**
 * MeetingsRecorderLive.jsx
 * Grabador de reuniones en vivo con chunks de 7s + cola de reintentos
 * SIN EMOJIS - Diseño enterprise
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Mic, MicOff, Loader2, FileText, CheckCircle, AlertCircle, Send } from 'lucide-react';
import { 
  startLiveMeeting, 
  uploadLiveChunk, 
  stopLiveMeeting, 
  getLiveStatus,
  getMeetingResult,
  sendMeetingSummary 
} from '@/services/meetingsService';
import LiveAssistantPanel from './LiveAssistantPanel';

const CHUNK_INTERVAL_MS = 7000; // 7 segundos
const MAX_RETRIES = 3;
const RETRY_DELAYS = [300, 800, 1600]; // backoff en ms

export default function MeetingsRecorderLive() {
  const [isRecording, setIsRecording] = useState(false);
  const [meetingId, setMeetingId] = useState(null);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | recording | uploading | retrying | processing | ready | error
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  
  // Refs
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunkQueueRef = useRef([]);
  const chunkIndexRef = useRef(0);
  const isProcessingQueueRef = useRef(false);
  const intervalIdRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const startTimeRef = useRef(null);
  
  const { accessToken, user } = useAuth();

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      cleanupRecording();
    };
  }, []);

  const cleanupRecording = () => {
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (mediaRecorderRef.current?.recorder?.state === 'recording') {
      mediaRecorderRef.current.recorder.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      setErrorMessage('');
      console.log('[MEETINGS] Iniciando reunión en vivo...');

      // 1. Verificar permisos de micrófono
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        });
      } catch (micError) {
        console.error('[MEETINGS] Error de permisos de micrófono:', micError);
        setErrorMessage('Permiso de micrófono denegado. Actívalo en la configuración del navegador para grabar.');
        setStatus('error');
        return;
      }

      streamRef.current = stream;

      // 2. Crear meeting en backend
      const meeting = await startLiveMeeting(`Reunión ${new Date().toLocaleDateString('es-MX')}`);
      
      if (!meeting?.id) {
        throw new Error('No se pudo crear la reunión');
      }

      setMeetingId(meeting.id);
      setStatus('recording');
      setIsRecording(true);
      startTimeRef.current = Date.now();
      console.log('[MEETINGS] Reunión iniciada:', meeting.id);

      // 3. Iniciar grabación con MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      const audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
          console.log(`[MEETINGS] Chunk capturado: ${event.data.size} bytes`);
        }
      };

      mediaRecorder.onstop = () => {
        if (audioChunks.length > 0) {
          const blob = new Blob(audioChunks, { type: mimeType });
          enqueueChunk(meeting.id, blob);
          audioChunks.length = 0;
        }
      };

      mediaRecorder.start();

      // 4. Capturar chunks cada 7 segundos
      const intervalId = setInterval(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          mediaRecorder.start();
        }
      }, CHUNK_INTERVAL_MS);

      intervalIdRef.current = intervalId;
      mediaRecorderRef.current = { recorder: mediaRecorder };

      // 5. Timer visual
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // 6. Polling de estado en vivo
      pollIntervalRef.current = setInterval(() => {
        fetchLiveStatus(meeting.id);
      }, 5000);

    } catch (error) {
      console.error('[MEETINGS] Error:', error);
      setErrorMessage(error.message || 'No se pudo conectar al servidor de reuniones');
      setStatus('error');
      cleanupRecording();
    }
  };

  const enqueueChunk = (mtgId, blob) => {
    chunkIndexRef.current += 1;
    const chunk = {
      id: chunkIndexRef.current,
      meetingId: mtgId,
      blob,
      retries: 0,
      status: 'pending' // pending | uploading | uploaded | failed
    };
    chunkQueueRef.current.push(chunk);
    console.log(`[MEETINGS] Chunk ${chunk.id} encolado`);
    processQueue();
  };

  const processQueue = async () => {
    if (isProcessingQueueRef.current) return;
    if (chunkQueueRef.current.length === 0) return;

    isProcessingQueueRef.current = true;

    while (chunkQueueRef.current.length > 0) {
      const chunk = chunkQueueRef.current[0];

      if (chunk.status === 'uploaded') {
        chunkQueueRef.current.shift();
        continue;
      }

      if (chunk.status === 'failed' && chunk.retries >= MAX_RETRIES) {
        console.warn(`[MEETINGS] Chunk ${chunk.id} falló después de ${MAX_RETRIES} reintentos`);
        chunkQueueRef.current.shift();
        continue;
      }

      try {
        setStatus('uploading');
        chunk.status = 'uploading';

        await uploadLiveChunk(
          chunk.meetingId,
          chunk.blob,
          chunk.id,
          startTimeRef.current
        );

        chunk.status = 'uploaded';
        console.log(`[MEETINGS] Chunk ${chunk.id} subido correctamente`);
        chunkQueueRef.current.shift();
        
        if (isRecording) {
          setStatus('recording');
        }

      } catch (error) {
        console.error(`[MEETINGS] Error subiendo chunk ${chunk.id}:`, error);
        chunk.retries += 1;
        chunk.status = 'pending';

        if (chunk.retries < MAX_RETRIES) {
          const delay = RETRY_DELAYS[chunk.retries - 1] || 1600;
          console.log(`[MEETINGS] Reintentando chunk ${chunk.id} en ${delay}ms (intento ${chunk.retries}/${MAX_RETRIES})`);
          setStatus('retrying');
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          chunk.status = 'failed';
          setErrorMessage('Problema de red. Algunos fragmentos no se pudieron enviar.');
        }
      }
    }

    isProcessingQueueRef.current = false;
  };

  const fetchLiveStatus = async (mtgId) => {
    try {
      const data = await getLiveStatus(mtgId);
      if (data?.transcript) {
        setLiveTranscript(data.transcript);
      }
    } catch (error) {
      console.error('[MEETINGS] Error obteniendo estado:', error);
    }
  };

  const stopRecording = async () => {
    if (!meetingId) return;

    try {
      setStatus('processing');
      setIsRecording(false);
      cleanupRecording();

      console.log('[MEETINGS] Grabación detenida');

      // Esperar a que se procese la cola
      while (chunkQueueRef.current.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Finalizar meeting
      await stopLiveMeeting(meetingId);
      console.log('[MEETINGS] Generando minuta...');

      // Polling para obtener resultado
      await pollForResult(meetingId);

    } catch (error) {
      console.error('[MEETINGS] Error deteniendo reunión:', error);
      setErrorMessage(error.message || 'Error al procesar la reunión');
      setStatus('error');
    }
  };

  const pollForResult = async (mtgId) => {
    const maxAttempts = 60;
    let attempts = 0;

    const poll = async () => {
      attempts++;

      try {
        const data = await getMeetingResult(mtgId);

        if (data?.status === 'processing') {
          if (attempts < maxAttempts) {
            setTimeout(poll, 5000);
          } else {
            throw new Error('Tiempo de espera excedido al generar la minuta');
          }
          return;
        }

        if (data?.status === 'done' || data?.result) {
          setResult(data.result || data);
          setStatus('ready');
          console.log('[MEETINGS] Minuta generada correctamente');
        } else {
          throw new Error('No se pudo generar la minuta');
        }
      } catch (error) {
        console.error('[MEETINGS] Error obteniendo resultado:', error);
        setErrorMessage(error.message);
        setStatus('error');
      }
    };

    poll();
  };

  const handleSendEmail = async () => {
    if (!meetingId || sendingEmail) return;

    try {
      setSendingEmail(true);
      setErrorMessage('');
      
      await sendMeetingSummary(meetingId, { email: true });
      
      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 3000);
    } catch (error) {
      console.error('[MEETINGS] Error enviando correo:', error);
      setErrorMessage(error.message || 'No se pudo enviar el correo');
    } finally {
      setSendingEmail(false);
    }
  };

  const resetMeeting = () => {
    setStatus('idle');
    setMeetingId(null);
    setLiveTranscript('');
    setRecordingTime(0);
    setResult(null);
    setErrorMessage('');
    setEmailSent(false);
    chunkIndexRef.current = 0;
    chunkQueueRef.current = [];
    startTimeRef.current = null;
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          Reuniones en Vivo
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Graba reuniones presenciales y genera minutas automáticamente
        </p>
      </div>

      {/* Control Bar */}
      {(status === 'idle' || status === 'error') && (
        <div className="space-y-4">
          {errorMessage && (
            <div
              className="p-4 rounded-xl border flex items-start gap-3"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderColor: 'rgba(239, 68, 68, 0.3)',
              }}
            >
              <AlertCircle size={20} className="flex-shrink-0 mt-0.5" style={{ color: '#EF4444' }} />
              <div className="flex-1">
                <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  Error
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {errorMessage}
                </p>
              </div>
            </div>
          )}

          <div className="text-center py-12">
            <button
              onClick={startRecording}
              className="px-8 py-4 rounded-xl font-medium transition-all hover:opacity-90 flex items-center justify-center gap-3 mx-auto text-lg"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: '#FFFFFF',
              }}
            >
              <Mic size={24} />
              Iniciar Reunión
            </button>
          </div>
        </div>
      )}

      {/* Recording State */}
      {status === 'recording' && (
        <div className="space-y-6">
          <div 
            className="p-6 rounded-xl border text-center"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderColor: 'rgba(239, 68, 68, 0.3)',
            }}
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                GRABANDO
              </span>
            </div>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Chunks enviados: {chunkIndexRef.current}
            </p>
            <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
              {formatTime(recordingTime)}
            </p>
          </div>

          {liveTranscript && (
            <div 
              className="p-6 rounded-xl border"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border)',
              }}
            >
              <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                <FileText size={20} />
                Transcripción en vivo
              </h3>
              <div 
                className="text-sm whitespace-pre-wrap"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {liveTranscript || 'Esperando transcripción...'}
              </div>
            </div>
          )}

          <button
            onClick={stopRecording}
            className="w-full px-6 py-3 rounded-xl font-medium transition-all hover:opacity-90 flex items-center justify-center gap-2"
            style={{
              backgroundColor: '#EF4444',
              color: '#FFFFFF',
            }}
          >
            <MicOff size={20} />
            Finalizar y Generar Minuta
          </button>
        </div>
      )}

      {status === 'processing' && (
        <div className="text-center py-12">
          <Loader2 size={48} className="animate-spin mx-auto mb-4" style={{ color: 'var(--color-accent)' }} />
          <p className="text-lg font-medium" style={{ color: 'var(--color-text-primary)' }}>
            Generando minuta...
          </p>
          <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>
            Esto puede tomar unos minutos
          </p>
        </div>
      )}

      {/* Ready State - Show Results */}
      {status === 'ready' && result && (
        <div className="space-y-6">
          <div
            className="p-6 rounded-xl border text-center"
            style={{
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              borderColor: 'rgba(34, 197, 94, 0.3)',
            }}
          >
            <CheckCircle size={48} className="mx-auto mb-3" style={{ color: '#22C55E' }} />
            <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
              Minuta generada correctamente
            </h3>
          </div>

          {/* Transcript Panel */}
          {result.transcript && (
            <div
              className="p-6 rounded-xl border"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border)',
              }}
            >
              <h3 className="font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                Transcripción
              </h3>
              <div
                className="text-sm whitespace-pre-wrap max-h-96 overflow-y-auto p-4 rounded-lg"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {result.transcript}
              </div>
            </div>
          )}

          {/* Minutes Panel */}
          <div
            className="p-6 rounded-xl border space-y-6"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              borderColor: 'var(--color-border)',
            }}
          >
            <h3 className="font-semibold text-lg" style={{ color: 'var(--color-text-primary)' }}>
              Minuta
            </h3>

            {/* Resumen */}
            {result.summary && (
              <div>
                <h4 className="font-semibold mb-2 text-sm" style={{ color: 'var(--color-text-primary)' }}>
                  Resumen Ejecutivo
                </h4>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {result.summary}
                </p>
              </div>
            )}

            {/* Acuerdos */}
            {result.acuerdos && result.acuerdos.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 text-sm" style={{ color: 'var(--color-text-primary)' }}>
                  Acuerdos
                </h4>
                <ul className="space-y-2">
                  {result.acuerdos.map((acuerdo, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      <span className="text-accent">•</span>
                      <span>{acuerdo}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Acciones */}
            {result.tareas && result.tareas.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 text-sm" style={{ color: 'var(--color-text-primary)' }}>
                  Acciones
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <th className="text-left py-2 px-3" style={{ color: 'var(--color-text-primary)' }}>
                          Tarea
                        </th>
                        <th className="text-left py-2 px-3" style={{ color: 'var(--color-text-primary)' }}>
                          Responsable
                        </th>
                        <th className="text-left py-2 px-3" style={{ color: 'var(--color-text-primary)' }}>
                          Fecha
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.tareas.map((tarea, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td className="py-2 px-3" style={{ color: 'var(--color-text-secondary)' }}>
                            {typeof tarea === 'string' ? tarea : tarea.description || tarea.task}
                          </td>
                          <td className="py-2 px-3" style={{ color: 'var(--color-text-secondary)' }}>
                            {typeof tarea === 'object' ? tarea.responsible || '-' : '-'}
                          </td>
                          <td className="py-2 px-3" style={{ color: 'var(--color-text-secondary)' }}>
                            {typeof tarea === 'object' ? tarea.date || '-' : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Riesgos/Pendientes */}
            {result.riesgos && result.riesgos.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 text-sm" style={{ color: 'var(--color-text-primary)' }}>
                  Riesgos y Pendientes
                </h4>
                <ul className="space-y-2">
                  {result.riesgos.map((riesgo, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      <span className="text-yellow-500">⚠</span>
                      <span>{riesgo}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={handleSendEmail}
              disabled={sendingEmail || emailSent}
              className="flex-1 px-6 py-3 rounded-xl font-medium transition-all hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50"
              style={{
                backgroundColor: emailSent ? '#22C55E' : 'var(--color-accent)',
                color: '#FFFFFF',
              }}
            >
              {sendingEmail ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Enviando...
                </>
              ) : emailSent ? (
                <>
                  <CheckCircle size={20} />
                  Enviado
                </>
              ) : (
                <>
                  <Send size={20} />
                  Enviar por Correo
                </>
              )}
            </button>

            <button
              onClick={resetMeeting}
              className="px-6 py-3 rounded-xl font-medium transition-all hover:opacity-90 border"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            >
              Nueva Reunión
            </button>
          </div>

          {/* Live Assistant Panel */}
          <LiveAssistantPanel meetingId={meetingId} meetingResult={result} />
        </div>
      )}
    </div>
  );
}
