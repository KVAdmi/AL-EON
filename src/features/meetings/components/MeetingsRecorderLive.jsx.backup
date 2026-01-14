/**
 * MeetingsRecorderLive.jsx
 * Grabador de reuniones en vivo con chunks de 30s
 * Transcripción en tiempo real y generación de minuta
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Mic, MicOff, Loader2, FileText, CheckCircle } from 'lucide-react';
import { generateRequestId, logRequest } from '@/utils/requestId';

const BACKEND_URL = import.meta.env.VITE_CORE_BASE_URL || 'https://api.al-eon.com';
const CHUNK_INTERVAL = 30000; // 30 segundos

export default function MeetingsRecorderLive() {
  const [isRecording, setIsRecording] = useState(false);
  const [meetingId, setMeetingId] = useState(null);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [chunkCount, setChunkCount] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | recording | processing | done
  const [result, setResult] = useState(null); // Minuta final
  
  const mediaRecorderRef = useRef(null);
  const chunkIndexRef = useRef(0);
  const streamRef = useRef(null);
  const pollIntervalRef = useRef(null);
  
  const { accessToken, user } = useAuth();

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      stopRecording();
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      console.log('[MEETINGS] 🎙️ Iniciando reunión en vivo...');
      
      // 1. Crear meeting en Core
      const requestId = generateRequestId();
      const response = await fetch(`${BACKEND_URL}/api/meetings/live/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'x-request-id': requestId,
        },
        body: JSON.stringify({
          title: `Reunión ${new Date().toLocaleDateString('es-MX')}`,
          description: 'Grabada desde modo altavoz',
          participants: [],
          auto_send_enabled: false,
        }),
      });

      logRequest(requestId, '/api/meetings/live/start', response.status);

      if (!response.ok) {
        throw new Error(`Error ${response.status} al iniciar reunión`);
      }

      const data = await response.json();

      if (!data.success || !data.meetingId) {
        throw new Error(data.message || 'No se pudo iniciar la reunión');
      }

      setMeetingId(data.meetingId);
      setStatus('recording');
      console.log('[MEETINGS] ✅ Reunión iniciada:', data.meetingId);

      // 2. Iniciar grabación de audio
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      const audioChunks = [];

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
          console.log('[MEETINGS] 📦 Chunk capturado:', event.data.size, 'bytes');
        }
      };

      mediaRecorder.onstop = async () => {
        if (audioChunks.length > 0) {
          await sendChunk(data.meetingId, audioChunks);
        }
      };

      // Enviar chunk cada 30 segundos
      mediaRecorder.start();
      const intervalId = setInterval(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          mediaRecorder.start();
        }
      }, CHUNK_INTERVAL);

      mediaRecorderRef.current = { recorder: mediaRecorder, intervalId };
      setIsRecording(true);

      // 3. Polling cada 5s para status en vivo
      pollIntervalRef.current = setInterval(() => {
        fetchLiveStatus(data.meetingId);
      }, 5000);

    } catch (error) {
      console.error('[MEETINGS] ❌ Error:', error);
      alert(`Error al iniciar reunión: ${error.message}`);
      setStatus('idle');
    }
  };

  const sendChunk = async (mtgId, chunks) => {
    try {
      chunkIndexRef.current += 1;
      
      const audioBlob = new Blob(chunks, { type: 'audio/webm' });
      
      const formData = new FormData();
      formData.append('chunk', audioBlob, `chunk-${chunkIndexRef.current}.webm`);

      const requestId = generateRequestId();
      const response = await fetch(`${BACKEND_URL}/api/meetings/live/${mtgId}/chunk`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-request-id': requestId,
        },
        body: formData,
      });

      logRequest(requestId, `/api/meetings/live/${mtgId}/chunk`, response.status);

      if (!response.ok) {
        throw new Error('Error enviando chunk');
      }

      setChunkCount(chunkIndexRef.current);
      console.log('[MEETINGS] ✅ Chunk enviado:', chunkIndexRef.current);
    } catch (error) {
      console.error('[MEETINGS] ❌ Error enviando chunk:', error);
    }
  };

  const fetchLiveStatus = async (mtgId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/meetings/live/${mtgId}/status`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) return;

      const data = await response.json();

      if (data.success) {
        setLiveTranscript(data.transcript || '');
      }
    } catch (error) {
      console.error('[MEETINGS] ❌ Error fetching status:', error);
    }
  };

  const stopRecording = async () => {
    if (!meetingId) return;

    try {
      setStatus('processing');
      
      // 1. Detener grabación
      if (mediaRecorderRef.current) {
        clearInterval(mediaRecorderRef.current.intervalId);
        mediaRecorderRef.current.recorder.stop();
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      setIsRecording(false);
      console.log('[MEETINGS] 🛑 Grabación detenida');

      // 2. Finalizar meeting en Core
      const requestId = generateRequestId();
      const response = await fetch(`${BACKEND_URL}/api/meetings/live/${meetingId}/stop`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-request-id': requestId,
        },
      });

      logRequest(requestId, `/api/meetings/live/${meetingId}/stop`, response.status);

      if (!response.ok) {
        throw new Error('Error al finalizar reunión');
      }

      const data = await response.json();

      if (data.success) {
        console.log('[MEETINGS] ⏳ Generando minuta...');
        
        // 3. Polling para obtener resultado final
        await pollForResult(meetingId);
      }
    } catch (error) {
      console.error('[MEETINGS] ❌ Error deteniendo reunión:', error);
      alert(`Error: ${error.message}`);
      setStatus('idle');
    }
  };

  const pollForResult = async (mtgId) => {
    const maxAttempts = 60; // 5 minutos máximo
    let attempts = 0;

    const poll = async () => {
      attempts++;
      
      try {
        const response = await fetch(`${BACKEND_URL}/api/meetings/${mtgId}/result`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
          if (attempts < maxAttempts) {
            setTimeout(poll, 5000);
          } else {
            throw new Error('Timeout esperando resultado');
          }
          return;
        }

        const data = await response.json();

        if (data.status === 'processing') {
          if (attempts < maxAttempts) {
            setTimeout(poll, 5000);
          } else {
            throw new Error('Timeout esperando resultado');
          }
          return;
        }

        if (data.status === 'done' && data.result) {
          setResult(data.result);
          setStatus('done');
          console.log('[MEETINGS] ✅ Minuta generada');
        } else {
          throw new Error('No se pudo generar la minuta');
        }
      } catch (error) {
        console.error('[MEETINGS] ❌ Error obteniendo resultado:', error);
        setStatus('idle');
      }
    };

    poll();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          🎙️ Reuniones en Vivo
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Graba reuniones presenciales y genera minutas automáticamente
        </p>
      </div>

      {status === 'idle' && (
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
            Iniciar Grabación
          </button>
        </div>
      )}

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
              Chunks enviados: {chunkCount}
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

      {status === 'done' && result && (
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
              ¡Minuta generada!
            </h3>
          </div>

          <div 
            className="p-6 rounded-xl border space-y-6"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              borderColor: 'var(--color-border)',
            }}
          >
            {/* Transcripción */}
            <div>
              <h3 className="font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                📝 Transcripción
              </h3>
              <div 
                className="text-sm whitespace-pre-wrap p-4 rounded-lg"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {result.transcript || 'No disponible'}
              </div>
            </div>

            {/* Resumen */}
            {result.summary && (
              <div>
                <h3 className="font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                  📋 Resumen
                </h3>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {result.summary}
                </p>
              </div>
            )}

            {/* Minuta */}
            {result.minuta && (
              <div>
                <h3 className="font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                  📄 Minuta
                </h3>
                <div 
                  className="text-sm whitespace-pre-wrap p-4 rounded-lg"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {result.minuta}
                </div>
              </div>
            )}

            {/* Acuerdos */}
            {result.acuerdos && result.acuerdos.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                  🤝 Acuerdos
                </h3>
                <ul className="space-y-2">
                  {result.acuerdos.map((acuerdo, i) => (
                    <li 
                      key={i}
                      className="flex items-start gap-2 text-sm"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      <span>•</span>
                      <span>{acuerdo}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tareas */}
            {result.tareas && result.tareas.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                  ✅ Tareas
                </h3>
                <ul className="space-y-2">
                  {result.tareas.map((tarea, i) => (
                    <li 
                      key={i}
                      className="flex items-start gap-2 text-sm"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      <span>☐</span>
                      <span>{tarea}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setStatus('idle');
              setMeetingId(null);
              setLiveTranscript('');
              setChunkCount(0);
              setResult(null);
              chunkIndexRef.current = 0;
            }}
            className="w-full px-6 py-3 rounded-xl font-medium transition-all hover:opacity-90"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: '#FFFFFF',
            }}
          >
            Nueva Reunión
          </button>
        </div>
      )}
    </div>
  );
}
