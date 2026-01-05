/**
 * EmailModulePage - Página principal del módulo de Correo
 * Layout tipo Outlook con sidebar, inbox, detalle y composer
 */
import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Plus, 
  Settings, 
  Menu,
  X,
  Mic,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import useEmailStore from '@/stores/emailStore';
import { getEmailAccounts } from '@/services/emailService';
import EmailConfigWizard from '@/features/email/components/EmailConfigWizard';
import EmailInbox from '@/features/email/components/EmailInbox';
import EmailComposer from '@/features/email/components/EmailComposer';
import EmailMessageDetail from '@/features/email/components/EmailMessageDetail';
import EmailAccountSection from '@/features/email/components/EmailAccountSection';

export default function EmailModulePage() {
  const { user, accessToken } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
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
  const [voiceMode, setVoiceMode] = useState(false);

  // Cargar cuentas al montar
  useEffect(() => {
    if (user?.id) {
      loadAccounts();
    }
  }, [user]);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      console.log('🔵 [EmailModulePage] Cargando cuentas para user:', user?.id);
      const data = await getEmailAccounts(user.id, accessToken);
      console.log('🔵 [EmailModulePage] Cuentas recibidas:', data);
      console.log('🔵 [EmailModulePage] Cantidad de cuentas:', data?.length);
      
      setAccounts(data);
      
      // Si hay cuentas y no hay una seleccionada, seleccionar la primera
      if (data.length > 0 && !currentAccount) {
        console.log('🔵 [EmailModulePage] Seleccionando primera cuenta:', data[0]);
        setCurrentAccount(data[0]);
      } else if (data.length === 0) {
        console.log('⚠️ [EmailModulePage] NO se encontraron cuentas en Supabase');
      }
    } catch (error) {
      console.error('❌ [EmailModulePage] Error al cargar cuentas:', error);
      toast({
        variant: 'destructive',
        title: 'Error al cargar cuentas',
        description: error.message || 'No se pudieron cargar las cuentas de correo',
      });
    } finally {
      console.log('🔵 [EmailModulePage] Finalizando loadAccounts, setLoading(false)');
      setLoading(false);
    }
  };

  const handleWizardComplete = (newAccount) => {
    setShowWizard(false);
    loadAccounts();
    toast({
      title: 'Cuenta configurada',
      description: '✓ Tu cuenta de correo está lista para usar',
    });
  };

  const handleAccountSelect = (account) => {
    console.log('🔵 [EmailModulePage] Cuenta seleccionada:', account);
    setCurrentAccount(account);
    setCurrentFolder('inbox'); // Resetear a inbox al cambiar de cuenta
    setSelectedMessage(null); // Limpiar mensaje seleccionado
  };

  const handleFolderSelect = (account, folderId) => {
    console.log('🔵 [EmailModulePage] Carpeta seleccionada:', folderId, 'para cuenta:', account.id);
    setCurrentAccount(account);
    setCurrentFolder(folderId);
    setSelectedMessage(null); // Limpiar mensaje seleccionado al cambiar carpeta
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
    toast({
      title: 'Próximamente',
      description: 'Función de crear tarea estará disponible pronto',
    });
    // TODO: Integrar con módulo de tareas
  };

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
            className="flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold mx-auto hover:opacity-90 transition-all"
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
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-2xl hover:opacity-80 transition-all"
            style={{ 
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-text-primary)'
            }}
            title="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="lg:hidden p-2 rounded-2xl hover:opacity-80"
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
            onClick={() => setVoiceMode(!voiceMode)}
            className={`p-2 rounded-2xl transition-all ${voiceMode ? 'animate-pulse ring-2' : ''}`}
            style={{
              backgroundColor: voiceMode ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
              color: voiceMode ? 'white' : 'var(--color-text-primary)',
              ringColor: voiceMode ? 'var(--color-accent)' : 'transparent',
            }}
            title={voiceMode ? "Modo voz ACTIVO - Click para desactivar" : "Activar modo voz manos libres"}
          >
            <Mic className="w-5 h-5" />
          </button>

          <button
            onClick={handleCompose}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl font-medium hover:opacity-90 transition-all"
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
            className="p-2 rounded-2xl hover:opacity-80"
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
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
            <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              MIS CUENTAS
            </h2>
            <button
              onClick={() => setShowSidebar(false)}
              className="lg:hidden p-1 rounded-2xl hover:opacity-80"
            >
              <X className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
            </button>
          </div>

          {/* Lista de cuentas colapsables */}
          <div className="flex-1 overflow-y-auto p-4">
            {accounts.length === 0 && (
              <div className="text-center py-8">
                <Mail className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--color-text-tertiary)' }} />
                <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                  No hay cuentas configuradas
                </p>
              </div>
            )}
            {accounts.map((account) => (
              <EmailAccountSection
                key={account.id}
                account={account}
                currentFolder={currentAccount?.id === account.id ? currentFolder : null}
                onFolderSelect={handleFolderSelect}
                isOnlyAccount={accounts.length === 1}
              />
            ))}
          </div>

          {/* Botón para agregar cuenta */}
          <div className="p-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <button
              onClick={() => setShowWizard(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg hover:opacity-90 transition-all"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
              }}
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Agregar cuenta</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Inbox List */}
          <div className={`${selectedMessage ? 'hidden lg:flex' : 'flex'} w-full lg:w-96 border-r flex-col`} style={{ borderColor: 'var(--color-border)' }}>
            <EmailInbox 
              accountId={currentAccount?.id}
              folder={currentFolder}
              onSelectMessage={(message) => {
                setSelectedMessage(message);
              }}
            />
          </div>

          {/* Message Detail */}
          <div className={`${selectedMessage ? 'flex' : 'hidden lg:flex'} flex-1 flex-col`}>
            {selectedMessage ? (
              <EmailMessageDetail
                message={selectedMessage}
                onReply={handleReply}
                onReplyAll={handleReplyAll}
                onForward={handleForward}
                onCreateTask={handleCreateTask}
                onClose={() => setSelectedMessage(null)}
              />
            ) : (
              <div 
                className="h-full flex items-center justify-center"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                Selecciona un mensaje para verlo
              </div>
            )}
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
            toast({
              title: 'Correo enviado',
              description: '✓ Tu mensaje ha sido enviado exitosamente',
            });
          }}
        />
      )}
    </div>
  );
}
