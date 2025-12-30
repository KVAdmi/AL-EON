/**
 * EmailPageOutlook.jsx
 * Módulo de Email EXACTAMENTE COMO OUTLOOK con modo oscuro
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getEmailAccounts, getFolders } from '@/services/emailService';
import { Mail, Send, Inbox, Archive, Trash2, AlertCircle, FileText, Star, ArrowLeft, Search, Plus } from 'lucide-react';

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div style={{ color: 'var(--color-text-secondary)' }}>Cargando...</div>
      </div>
    );
  }

  if (!user || accounts.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="text-center">
          <Mail className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--color-text-tertiary)' }} />
          <p style={{ color: 'var(--color-text-secondary)' }} className="mb-4">No tienes cuentas de email configuradas</p>
          <button
            onClick={() => navigate('/settings/email')}
            className="px-4 py-2 rounded-lg"
            style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
          >
            Configurar cuenta
          </button>
        </div>
      </div>
    );
  }

  const FOLDER_ICONS = {
    'INBOX': Inbox,
    'Sent': Send,
    'Drafts': FileText,
    'Spam': AlertCircle,
    'Trash': Trash2,
  };

  // Mock emails para preview (reemplazar con datos reales del backend)
  const mockEmails = [
    {
      id: 1,
      from: 'Microsoft',
      subject: 'Actualiza la información de tu cuenta',
      preview: 'Tu suscripción ha vencido. Actualice su...',
      date: '7:03',
      isUnread: true,
      avatar: 'M'
    },
    {
      id: 2,
      from: 'Supabase',
      subject: 'Action Required: Payment Failure',
      preview: 'Hi there, Your organization "Codigo Vivo"...',
      date: 'Ayer',
      isUnread: false,
      avatar: 'S'
    },
  ];

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:opacity-80 rounded" style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>AL-E Chat</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-tertiary)' }} />
            <input
              type="text"
              placeholder="Buscar"
              className="pl-10 pr-4 py-2 rounded border"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)'
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Folders */}
        <div className="w-64 border-r flex flex-col" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
          <div className="p-4">
            <button
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium"
              style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
            >
              <Send className="w-4 h-4" />
              Redactar
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2">
            <div className="mb-4">
              <div className="text-xs font-semibold mb-2 px-2" style={{ color: 'var(--color-text-tertiary)' }}>
                Favoritos
              </div>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded hover:opacity-80" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}>
                <FileText className="w-4 h-4" />
                <span className="text-sm">Borradores</span>
              </button>
            </div>

            <div>
              <div className="text-xs font-semibold mb-2 px-2" style={{ color: 'var(--color-text-tertiary)' }}>
                Carpetas
              </div>
              {folders.map((folder) => {
                const Icon = FOLDER_ICONS[folder.folder_name] || Mail;
                const isSelected = selectedFolder?.folder_id === folder.folder_id;
                return (
                  <button
                    key={folder.folder_id}
                    onClick={() => setSelectedFolder(folder)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded mb-1 hover:opacity-80"
                    style={{
                      backgroundColor: isSelected ? 'var(--color-bg-tertiary)' : 'transparent',
                      color: 'var(--color-text-primary)'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span className="text-sm">{folder.folder_name}</span>
                    </div>
                    {folder.unread_count > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}>
                        {folder.unread_count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center Panel - Email List */}
        <div className="w-96 border-r flex flex-col" style={{ borderColor: 'var(--color-border)' }}>
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 text-sm rounded" style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}>
                Prioritarios
              </button>
              <button className="px-3 py-1 text-sm rounded" style={{ color: 'var(--color-text-secondary)' }}>
                Otro
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {mockEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--color-text-tertiary)' }}>
                <Mail className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-sm">No hay mensajes</p>
              </div>
            ) : (
              <div>
                {mockEmails.map((email) => (
                  <button
                    key={email.id}
                    onClick={() => setSelectedEmail(email)}
                    className="w-full p-4 border-b text-left hover:opacity-80"
                    style={{
                      borderColor: 'var(--color-border)',
                      backgroundColor: selectedEmail?.id === email.id ? 'var(--color-bg-secondary)' : 'transparent'
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold" style={{ backgroundColor: 'var(--color-accent)' }}>
                        {email.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`font-medium text-sm ${email.isUnread ? 'font-bold' : ''}`} style={{ color: 'var(--color-text-primary)' }}>
                            {email.from}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                            {email.date}
                          </span>
                        </div>
                        <div className={`text-sm mb-1 ${email.isUnread ? 'font-semibold' : ''}`} style={{ color: 'var(--color-text-primary)' }}>
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
        <div className="flex-1 flex flex-col" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
          {!selectedEmail ? (
            <div className="flex-1 flex flex-col items-center justify-center" style={{ color: 'var(--color-text-tertiary)' }}>
              <Mail className="w-24 h-24 mb-4 opacity-20" />
              <p className="text-lg">No hay ninguna conversación seleccionada</p>
              <p className="text-sm">Selecciona una conversación para leer.</p>
            </div>
          ) : (
            <>
              <div className="p-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <button className="p-2 rounded hover:opacity-80" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                      <Archive className="w-4 h-4" style={{ color: 'var(--color-text-primary)' }} />
                    </button>
                    <button className="p-2 rounded hover:opacity-80" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                      <Trash2 className="w-4 h-4" style={{ color: 'var(--color-text-primary)' }} />
                    </button>
                  </div>
                </div>
                <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                  {selectedEmail.subject}
                </h2>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg" style={{ backgroundColor: 'var(--color-accent)' }}>
                    {selectedEmail.avatar}
                  </div>
                  <div>
                    <div className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{selectedEmail.from}</div>
                    <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      Para: {selectedAccount?.email}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <div style={{ color: 'var(--color-text-primary)' }}>
                  <p>Contenido del email aparecerá aquí...</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
