/**
 * MeetingsViewer.jsx
 * Visualizador de reuniones grabadas y sus minutas
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Calendar, FileText, Clock, ChevronRight, ChevronDown } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_CORE_BASE_URL || 'https://api.al-eon.com';

export default function MeetingsViewer() {
  const [meetings, setMeetings] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingResult, setLoadingResult] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    transcript: true,
    summary: true,
    minuta: true,
    acuerdos: true,
    tareas: true,
  });

  const { accessToken } = useAuth();

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/meetings`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        throw new Error('Error obteniendo reuniones');
      }

      const data = await response.json();
      
      if (data.success) {
        setMeetings(data.meetings || []);
      }
    } catch (error) {
      console.error('[MEETINGS] ❌ Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchResult = async (meetingId) => {
    try {
      setLoadingResult(true);
      const response = await fetch(`${BACKEND_URL}/api/meetings/${meetingId}/result`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        throw new Error('Error obteniendo resultado');
      }

      const data = await response.json();

      if (data.status === 'done' && data.result) {
        setResult(data.result);
      } else if (data.status === 'processing') {
        setResult({ status: 'processing' });
      } else {
        setResult({ error: 'No disponible' });
      }
    } catch (error) {
      console.error('[MEETINGS] ❌ Error:', error);
      setResult({ error: error.message });
    } finally {
      setLoadingResult(false);
    }
  };

  const selectMeeting = (meeting) => {
    setSelectedMeeting(meeting);
    setResult(null);
    fetchResult(meeting.id);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={48} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          📂 Reuniones Grabadas
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Historial de reuniones y sus minutas
        </p>
      </div>

      {meetings.length === 0 ? (
        <div className="text-center py-12">
          <FileText size={48} className="mx-auto mb-4 opacity-30" style={{ color: 'var(--color-text-secondary)' }} />
          <p style={{ color: 'var(--color-text-secondary)' }}>
            No hay reuniones grabadas aún
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de reuniones */}
          <div className="lg:col-span-1 space-y-3">
            {meetings.map((meeting) => (
              <button
                key={meeting.id}
                onClick={() => selectMeeting(meeting)}
                className={`w-full text-left p-4 rounded-xl border transition-all hover:border-opacity-60 ${
                  selectedMeeting?.id === meeting.id ? 'ring-2' : ''
                }`}
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  borderColor: selectedMeeting?.id === meeting.id 
                    ? 'var(--color-accent)' 
                    : 'var(--color-border)',
                  ringColor: 'var(--color-accent)',
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-sm line-clamp-2" style={{ color: 'var(--color-text-primary)' }}>
                    {meeting.title || 'Sin título'}
                  </h3>
                  <ChevronRight 
                    size={16} 
                    className={selectedMeeting?.id === meeting.id ? 'opacity-100' : 'opacity-30'}
                    style={{ color: 'var(--color-accent)' }}
                  />
                </div>
                
                <div className="flex items-center gap-2 text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  <Calendar size={12} />
                  <span>{formatDate(meeting.created_at)}</span>
                </div>

                {meeting.duration && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    <Clock size={12} />
                    <span>{formatDuration(meeting.duration)}</span>
                  </div>
                )}

                {meeting.status && (
                  <div className="mt-2">
                    <span 
                      className="text-xs px-2 py-1 rounded-full"
                      style={{
                        backgroundColor: meeting.status === 'done' 
                          ? 'rgba(34, 197, 94, 0.1)' 
                          : 'rgba(251, 191, 36, 0.1)',
                        color: meeting.status === 'done' ? '#22C55E' : '#FBBF24',
                      }}
                    >
                      {meeting.status === 'done' ? 'Completada' : 'Procesando...'}
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Detalle de reunión seleccionada */}
          <div className="lg:col-span-2">
            {!selectedMeeting ? (
              <div 
                className="h-full flex items-center justify-center rounded-xl border"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <p style={{ color: 'var(--color-text-secondary)' }}>
                  Selecciona una reunión
                </p>
              </div>
            ) : loadingResult ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
              </div>
            ) : result?.error ? (
              <div 
                className="p-6 rounded-xl border text-center"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  borderColor: 'rgba(239, 68, 68, 0.3)',
                }}
              >
                <p style={{ color: '#EF4444' }}>
                  {result.error}
                </p>
              </div>
            ) : result?.status === 'processing' ? (
              <div 
                className="p-6 rounded-xl border text-center"
                style={{
                  backgroundColor: 'rgba(251, 191, 36, 0.1)',
                  borderColor: 'rgba(251, 191, 36, 0.3)',
                }}
              >
                <Loader2 size={32} className="animate-spin mx-auto mb-3" style={{ color: '#FBBF24' }} />
                <p style={{ color: 'var(--color-text-primary)' }}>
                  Procesando reunión...
                </p>
              </div>
            ) : result ? (
              <div className="space-y-4">
                {/* Header */}
                <div 
                  className="p-6 rounded-xl border"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                  }}
                >
                  <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                    {selectedMeeting.title || 'Sin título'}
                  </h2>
                  {selectedMeeting.description && (
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      {selectedMeeting.description}
                    </p>
                  )}
                </div>

                {/* Transcripción */}
                {result.transcript && (
                  <div 
                    className="rounded-xl border overflow-hidden"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderColor: 'var(--color-border)',
                    }}
                  >
                    <button
                      onClick={() => toggleSection('transcript')}
                      className="w-full p-4 flex items-center justify-between hover:opacity-80 transition-opacity"
                    >
                      <span className="font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                        <FileText size={18} />
                        Transcripción
                      </span>
                      <ChevronDown 
                        size={18} 
                        className={`transition-transform ${expandedSections.transcript ? '' : '-rotate-90'}`}
                        style={{ color: 'var(--color-text-secondary)' }}
                      />
                    </button>
                    {expandedSections.transcript && (
                      <div 
                        className="px-4 pb-4 text-sm whitespace-pre-wrap"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {result.transcript}
                      </div>
                    )}
                  </div>
                )}

                {/* Resumen */}
                {result.summary && (
                  <div 
                    className="rounded-xl border overflow-hidden"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderColor: 'var(--color-border)',
                    }}
                  >
                    <button
                      onClick={() => toggleSection('summary')}
                      className="w-full p-4 flex items-center justify-between hover:opacity-80 transition-opacity"
                    >
                      <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        📋 Resumen
                      </span>
                      <ChevronDown 
                        size={18} 
                        className={`transition-transform ${expandedSections.summary ? '' : '-rotate-90'}`}
                        style={{ color: 'var(--color-text-secondary)' }}
                      />
                    </button>
                    {expandedSections.summary && (
                      <div 
                        className="px-4 pb-4 text-sm"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {result.summary}
                      </div>
                    )}
                  </div>
                )}

                {/* Minuta */}
                {result.minuta && (
                  <div 
                    className="rounded-xl border overflow-hidden"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderColor: 'var(--color-border)',
                    }}
                  >
                    <button
                      onClick={() => toggleSection('minuta')}
                      className="w-full p-4 flex items-center justify-between hover:opacity-80 transition-opacity"
                    >
                      <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        📄 Minuta
                      </span>
                      <ChevronDown 
                        size={18} 
                        className={`transition-transform ${expandedSections.minuta ? '' : '-rotate-90'}`}
                        style={{ color: 'var(--color-text-secondary)' }}
                      />
                    </button>
                    {expandedSections.minuta && (
                      <div 
                        className="px-4 pb-4 text-sm whitespace-pre-wrap"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {result.minuta}
                      </div>
                    )}
                  </div>
                )}

                {/* Acuerdos */}
                {result.acuerdos && result.acuerdos.length > 0 && (
                  <div 
                    className="rounded-xl border overflow-hidden"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderColor: 'var(--color-border)',
                    }}
                  >
                    <button
                      onClick={() => toggleSection('acuerdos')}
                      className="w-full p-4 flex items-center justify-between hover:opacity-80 transition-opacity"
                    >
                      <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        🤝 Acuerdos ({result.acuerdos.length})
                      </span>
                      <ChevronDown 
                        size={18} 
                        className={`transition-transform ${expandedSections.acuerdos ? '' : '-rotate-90'}`}
                        style={{ color: 'var(--color-text-secondary)' }}
                      />
                    </button>
                    {expandedSections.acuerdos && (
                      <ul className="px-4 pb-4 space-y-2">
                        {result.acuerdos.map((acuerdo, i) => (
                          <li 
                            key={i}
                            className="flex items-start gap-2 text-sm"
                            style={{ color: 'var(--color-text-secondary)' }}
                          >
                            <span className="mt-1">•</span>
                            <span>{acuerdo}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Tareas */}
                {result.tareas && result.tareas.length > 0 && (
                  <div 
                    className="rounded-xl border overflow-hidden"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderColor: 'var(--color-border)',
                    }}
                  >
                    <button
                      onClick={() => toggleSection('tareas')}
                      className="w-full p-4 flex items-center justify-between hover:opacity-80 transition-opacity"
                    >
                      <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        ✅ Tareas ({result.tareas.length})
                      </span>
                      <ChevronDown 
                        size={18} 
                        className={`transition-transform ${expandedSections.tareas ? '' : '-rotate-90'}`}
                        style={{ color: 'var(--color-text-secondary)' }}
                      />
                    </button>
                    {expandedSections.tareas && (
                      <ul className="px-4 pb-4 space-y-2">
                        {result.tareas.map((tarea, i) => (
                          <li 
                            key={i}
                            className="flex items-start gap-2 text-sm"
                            style={{ color: 'var(--color-text-secondary)' }}
                          >
                            <span className="mt-1">☐</span>
                            <span>{tarea}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
