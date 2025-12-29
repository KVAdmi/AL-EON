import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getEmailAccounts, getInbox } from '@/services/emailService';
import { Mail, Inbox as InboxIcon, Send, Archive } from 'lucide-react';
import EmailInbox from '@/features/email/components/EmailInbox';
import ComposeModal from '@/features/email/components/ComposeModal';
import { useToast } from '@/ui/use-toast';
import { Link } from 'react-router-dom';

export default function EmailPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [activeView, setActiveView] = useState('inbox'); // inbox, sent, archive

  useEffect(() => {
    loadAccounts();
  }, [user]);

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
        className="h-screen flex"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        {/* Sidebar */}
        <div 
          className="w-64 border-r flex flex-col"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {/* Header */}
          <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <button
              onClick={() => setShowCompose(true)}
              className="w-full py-3 px-4 rounded-xl font-medium transition-all hover:opacity-90 flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: '#FFFFFF',
              }}
            >
              <Send size={18} />
              Redactar
            </button>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto p-2">
            <button
              onClick={() => setActiveView('inbox')}
              className={`w-full px-4 py-2.5 rounded-lg mb-1 flex items-center gap-3 transition-all ${
                activeView === 'inbox' ? 'font-medium' : ''
              }`}
              style={{
                backgroundColor: activeView === 'inbox' ? 'var(--color-bg-secondary)' : 'transparent',
                color: 'var(--color-text-primary)',
              }}
            >
              <InboxIcon size={18} />
              Bandeja de entrada
            </button>

            <button
              onClick={() => setActiveView('sent')}
              className={`w-full px-4 py-2.5 rounded-lg mb-1 flex items-center gap-3 transition-all ${
                activeView === 'sent' ? 'font-medium' : ''
              }`}
              style={{
                backgroundColor: activeView === 'sent' ? 'var(--color-bg-secondary)' : 'transparent',
                color: 'var(--color-text-primary)',
              }}
            >
              <Send size={18} />
              Enviados
            </button>

            <button
              onClick={() => setActiveView('archive')}
              className={`w-full px-4 py-2.5 rounded-lg mb-1 flex items-center gap-3 transition-all ${
                activeView === 'archive' ? 'font-medium' : ''
              }`}
              style={{
                backgroundColor: activeView === 'archive' ? 'var(--color-bg-secondary)' : 'transparent',
                color: 'var(--color-text-primary)',
              }}
            >
              <Archive size={18} />
              Archivo
            </button>
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
