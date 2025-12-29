import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getEmailAccounts, getInbox, getFolders, createFolder } from '@/services/emailService';
import { Mail, Inbox as InboxIcon, Send, Archive, ArrowLeft, FileText } from 'lucide-react';
import EmailInbox from '@/features/email/components/EmailInbox';
import ComposeModal from '@/features/email/components/ComposeModal';
import FoldersList from '@/components/email/FoldersList';
import { useToast } from '@/ui/use-toast';
import { Link } from 'react-router-dom';

export default function EmailPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [activeView, setActiveView] = useState('inbox'); // inbox, sent, archive

  useEffect(() => {
    loadAccounts();
  }, [user]);

  useEffect(() => {
    if (selectedAccount && user) {
      loadFolders();
    }
  }, [selectedAccount, user]);

  async function loadAccounts() {
    if (!user) return;

    try {
      setLoading(true);
      const data = await getEmailAccounts(user.id);
      setAccounts(data || []);
      
      // Seleccionar primera cuenta activa
      const activeAccount = data?.find(acc => acc.is_active);
      if (activeAccount) {
        setSelectedAccount(activeAccount);
      }
    } catch (error) {
      console.error('Error cargando cuentas:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadFolders() {
    if (!selectedAccount || !user) return;

    try {
      setLoadingFolders(true);
      const data = await getFolders(selectedAccount.account_id || selectedAccount.id, user.id);
      setFolders(data || []);
      
      // Seleccionar INBOX por defecto
      const inbox = data?.find(f => f.folder_name === 'INBOX');
      if (inbox) {
        setSelectedFolder(inbox);
      }
    } catch (error) {
      console.error('Error cargando folders:', error);
    } finally {
      setLoadingFolders(false);
    }
  }

  async function handleCreateFolder(folderName) {
    if (!selectedAccount || !user) return;
    
    try {
      await createFolder({
        account_id: selectedAccount.account_id || selectedAccount.id,
        owner_user_id: user.id,
        folder_name: folderName,
        is_system: false,
      });
      await loadFolders(); // Recargar lista
    } catch (error) {
      throw error;
    }
  }

  async function handleRenameFolder(folderId, newName) {
    // TODO: Implementar endpoint de rename en backend
    console.log('Rename folder:', folderId, newName);
    alert('Feature de renombrar carpetas estará disponible pronto');
  }

  async function handleDeleteFolder(folderId) {
    // TODO: Implementar endpoint de delete en backend
    console.log('Delete folder:', folderId);
    alert('Feature de eliminar carpetas estará disponible pronto');
  }

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        <div style={{ color: 'var(--color-text-secondary)' }}>
          Cargando...
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-6"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        <div 
          className="max-w-md text-center p-8 rounded-xl border"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            borderColor: 'var(--color-border)',
          }}
        >
          <Mail size={64} className="mx-auto mb-4" style={{ color: 'var(--color-text-tertiary)' }} />
          <h2 
            className="text-2xl font-bold mb-3"
            style={{ color: 'var(--color-text-primary)' }}
          >
            No hay cuentas configuradas
          </h2>
          <p 
            className="mb-6"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Configura una cuenta SMTP/IMAP para comenzar a enviar y recibir emails
          </p>
          <Link
            to="/settings/email"
            className="inline-block py-3 px-6 rounded-xl font-medium transition-all hover:opacity-90"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: '#FFFFFF',
            }}
          >
            Configurar cuenta
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div 
        className="h-screen flex flex-col sm:flex-row"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        {/* Sidebar */}
        <div 
          className="w-full sm:w-64 border-r flex flex-col max-h-[40vh] sm:max-h-none"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {/* Header */}
          <div className="p-3 sm:p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
            {/* Botón Volver */}
            <button
              onClick={() => navigate(-1)}
              className="w-full mb-2 sm:mb-3 px-3 sm:px-4 py-2 rounded-lg transition-all hover:opacity-80 flex items-center gap-2 text-sm sm:text-base"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)'
              }}
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="font-medium">Volver</span>
            </button>

            <button
              onClick={() => setShowCompose(true)}
              className="w-full py-2 sm:py-3 px-3 sm:px-4 rounded-xl font-medium transition-all hover:opacity-90 flex items-center justify-center gap-2 text-sm sm:text-base"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: '#FFFFFF',
              }}
            >
              <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              Redactar
            </button>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto">
            {/* Borradores link */}
            <div className="p-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <button
                onClick={() => navigate('/drafts')}
                className="w-full px-4 py-2.5 rounded-lg flex items-center gap-3 transition-all hover:opacity-80"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-primary)',
                }}
              >
                <FileText size={18} />
                Borradores
              </button>
            </div>

            {/* Folders */}
            <div className="p-2">
              <FoldersList
                folders={folders}
                selectedFolder={selectedFolder}
                onSelectFolder={setSelectedFolder}
                onCreateFolder={handleCreateFolder}
                onRenameFolder={handleRenameFolder}
                onDeleteFolder={handleDeleteFolder}
                isLoading={loadingFolders}
              />
            </div>
          </div>

          {/* Account selector */}
          {accounts.length > 1 && (
            <div className="p-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <select
                value={selectedAccount?.id || ''}
                onChange={(e) => {
                  const account = accounts.find(a => a.id === e.target.value);
                  setSelectedAccount(account);
                }}
                className="w-full px-3 py-2 rounded-lg border"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.fromEmail}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col">
          {activeView === 'inbox' && selectedAccount ? (
            <EmailInbox accountId={selectedAccount.id} />
          ) : (
            <div 
              className="flex-1 flex items-center justify-center"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              {activeView === 'inbox' ? 'Inbox en preparación' : `${activeView} en preparación`}
            </div>
          )}
        </div>
      </div>

      {/* Compose modal */}
      {showCompose && (
        <ComposeModal
          accounts={accounts}
          defaultAccountId={selectedAccount?.id}
          onClose={() => setShowCompose(false)}
        />
      )}
    </>
  );
}
