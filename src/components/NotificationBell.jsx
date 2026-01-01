import React, { useState, useEffect } from 'react';
import { Bell, Check, X, Users, Calendar, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

export function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadNotifications();
    
    // Suscripción en tiempo real a nuevas notificaciones
    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_notifications'
        },
        (payload) => {
          console.log('🔔 Nueva notificación:', payload);
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
    }
  };

  const handleAcceptInvite = async (notification) => {
    setIsLoading(true);
    try {
      const projectId = notification.metadata?.project_id;
      
      const { error } = await supabase.rpc('accept_project_invitation', {
        p_project_id: projectId
      });

      if (error) throw error;

      await loadNotifications();
      setIsOpen(false);
      
      // Recargar página para que aparezca el proyecto en sidebar
      window.location.reload();
    } catch (error) {
      console.error('Error aceptando invitación:', error);
      alert('Error al aceptar invitación');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectInvite = async (notification) => {
    setIsLoading(true);
    try {
      const projectId = notification.metadata?.project_id;
      
      const { error } = await supabase.rpc('reject_project_invitation', {
        p_project_id: projectId
      });

      if (error) throw error;

      await loadNotifications();
    } catch (error) {
      console.error('Error rechazando invitación:', error);
      alert('Error al rechazar invitación');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await supabase.rpc('mark_notification_read', {
        p_notification_id: notificationId
      });
      
      await loadNotifications();
    } catch (error) {
      console.error('Error marcando como leída:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await supabase.rpc('mark_all_notifications_read');
      await loadNotifications();
    } catch (error) {
      console.error('Error marcando todas como leídas:', error);
    }
  };

  return (
    <div className="relative">
      {/* Bell Button - Responsivo */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg transition-colors hover:bg-[var(--color-bg-hover)] flex items-center gap-2"
        style={{ color: 'var(--color-text-secondary)' }}
        aria-label="Notificaciones"
      >
        <Bell size={20} />
        <span className="hidden sm:inline text-sm font-medium">Notificaciones</span>
        {unreadCount > 0 && (
          <span 
            className="absolute -top-1 -right-1 sm:relative sm:top-0 sm:right-0 min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center shadow-lg"
            style={{ 
              backgroundColor: '#EF4444', // Rojo intenso
              color: 'white'
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown - Modal en móvil, dropdown en desktop */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[9998] bg-black/50" onClick={() => setIsOpen(false)} />
          <div
            className="fixed sm:absolute left-0 right-0 bottom-0 sm:left-auto sm:right-0 sm:top-full sm:bottom-auto mt-0 sm:mt-2 w-full sm:w-96 sm:rounded-lg shadow-2xl z-[9999] border-t sm:border overflow-hidden"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              borderColor: 'var(--color-border)',
              maxHeight: '80vh',
              borderRadius: '16px 16px 0 0',
              '@media (min-width: 640px)': {
                borderRadius: '8px'
              }
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Notificaciones
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs hover:underline"
                  style={{ color: 'var(--color-accent)' }}
                >
                  Marcar todas como leídas
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center" style={{ color: 'var(--color-text-tertiary)' }}>
                  <Bell size={48} className="mx-auto mb-3 opacity-50" />
                  <p>No tienes notificaciones</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b transition-colors cursor-pointer hover:bg-[var(--color-bg-hover)] ${
                      !notification.is_read ? 'bg-[var(--color-bg-secondary)]' : ''
                    }`}
                    style={{ borderColor: 'var(--color-border)' }}
                    onClick={() => {
                      if (notification.type === 'calendar_reminder' && notification.metadata?.eventId) {
                        navigate('/calendar');
                        setIsOpen(false);
                      }
                      if (!notification.is_read) {
                        handleMarkAsRead(notification.id);
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      {/* Iconos por tipo */}
                      {notification.type === 'project_invite' && (
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: 'var(--color-accent)' }}
                        >
                          <Users size={20} className="text-white" />
                        </div>
                      )}
                      {notification.type === 'calendar_reminder' && (
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: '#3B82F6' }}
                        >
                          <Calendar size={20} className="text-white" />
                        </div>
                      )}
                      {!notification.type && (
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: '#6B7280' }}
                        >
                          <AlertCircle size={20} className="text-white" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>
                              {notification.title}
                            </p>
                            <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                              {notification.message}
                            </p>
                            <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                              {new Date(notification.created_at).toLocaleDateString('es-MX', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          
                          {!notification.is_read && (
                            <div 
                              className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                              style={{ backgroundColor: 'var(--color-accent)' }}
                            />
                          )}
                        </div>

                        {/* Actions for project invites */}
                        {notification.type === 'project_invite' && !notification.is_read && (
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => handleAcceptInvite(notification)}
                              disabled={isLoading}
                              className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50"
                              style={{
                                backgroundColor: 'var(--color-accent)',
                                color: 'white'
                              }}
                            >
                              <Check size={14} />
                              Aceptar
                            </button>
                            <button
                              onClick={() => handleRejectInvite(notification)}
                              disabled={isLoading}
                              className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors hover:bg-[var(--color-bg-hover)] disabled:opacity-50"
                              style={{ color: 'var(--color-text-secondary)' }}
                            >
                              <X size={14} />
                              Rechazar
                            </button>
                          </div>
                        )}

                        {/* Mark as read for other notifications */}
                        {notification.type !== 'project_invite' && !notification.is_read && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="text-xs mt-2 hover:underline"
                            style={{ color: 'var(--color-accent)' }}
                          >
                            Marcar como leída
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default NotificationBell;
