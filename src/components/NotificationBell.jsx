import React, { useState, useEffect } from 'react';
import { Bell, Check, X, Users, Calendar, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.id) {
      loadNotifications();
      loadUpcomingEvents();
    }
    
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

    // Recargar eventos cada 5 minutos
    const intervalId = setInterval(() => {
      if (user?.id) {
        loadUpcomingEvents();
      }
    }, 5 * 60 * 1000);

    return () => {
      subscription.unsubscribe();
      clearInterval(intervalId);
    };
  }, [user]);

  const loadUpcomingEvents = async () => {
    if (!user?.id) return;

    try {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 2); // Próximos 2 días

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('owner_user_id', user.id)
        .eq('status', 'scheduled')
        .gte('start_at', now.toISOString())
        .lte('start_at', tomorrow.toISOString())
        .order('start_at', { ascending: true })
        .limit(10);

      if (error) throw error;

      console.log('📅 Eventos próximos:', data);
      setCalendarEvents(data || []);
    } catch (error) {
      console.error('Error cargando eventos próximos:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setNotifications(data || []);
      
      // Contar no leídas + eventos próximos
      const unreadNotifs = data?.filter(n => !n.is_read).length || 0;
      setUnreadCount(unreadNotifs + calendarEvents.length);
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
          {/* Overlay */}
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setIsOpen(false)} />
          
          {/* Modal/Dropdown - ABRE HACIA ARRIBA en desktop */}
          <div
            className="fixed bottom-0 left-0 right-0 lg:fixed lg:bottom-16 lg:right-4 lg:left-auto lg:top-auto w-full lg:w-96 rounded-t-2xl lg:rounded-xl shadow-2xl z-50 flex flex-col max-h-[80vh] lg:max-h-[600px]"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              borderColor: 'var(--color-border)',
              border: '1px solid var(--color-border)',
              maxHeight: 'calc(100vh - 8rem)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="font-semibold text-base" style={{ color: 'var(--color-text-primary)' }}>
                Notificaciones
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs hover:underline shrink-0"
                  style={{ color: 'var(--color-accent)' }}
                >
                  Marcar como leídas
                </button>
              )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 && calendarEvents.length === 0 ? (
                <div className="p-8 text-center" style={{ color: 'var(--color-text-tertiary)' }}>
                  <Bell size={48} className="mx-auto mb-3 opacity-50" />
                  <p>No tienes notificaciones</p>
                </div>
              ) : (
                <>
                  {/* Eventos de calendario próximos */}
                  {calendarEvents.map((event) => {
                    const startDate = new Date(event.start_at);
                    const now = new Date();
                    const diffMs = startDate - now;
                    const diffMins = Math.floor(diffMs / 60000);
                    const diffHours = Math.floor(diffMins / 60);
                    const diffDays = Math.floor(diffHours / 24);
                    
                    // Verificar si es hoy, mañana o más adelante
                    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    const tomorrow = new Date(today);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    const eventDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
                    
                    let timeText = '';
                    if (diffMins < 0) {
                      timeText = 'Ahora';
                    } else if (diffMins < 60) {
                      timeText = `En ${diffMins} min`;
                    } else if (eventDay.getTime() === today.getTime()) {
                      // Es HOY
                      timeText = `Hoy ${startDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`;
                    } else if (eventDay.getTime() === tomorrow.getTime()) {
                      // Es MAÑANA
                      timeText = `Mañana ${startDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`;
                    } else if (diffDays < 7) {
                      // Esta semana
                      const dayName = startDate.toLocaleDateString('es-MX', { weekday: 'short' });
                      timeText = `${dayName} ${startDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`;
                    } else {
                      // Más adelante
                      timeText = startDate.toLocaleDateString('es-MX', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                    }

                    return (
                      <div
                        key={`event-${event.id}`}
                        className="p-4 border-b transition-colors cursor-pointer hover:bg-[var(--color-bg-hover)]"
                        style={{ 
                          borderColor: 'var(--color-border)',
                          backgroundColor: 'var(--color-bg-tertiary)'
                        }}
                        onClick={() => {
                          navigate('/calendar');
                          setIsOpen(false);
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: '#3B82F6' }}
                          >
                            <Calendar size={20} className="text-white" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>
                                  {event.title}
                                </p>
                                <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                                  {event.location || 'Sin ubicación'}
                                </p>
                                <p className="text-xs mt-1 font-semibold" style={{ color: '#3B82F6' }}>
                                  {timeText}
                                </p>
                              </div>
                              
                              <div 
                                className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                                style={{ backgroundColor: '#3B82F6' }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Notificaciones regulares */}
                  {notifications.map((notification) => (
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
                  >                    <div className="flex items-start gap-3">
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
                ))}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default NotificationBell;