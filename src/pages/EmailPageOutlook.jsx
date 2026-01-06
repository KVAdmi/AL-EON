/**
 * EmailPageOutlook.jsx
 * Réplica EXACTA de Outlook macOS PROFESIONAL con datos REALES
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  getEmailAccounts, getFolders, getInbox, 
  getContacts, createContact, importVCard,
  syncEmailAccount
} from '@/services/emailService';
import { 
  Mail, Send, Inbox, Archive, Trash2, AlertCircle, FileText, Star, 
  ArrowLeft, Search, Menu, X, ChevronLeft, ChevronRight, RefreshCw, Settings, 
  Edit3, Users, Filter, MoreVertical, Clock, Flag, Upload
} from 'lucide-react';
import EmailAccountForm from '@/features/email/components/EmailAccountForm';
import EmailComposer from '@/features/email/components/EmailComposer';
import ContactFormModal from '@/features/email/components/ContactFormModal';
import { useToast } from '@/ui/use-toast';

export default function EmailPageOutlook() {
  const { user, accessToken } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
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
  const [showComposer, setShowComposer] = useState(false);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contacts, setContacts] = useState([]);
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
    if (!selectedAccount || !selectedFolder || !user) {
      console.warn('⚠️ Faltan datos para cargar emails');
      return;
    }
    
    try {
      setLoadingEmails(true);
      const accountId = selectedAccount.id || selectedAccount.account_id;
      console.log('📧 Cargando emails...', { 
        accountId, 
        userId: user.id,
        folder: selectedFolder.folder_name 
      });
      
      const data = await getInbox(accountId, {
        ownerUserId: user.id,
        folder: selectedFolder.folder_name,
        limit: 50,
      });
      
      console.log('✉️ Emails cargados:', data);
      setEmails(data.messages || data.emails || []);
    } catch (error) {
      console.error('❌ Error cargando emails:', error);
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

  async function loadContacts() {
    try {
      const data = await getContacts(user.id);
      setContacts(data || []);
    } catch (error) {
      console.error('Error cargando contactos:', error);
    }
  }

  async function handleCreateContact(contactData) {
    try {
      await createContact(user.id, contactData);
      toast({
        title: 'Contacto creado',
        description: `${contactData.name} ha sido agregado a tus contactos`,
      });
      await loadContacts();
    } catch (error) {
      throw error;
    }
  }

  async function handleImportVCard(file) {
    try {
      toast({
        title: 'Importando contactos...',
        description: 'Por favor espera mientras procesamos el archivo',
      });
      
      const result = await importVCard(file, user.id);
      
      toast({
        title: 'Importación completada',
        description: `${result.success} contactos importados${result.errors > 0 ? `, ${result.errors} errores` : ''}`,
      });
      
      await loadContacts();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo importar el archivo vCard',
      });
    }
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
    <div className="h-screen flex flex-col" style={{ backgroundColor: '#1c1c1e' }}>
      {/* Top Bar - Más oscuro como Outlook */}
      <div 
        className="flex items-center justify-between px-3 sm:px-4 py-3 border-b shrink-0" 
        style={{ 
          borderColor: '#2c2c2e',
          backgroundColor: '#1c1c1e'
        }}
      >
        <div className="flex items-center gap-2 sm:gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 hover:bg-white/5 rounded-xl shrink-0 transition-all" 
            style={{ color: '#ffffff' }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-2 hover:bg-white/5 rounded-xl lg:hidden shrink-0 transition-all"
            style={{ color: '#ffffff' }}
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-lg sm:text-xl font-semibold truncate" style={{ color: '#ffffff' }}>
            AL-E Mail
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 hover:bg-white/5 rounded-xl shrink-0 transition-all" 
            style={{ color: '#ffffff' }}
            title="Refrescar"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={() => setShowContactsModal(true)}
            className="p-2 hover:bg-white/5 rounded-xl shrink-0 transition-all" 
            style={{ color: '#ffffff' }}
            title="Contactos"
          >
            <Users className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setShowSettingsModal(true)}
            className="p-2 hover:bg-white/5 rounded-xl shrink-0 transition-all" 
            style={{ color: '#ffffff' }}
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
              className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl font-medium text-sm sm:text-base hover:opacity-90 transition-all shadow-lg"
              style={{ backgroundColor: '#0078d4', color: '#fff' }}
              onClick={() => {
                setShowSidebar(false);
                setShowComposer(true);
              }}
            >
              <Edit3 className="w-4 h-4 shrink-0" />
              <span>Nuevo correo</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2">
            {/* Favoritos */}
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

            {/* TODAS LAS CUENTAS CON SUS CARPETAS (estilo Outlook macOS) */}
            {accounts.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                No hay cuentas configuradas
              </div>
            ) : (
              accounts.map((account) => (
                <AccountFolderTree
                  key={account.id || account.account_id}
                  account={account}
                  user={user}
                  accessToken={accessToken}
                  selectedAccount={selectedAccount}
                  selectedFolder={selectedFolder}
                  onSelectAccount={setSelectedAccount}
                  onSelectFolder={(folder) => {
                    setSelectedFolder(folder);
                    setShowSidebar(false);
                    setSelectedEmail(null);
                  }}
                  FOLDER_ICONS={FOLDER_ICONS}
                />
              ))
            )}
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
          {/* Header con nombre de cuenta y carpeta */}
          <div className="p-3 sm:p-4 border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
            {/* Título de cuenta y carpeta */}
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <Mail size={16} style={{ color: '#0078d4' }} />
                <h2 className="text-lg font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
                  {selectedAccount?.display_name || selectedAccount?.email || 'Cuenta de correo'}
                </h2>
              </div>
              {selectedFolder && (
                <div className="flex items-center gap-2 ml-6">
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text-secondary)' }}>
                    {selectedFolder.folder_name}
                  </span>
                  {selectedFolder.unread_count > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}>
                      {selectedFolder.unread_count} sin leer
                    </span>
                  )}
                </div>
              )}
            </div>
            
            {/* Filtros */}
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
              <div className="flex flex-col items-center justify-center h-full p-8" style={{ color: 'var(--color-text-tertiary)' }}>
                <Mail className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-base font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  No hay mensajes en esta carpeta
                </p>
                <p className="text-sm text-center mb-4">
                  Los correos de tu cuenta se sincronizarán automáticamente
                </p>
                {selectedAccount && (
                  <button
                    onClick={async () => {
                      try {
                        toast({
                          title: 'Sincronizando...',
                          description: 'Descargando correos del servidor',
                        });
                        await syncEmailAccount(selectedAccount.id || selectedAccount.account_id);
                        await loadEmails();
                        toast({
                          title: 'Sincronización completada',
                          description: 'Los correos se han actualizado',
                        });
                      } catch (error) {
                        toast({
                          variant: 'destructive',
                          title: 'Error',
                          description: error.message || 'No se pudo sincronizar',
                        });
                      }
                    }}
                    className="px-4 py-2 rounded-xl font-medium hover:opacity-90 transition-all"
                    style={{ backgroundColor: '#0078d4', color: '#fff' }}
                  >
                    <RefreshCw className="w-4 h-4 inline mr-2" />
                    Sincronizar ahora
                  </button>
                )}
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
      
      {/* Modal de Composer */}
      {showComposer && (
        <EmailComposer
          mode="new"
          onClose={() => setShowComposer(false)}
          onSent={() => {
            setShowComposer(false);
            handleRefresh();
          }}
        />
      )}
      
      {/* Modal de Contactos */}
      {showContactsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div 
            className="max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
            style={{ backgroundColor: 'var(--color-bg-primary)' }}
          >
            <div className="sticky top-0 z-10 p-6 border-b" style={{ 
              backgroundColor: 'var(--color-bg-primary)',
              borderColor: 'var(--color-border)' 
            }}>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  Contactos
                </h2>
                <button 
                  onClick={() => setShowContactsModal(false)}
                  className="p-2 hover:opacity-80 rounded-xl transition-all"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Opciones de importar/crear */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.vcf,.vcard';
                    input.onchange = (e) => {
                      const file = e.target.files[0];
                      if (file) {
                        handleImportVCard(file);
                      }
                    };
                    input.click();
                  }}
                  className="p-6 rounded-2xl border-2 border-dashed hover:opacity-80 transition-all text-center"
                  style={{ 
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-bg-secondary)'
                  }}
                >
                  <Upload className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--color-accent)' }} />
                  <h3 className="font-semibold text-lg mb-2" style={{ color: 'var(--color-text-primary)' }}>
                    Importar vCard
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Importa contactos desde archivos .vcf o .vcard
                  </p>
                </button>
                
                <button
                  onClick={() => {
                    setShowContactForm(true);
                  }}
                  className="p-6 rounded-2xl border-2 hover:opacity-80 transition-all text-center"
                  style={{ 
                    borderColor: '#0078d4',
                    backgroundColor: 'rgba(0, 120, 212, 0.1)'
                  }}
                >
                  <Users className="w-12 h-12 mx-auto mb-3" style={{ color: '#0078d4' }} />
                  <h3 className="font-semibold text-lg mb-2" style={{ color: 'var(--color-text-primary)' }}>
                    Crear contacto
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Agrega un nuevo contacto manualmente
                  </p>
                </button>
              </div>
              
              {/* Lista de contactos (placeholder) */}
              <div className="mt-6">
                <h3 className="font-semibold text-lg mb-4" style={{ color: 'var(--color-text-primary)' }}>
                  Mis contactos
                </h3>
                <div 
                  className="text-center py-12 rounded-xl"
                  style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                >
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--color-text-tertiary)' }} />
                  <p style={{ color: 'var(--color-text-secondary)' }}>
                    No tienes contactos guardados aún
                  </p>
                  <p className="text-sm mt-2" style={{ color: 'var(--color-text-tertiary)' }}>
                    Importa o crea tu primer contacto
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de crear/editar contacto */}
      <ContactFormModal
        isOpen={showContactForm}
        onClose={() => setShowContactForm(false)}
        onSave={handleCreateContact}
      />
    </div>
  );
}

/**
 * Componente para mostrar un árbol de carpetas por cuenta (estilo Outlook macOS)
 */
function AccountFolderTree({ 
  account, 
  user, 
  accessToken, 
  selectedAccount,
  selectedFolder, 
  onSelectAccount,
  onSelectFolder, 
  FOLDER_ICONS 
}) {
  const [folders, setFolders] = useState([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isExpanded) {
      loadFolders();
    }
  }, [isExpanded, account]);

  async function loadFolders() {
    try {
      setLoading(true);
      const data = await getFolders(account.id || account.account_id, user.id, accessToken);
      console.log(`📁 Folders de ${account.email}:`, data);
      setFolders(data || []);
    } catch (error) {
      console.error('Error cargando folders:', error);
      setFolders([]);
    } finally {
      setLoading(false);
    }
  }

  const accountId = account.id || account.account_id;
  const isSelectedAccount = selectedAccount?.id === accountId || selectedAccount?.account_id === accountId;

  return (
    <div className="mb-4">
      {/* Header de la cuenta (MÁS VISIBLE) */}
      <button
        onClick={() => {
          setIsExpanded(!isExpanded);
          if (!isSelectedAccount) {
            onSelectAccount(account);
          }
        }}
        className="w-full flex items-center gap-2 px-3 py-3 rounded-xl hover:opacity-90 transition-all shadow-sm"
        style={{
          backgroundColor: isSelectedAccount ? '#0078d4' : 'var(--color-bg-tertiary)',
          color: isSelectedAccount ? '#fff' : 'var(--color-text-primary)',
          border: `2px solid ${isSelectedAccount ? '#0078d4' : 'var(--color-border)'}`
        }}
      >
        <ChevronRight 
          size={16} 
          className={`transition-transform shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
        />
        <Mail size={18} className="shrink-0" />
        <div className="flex-1 text-left min-w-0">
          <div className="text-sm font-bold truncate">{account.display_name || 'Mi cuenta'}</div>
          <div className="text-xs truncate opacity-80">
            {account.email}
          </div>
        </div>
        {folders.length > 0 && (
          <span className="text-xs px-2 py-1 rounded-full shrink-0 font-medium" style={{ 
            backgroundColor: isSelectedAccount ? 'rgba(255,255,255,0.2)' : 'var(--color-bg-primary)',
            color: isSelectedAccount ? '#fff' : 'var(--color-text-tertiary)'
          }}>
            {folders.length}
          </span>
        )}
      </button>

      {/* Carpetas de la cuenta (MÁS INDENTADAS) */}
      {isExpanded && (
        <div className="ml-6 mt-2 space-y-1 pl-2 border-l-2" style={{ borderColor: isSelectedAccount ? '#0078d4' : 'var(--color-border)' }}>
          {loading ? (
            <div className="px-3 py-2 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              Cargando...
            </div>
          ) : folders.length === 0 ? (
            <div className="px-3 py-2 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              Sin carpetas
            </div>
          ) : (
            folders.map((folder) => {
              const Icon = FOLDER_ICONS[folder.folder_name] || Mail;
              const isSelected = selectedFolder?.folder_id === folder.folder_id;
              return (
                <button
                  key={folder.folder_id}
                  onClick={() => {
                    onSelectAccount(account);
                    onSelectFolder(folder);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:opacity-90 transition-all"
                  style={{
                    backgroundColor: isSelected ? 'var(--color-accent)' : 'transparent',
                    color: isSelected ? '#fff' : 'var(--color-text-primary)'
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-medium truncate">{folder.folder_name}</span>
                  </div>
                  {folder.unread_count > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full shrink-0 font-bold" style={{ 
                      backgroundColor: isSelected ? 'rgba(255,255,255,0.3)' : 'var(--color-accent)', 
                      color: '#fff' 
                    }}>
                      {folder.unread_count}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
