import React, { useRef, useEffect, useState } from 'react';
import { Menu, AlertCircle, Mic, Volume2, Waves, MessageSquare, StopCircle, RefreshCw, Copy, Check, BookmarkPlus, FileText, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MarkdownRenderer from '@/lib/markdownRenderer';
import TypingIndicator from '@/features/chat/components/TypingIndicator';
import { SaveMemoryModal } from './SaveMemoryModal';
import { saveMemory } from '@/services/memoryService';
import { useToast } from '@/ui/use-toast';
import { SourcesList, NoSourcesBadge } from './SourcesList';
import { AttachmentsList } from './AttachmentStatus';

// ✅ P1: Componente para mostrar tiempo de procesamiento
function ProcessingTimer({ startTime }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
      <span>Procesando... {formatTime(elapsed)}</span>
      {elapsed > 30 && (
        <span className="text-yellow-600 dark:text-yellow-400">
          (operación larga, puede tardar hasta 60s)
        </span>
      )}
    </div>
  );
}

function MessageThread({ conversation, isLoading, voiceMode, handsFree, onToggleHandsFree, onToggleSidebar, onStopResponse, onRegenerateResponse, currentUser, assistantName, assistantAvatar, userAvatar }) {
  const scrollRef = useRef(null);
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [loadingStartTime, setLoadingStartTime] = useState(null); // ✅ P1: Track tiempo de inicio

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ✅ P1: Actualizar tiempo de inicio cuando cambia isLoading
  useEffect(() => {
    if (isLoading) {
      setLoadingStartTime(Date.now());
    } else {
      setLoadingStartTime(null);
    }
  }, [isLoading]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation?.messages, isLoading]);

  const handleBackButton = () => {
    // ✅ En móvil y desktop: toggle sidebar
    onToggleSidebar();
  };

  return (
    <div className="h-full flex flex-col" style={{ maxWidth: '100vw', width: '100%', overflowX: 'hidden' }}>
      {/* Header con modo de voz - Optimizado para mobile */}
      <div className="p-3 md:p-4 border-b flex items-center justify-between gap-2 md:gap-3 flex-wrap" style={{ borderColor: 'var(--color-border)', maxWidth: '100%' }}>
        <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
          <button
            onClick={handleBackButton}
            className="p-2 rounded-lg transition-all flex-shrink-0"
            style={{ color: 'var(--color-text-secondary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title="Abrir menú"
          >
            <Menu size={20} />
          </button>
          <span className="font-semibold text-base md:text-lg truncate" style={{ color: 'var(--color-text-primary)' }}>
            {conversation?.title || 'AL-E Chat'}
          </span>
        </div>

        {/* Chips de control de voz - Responsive */}
        {voiceMode && (
          <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
            {/* Voice controls - SOLO SI voiceMode existe */}
            <>
                {/* Estado actual */}
                {voiceMode.status !== 'idle' && (
                  <div className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 rounded-full text-xs font-medium ${
                    voiceMode.status === 'listening' ? 'bg-green-900/30 text-green-400 border border-green-700' :
                    voiceMode.status === 'processing' ? 'bg-blue-900/30 text-blue-400 border border-blue-700' :
                    'bg-gray-700 text-gray-300 border border-gray-600'
                  }`}>
                    {voiceMode.status === 'listening' && <><Mic size={12} md:size={14} className="animate-pulse" /> <span className="hidden sm:inline">Escuchando</span></>}
                    {voiceMode.status === 'processing' && <><span className="hidden sm:inline">Procesando...</span><span className="sm:hidden">...</span></>}
                    {voiceMode.status === 'speaking' && <><Volume2 size={12} md:size={14} className="animate-pulse" /> <span className="hidden sm:inline">AL-E habla</span></>}
                  </div>
                )}

                {/* Selector de modo */}
                <button
                  onClick={() => voiceMode.setMode(voiceMode.mode === 'text' ? 'voice' : 'text')}
                  className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    voiceMode.mode === 'voice'
                      ? 'bg-gray-700 text-white border border-gray-600'
                      : 'bg-transparent text-gray-400 hover:bg-gray-800 border border-gray-700'
                  }`}
                >
                  {voiceMode.mode === 'voice' ? (
                    <><Waves size={12} md:size={14} /> <span className="hidden sm:inline">Voz</span></>
                  ) : (
                    <><MessageSquare size={12} md:size={14} /> <span className="hidden sm:inline">Texto</span></>
                  )}
                </button>

                {/* Botón micrófono en modo voz */}
                {voiceMode.mode === 'voice' && (
                  <button
                    onClick={() => {
                      console.log('🔥🔥🔥 [MessageThread] CLICK EN MICRÓFONO');
                      console.log('[VoiceUI] voiceMode:', voiceMode);
                      console.log('[VoiceUI] voiceMode.startListening existe?', typeof voiceMode.startListening);
                      console.log('[VoiceUI] isListening:', voiceMode?.isListening);
                      
                      if (voiceMode.isListening) {
                        console.log('🛑 Deteniendo grabación...');
                        voiceMode.stopAll();
                      } else {
                        console.log('🎤 Iniciando grabación...');
                        voiceMode.startListening();
                      }
                    }}
                    className={`p-2 rounded-full transition-all ${
                      voiceMode.isListening
                        ? 'bg-red-600 text-white animate-pulse'
                        : 'bg-gray-700 text-white hover:bg-gray-600 border border-gray-600'
                    }`}
                  >
                    <Mic size={14} md:size={16} />
                  </button>
                )}

                {/* Botón Manos Libres */}
                {voiceMode.mode === 'voice' && (
                  <button
                    onClick={onToggleHandsFree}
                    className={`flex items-center gap-1.5 px-2 md:px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      handsFree
                        ? 'bg-blue-600 text-white border border-blue-500'
                        : 'bg-transparent text-gray-400 hover:bg-gray-800 border border-gray-700'
                    }`}
                    title={handsFree ? 'Desactivar manos libres' : 'Activar manos libres'}
                  >
                    <Waves size={12} md:size={14} />
                    <span className="hidden sm:inline">Manos Libres</span>
                  </button>
                )}
              </>
          </div>
        )}
      </div>

      {/* Messages - Optimizado para mobile */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-4 scroll-smooth" style={{ maxWidth: '100%' }}>
        {!conversation || conversation.messages.length === 0 ? (
          <div className="h-full flex items-center justify-center px-4">
            <div className="text-center max-w-md w-full">
              <img 
                src="/Logo AL-E sobre fondo negro.png" 
                alt="AL-E Logo" 
                className="w-32 md:w-48 h-auto mx-auto mb-4 md:mb-6"
              />
              <h2 className="text-xl md:text-2xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                ¿Cómo puede ayudarte AL-E hoy?
              </h2>
              <p className="text-sm md:text-base" style={{ color: 'var(--color-text-secondary)' }}>
                Inicia una conversación para comenzar a chatear con AL-E
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 md:space-y-6 max-w-4xl mx-auto">
            {conversation.messages.map((message) => (
              <Message 
                key={message.id} 
                message={message} 
                currentUser={currentUser} 
                assistantName={assistantName}
                assistantAvatar={assistantAvatar}
                userAvatar={userAvatar}
              />
            ))}
            {isLoading && (
              <div className="space-y-3">
                <TypingIndicator />
                {/* ✅ P1: Indicador de tiempo de procesamiento */}
                {loadingStartTime && <ProcessingTimer startTime={loadingStartTime} />}
                {/* Botón detener mientras carga */}
                <div className="flex justify-start">
                  <button
                    onClick={onStopResponse}
                    className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg transition-all hover:opacity-80 text-sm"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-secondary)'
                    }}
                  >
                    <StopCircle size={14} md:size={16} />
                    <span className="font-medium">Detener</span>
                  </button>
                </div>
              </div>
            )}
            {/* Botón regenerar después del último mensaje */}
            {!isLoading && conversation.messages.length > 0 && conversation.messages[conversation.messages.length - 1].role === 'assistant' && (
              <div className="flex justify-start">
                <button
                  onClick={onRegenerateResponse}
                  className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg transition-all hover:opacity-80 text-sm"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  <RefreshCw size={14} md:size={16} />
                  <span className="font-medium">Regenerar</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Message({ message, currentUser, assistantName = 'Luma', assistantAvatar, userAvatar }) {
  const isUser = message.role === 'user';
  const isError = message.isError;
  const [copied, setCopied] = useState(false);
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [memoryType, setMemoryType] = useState(null);
  const { toast } = useToast();
  
  // 🐛 DEBUG: Ver si llega el avatar
  console.log('🔍 [Message] assistantAvatar:', assistantAvatar);
  console.log('🔍 [Message] userAvatar:', userAvatar);
  console.log('🔍 [Message] assistantName:', assistantName);
  console.log('🔍 [Message] isUser:', isUser);

  // Obtener la inicial del usuario
  const getUserInitial = () => {
    if (!currentUser) return 'U';
    return currentUser.charAt(0).toUpperCase();
  };

  // Obtener la inicial del asistente
  const getAssistantInitial = () => {
    if (!assistantName) return 'AL';
    const words = assistantName.trim().split(' ');
    if (words.length >= 2) {
      // Si tiene 2 o más palabras, usar iniciales de primeras 2
      return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    }
    // Si es una palabra, usar primeras 2 letras
    return assistantName.substring(0, 2).toUpperCase();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('❌ Error copiando texto:', error);
    }
  };

  const handleSaveMemoryClick = (type) => {
    setMemoryType(type);
    setShowMemoryModal(true);
  };

  const handleSaveMemory = async ({ content, type, scope }) => {
    try {
      await saveMemory({ content, type, scope });
      
      toast({
        title: "Memoria guardada",
        description: `${type === 'agreement' ? 'Acuerdo' : 'Hecho'} guardado exitosamente. AL-E lo recordará.`,
        duration: 3000,
      });

      setShowMemoryModal(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo guardar la memoria",
        duration: 5000,
      });
      throw error;
    }
  };

  return (
    <>
      <SaveMemoryModal
        isOpen={showMemoryModal}
        onClose={() => setShowMemoryModal(false)}
        initialContent={message.content}
        messageType={memoryType}
        onSave={handleSaveMemory}
      />

      <div className={`flex gap-2 md:gap-4 ${isUser ? 'justify-end' : 'justify-start'} group`} style={{ maxWidth: '100%' }}>
        {!isUser && (
          <div 
            className="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{ 
              backgroundColor: assistantAvatar ? 'transparent' : 'var(--color-accent)',
              border: assistantAvatar ? '2px solid var(--color-accent)' : 'none'
            }}
          >
            {assistantAvatar ? (
              <img 
                src={assistantAvatar} 
                alt={assistantName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs md:text-sm font-semibold" style={{ color: '#FFFFFF' }}>
                {getAssistantInitial()}
              </span>
            )}
          </div>
        )}
      
      <div className={`flex-1 max-w-[85%] md:max-w-3xl ${isUser ? 'text-right' : ''}`} style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>
        <div
          className={`inline-block p-3 md:p-4 rounded-xl relative ${isUser ? 'text-left' : ''}`}
          style={{
            backgroundColor: isUser ? 'var(--color-accent)' : isError ? 'rgba(239, 68, 68, 0.1)' : 'var(--color-bg-secondary)',
            color: isUser ? '#FFFFFF' : 'var(--color-text-primary)',
            maxWidth: '100%',
            overflowWrap: 'break-word',
            wordBreak: 'break-word'
          }}
        >
          {/* Botón copiar (aparece on hover) */}
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 p-1.5 rounded-md transition-all opacity-0 group-hover:opacity-100"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border)'
            }}
            title={copied ? 'Copiado!' : 'Copiar mensaje'}
          >
            {copied ? (
              <Check size={14} className="text-green-500" />
            ) : (
              <Copy size={14} style={{ color: 'var(--color-text-secondary)' }} />
            )}
          </button>

          {isError && (
            <div className="flex items-center gap-2 mb-2 text-red-400">
              <AlertCircle size={14} md:size={16} />
              <span className="text-xs md:text-sm font-medium">Error</span>
            </div>
          )}
          
          {message.attachments && message.attachments.length > 0 && (
            <AttachmentsList attachments={message.attachments} />
          )}
          
          <div className="text-sm md:text-base">
            <MarkdownRenderer content={message.content} />
          </div>

          {/* ✅ Mostrar fuentes si existen */}
          {!isUser && message.sources && message.sources.length > 0 && (
            <SourcesList sources={message.sources} />
          )}
          
          {/* ✅ Badge "sin evidencia" si backend respondió sin fuentes */}
          {!isUser && !isError && message.noSources === true && (
            <NoSourcesBadge />
          )}
        </div>
        
        {/* Botones de memoria (aparecen on hover) - Para mensajes de AL-E Y del usuario */}
        {!isError && (
          <div className={`mt-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-all ${isUser ? 'justify-end' : 'justify-start'}`}>
            <button
              onClick={() => handleSaveMemoryClick('agreement')}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-accent)';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
              }}
              title="Guardar este acuerdo o decisión para recordarlo después"
            >
              <BookmarkPlus size={12} />
              <span>Guardar acuerdo</span>
            </button>
            
            <button
              onClick={() => handleSaveMemoryClick('fact')}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-accent)';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
              }}
              title="Guardar este hecho importante para el contexto del proyecto"
            >
              <FileText size={12} />
              <span>Guardar hecho</span>
            </button>
          </div>
        )}
        
        <div className="mt-1 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          {new Date(message.timestamp).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>

      {isUser && (
        <div 
          className="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
          style={{ 
            backgroundColor: userAvatar ? 'transparent' : 'var(--color-bg-secondary)',
            border: userAvatar ? '2px solid var(--color-accent)' : 'none'
          }}
        >
          {userAvatar ? (
            <img 
              src={userAvatar} 
              alt={currentUser}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xs md:text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {getUserInitial()}
            </span>
          )}
        </div>
      )}
    </div>
    </>
  );
}

export default MessageThread;
