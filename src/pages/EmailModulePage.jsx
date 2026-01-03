/**
 * EmailModulePage - Página principal del módulo de Correo
 * Layout tipo Outlook con sidebar, inbox, detalle y composer
 */
import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Plus, 
  Settings, 
  Inbox as InboxIcon, 
  Send, 
  Archive, 
  Trash2,
  Star,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import useEmailStore from '../../stores/emailStore';
import { getEmailAccounts } from '../../services/emailService';
import EmailConfigWizard from '../../features/email/components/EmailConfigWizard';
import EmailInbox from '../../features/email/components/EmailInbox';
import EmailMessageDetail from '../../features/email/components/EmailMessageDetail';
import EmailComposer from '../../features/email/components/EmailComposer';

export default function EmailModulePage() {
  const { user, accessToken } = useAuth();
  const { toast } = useToast();
  const {
    currentAccount,
    accounts,
    selectedMessage,
    isComposing,
    currentFolder,
    setCurrentAccount,
    setAccounts,
    setSelectedMessage,
    setCurrentFolder,
    startCompose,
    closeCompose,
  } = useEmailStore();

  const [showWizard, setShowWizard] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [composerMode, setComposerMode] = useState('new');
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cargar cuentas al montar
  useEffect(() => {
    if (user?.id) {
      loadAccounts();
    }
  }, [user]);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const data = await getEmailAccounts(user.id, accessToken);
      setAccounts(data);
      
      // Si hay cuentas y no hay una seleccionada, seleccionar la primera
      if (data.length > 0 && !currentAccount) {
        setCurrentAccount(data[0]);
      }
    } catch (error) {
      console.error('Error al cargar cuentas:', error);
      toast.error('Error al cargar cuentas: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccountSelect = (account) => {
    setCurrentAccount(account);
    setSelectedMessage(null);
  };

  const handleWizardComplete = (newAccount) => {
    setShowWizard(false);
    loadAccounts();
    toast.success('✓ Cuenta configurada exitosamente');
  };

  const handleCompose = () => {
    setComposerMode('new');
    setReplyToMessage(null);
    startCompose();
  };

  const handleReply = (message) => {
    setComposerMode('reply');
    setReplyToMessage(message);
    startCompose();
  };

  const handleReplyAll = (message) => {
    setComposerMode('replyAll');
    setReplyToMessage(message);
    startCompose();
  };

  const handleForward = (message) => {
    setComposerMode('forward');
    setReplyToMessage(message);
    startCompose();
  };

  const handleCreateTask = (message) => {
    toast.info('Función de crear tarea próximamente');
    // TODO: Integrar con módulo de tareas
  };

  const folders = [
    { id: 'inbox', name: 'Bandeja de entrada', icon: InboxIcon, color: 'var(--color-primary)' },
    { id: 'sent', name: 'Enviados', icon: Send, color: 'var(--color-text-secondary)' },
    { id: 'starred', name: 'Destacados', icon: Star, color: '#facc15' },
    { id: 'archive', name: 'Archivados', icon: Archive, color: 'var(--color-text-secondary)' },
    { id: 'trash', name: 'Papelera', icon: Trash2, color: '#ef4444' },
  ];

  if (loading) {
    return (
      <div 
        className="h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        <div className="text-center">
          <Mail className="w-16 h-16 mx-auto mb-4 animate-pulse" style={{ color: 'var(--color-primary)' }} />
          <p className="text-lg" style={{ color: 'var(--color-text-primary)' }}>
            Cargando correo...
          </p>
        </div>
      </div>
    );
  }

  // Si no hay cuentas, mostrar pantalla de configuración inicial
  if (accounts.length === 0 && !showWizard) {
    return (
      <div 
        className="h-screen flex items-center justify-center p-6"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        <div className="max-w-md text-center">
          <Mail className="w-24 h-24 mx-auto mb-6" style={{ color: 'var(--color-primary)' }} />
          <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            Bienvenido al módulo de Correo
          </h1>
          <p className="text-lg mb-8" style={{ color: 'var(--color-text-secondary)' }}>
            Conecta tu cuenta de correo (Gmail, Outlook o cualquier proveedor IMAP/SMTP) para comenzar
          </p>
          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold mx-auto hover:opacity-90 transition-all"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'white',
            }}
          >
            <Plus className="w-5 h-5" />
            Configurar mi primera cuenta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="h-screen flex flex-col"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      {/* Header */}
      <div 
        className="h-16 flex items-center justify-between px-4 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="lg:hidden p-2 rounded-lg hover:opacity-80"
            style={{ backgroundColor: 'var(--color-bg-secondary)' }}
          >
            <Menu className="w-5 h-5" style={{ color: 'var(--color-text-primary)' }} />
          </button>
          
          <Mail className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            AL-E Correo
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCompose}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-all"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'white',
            }}
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Redactar</span>
          </button>

          <button
            onClick={() => setShowWizard(true)}
            className="p-2 rounded-lg hover:opacity-80"
            style={{ backgroundColor: 'var(--color-bg-secondary)' }}
            title="Configurar cuenta"
          >
            <Settings className="w-5 h-5" style={{ color: 'var(--color-text-primary)' }} />
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div
          className={`${
            showSidebar ? 'translate-x-0' : '-translate-x-full'
          } fixed lg:static inset-y-0 left-0 z-40 w-64 border-r flex flex-col transition-transform lg:translate-x-0`}
          style={{
            backgroundColor: 'var(--color-bg-primary)',
            borderColor: 'var(--color-border)',
          }}
        >
          <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                CUENTAS
              </h2>
              <button
                onClick={() => setShowSidebar(false)}
                className="lg:hidden p-1 rounded hover:opacity-80"
              >
                <X className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
              </button>
            </div>
            
            {/* Lista de cuentas */}
            <div className="space-y-1">
              {accounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => handleAccountSelect(account)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                    currentAccount?.id === account.id ? 'ring-2' : ''
                  }`}
                  style={{
                    backgroundColor: currentAccount?.id === account.id 
                      ? 'var(--color-bg-secondary)' 
                      : 'transparent',
                    ringColor: 'var(--color-primary)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <p className="font-medium truncate text-sm">{account.fromName}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--color-text-tertiary)' }}>
                    {account.fromEmail}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Carpetas */}
          <div className="flex-1 overflow-y-auto p-4">
            <h2 className="font-semibold text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              CARPETAS
            </h2>
            <div className="space-y-1">
              {folders.map((folder) => {
                const FolderIcon = folder.icon;
                return (
                  <button
                    key={folder.id}
                    onClick={() => setCurrentFolder(folder.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                      currentFolder === folder.id ? 'ring-2' : ''
                    }`}
                    style={{
                      backgroundColor: currentFolder === folder.id 
                        ? 'var(--color-bg-secondary)' 
                        : 'transparent',
                      ringColor: 'var(--color-primary)',
                    }}
                  >
                    <FolderIcon className="w-5 h-5" style={{ color: folder.color }} />
                    <span 
                      className="text-sm font-medium"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {folder.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Inbox List */}
          <div className={`${selectedMessage ? 'hidden lg:flex' : 'flex'} w-full lg:w-96 border-r flex-col`}>
            <EmailInbox 
              onSelectMessage={(message) => {
                setSelectedMessage(message);
              }}
            />
          </div>

          {/* Message Detail */}
          <div className={`${selectedMessage ? 'flex' : 'hidden lg:flex'} flex-1 flex-col`}>
            <EmailMessageDetail
              message={selectedMessage}
              onReply={handleReply}
              onReplyAll={handleReplyAll}
              onForward={handleForward}
              onCreateTask={handleCreateTask}
              onClose={() => setSelectedMessage(null)}
            />
          </div>
        </div>
      </div>

      {/* Overlays */}
      {showSidebar && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Wizard */}
      {showWizard && (
        <EmailConfigWizard
          onComplete={handleWizardComplete}
          onCancel={() => setShowWizard(false)}
        />
      )}

      {/* Composer */}
      {isComposing && (
        <EmailComposer
          mode={composerMode}
          replyTo={replyToMessage}
          onClose={closeCompose}
          onSent={() => {
            closeCompose();
            toast.success('✓ Correo enviado');
          }}
        />
      )}
    </div>
  );
}
