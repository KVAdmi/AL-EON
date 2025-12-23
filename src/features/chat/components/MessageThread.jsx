import React, { useRef, useEffect } from 'react';
import { Menu, AlertCircle, Mic, Volume2, Waves, MessageSquare, StopCircle, RefreshCw } from 'lucide-react';
import MarkdownRenderer from '@/lib/markdownRenderer';
import TypingIndicator from '@/features/chat/components/TypingIndicator';

function MessageThread({ conversation, isLoading, voiceMode, handsFree, onToggleHandsFree, onToggleSidebar, onStopResponse, onRegenerateResponse }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation?.messages, isLoading]);

  return (
    <div className="h-full flex flex-col">
      {/* Header con modo de voz - Optimizado para mobile */}
      <div className="p-3 md:p-4 border-b flex items-center justify-between gap-2 md:gap-3 flex-wrap" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg transition-all flex-shrink-0"
            style={{ color: 'var(--color-text-secondary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
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
                onClick={voiceMode.isListening ? voiceMode.stopAll : voiceMode.startListening}
                className={`p-2 rounded-full transition-all ${
                  voiceMode.isListening
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'bg-gray-700 text-white hover:bg-gray-600 border border-gray-600'
                }`}
              >
                <Mic size={14} md:size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Messages - Optimizado para mobile */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 md:p-4 scroll-smooth">
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
              <Message key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="space-y-3">
                <TypingIndicator />
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

function Message({ message }) {
  const isUser = message.role === 'user';
  const isError = message.isError;

  return (
    <div className={`flex gap-2 md:gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div 
          className="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          <span className="text-xs md:text-sm font-semibold" style={{ color: '#FFFFFF' }}>
            AL
          </span>
        </div>
      )}
      
      <div className={`flex-1 max-w-[85%] md:max-w-3xl ${isUser ? 'text-right' : ''}`}>
        <div
          className={`inline-block p-3 md:p-4 rounded-xl ${isUser ? 'text-left' : ''}`}
          style={{
            backgroundColor: isUser ? 'var(--color-accent)' : isError ? 'rgba(239, 68, 68, 0.1)' : 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)'
          }}
        >
          {isError && (
            <div className="flex items-center gap-2 mb-2 text-red-400">
              <AlertCircle size={14} md:size={16} />
              <span className="text-xs md:text-sm font-medium">Error</span>
            </div>
          )}
          
          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-2 md:mb-3 flex flex-wrap gap-1.5 md:gap-2">
              {message.attachments.map((attachment, idx) => (
                <AttachmentChip key={idx} attachment={attachment} />
              ))}
            </div>
          )}
          
          <div className="text-sm md:text-base">
            <MarkdownRenderer content={message.content} />
          </div>

          {/* TODO: Agregar soporte para imágenes, fuentes web, citas y acciones */}
        </div>
        
        <div className="mt-1 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          {new Date(message.timestamp).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>

      {isUser && (
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'var(--color-bg-secondary)' }}
        >
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            U
          </span>
        </div>
      )}
    </div>
  );
}

function AttachmentChip({ attachment }) {
  return (
    <div 
      className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm"
      style={{ 
        backgroundColor: 'var(--color-accent-light)',
        color: 'var(--color-accent)' 
      }}
    >
      <span className="truncate max-w-[200px]">{attachment.name || 'Attachment'}</span>
    </div>
  );
}

export default MessageThread;
