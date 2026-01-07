import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeftIcon, 
  MagnifyingGlassIcon,
  EnvelopeIcon,
  PaperAirplaneIcon,
  CalendarIcon,
  DocumentArrowDownIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline';
import { getMeetingById, sendMinutes, createCalendarEvents } from '../services/meetingsService';

const MeetingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [meeting, setMeeting] = useState(null);
  const [activeTab, setActiveTab] = useState('transcript'); // transcript, minuta, documentos
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingTelegram, setSendingTelegram] = useState(false);
  const [creatingEvents, setCreatingEvents] = useState(false);

  useEffect(() => {
    loadMeeting();
  }, [id]);

  const loadMeeting = async () => {
    try {
      setLoading(true);
      const data = await getMeetingById(id);
      setMeeting(data);
    } catch (error) {
      console.error('Error loading meeting:', error);
      alert('No se pudo cargar la reunión');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!meeting) return;
    
    try {
      setSendingEmail(true);
      await sendMinutes(meeting.id, 'email');
      alert('✅ Minuta enviada por correo');
    } catch (error) {
      console.error('Error sending email:', error);
      alert('❌ Error al enviar correo');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSendTelegram = async () => {
    if (!meeting) return;
    
    try {
      setSendingTelegram(true);
      await sendMinutes(meeting.id, 'telegram');
      alert('✅ Minuta enviada por Telegram');
    } catch (error) {
      console.error('Error sending Telegram:', error);
      alert('❌ Error al enviar por Telegram');
    } finally {
      setSendingTelegram(false);
    }
  };

  const handleCreateEvents = async () => {
    if (!meeting) return;
    
    try {
      setCreatingEvents(true);
      await createCalendarEvents(meeting.id);
      alert('✅ Eventos creados en tu calendario');
    } catch (error) {
      console.error('Error creating events:', error);
      alert('❌ Error al crear eventos');
    } finally {
      setCreatingEvents(false);
    }
  };

  const handleDownloadTranscript = () => {
    if (!meeting?.transcript_text) return;
    
    const blob = new Blob([meeting.transcript_text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meeting.title}_transcripcion.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTimestamp = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const highlightSearchText = (text) => {
    if (!searchQuery.trim()) return text;
    
    const regex = new RegExp(`(${searchQuery})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) => 
      regex.test(part) 
        ? <mark key={i} className="bg-yellow-200">{part}</mark>
        : part
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <p className="text-lg mb-4">Reunión no encontrada</p>
        <button
          onClick={() => navigate('/reuniones')}
          className="text-blue-600 hover:underline"
        >
          Volver a reuniones
        </button>
      </div>
    );
  }

  const isProcessing = meeting.status === 'processing' || meeting.status === 'uploading';
  const hasError = meeting.status === 'error';

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/reuniones')}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{meeting.title}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {new Date(meeting.created_at).toLocaleString('es-MX', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
                {meeting.audio_duration_seconds && (
                  <span className="ml-3">
                    • Duración: {Math.floor(meeting.audio_duration_seconds / 60)} min
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          {!isProcessing && !hasError && (
            <div className="flex items-center space-x-3">
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                <EnvelopeIcon className="w-5 h-5" />
                <span>{sendingEmail ? 'Enviando...' : 'Enviar por Email'}</span>
              </button>
              
              <button
                onClick={handleSendTelegram}
                disabled={sendingTelegram}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
              >
                <PaperAirplaneIcon className="w-5 h-5" />
                <span>{sendingTelegram ? 'Enviando...' : 'Enviar por Telegram'}</span>
              </button>
              
              <button
                onClick={handleCreateEvents}
                disabled={creatingEvents}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
              >
                <CalendarIcon className="w-5 h-5" />
                <span>{creatingEvents ? 'Creando...' : 'Crear Eventos'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Status Banner */}
        {isProcessing && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-blue-800">
              Procesando tu reunión... esto puede tardar unos minutos
            </span>
          </div>
        )}

        {hasError && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">
              ❌ Error al procesar: {meeting.error_message || 'Error desconocido'}
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-6 mt-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('transcript')}
            className={`pb-3 px-1 font-medium text-sm transition-colors ${
              activeTab === 'transcript'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Transcripción
          </button>
          <button
            onClick={() => setActiveTab('minuta')}
            className={`pb-3 px-1 font-medium text-sm transition-colors ${
              activeTab === 'minuta'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Minuta
          </button>
          <button
            onClick={() => setActiveTab('documentos')}
            className={`pb-3 px-1 font-medium text-sm transition-colors ${
              activeTab === 'documentos'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Documentos
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'transcript' && (
          <TranscriptTab 
            meeting={meeting} 
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            highlightSearchText={highlightSearchText}
            formatTimestamp={formatTimestamp}
            onDownload={handleDownloadTranscript}
          />
        )}

        {activeTab === 'minuta' && (
          <MinutaTab meeting={meeting} />
        )}

        {activeTab === 'documentos' && (
          <DocumentosTab meeting={meeting} />
        )}
      </div>
    </div>
  );
};

// ============================================
// TAB: TRANSCRIPCIÓN
// ============================================
const TranscriptTab = ({ meeting, searchQuery, setSearchQuery, highlightSearchText, formatTimestamp, onDownload }) => {
  if (!meeting.transcript_text && !meeting.transcript_json) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>No hay transcripción disponible</p>
      </div>
    );
  }

  // Si tenemos transcript_json con timestamps
  const hasTimestamps = meeting.transcript_json && Array.isArray(meeting.transcript_json);

  return (
    <div className="p-6">
      {/* Search Bar */}
      <div className="mb-6 flex items-center space-x-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar en la transcripción..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <button
          onClick={onDownload}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
        >
          <DocumentArrowDownIcon className="w-5 h-5" />
          <span>Descargar</span>
        </button>
      </div>

      {/* Transcript Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {hasTimestamps ? (
          <div className="space-y-4">
            {meeting.transcript_json.map((segment, index) => (
              <div key={index} className="flex space-x-4">
                <span className="text-sm text-gray-500 font-mono min-w-[60px]">
                  {formatTimestamp(segment.start)}
                </span>
                <p className="text-gray-800 leading-relaxed">
                  {highlightSearchText(segment.text)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
            {highlightSearchText(meeting.transcript_text)}
          </p>
        )}
      </div>
    </div>
  );
};

// ============================================
// TAB: MINUTA
// ============================================
const MinutaTab = ({ meeting }) => {
  if (!meeting.minutes_summary) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>La minuta se está generando...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Resumen */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">📋 Resumen</h2>
        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
          {meeting.minutes_summary}
        </p>
      </div>

      {/* Acuerdos */}
      {meeting.minutes_agreements && meeting.minutes_agreements.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CheckCircleIcon className="w-6 h-6 text-green-600 mr-2" />
            Acuerdos
          </h2>
          <div className="space-y-3">
            {meeting.minutes_agreements.map((agreement, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                <span className="text-green-600 font-semibold">{index + 1}.</span>
                <div className="flex-1">
                  <p className="text-gray-800">{agreement.text}</p>
                  {agreement.assignee && (
                    <p className="text-sm text-gray-600 mt-1">
                      👤 Responsable: {agreement.assignee}
                    </p>
                  )}
                  {agreement.date && (
                    <p className="text-sm text-gray-600 mt-1">
                      📅 Fecha: {agreement.date}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pendientes */}
      {meeting.minutes_pending && meeting.minutes_pending.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <ClockIcon className="w-6 h-6 text-orange-600 mr-2" />
            Pendientes
          </h2>
          <div className="space-y-3">
            {meeting.minutes_pending.map((pending, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-orange-50 rounded-lg">
                <span className="text-orange-600 font-semibold">{index + 1}.</span>
                <div className="flex-1">
                  <p className="text-gray-800">{pending.text}</p>
                  {pending.priority && (
                    <p className="text-sm text-orange-600 mt-1 font-medium">
                      Prioridad: {pending.priority}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Decisiones */}
      {meeting.minutes_decisions && meeting.minutes_decisions.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <LightBulbIcon className="w-6 h-6 text-blue-600 mr-2" />
            Decisiones
          </h2>
          <div className="space-y-3">
            {meeting.minutes_decisions.map((decision, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                <span className="text-blue-600 font-semibold">{index + 1}.</span>
                <div className="flex-1">
                  <p className="text-gray-800">{decision.text}</p>
                  {decision.impact && (
                    <p className="text-sm text-gray-600 mt-1">
                      💡 Impacto: {decision.impact}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Riesgos */}
      {meeting.minutes_risks && meeting.minutes_risks.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600 mr-2" />
            Riesgos
          </h2>
          <div className="space-y-3">
            {meeting.minutes_risks.map((risk, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
                <span className="text-red-600 font-semibold">{index + 1}.</span>
                <div className="flex-1">
                  <p className="text-gray-800">{risk.text}</p>
                  {risk.severity && (
                    <p className="text-sm text-red-600 mt-1 font-medium">
                      ⚠️ Severidad: {risk.severity}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// TAB: DOCUMENTOS
// ============================================
const DocumentosTab = ({ meeting }) => {
  const hasAttachments = meeting.attachments && meeting.attachments.length > 0;

  if (!hasAttachments) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>No hay documentos adjuntos</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {meeting.attachments.map((attachment, index) => (
          <a
            key={index}
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-500 hover:shadow-md transition-all"
          >
            <div className="flex items-start space-x-3">
              <DocumentArrowDownIcon className="w-8 h-8 text-gray-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {attachment.name}
                </p>
                {attachment.type && (
                  <p className="text-xs text-gray-500 mt-1">
                    {attachment.type.toUpperCase()}
                  </p>
                )}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default MeetingDetailPage;
