import React, { useState } from 'react';
import { deleteEmailAccount, testEmailConnection } from '@/services/emailService';
import { useToast } from '@/ui/use-toast';
import { Mail, MoreVertical, CheckCircle2, XCircle, Trash2, Edit3 } from 'lucide-react';

export default function EmailAccountsList({ accounts, onEdit, onAccountUpdated }) {
  const { toast } = useToast();
  const [openMenu, setOpenMenu] = useState(null);

  async function handleDelete(accountId) {
    if (!confirm('¿Eliminar esta cuenta de email?')) return;

    try {
      await deleteEmailAccount(accountId);
      toast({
        title: 'Cuenta eliminada',
        description: 'La cuenta se eliminó correctamente',
      });
      onAccountUpdated();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo eliminar la cuenta',
      });
    }
  }

  return (
    <div className="space-y-3">
      {accounts.map((account) => (
        <div
          key={account.id}
          className="p-5 rounded-xl border flex items-center justify-between group hover:shadow-sm transition-all"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            borderColor: 'var(--color-border)',
          }}
        >
          <div className="flex items-center gap-4 flex-1">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-bg-primary)' }}
            >
              <Mail size={24} style={{ color: 'var(--color-accent)' }} />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 
                  className="font-semibold"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {account.fromName}
                </h3>
                {account.is_active ? (
                  <span 
                    className="px-2 py-0.5 text-xs rounded-full font-medium"
                    style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      color: '#10b981',
                    }}
                  >
                    Activa
                  </span>
                ) : (
                  <span 
                    className="px-2 py-0.5 text-xs rounded-full font-medium"
                    style={{
                      backgroundColor: 'rgba(107, 114, 128, 0.1)',
                      color: '#6b7280',
                    }}
                  >
                    Inactiva
                  </span>
                )}
              </div>
              
              <p 
                className="text-sm mb-2"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {account.fromEmail}
              </p>

              <div className="flex items-center gap-4 text-xs">
                <div 
                  className="flex items-center gap-1.5"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  <span className="font-medium">SMTP:</span>
                  <span>{account.smtp?.host}:{account.smtp?.port}</span>
                </div>
                
                {account.imap?.enabled && (
                  <div 
                    className="flex items-center gap-1.5"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    <span className="font-medium">IMAP:</span>
                    <span>{account.imap?.host}:{account.imap?.port}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(account)}
              className="p-2 rounded-lg transition-all hover:opacity-80"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                color: 'var(--color-text-secondary)',
              }}
              title="Editar"
            >
              <Edit3 size={16} />
            </button>

            <button
              onClick={() => handleDelete(account.id)}
              className="p-2 rounded-lg transition-all hover:opacity-80"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                color: '#ef4444',
              }}
              title="Eliminar"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
