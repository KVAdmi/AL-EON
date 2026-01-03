/**
 * EmailOutlookPage.jsx
 * Módulo de Email estilo Outlook EXACTO
 * Layout: Sidebar | Lista | Detalle
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getEmailAccounts, getFolders, getDrafts } from '@/services/emailService';
import { Send, FileText, Inbox, Archive, Trash2, Star, ArrowLeft, Plus, Settings } from 'lucide-react';

export default function EmailOutlookPage() {
  const { user, accessToken } = useAuth();
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
      const data = await getEmailAccounts(user.id, accessToken);
      setAccounts(data || []);
      if (data?.length > 0) {
        setSelectedAccount(data[0]);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadFolders() {
    try {
      const data = await getFolders(selectedAccount.account_id || selectedAccount.id, user.id);
      setFolders(data || []);
      
      // Seleccionar INBOX por defecto
      const inbox = data?.find(f => f.folder_name === 'INBOX');
      if (inbox) {
        setSelectedFolder(inbox);
        loadEmails(inbox);
      }
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  }

  async function loadEmails(folder) {
    // TODO: Cargar emails reales del folder
    // Por ahora mock data
    setEmails([
      {
        id: '1',
        from_name: 'Microsoft',
        from_email: 'microsoft@email.com',
        subject: 'Importante: actualice la información de su cuenta',
        body_preview: 'Su suscripción ha vencido. Actualice su información...',
        date: new Date(),
        is_read: false,
        has_attachments: false,
      },
      {
        id: '2',
        from_name: 'Supabase Billing Team',
        from_email: 'billing@supabase.com',
        subject: '[Supabase] Action Required: Payment Failure And Pending Shutdown',
        body_preview: 'Hi there, Your organization "Kodigo Vivo" has a payment failure...',
        date: new Date(Date.now() - 86400000),
        is_read: false,
        has_attachments: true,
      },
      {
        id: '3',
        from_name: 'Patricia Garibay',
        from_email: 'pgaribay@kodigovivo.com',
        subject: '(sin asunto)',
        body_preview: 'Sent from my Verizon, Samsung Galaxy...',
        date: new Date(Date.now() - 3 * 86400000),
        is_read: true,
        has_attachments: false,
      },
    ]);
  }

  const formatDate = (date) => {
    const now = new Date();
    const diff = now - date;
    
    if (diff < 86400000) { // Menos de 24 horas
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } else if (diff < 7 * 86400000) { // Menos de 7 días
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'numeric' });
    } else {
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'numeric', year: '2-digit' });
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Cargando...</div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-gray-500 mb-4">No hay cuentas configuradas</div>
          <button
            onClick={() => navigate('/settings/email')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Configurar cuenta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-white">
      {/* SIDEBAR IZQUIERDO - Estilo Outlook */}
      <div className="w-64 border-r border-gray-200 flex flex-col bg-gray-50">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>
          
          <button
            onClick={() => {/* TODO: Abrir composer */}}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Send className="w-4 h-4" />
            Redactar
          </button>
        </div>

        {/* Carpetas */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="space-y-1">
            {/* Bandeja de entrada */}
            <button
              onClick={() => {
                const inbox = folders.find(f => f.folder_name === 'INBOX');
                if (inbox) {
                  setSelectedFolder(inbox);
                  loadEmails(inbox);
                }
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                selectedFolder?.folder_name === 'INBOX'
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <Inbox className="w-4 h-4" />
                <span className="text-sm">Bandeja de entrada</span>
              </div>
              {selectedFolder?.folder_name === 'INBOX' && selectedFolder.unread_count > 0 && (
                <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                  {selectedFolder.unread_count}
                </span>
              )}
            </button>

            {/* Borradores */}
            <button
              onClick={() => navigate('/drafts')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span className="text-sm">Borradores</span>
            </button>

            {/* Enviados */}
            <button
              onClick={() => {
                const sent = folders.find(f => f.folder_name === 'Sent');
                if (sent) {
                  setSelectedFolder(sent);
                  loadEmails(sent);
                }
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                selectedFolder?.folder_name === 'Sent'
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Send className="w-4 h-4" />
              <span className="text-sm">Enviados</span>
            </button>

            {/* Archivados */}
            <button
              onClick={() => {
                const archived = folders.find(f => f.folder_name === 'Archive');
                if (archived) {
                  setSelectedFolder(archived);
                  loadEmails(archived);
                }
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                selectedFolder?.folder_name === 'Archive'
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Archive className="w-4 h-4" />
              <span className="text-sm">Archivados</span>
            </button>

            {/* Eliminados */}
            <button
              onClick={() => {
                const trash = folders.find(f => f.folder_name === 'Trash');
                if (trash) {
                  setSelectedFolder(trash);
                  loadEmails(trash);
                }
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                selectedFolder?.folder_name === 'Trash'
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm">Eliminados</span>
            </button>

            {/* Destacados */}
            <button
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Star className="w-4 h-4" />
              <span className="text-sm">Destacados</span>
            </button>
          </div>
        </div>

        {/* Configuración */}
        <div className="p-2 border-t border-gray-200">
          <button
            onClick={() => navigate('/settings/email')}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm">Configuración</span>
          </button>
        </div>
      </div>

      {/* LISTA DE EMAILS - Centro */}
      <div className="w-96 border-r border-gray-200 flex flex-col bg-white">
        {/* Header Lista */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-gray-900">
              {selectedFolder?.folder_name === 'INBOX' ? 'Bandeja de entrada' : selectedFolder?.folder_name || 'Emails'}
            </h2>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              Ver todos
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-4 text-sm">
            <button className="text-blue-600 font-medium border-b-2 border-blue-600 pb-1">
              Prioritarios
            </button>
            <button className="text-gray-600 hover:text-gray-900 pb-1">
              Otro
            </button>
          </div>
        </div>

        {/* Lista de emails */}
        <div className="flex-1 overflow-y-auto">
          {emails.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              No hay mensajes
            </div>
          ) : (
            emails.map((email) => (
              <div
                key={email.id}
                onClick={() => setSelectedEmail(email)}
                className={`border-b border-gray-200 p-4 cursor-pointer transition-colors ${
                  selectedEmail?.id === email.id
                    ? 'bg-blue-50'
                    : email.is_read
                    ? 'bg-white hover:bg-gray-50'
                    : 'bg-blue-50/30 hover:bg-blue-50/50'
                }`}
              >
                <div className="flex gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                    {getInitials(email.from_name)}
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm truncate ${email.is_read ? 'font-normal text-gray-900' : 'font-semibold text-gray-900'}`}>
                        {email.from_name}
                      </span>
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                        {formatDate(email.date)}
                      </span>
                    </div>
                    
                    <div className={`text-sm mb-1 truncate ${email.is_read ? 'font-normal' : 'font-semibold'}`}>
                      {email.subject || '(sin asunto)'}
                    </div>
                    
                    <div className="text-sm text-gray-600 truncate">
                      {email.body_preview}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* PANEL DETALLE - Derecha */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedEmail ? (
          <>
            {/* Header Detalle */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between mb-4">
                <h1 className="text-2xl font-semibold text-gray-900 flex-1">
                  {selectedEmail.subject || '(sin asunto)'}
                </h1>
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-lg">
                  {getInitials(selectedEmail.from_name)}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">{selectedEmail.from_name}</div>
                  <div className="text-sm text-gray-600">{selectedEmail.from_email}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {selectedEmail.date.toLocaleDateString('es-ES', { 
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Cuerpo del email */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose max-w-none">
                <p className="text-gray-700">{selectedEmail.body_preview}</p>
              </div>
            </div>

            {/* Footer Acciones */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex gap-2">
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <Send className="w-4 h-4" />
                  Responder
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                  Reenviar
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                  <Archive className="w-4 h-4" />
                  Archivar
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors ml-auto">
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <div className="w-32 h-32 mb-4">
              <svg viewBox="0 0 100 100" fill="currentColor">
                <rect x="20" y="30" width="60" height="40" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/>
                <path d="M20 35 L50 55 L80 35" fill="none" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <p className="text-lg font-medium">No hay ninguna conversación seleccionada</p>
            <p className="text-sm text-gray-500 mt-1">Selecciona una conversación para leer.</p>
          </div>
        )}
      </div>
    </div>
  );
}
