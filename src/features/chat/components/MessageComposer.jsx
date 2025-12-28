
import React, { useState, useRef } from 'react';
import { Send, Paperclip, X, Image as ImageIcon, Globe } from 'lucide-react';
import { Button } from '@/ui/button';
import { useToast } from '@/ui/use-toast';

function MessageComposer({ onSendMessage, isLoading, isUploading, disabled, sessionId, onWebToggle, webEnabled }) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [showImagePrompt, setShowImagePrompt] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Detectar comando /image
    if (message.trim().startsWith('/image ')) {
      const prompt = message.trim().substring(7);
      if (prompt) {
        onSendMessage(`/image ${prompt}`, attachments);
        setMessage('');
        setAttachments([]);
        return;
      }
    }
    
    if (!message.trim() && attachments.length === 0) {
      return;
    }

    if (disabled) {
      toast({
        title: "Sin conversación",
        description: "Por favor crea una nueva conversación primero",
        variant: "destructive"
      });
      return;
    }

    console.log('📤 SENDING MESSAGE WITH ATTACHMENTS:', attachments);

    // ✅ AHORA PASAMOS LOS ARCHIVOS COMPLETOS (File objects)
    onSendMessage(message, attachments);
    setMessage('');
    setAttachments([]);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleImageGenerate = () => {
    const prompt = window.prompt('Describe la imagen que quieres generar:');
    if (prompt && prompt.trim()) {
      onSendMessage(`/image ${prompt.trim()}`, []);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    console.log('📎 FILES SELECTED:', files);
    setAttachments(prev => [...prev, ...files]);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const files = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          files.push(file);
        }
      }
    }

    if (files.length > 0) {
      console.log('📋 IMAGES PASTED:', files);
      setAttachments(prev => [...prev, ...files]);
      toast({
        title: "Imágenes pegadas",
        description: `${files.length} imagen(es) agregadas`
      });
    }
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleTextareaChange = (e) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  return (
    <div className="p-3 md:p-4 border-t" style={{ borderColor: 'var(--color-border)', maxWidth: '100vw', overflowX: 'hidden' }}>
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto" style={{ maxWidth: '100%' }}>
        {/* ✅ NUEVO: Indicador de "Procesando documento..." */}
        {isUploading && (
          <div className="mb-2 md:mb-3 px-3 md:px-4 py-2 rounded-2xl flex items-center gap-2 text-xs md:text-sm"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-secondary)'
            }}
          >
            <div className="animate-spin h-3 w-3 md:h-4 md:w-4 border-2 border-current border-t-transparent rounded-full"></div>
            <span>Procesando documentos...</span>
          </div>
        )}

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="mb-2 md:mb-3 flex flex-wrap gap-1.5 md:gap-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="inline-flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded-full text-xs md:text-sm"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-primary)'
                }}
              >
                <Paperclip size={12} className="md:w-3.5 md:h-3.5 flex-shrink-0" />
                <span className="truncate max-w-[100px] md:max-w-[150px]">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(index)}
                  className="hover:opacity-70 transition-opacity flex-shrink-0"
                >
                  <X size={12} className="md:w-3.5 md:h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Area - Optimizado para mobile */}
        <div 
          className="flex items-end gap-1.5 md:gap-2 p-1.5 md:p-2 rounded-2xl transition-all duration-200"
          style={{ 
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)'
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isUploading || disabled}
            className="flex-shrink-0 rounded-2xl h-9 w-9 md:h-10 md:w-10"
          >
            <Paperclip size={18} className="md:w-5 md:h-5" style={{ color: 'var(--color-text-secondary)' }} />
          </Button>

          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={disabled ? "Nueva conversación..." : isUploading ? "Procesando..." : "Escribe tu mensaje..."}
            disabled={isLoading || isUploading || disabled}
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none px-1 md:px-2 py-2 text-sm md:text-base"
            style={{
              color: 'var(--color-text-primary)',
              minHeight: '24px',
              maxHeight: '120px'
            }}
          />

          <Button
            type="submit"
            size="icon"
            disabled={(!message.trim() && attachments.length === 0) || isLoading || isUploading || disabled}
            className="flex-shrink-0 transition-all duration-200 rounded-2xl h-9 w-9 md:h-10 md:w-10"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: '#FFFFFF'
            }}
          >
            <Send size={16} className="md:w-[18px] md:h-[18px]" />
          </Button>
        </div>

        {/* Helper Text - Oculto en mobile */}
        <p className="text-xs mt-2 text-center hidden md:block" style={{ color: 'var(--color-text-tertiary)' }}>
          Press Enter to send, Shift+Enter for new line
        </p>
      </form>
    </div>
  );
}

export default MessageComposer;
