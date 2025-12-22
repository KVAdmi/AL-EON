
import React, { useState, useRef } from 'react';
import { Send, Paperclip, X, Image as ImageIcon, Globe } from 'lucide-react';
import { Button } from '@/ui/button';
import { useToast } from '@/ui/use-toast';

function MessageComposer({ onSendMessage, isLoading, disabled, sessionId, onWebToggle, webEnabled }) {
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

    const attachmentData = attachments.map(file => ({
      name: file.name,
      type: file.type,
      size: file.size
    }));

    onSendMessage(message, attachmentData);
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
    setAttachments(prev => [...prev, ...files]);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
    <div className="p-4">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-primary)'
                }}
              >
                <Paperclip size={14} />
                <span className="truncate max-w-[150px]">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(index)}
                  className="hover:opacity-70 transition-opacity"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div 
          className="flex items-end gap-2 p-2 rounded-xl transition-all duration-200"
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
            disabled={isLoading || disabled}
            className="flex-shrink-0 rounded-xl"
          >
            <Paperclip size={20} style={{ color: 'var(--color-text-secondary)' }} />
          </Button>

          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? "Crea una nueva conversación para comenzar..." : "Escribe tu mensaje... (Shift+Enter para nueva línea)"}
            disabled={isLoading || disabled}
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none px-2 py-2"
            style={{
              color: 'var(--color-text-primary)',
              minHeight: '24px',
              maxHeight: '200px'
            }}
          />

          <Button
            type="submit"
            size="icon"
            disabled={(!message.trim() && attachments.length === 0) || isLoading || disabled}
            className="flex-shrink-0 transition-all duration-200 rounded-xl"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-text-primary)'
            }}
          >
            <Send size={18} />
          </Button>
        </div>

        {/* Helper Text */}
        <p className="text-xs mt-2 text-center" style={{ color: 'var(--color-text-tertiary)' }}>
          Press Enter to send, Shift+Enter for new line
        </p>
      </form>
    </div>
  );
}

export default MessageComposer;
