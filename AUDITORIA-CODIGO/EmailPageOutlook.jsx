/**
 * EmailPageOutlook.jsx
 * Módulo de Email EXACTAMENTE COMO OUTLOOK con modo oscuro y RESPONSIVE PERFECTO
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getEmailAccounts, getFolders } from '@/services/emailService';
import { Mail, Send, Inbox, Archive, Trash2, AlertCircle, FileText, Star, ArrowLeft, Search, Menu, X, ChevronLeft } from 'lucide-react';

export default function EmailPageOutlook() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [view, setView] = useState('list'); // 'list' o 'detail' para mobile

  useEffect(() => {
    if (user?.id) {
      loadAccounts();
    }
  }, [user]);

  useEffect(() => {
    if (selectedAccount && user) {
      loadFolders();
    }
  }, [selectedAccount, user]);

  async function loadAccounts() {
    try {
      const data = await getEmailAccounts(user.id);
      setAccounts(data || []);
      if (data && data.length > 0) {
        setSelectedAccount(data[0]);
      }
    } catch (error) {
      console.error('Error cargando cuentas:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadFolders() {
    try {
      const data = await getFolders(selectedAccount.account_id || selectedAccount.id, user.id);
      setFolders(data || []);
      const inbox = data?.find(f => f.folder_name === 'INBOX');
      if (inbox) {
        setSelectedFolder(inbox);
      }
    } catch (error) {
      console.error('Error cargando folders:', error);
    }
  }

  const FOLDER_ICONS = {
    'INBOX': Inbox,
    'Sent': Send,
    'Drafts': FileText,
    'Spam': AlertCircle,
    'Trash': Trash2,
  };

  const mockEmails = [
    {
      id: 1,
      from: 'Microsoft',
      subject: 'Actualiza la información de tu cuenta',
      preview: 'Tu suscripción ha vencido. Actualice su información de facturación para continuar usando nuestros servicios.',
      date: '7:03',
      isUnread: true,
      avatar: 'M'
    },
    {
      id: 2,
      from: 'Supabase',
      subject: 'Action Required: Payment Failure',
      preview: 'Hi there, Your organization "Codigo Vivo" has a payment method that failed.',
      date: 'Ayer',
      isUnread: false,
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div style={{ color: 'var(--color-text-secondary)' }}>Cargando...</div>
      </div>
    );
  }

  if (!user || accounts.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="text-center max-w-md">
          <Mail className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--color-text-tertiary)' }} />
          <p style={{ color: 'var(--color-text-secondary)' }} className="mb-4">No tienes cuentas de email configuradas</p>
          <button
            onClick={() => navigate('/settings/email')}
            className="px-6 py-3 rounded-lg w-full sm:w-auto"
            style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
          >
            Configurar cuenta
          </button>
        </div>
      </div>
    );
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
        {/* Left Sidebar - Folders (Responsive) */}
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
                Favoritos
              </div>
              <button 
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded hover:opacity-80" 
                style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}
                onClick={() => setShowSidebar(false)}
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span className="text-sm">Borradores</span>
              </button>
            </div>

            <div className="mb-4">
              <div className="text-xs font-semibold mb-2 px-2 uppercase" style={{ color: 'var(--color-text-tertiary)' }}>
                Carpetas
              </div>
              {folders.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                  No hay carpetas
                </div>
              ) : (
                folders.map((folder) => {
                  const Icon = FOLDER_ICONS[folder.folder_name] || Mail;
                  const isSelected = selectedFolder?.folder_id === folder.folder_id;
                  return (
                    <button
                      key={folder.folder_id}
                      onClick={() => {
                        setSelectedFolder(folder);
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
                        <span className="text-sm truncate">{folder.folder_name}</span>
                      </div>
                      {folder.unread_count > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}>
                          {folder.unread_count}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Center Panel - Email List (Hidden on mobile when detail is shown) */}
        <div 
          className={`
            ${view === 'detail' ? 'hidden lg:flex' : 'flex'}
            w-full lg:w-96 border-r flex-col
          `}
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="p-3 sm:p-4 border-b flex items-center justify-between shrink-0" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-2 overflow-x-auto">
              <button className="px-3 py-1.5 text-sm rounded whitespace-nowrap" style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}>
                Prioritarios
              </button>
              <button className="px-3 py-1.5 text-sm rounded whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>
                Otro
              </button>
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

        {/* Right Panel - Email Content (Full screen on mobile) */}
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
              <p className="text-sm text-center mt-2">Selecciona una conversación para leer.</p>
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
                  <div className="flex items-center gap-2">
                    <button className="p-2 rounded hover:opacity-80" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                      <Archive className="w-4 h-4" style={{ color: 'var(--color-text-primary)' }} />
                    </button>
                    <button className="p-2 rounded hover:opacity-80" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                      <Trash2 className="w-4 h-4" style={{ color: 'var(--color-text-primary)' }} />
                    </button>
                  </div>
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
                      Para: {selectedAccount?.email}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <div style={{ color: 'var(--color-text-primary)' }}>
                  <p className="mb-4">{selectedEmail.preview}</p>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Contenido completo del email aparecerá aquí...
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
