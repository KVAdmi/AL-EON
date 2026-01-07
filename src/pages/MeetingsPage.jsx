/**
 * MeetingsPage.jsx
 * Lista de reuniones con UI ejecutiva profesional
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Upload, Mic, Clock, CheckCircle2, AlertCircle, 
  Eye, Trash2, RefreshCw, Play, Square, Pause
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getMeetings, 
  uploadMeeting, 
  startLiveMeeting,
  sendLiveChunk,
  stopLiveMeeting,
  deleteMeeting,
  pollMeetingStatus
} from '@/services/meetingsService';

export default function MeetingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Estado modo altavoz
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentMeetingId, setCurrentMeetingId] = useState(null);
  const [liveNotes, setLiveNotes] = useState([]);
  
  useEffect(() => {
    loadMeetings();
  }, []);

  // Timer para grabación
  useEffect(() => {
    let interval;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  async function loadMeetings() {
    try {
      setLoading(true);
      const data = await getMeetings();
      setMeetings(data);
    } catch (error) {
      console.error('Error cargando reuniones:', error);
      alert('Error al cargar reuniones');
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // SUBIR ARCHIVO
  // =====================================================
  
  async function handleFileSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar que sea audio
    if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
      alert('Por favor selecciona un archivo de audio o video válido');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(10);
      
      const title = prompt('Nombre de la reunión:', `Reunión ${new Date().toLocaleDateString('es-ES')}`);
      if (!title) return;

      setUploadProgress(30);
      const meeting = await uploadMeeting(file, title);
      
      setUploadProgress(70);
      
      // Agregar a la lista
      setMeetings(prev => [meeting, ...prev]);
      
      setUploadProgress(100);
      
      // Iniciar polling
      pollMeetingStatus(meeting.id, (updatedMeeting) => {
        setMeetings(prev => prev.map(m => 
          m.id === updatedMeeting.id ? updatedMeeting : m
        ));
      });

      alert('Grabación subida. Procesando...');
    } catch (error) {
      console.error('Error subiendo archivo:', error);
      alert('Error al subir archivo: ' + error.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  // =====================================================
  // MODO ALTAVOZ
  // =====================================================
  
  async function handleStartLive() {
    try {
      // Solicitar permiso de micrófono
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      const title = prompt(
        'Nombre de la reunión:',
        `Reunión ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
      );
      if (!title) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      // Crear reunión
      const meeting = await startLiveMeeting(title);
      setCurrentMeetingId(meeting.id);
      
      // Configurar MediaRecorder
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = async (e) => {
        if (!e.data || e.data.size === 0) return;
        if (isPaused) return;
        
        try {
          await sendLiveChunk(meeting.id, e.data);
          console.log('✅ Chunk enviado');
        } catch (error) {
          console.error('❌ Error enviando chunk:', error);
        }
      };

      recorder.start(15000); // Chunk cada 15 segundos
      setIsRecording(true);
      setRecordingTime(0);
      
      // Agregar a la lista
      setMeetings(prev => [meeting, ...prev]);
      
      alert('⚠️ Esta sesión está grabando audio para transcripción. Asegúrate de tener consentimiento.');
    } catch (error) {
      console.error('Error iniciando grabación:', error);
      alert('Error al acceder al micrófono: ' + error.message);
    }
  }

  function handlePauseLive() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    } else if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  }

  async function handleStopLive() {
    try {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }

      if (currentMeetingId) {
        await stopLiveMeeting(currentMeetingId);
        
        // Iniciar polling
        pollMeetingStatus(currentMeetingId, (updatedMeeting) => {
          setMeetings(prev => prev.map(m => 
            m.id === updatedMeeting.id ? updatedMeeting : m
          ));
        });
      }

      setIsRecording(false);
      setIsPaused(false);
      setRecordingTime(0);
      setCurrentMeetingId(null);
      setLiveNotes([]);
      
      alert('Reunión finalizada. Generando minuta...');
    } catch (error) {
      console.error('Error finalizando reunión:', error);
      alert('Error al finalizar: ' + error.message);
    }
  }

  // =====================================================
  // OTRAS ACCIONES
  // =====================================================
  
  async function handleDelete(meetingId) {
    if (!confirm('¿Eliminar esta reunión?')) return;
    
    try {
      await deleteMeeting(meetingId);
      setMeetings(prev => prev.filter(m => m.id !== meetingId));
      alert('Reunión eliminada');
    } catch (error) {
      console.error('Error eliminando:', error);
      alert('Error al eliminar');
    }
  }

  function formatDuration(seconds) {
    if (!seconds) return '--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function formatRecordingTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function getStatusBadge(status) {
    const styles = {
      uploading: { bg: '#3b82f6', text: 'Subiendo', icon: <Upload size={14} /> },
      recording: { bg: '#ef4444', text: 'Grabando', icon: <Mic size={14} /> },
      processing: { bg: '#f59e0b', text: 'Procesando', icon: <Clock size={14} /> },
      done: { bg: '#10b981', text: 'Listo', icon: <CheckCircle2 size={14} /> },
      error: { bg: '#ef4444', text: 'Error', icon: <AlertCircle size={14} /> }
    };

    const style = styles[status] || styles.processing;

    return (
      <div 
        className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium text-white"
        style={{ backgroundColor: style.bg }}
      >
        {style.icon}
        <span>{style.text}</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div style={{ color: 'var(--color-text-secondary)' }}>Cargando reuniones...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Header */}
      <div 
        className="border-b sticky top-0 z-10"
        style={{ 
          backgroundColor: 'var(--color-bg-primary)',
          borderColor: 'var(--color-border)'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-xl hover:opacity-80"
                style={{ backgroundColor: 'var(--color-bg-secondary)' }}
              >
                <ArrowLeft size={20} style={{ color: 'var(--color-text-primary)' }} />
              </button>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  Reuniones
                </h1>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {meetings.length} reunión{meetings.length !== 1 ? 'es' : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={loadMeetings}
                className="p-2 rounded-xl hover:opacity-80"
                style={{ backgroundColor: 'var(--color-bg-secondary)' }}
              >
                <RefreshCw size={20} style={{ color: 'var(--color-text-primary)' }} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Panel de grabación activa */}
        {isRecording && (
          <div 
            className="mb-6 p-6 rounded-2xl border-2"
            style={{ 
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: '#ef4444'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {formatRecordingTime(recordingTime)}
                </span>
                {isPaused && (
                  <span className="text-sm px-2 py-1 rounded bg-yellow-500 text-white">
                    EN PAUSA
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePauseLive}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl hover:opacity-80"
                  style={{ 
                    backgroundColor: 'var(--color-accent)',
                    color: '#fff'
                  }}
                >
                  {isPaused ? <Play size={18} /> : <Pause size={18} />}
                  <span>{isPaused ? 'Reanudar' : 'Pausar'}</span>
                </button>
                
                <button
                  onClick={handleStopLive}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl hover:opacity-80 bg-red-600 text-white"
                >
                  <Square size={18} />
                  <span>Finalizar</span>
                </button>
              </div>
            </div>

            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Grabando audio. Transcripción en tiempo real...
            </p>
          </div>
        )}

        {/* Botones de acción */}
        {!isRecording && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-dashed hover:opacity-80 transition-all"
              style={{ 
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)'
              }}
            >
              <Upload size={32} style={{ color: 'var(--color-accent)' }} />
              <div>
                <div className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  Subir grabación
                </div>
                <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Archivo de audio o video
                </div>
              </div>
              {uploading && (
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="h-2 rounded-full transition-all"
                    style={{ 
                      width: `${uploadProgress}%`,
                      backgroundColor: 'var(--color-accent)'
                    }}
                  />
                </div>
              )}
            </button>

            <button
              onClick={handleStartLive}
              className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 hover:opacity-80 transition-all"
              style={{ 
                backgroundColor: 'var(--color-accent)',
                borderColor: 'var(--color-accent)',
                color: '#fff'
              }}
            >
              <Mic size={32} />
              <div>
                <div className="font-semibold">
                  Iniciar reunión (Altavoz)
                </div>
                <div className="text-sm opacity-90">
                  Grabar en vivo presencial
                </div>
              </div>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {/* Lista de reuniones */}
        {meetings.length === 0 ? (
          <div 
            className="text-center py-12 rounded-2xl"
            style={{ backgroundColor: 'var(--color-bg-secondary)' }}
          >
            <Mic size={48} className="mx-auto mb-4 opacity-20" style={{ color: 'var(--color-text-tertiary)' }} />
            <p className="text-lg font-medium" style={{ color: 'var(--color-text-primary)' }}>
              No hay reuniones
            </p>
            <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>
              Sube una grabación o inicia una reunión en vivo
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {meetings.map(meeting => (
              <div
                key={meeting.id}
                className="p-5 rounded-2xl border hover:shadow-lg transition-all cursor-pointer"
                style={{ 
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)'
                }}
                onClick={() => meeting.status === 'done' && navigate(`/reuniones/${meeting.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-lg flex-1" style={{ color: 'var(--color-text-primary)' }}>
                    {meeting.title}
                  </h3>
                  {getStatusBadge(meeting.status)}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    <Clock size={14} />
                    <span>{new Date(meeting.created_at).toLocaleDateString('es-ES', { 
                      day: 'numeric', 
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
                  </div>
                  {meeting.audio_duration_seconds && (
                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      <span>Duración: {formatDuration(meeting.audio_duration_seconds)}</span>
                    </div>
                  )}
                  {meeting.is_live && (
                    <div className="flex items-center gap-2 text-sm" style={{ color: '#ef4444' }}>
                      <Mic size={14} />
                      <span>Modo altavoz</span>
                    </div>
                  )}
                </div>

                {meeting.status === 'error' && (
                  <div className="mb-3 p-2 rounded bg-red-50 text-red-600 text-xs">
                    {meeting.error_message || 'Error al procesar'}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {meeting.status === 'done' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/reuniones/${meeting.id}`);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl hover:opacity-80"
                      style={{ 
                        backgroundColor: 'var(--color-accent)',
                        color: '#fff'
                      }}
                    >
                      <Eye size={16} />
                      <span className="text-sm font-medium">Ver minuta</span>
                    </button>
                  )}
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(meeting.id);
                    }}
                    className="p-2 rounded-xl hover:opacity-80"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                  >
                    <Trash2 size={16} style={{ color: 'var(--color-text-secondary)' }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
