import React, { useState, useEffect } from 'react';
import { Mail, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getEmailAccounts } from '@/services/emailService';
import EmailAccountForm from '@/features/email/components/EmailAccountForm';
import EmailAccountsList from '@/features/email/components/EmailAccountsList';
import { useToast } from '@/ui/use-toast';

export default function EmailSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);

  useEffect(() => {
    loadAccounts();
  }, [user]);

  async function loadAccounts() {
    if (!user) return;
    
    try {
      setLoading(true);
      const data = await getEmailAccounts(user.id);
      setAccounts(data || []);
    } catch (error) {
      console.error('Error cargando cuentas:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudieron cargar las cuentas de email',
      });
    } finally {
      setLoading(false);
    }
  }

  function handleAddAccount() {
    setEditingAccount(null);
    setShowAddForm(true);
  }

  function handleEditAccount(account) {
    setEditingAccount(account);
    setShowAddForm(true);
  }

  function handleCloseForm() {
    setShowAddForm(false);
    setEditingAccount(null);
  }

  function handleAccountSaved() {
    loadAccounts();
    handleCloseForm();
  }

  return (
    <div 
      className="h-screen overflow-y-auto"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      <div className="max-w-5xl mx-auto p-6 pb-32">
        {/* Botón Volver */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-6 px-4 py-2 rounded-lg transition-all hover:opacity-80"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border)'
          }}
        >
          <ArrowLeft size={18} />
          <span className="font-medium">Volver</span>
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 
            className="text-3xl font-bold mb-2"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Configuración de Correo
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Gestiona tus cuentas SMTP/IMAP para envío y recepción de emails
          </p>
        </div>

        {/* Contenido */}
        {loading ? (
          <div 
            className="text-center py-12"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Cargando cuentas...
          </div>
        ) : (
          <>
            {/* Lista de cuentas */}
            {accounts.length > 0 && !showAddForm && (
              <div className="mb-6">
                <EmailAccountsList
                  accounts={accounts}
                  onEdit={handleEditAccount}
                  onAccountUpdated={loadAccounts}
                />
              </div>
            )}

            {/* Formulario */}
            {showAddForm ? (
              <div 
                className="p-6 rounded-xl border"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <EmailAccountForm
                  account={editingAccount}
                  onSave={handleAccountSaved}
                  onCancel={handleCloseForm}
                />
              </div>
            ) : (
              <button
                onClick={handleAddAccount}
                className="w-full py-4 px-6 rounded-xl border-2 border-dashed transition-all hover:border-solid"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <span className="font-medium">+ Agregar cuenta de correo</span>
              </button>
            )}

            {/* Empty state */}
            {accounts.length === 0 && !showAddForm && (
              <div 
                className="text-center py-12 rounded-xl border"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <Mail 
                  size={64}
                  style={{ color: 'var(--color-text-tertiary)', opacity: 0.3, marginBottom: '16px' }}
                />
                <h3 
                  className="text-xl font-semibold mb-2"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  No hay cuentas configuradas
                </h3>
                <p 
                  className="mb-6"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Agrega tu primera cuenta SMTP/IMAP para comenzar
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
