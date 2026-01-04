/**
 * MailInboxPage.jsx
 * Vista de bandeja de entrada estilo Outlook con múltiples cuentas
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getMailMessages } from '@/services/mailService';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/ui/use-toast';
import { 
  Mail, 
  RefreshCw, 
  Flag, 
  Star, 
  AlertCircle, 
  Inbox, 
  Send, 
  FileText, 
  Trash2, 
  Archive,
  Settings,
  ChevronDown,
  ChevronRight,
  Plus,
  Edit,
  Loader2,
  Menu,
  X,
  ArrowLeft,
  Mic
} from 'lucide-react';

export default function MailInboxPage() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState('inbox');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [showAccountsExpanded, setShowAccountsExpanded] = useState(true);
  const [showLabelsExpanded, setShowLabelsExpanded] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [voiceMode, setVoiceMode] = useState(false);

  // Carpetas del correo
  const folders = [
    { id: 'inbox', name: 'Bandeja de entrada', icon: Inbox, color: '#3B82F6', count: 0 },
    { id: 'sent', name: 'Enviados', icon: Send, color: '#10B981', count: 0 },
    { id: 'drafts', name: 'Borradores', icon: FileText, color: '#F59E0B', count: 0 },
    { id: 'spam', name: 'Spam', icon: AlertCircle, color: '#EF4444', count: 0 },
    { id: 'archive', name: 'Archivo', icon: Archive, color: '#6B7280', count: 0 },
    { id: 'trash', name: 'Papelera', icon: Trash2, color: '#9CA3AF', count: 0 },
  ];

  // Etiquetas de clasificación con colores
  const labels = [
    { id: 'urgent', name: 'Urgente', color: '#EF4444', icon: '🔴', count: 0 },
    { id: 'important', name: 'Importante', color: '#F59E0B', icon: '⭐', count: 0 },
    { id: 'pending', name: 'Pendiente', color: '#3B82F6', icon: '⏳', count: 0 },
    { id: 'follow_up', name: 'Seguimiento', color: '#8B5CF6', icon: '📌', count: 0 },
    { id: 'low_priority', name: 'Baja prioridad', color: '#6B7280', icon: '⬇️', count: 0 },
  ];

  // 🔥 DEBUG: Ver qué valores tiene auth
  console.log('🟢 [MailInboxPage] RENDER - user:', user);
  console.log('🟢 [MailInboxPage] RENDER - session:', session);
  console.log('🟢 [MailInboxPage] RENDER - session.access_token:', session?.access_token ? 'EXISTS' : 'NULL');

  useEffect(() => {
    console.log('🟡 [MailInboxPage] useEffect DISPARADO');
    console.log('🟡 [MailInboxPage] user?.id:', user?.id);
    
    if (user?.id) {
      console.log('🟢 [MailInboxPage] ✅ Usuario existe, llamando loadAccounts');
      loadAccounts();
    } else {
      console.log('🔴 [MailInboxPage] ❌ NO hay user.id');
    }
  }, [user]);

  useEffect(() => {
    if (selectedAccount) {
      loadMessages();
    }
  }, [selectedFolder, selectedAccount]);

  async function loadAccounts() {
    try {
      console.log('🔵 [MailInboxPage] ========== INICIO loadAccounts ==========');
      console.log('🔵 [MailInboxPage] USER COMPLETO:', JSON.stringify(user, null, 2));
      console.log('🔵 [MailInboxPage] user.id:', user?.id);
      console.log('🔵 [MailInboxPage] Consultando email_accounts con owner_user_id:', user.id);
      
      const { data: mailAccounts, error } = await supabase
        .from('email_accounts')
        .select('*')
        .eq('owner_user_id', user.id)
        .eq('is_active', true);
      
      console.log('🔵 [MailInboxPage] Error de Supabase:', error);
      console.log('🔵 [MailInboxPage] Cuentas recibidas:', mailAccounts);
      console.log('🔵 [MailInboxPage] Cantidad:', mailAccounts?.length);
      
      if (error) throw error;

      console.log('🔵 [MailInboxPage] Cuentas recibidas:', mailAccounts);

      if (mailAccounts && mailAccounts.length > 0) {
        setAccounts(mailAccounts.map(acc => ({
          id: acc.id,
          email: acc.from_email,
          name: acc.from_name || acc.from_email.split('@')[0],
          provider: acc.provider_label || 'smtp',
          isActive: true
        })));
        if (!selectedAccount) {
          setSelectedAccount(mailAccounts[0].id);
        }
      } else {
        console.log('⚠️ [MailInboxPage] NO se encontraron cuentas');
        setAccounts([]);
        setSelectedAccount(null);
      }
    } catch (error) {
      console.error('❌ [MailInboxPage] Error cargando cuentas:', error);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages() {
    if (!selectedAccount) {
      console.log('⚠️ [MailInboxPage] No hay cuenta seleccionada');
      setMessages([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log('🔵 [MailInboxPage] Cargando mensajes...');
      console.log('🔵 [MailInboxPage] accountId:', selectedAccount);
      console.log('🔵 [MailInboxPage] folder:', selectedFolder);
      
      // Llamar al endpoint real de Core
      const token = await supabase.auth.getSession().then(s => s.data.session?.access_token);
      
      const response = await fetch(`https://api.al-eon.com/api/mail/messages?accountId=${selectedAccount}&folder=${selectedFolder}&limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('🔵 [MailInboxPage] Mensajes recibidos:', data);
      
      setMessages(data.messages || data || []);
    } catch (error) {
      console.error('❌ [MailInboxPage] Error cargando correos:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    if (!selectedAccount) {
      alert('Por favor selecciona una cuenta primero');
      return;
    }
    
    try {
      setRefreshing(true);
      console.log('🔄 [MailInboxPage] Sincronizando cuenta:', selectedAccount);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No hay sesión activa');
      }
      
      const response = await fetch(`https://api.al-eon.com/api/mail/accounts/${selectedAccount}/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        
        // Mensaje más específico si es problema de credenciales
        if (errorMessage.includes('descifrar') || errorMessage.includes('credencial') || errorMessage.includes('decrypt')) {
          throw new Error('Las credenciales de esta cuenta parecen estar corruptas. Por favor, vuelve a configurar la cuenta en Configuración > Correo');
        }
        
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      console.log('✅ [MailInboxPage] Sincronización completa:', result);
      
      // Mostrar resultado
      toast({
        title: 'Sincronización exitosa',
        description: `Se sincronizaron ${result.count || 0} mensajes nuevos`,
      });
      
      // Recargar mensajes después de sync
      await loadMessages();
    } catch (error) {
      console.error('❌ [MailInboxPage] Error en sync:', error);
      toast({
        variant: 'destructive',
        title: 'Error al sincronizar',
        description: error.message || 'No se pudo conectar con el servidor IMAP',
      });
    } finally {
      setRefreshing(false);
    }
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} h`;
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    
    return date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
    });
  }

  function getFlagColor(flag) {
    const flagData = labels.find(l => l.id === flag);
    return flagData?.color || 'transparent';
  }

  return (
    <div 
      className="h-screen flex"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      {/* Sidebar - Estilo Outlook */}
      <div 
        className={`
          fixed lg:static inset-y-0 left-0 z-50 lg:z-auto
          w-72 lg:border-r flex flex-col
          transition-transform duration-300
          ${showSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{ 
          borderColor: 'var(--color-border)', 
          backgroundColor: 'var(--color-bg-secondary)',
        }}
      >
        {/* Header Sidebar */}
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="font-semibold text-lg" style={{ color: 'var(--color-text-primary)' }}>
            Correo
          </h2>
          <button
            onClick={() => setShowSidebar(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-[var(--color-bg-hover)]"
            style={{ color: 'var(--color-text-primary)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Botón Nuevo Correo */}
        <div className="p-4">
          <button
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-medium transition-all hover:opacity-90"
            style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
            onClick={() => navigate('/correo')}
          >
            <Edit size={18} />
            <span>Nuevo correo</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2">
          {/* Sección: Cuentas */}
          <div className="mb-4">
            <button
              onClick={() => setShowAccountsExpanded(!showAccountsExpanded)}
              className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-[var(--color-bg-hover)]"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <span className="text-xs font-semibold uppercase">Cuentas</span>
              {showAccountsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            
            {showAccountsExpanded && (
              accounts.length > 0 ? (
                accounts.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => setSelectedAccount(account.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded mb-1 hover:opacity-80 ${
                      selectedAccount === account.id ? 'bg-[var(--color-bg-tertiary)]' : ''
                    }`}
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0"
                      style={{ backgroundColor: account.isActive ? '#10B981' : '#6B7280' }}
                    >
                      {account.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-sm font-medium truncate">{account.email}</div>
                      <div className="text-xs opacity-70">{account.provider.toUpperCase()}</div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-4 py-6 text-center">
                  <Mail size={32} className="mx-auto mb-2 opacity-30" style={{ color: 'var(--color-text-secondary)' }} />
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    No hay cuentas configuradas
                  </p>
                </div>
              )
            )}

            <button
              onClick={() => navigate('/settings/email')}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded hover:bg-[var(--color-bg-hover)]"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <Plus size={16} />
              <span className="text-sm">Agregar cuenta</span>
            </button>
          </div>

          {/* Sección: Carpetas */}
          <div className="mb-4">
            <div className="text-xs font-semibold mb-2 px-3 uppercase" style={{ color: 'var(--color-text-tertiary)' }}>
              Carpetas
            </div>
            {folders.map((folder) => {
              const Icon = folder.icon;
              const isSelected = selectedFolder === folder.id;
              return (
                <button
                  key={folder.id}
                  onClick={() => setSelectedFolder(folder.id)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded mb-1 hover:opacity-80"
                  style={{
                    backgroundColor: isSelected ? 'var(--color-bg-tertiary)' : 'transparent',
                    color: 'var(--color-text-primary)'
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="w-4 h-4 shrink-0" style={{ color: folder.color }} />
                    <span className="text-sm truncate">{folder.name}</span>
                  </div>
                  {folder.count > 0 && (
                    <span 
                      className="text-xs px-2 py-0.5 rounded-full shrink-0 font-semibold"
                      style={{ 
                        backgroundColor: folder.color,
                        color: 'white'
                      }}
                    >
                      {folder.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sección: Etiquetas */}
          <div className="mb-4">
            <button
              onClick={() => setShowLabelsExpanded(!showLabelsExpanded)}
              className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-[var(--color-bg-hover)]"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <span className="text-xs font-semibold uppercase">Etiquetas</span>
              {showLabelsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            
            {showLabelsExpanded && labels.map((label) => (
              <button
                key={label.id}
                onClick={() => {
                  toast({ title: `Filtrar por: ${label.name}` });
                }}
                className="w-full flex items-center justify-between px-4 py-2 rounded mb-1 hover:bg-[var(--color-bg-hover)]"
                style={{ color: 'var(--color-text-primary)' }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div 
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: label.color }}
                  />
                  <span className="text-sm truncate">{label.name}</span>
                </div>
                {label.count > 0 && (
                  <span className="text-xs shrink-0" style={{ color: label.color }}>
                    {label.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Sección: Configuración */}
          <div className="border-t pt-4 mt-4" style={{ borderColor: 'var(--color-border)' }}>
            <button
              onClick={() => navigate('/settings/email')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded hover:bg-[var(--color-bg-hover)]"
              style={{ color: 'var(--color-text-primary)' }}
            >
              <Settings size={16} />
              <span className="text-sm">Configuración</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div 
          className="flex items-center justify-between px-4 py-3 border-b shrink-0"
          style={{ borderColor: 'var(--color-border)' }}
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
              <ArrowLeft size={20} />
            </button>

            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="lg:hidden p-2 rounded-lg hover:bg-[var(--color-bg-hover)]"
              style={{ color: 'var(--color-text-primary)' }}
            >
              <Menu size={20} />
            </button>
            <h1 
              className="text-xl font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {folders.find(f => f.id === selectedFolder)?.name || 'Correos'}
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setVoiceMode(!voiceMode)}
              className={`p-2 rounded-2xl transition-all ${voiceMode ? 'animate-pulse ring-2' : ''}`}
              style={{
                backgroundColor: voiceMode ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
                color: voiceMode ? 'white' : 'var(--color-text-primary)',
                ringColor: voiceMode ? 'var(--color-accent)' : 'transparent',
              }}
              title={voiceMode ? "Modo voz ACTIVO - Click para desactivar" : "Activar modo voz manos libres"}
            >
              <Mic size={20} />
            </button>

            <button
              onClick={handleSync}
              disabled={refreshing}
              className="p-2 rounded-2xl hover:bg-[var(--color-bg-hover)] disabled:opacity-50"
              style={{ color: 'var(--color-text-primary)' }}
              title="Sincronizar con servidor IMAP"
            >
              <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto">
          {!selectedAccount ? (
            <div className="flex flex-col items-center justify-center h-full p-8">
              <Mail 
                size={64} 
                className="mb-4 opacity-20"
                style={{ color: 'var(--color-text-secondary)' }}
              />
              <h3 
                className="text-lg font-medium mb-2"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Configura tu primera cuenta
              </h3>
              <p 
                className="text-center mb-4"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Añade una cuenta de correo para comenzar
              </p>
              <button
                onClick={() => navigate('/settings/email')}
                className="px-4 py-2 rounded-lg font-medium"
                style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
              >
                Ir a Configuración
              </button>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 
                size={48} 
                className="animate-spin mb-4 opacity-50"
                style={{ color: 'var(--color-text-secondary)' }}
              />
              <p style={{ color: 'var(--color-text-secondary)' }}>
                Sincronizando correos...
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8">
              <Mail 
                size={64} 
                className="mb-4 opacity-20"
                style={{ color: 'var(--color-text-secondary)' }}
              />
              <h3 
                className="text-lg font-medium mb-2"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {selectedFolder === 'inbox' ? 'Bandeja vacía' : 
                 selectedFolder === 'sent' ? 'No has enviado correos' :
                 selectedFolder === 'drafts' ? 'No tienes borradores' :
                 selectedFolder === 'spam' ? 'No hay spam' :
                 selectedFolder === 'archive' ? 'Archivo vacío' :
                 'Papelera vacía'}
              </h3>
              <p 
                className="text-center text-sm"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {selectedFolder === 'inbox' ? 'Tus correos nuevos aparecerán aquí' :
                 selectedFolder === 'sent' ? 'Los correos que envíes aparecerán aquí' :
                 selectedFolder === 'drafts' ? 'Tus borradores guardados aparecerán aquí' :
                 'Esta carpeta está vacía'}
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {messages.map((message) => (
                <button
                  key={message.id}
                  onClick={() => navigate(`/mail/${message.id}`)}
                  className="w-full p-4 text-left hover:bg-[var(--color-bg-hover)] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white font-semibold"
                      style={{ backgroundColor: 'var(--color-accent)' }}
                    >
                      {(message.from_name || message.from_email).charAt(0).toUpperCase()}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span 
                            className={`font-medium truncate ${message.status === 'new' ? 'font-bold' : ''}`}
                            style={{ color: 'var(--color-text-primary)' }}
                          >
                            {message.from_name || message.from_email}
                          </span>
                          {message.status === 'new' && (
                            <span 
                              className="px-2 py-0.5 rounded-full text-xs font-semibold shrink-0"
                              style={{ 
                                backgroundColor: '#3B82F6',
                                color: 'white' 
                              }}
                            >
                              Nuevo
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          {message.flag && (
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: getFlagColor(message.flag) }}
                              title={labels.find(l => l.id === message.flag)?.name}
                            />
                          )}
                          {message.is_starred && (
                            <Star 
                              size={14} 
                              fill="#F59E0B"
                              style={{ color: '#F59E0B' }}
                            />
                          )}
                          {message.is_spam && (
                            <AlertCircle 
                              size={14}
                              style={{ color: '#EF4444' }}
                            />
                          )}
                          <span 
                            className="text-xs"
                            style={{ color: 'var(--color-text-tertiary)' }}
                          >
                            {formatDate(message.received_at)}
                          </span>
                        </div>
                      </div>

                      <div 
                        className={`text-sm mb-1 truncate ${message.status === 'new' ? 'font-semibold' : ''}`}
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {message.subject}
                      </div>

                      <div 
                        className="text-xs line-clamp-2"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {message.snippet || message.body_text?.substring(0, 150)}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Overlay para móvil */}
      {showSidebar && (
        <div 
          className="fixed inset-0 bg-black/50 lg:hidden z-40"
          onClick={() => setShowSidebar(false)}
        />
      )}
    </div>
  );
}
