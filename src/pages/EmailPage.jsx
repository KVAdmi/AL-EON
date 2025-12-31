/**
 * EmailPage.jsx
 * Módulo de Email tipo Outlook
 */

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Send, Inbox, Trash2, AlertCircle, FileText, ArrowLeft, Menu, X, ChevronLeft } from 'lucide-react';

export default function EmailPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [selectedFolder, setSelectedFolder] = useState('INBOX');
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [view, setView] = useState('list'); // 'list' o 'detail' para mobile

  // Carpetas simuladas tipo Outlook
  const folders = [
    { id: 'INBOX', name: 'Bandeja de entrada', icon: Inbox, unread: 3 },
    { id: 'Sent', name: 'Enviados', icon: Send, unread: 0 },
    { id: 'Drafts', name: 'Borradores', icon: FileText, unread: 1 },
    { id: 'Spam', name: 'Spam', icon: AlertCircle, unread: 0 },
    { id: 'Trash', name: 'Papelera', icon: Trash2, unread: 0 },
  ];

  const mockEmails = [
    {
      id: 1,
      from: 'Sistema AL-E',
      subject: 'Bienvenido a AL-E Mail',
      preview: 'Esta es tu bandeja de entrada. Pronto podrás enviar y recibir correos.',
      date: 'Hoy',
      isUnread: true,
      avatar: 'A'
    },
    {
      id: 2,
      from: 'Soporte',
      subject: 'Configuración pendiente',
      preview: 'Para activar el envío de correos, contacta con tu administrador.',
      date: 'Ayer',
      isUnread: true,
      avatar: 'S'
    },
  ];

  function handleEmailClick(email) {
    setSelectedEmail(email);
    setView('detail');
  }

  function handleBackToList() {
    setView('list');
    setSelectedEmail(null);
  }

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Top Bar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2 sm:gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 hover:opacity-80 rounded shrink-0" 
            style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-2 hover:opacity-80 rounded lg:hidden shrink-0"
            style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-lg sm:text-xl font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>AL-E Mail</h1>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Folders */}
        <div 
          className={`
            fixed lg:static inset-0 z-50 lg:z-auto
            w-64 lg:border-r flex flex-col
            transition-transform duration-300
            ${showSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
          style={{ 
            borderColor: 'var(--color-border)', 
            backgroundColor: 'var(--color-bg-secondary)',
          }}
        >
          {/* Overlay para mobile */}
          {showSidebar && (
            <div 
              className="fixed inset-0 bg-black/50 lg:hidden -z-10"
              onClick={() => setShowSidebar(false)}
            />
          )}

          <div className="flex items-center justify-between p-4 lg:hidden border-b" style={{ borderColor: 'var(--color-border)' }}>
            <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Carpetas</span>
            <button onClick={() => setShowSidebar(false)} className="p-1">
              <X className="w-5 h-5" style={{ color: 'var(--color-text-primary)' }} />
            </button>
          </div>

          <div className="p-3 sm:p-4">
            <button
              className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-lg font-medium text-sm sm:text-base"
              style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
              onClick={() => setShowSidebar(false)}
            >
              <Send className="w-4 h-4 shrink-0" />
              <span>Redactar</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2">
            <div className="mb-4">
              <div className="text-xs font-semibold mb-2 px-2 uppercase" style={{ color: 'var(--color-text-tertiary)' }}>
                Carpetas
              </div>
              {folders.map((folder) => {
                const Icon = folder.icon;
                const isSelected = selectedFolder === folder.id;
                return (
                  <button
                    key={folder.id}
                    onClick={() => {
                      setSelectedFolder(folder.id);
                      setShowSidebar(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded mb-1 hover:opacity-80"
                    style={{
                      backgroundColor: isSelected ? 'var(--color-bg-tertiary)' : 'transparent',
                      color: 'var(--color-text-primary)'
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="text-sm truncate">{folder.name}</span>
                    </div>
                    {folder.unread > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}>
                        {folder.unread}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center Panel - Email List */}
        <div 
          className={`
            ${view === 'detail' ? 'hidden lg:flex' : 'flex'}
            w-full lg:w-96 border-r flex-col
          `}
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="p-3 sm:p-4 border-b flex items-center justify-between shrink-0" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {folders.find(f => f.id === selectedFolder)?.name}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {mockEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-4" style={{ color: 'var(--color-text-tertiary)' }}>
                <Mail className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-sm text-center">No hay mensajes</p>
              </div>
            ) : (
              <div>
                {mockEmails.map((email) => (
                  <button
                    key={email.id}
                    onClick={() => handleEmailClick(email)}
                    className="w-full p-3 sm:p-4 border-b text-left hover:opacity-80"
                    style={{
                      borderColor: 'var(--color-border)',
                      backgroundColor: selectedEmail?.id === email.id ? 'var(--color-bg-secondary)' : 'transparent'
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div 
                        className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-white font-semibold" 
                        style={{ backgroundColor: 'var(--color-accent)' }}
                      >
                        {email.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1 gap-2">
                          <span 
                            className={`font-medium text-sm truncate ${email.isUnread ? 'font-bold' : ''}`} 
                            style={{ color: 'var(--color-text-primary)' }}
                          >
                            {email.from}
                          </span>
                          <span className="text-xs shrink-0" style={{ color: 'var(--color-text-tertiary)' }}>
                            {email.date}
                          </span>
                        </div>
                        <div 
                          className={`text-sm mb-1 truncate ${email.isUnread ? 'font-semibold' : ''}`} 
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {email.subject}
                        </div>
                        <div className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                          {email.preview}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Email Content */}
        <div 
          className={`
            ${view === 'list' ? 'hidden lg:flex' : 'flex'}
            flex-1 flex-col
          `}
          style={{ backgroundColor: 'var(--color-bg-secondary)' }}
        >
          {!selectedEmail ? (
            <div className="flex-1 flex flex-col items-center justify-center p-4" style={{ color: 'var(--color-text-tertiary)' }}>
              <Mail className="w-16 sm:w-24 h-16 sm:h-24 mb-4 opacity-20" />
              <p className="text-base sm:text-lg text-center">No hay ninguna conversación seleccionada</p>
              <p className="text-sm text-center mt-2">Selecciona un mensaje para leer.</p>
            </div>
          ) : (
            <>
              <div className="p-4 sm:p-6 border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={handleBackToList}
                    className="lg:hidden p-2 rounded hover:opacity-80"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                  {selectedEmail.subject}
                </h2>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-full flex items-center justify-center text-white font-semibold text-base sm:text-lg" 
                    style={{ backgroundColor: 'var(--color-accent)' }}
                  >
                    {selectedEmail.avatar}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{selectedEmail.from}</div>
                    <div className="text-sm truncate" style={{ color: 'var(--color-text-secondary)' }}>
                      Para: {user?.email || 'usuario@ale.com'}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <div style={{ color: 'var(--color-text-primary)' }}>
                  <p className="mb-4">{selectedEmail.preview}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
