/**
 * EmailPageOutlook.jsx
 * Réplica EXACTA de Outlook macOS con datos REALES (NO MOCKS)
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getEmailAccounts, getFolders, getInbox } from '@/services/emailService';
import { Mail, Send, Inbox, Archive, Trash2, AlertCircle, FileText, Star, ArrowLeft, Search, Menu, X, ChevronLeft, RefreshCw, Settings, Edit3 } from 'lucide-react';
import EmailAccountForm from '@/features/email/components/EmailAccountForm';

export default function EmailPageOutlook() {
  const { user, accessToken } = useAuth();
  const navigate = useNavigate();
  
  // Estados principales
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // UI Estados
  const [showSidebar, setShowSidebar] = useState(false);
  const [view, setView] = useState('list'); // 'list' o 'detail' para mobile
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [filterTab, setFilterTab] = useState('prioritarios'); // 'prioritarios' o 'otro'

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

  useEffect(() => {
    if (selectedFolder && selectedAccount) {
      loadEmails();
    }
  }, [selectedFolder, selectedAccount]);

  async function loadAccounts() {
    try {
      const data = await getEmailAccounts(user.id, accessToken);
      console.log('📧 Cuentas cargadas:', data);
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
      const data = await getFolders(selectedAccount.id || selectedAccount.account_id, user.id, accessToken);
      console.log('📁 Folders cargados:', data);
      setFolders(data || []);
      const inbox = data?.find(f => f.folder_name === 'INBOX' || f.folder_name === 'Bandeja de entrada');
      if (inbox) {
        setSelectedFolder(inbox);
      } else if (data && data.length > 0) {
        setSelectedFolder(data[0]);
      }
    } catch (error) {
      console.error('Error cargando folders:', error);
    }
  }

  async function loadEmails() {
    try {
      setLoadingEmails(true);
      const accountId = selectedAccount.id || selectedAccount.account_id;
      const data = await getInbox(accountId, {
        folder: selectedFolder.folder_name,
        limit: 50,
      });
      console.log('✉️ Emails cargados:', data);
      setEmails(data.messages || []);
    } catch (error) {
      console.error('Error cargando emails:', error);
      setEmails([]);
    } finally {
      setLoadingEmails(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadEmails();
    setTimeout(() => setRefreshing(false), 500);
  }

  const FOLDER_ICONS = {
    'INBOX': Inbox,
    'Bandeja de entrada': Inbox,
    'Sent': Send,
    'Enviados': Send,
    'Drafts': FileText,
    'Borradores': FileText,
    'Spam': AlertCircle,
    'Trash': Trash2,
    'Papelera': Trash2,
  };

  function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  }

  function getAvatarColor(email) {
    const colors = [
      '#3b82f6', // blue
      '#10b981', // green
      '#f59e0b', // orange
      '#ef4444', // red
      '#8b5cf6', // purple
      '#ec4899', // pink
      '#06b6d4', // cyan
    ];
    const index = (email?.charCodeAt(0) || 0) % colors.length;
    return colors[index];
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 24) {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } else if (diffHours < 48) {
      return 'Ayer';
    } else if (diffHours < 168) {
      return date.toLocaleDateString('es-ES', { weekday: 'long' });
    }
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
  }

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
            onClick={() => setShowSettingsModal(true)}
            className="px-6 py-3 rounded-xl w-full sm:w-auto font-medium hover:opacity-90"
            style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
          >
            + Agregar cuenta de correo
          </button>
        </div>
        
        {/* Modal de configuración */}
        {showSettingsModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div 
              className="max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl p-6"
              style={{ backgroundColor: 'var(--color-bg-primary)' }}
            >
              <EmailAccountForm 
                onSave={() => {
                  setShowSettingsModal(false);
                  loadAccounts();
                }}
                onCancel={() => setShowSettingsModal(false)}
              />
            </div>
          </div>
        )}
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
            className="p-2 hover:opacity-80 rounded-xl shrink-0" 
            style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-2 hover:opacity-80 rounded-xl lg:hidden shrink-0"
            style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-lg sm:text-xl font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>AL-E Mail</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 hover:opacity-80 rounded-xl shrink-0" 
            style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}
            title="Refrescar"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={() => setShowSettingsModal(true)}
            className="p-2 hover:opacity-80 rounded-xl shrink-0" 
            style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}
            title="Configurar cuentas"
          >
            <Settings className="w-5 h-5" />
          </button>
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
              className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl font-medium text-sm sm:text-base hover:opacity-90"
              style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
              onClick={() => {
                setShowSidebar(false);
                // TODO: Abrir modal de redactar
              }}
            >
              <Edit3 className="w-4 h-4 shrink-0" />
              <span>Redactar</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2">
            <div className="mb-4">
              <div className="text-xs font-semibold mb-2 px-2 uppercase" style={{ color: 'var(--color-text-tertiary)' }}>
                Favoritos
              </div>
              <button 
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:opacity-80" 
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
                        setSelectedEmail(null);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl mb-1 hover:opacity-80"
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
              <button 
                onClick={() => setFilterTab('prioritarios')}
                className="px-3 py-1.5 text-sm rounded-xl whitespace-nowrap hover:opacity-80" 
                style={{ 
                  backgroundColor: filterTab === 'prioritarios' ? 'var(--color-accent)' : 'transparent', 
                  color: filterTab === 'prioritarios' ? '#fff' : 'var(--color-text-secondary)' 
                }}
              >
                Prioritarios
              </button>
              <button 
                onClick={() => setFilterTab('otro')}
                className="px-3 py-1.5 text-sm rounded-xl whitespace-nowrap hover:opacity-80" 
                style={{ 
                  backgroundColor: filterTab === 'otro' ? 'var(--color-accent)' : 'transparent',
                  color: filterTab === 'otro' ? '#fff' : 'var(--color-text-secondary)' 
                }}
              >
                Otro
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingEmails ? (
              <div className="flex items-center justify-center h-full" style={{ color: 'var(--color-text-tertiary)' }}>
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
            ) : emails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-4" style={{ color: 'var(--color-text-tertiary)' }}>
                <Mail className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-sm text-center">No hay mensajes</p>
              </div>
            ) : (
              <div>
                {emails.map((email) => {
                  const fromName = email.from_name || email.from_email || 'Desconocido';
                  const avatar = getInitials(fromName);
                  const avatarColor = getAvatarColor(email.from_email);
                  const isUnread = !email.is_read;
                  
                  return (
                    <button
                      key={email.message_id || email.id}
                      onClick={() => handleEmailClick(email)}
                      className="w-full p-3 sm:p-4 border-b text-left hover:opacity-80 transition-colors"
                      style={{
                        borderColor: 'var(--color-border)',
                        backgroundColor: selectedEmail?.message_id === email.message_id ? 'var(--color-bg-secondary)' : 'transparent'
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div 
                          className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-white font-semibold text-sm" 
                          style={{ backgroundColor: avatarColor }}
                        >
                          {avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1 gap-2">
                            <span 
                              className={`font-medium text-sm truncate ${isUnread ? 'font-bold' : ''}`} 
                              style={{ color: 'var(--color-text-primary)' }}
                            >
                              {fromName}
                            </span>
                            <span className="text-xs shrink-0" style={{ color: 'var(--color-text-tertiary)' }}>
                              {formatDate(email.received_at || email.date)}
                            </span>
                          </div>
                          <div 
                            className={`text-sm mb-1 truncate ${isUnread ? 'font-semibold' : ''}`} 
                            style={{ color: 'var(--color-text-primary)' }}
                          >
                            {email.subject || '(Sin asunto)'}
                          </div>
                          <div className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                            {email.preview || email.text_preview || ''}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
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
                    className="lg:hidden p-2 rounded-xl hover:opacity-80"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-2">
                    <button className="p-2 rounded-xl hover:opacity-80" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                      <Archive className="w-4 h-4" style={{ color: 'var(--color-text-primary)' }} />
                    </button>
                    <button className="p-2 rounded-xl hover:opacity-80" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                      <Trash2 className="w-4 h-4" style={{ color: 'var(--color-text-primary)' }} />
                    </button>
                  </div>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                  {selectedEmail.subject || '(Sin asunto)'}
                </h2>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-full flex items-center justify-center text-white font-semibold text-base sm:text-lg" 
                    style={{ backgroundColor: getAvatarColor(selectedEmail.from_email) }}
                  >
                    {getInitials(selectedEmail.from_name || selectedEmail.from_email)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {selectedEmail.from_name || selectedEmail.from_email}
                    </div>
                    <div className="text-sm truncate" style={{ color: 'var(--color-text-secondary)' }}>
                      Para: {selectedAccount?.from_email || 'ti'}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <div style={{ color: 'var(--color-text-primary)' }}>
                  <div 
                    dangerouslySetInnerHTML={{ 
                      __html: selectedEmail.html_body || selectedEmail.text_body?.replace(/\n/g, '<br/>') || selectedEmail.preview || 'Sin contenido' 
                    }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Modal de configuración de cuentas */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div 
            className="max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl p-6"
            style={{ backgroundColor: 'var(--color-bg-primary)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Configuración de correo
              </h2>
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="p-2 hover:opacity-80 rounded-xl"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {accounts.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                  Cuentas configuradas
                </h3>
                <div className="space-y-2">
                  {accounts.map((acc) => (
                    <div 
                      key={acc.id || acc.account_id}
                      className="p-3 rounded-xl border flex items-center justify-between"
                      style={{ 
                        borderColor: 'var(--color-border)',
                        backgroundColor: 'var(--color-bg-secondary)'
                      }}
                    >
                      <div>
                        <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {acc.from_name || 'Sin nombre'}
                        </div>
                        <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                          {acc.from_email}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <span 
                          className="text-xs px-2 py-1 rounded-full"
                          style={{ 
                            backgroundColor: acc.is_active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            color: acc.is_active ? '#10b981' : '#ef4444'
                          }}
                        >
                          {acc.is_active ? 'Activa' : 'Inactiva'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <EmailAccountForm 
              onSave={() => {
                setShowSettingsModal(false);
                loadAccounts();
              }}
              onCancel={() => setShowSettingsModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
