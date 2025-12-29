import React, { useState, useEffect } from 'react';
import { Bell, X, Filter, CheckCheck, Trash2, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import NotificationItem from './NotificationItem';
import * as notificationsService from '@/services/notificationsService';

export default function NotificationCenter({ isOpen, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, filter]);

  async function loadNotifications() {
    try {
      setLoading(true);
      setError(null);
      
      const filters = { limit: 50 };
      if (filter === 'unread') {
        filters.read = false;
      } else if (filter === 'read') {
        filters.read = true;
      }

      const data = await notificationsService.getNotifications(filters);
      setNotifications(data || []);
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError('No se pudieron cargar las notificaciones');
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAsRead(notificationId) {
    try {
      await notificationsService.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  }

  async function handleMarkAllAsRead() {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      await Promise.all(unreadIds.map(id => notificationsService.markAsRead(id)));
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  }

  async function handleDelete(notificationId) {
    try {
      await notificationsService.cancelNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  }

  async function handleClearAll() {
    if (!window.confirm('¿Eliminar todas las notificaciones?')) return;
    
    try {
      await Promise.all(notifications.map(n => notificationsService.cancelNotification(n.id)));
      setNotifications([]);
    } catch (err) {
      console.error('Error clearing notifications:', err);
    }
  }

  function handleNotificationClick(notification) {
    // Marcar como leída
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }

    // Navegación según tipo
    if (notification.metadata?.conversationId) {
      navigate(`/chat?conversation=${notification.metadata.conversationId}`);
      onClose();
    } else if (notification.metadata?.eventId) {
      navigate(`/calendar?event=${notification.metadata.eventId}`);
      onClose();
    } else if (notification.metadata?.chatId) {
      navigate(`/telegram?chat=${notification.metadata.chatId}`);
      onClose();
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4 md:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-md h-[90vh] rounded-2xl shadow-2xl flex flex-col"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)'
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-6 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-3">
            <Bell size={24} style={{ color: 'var(--color-accent)' }} />
            <div>
              <h2
                className="text-xl font-semibold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Notificaciones
              </h2>
              {unreadCount > 0 && (
                <p
                  className="text-sm"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {unreadCount} sin leer
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-opacity-80 transition-all"
            style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
          >
            <X size={20} style={{ color: 'var(--color-text-secondary)' }} />
          </button>
        </div>

        {/* Toolbar */}
        <div
          className="flex items-center justify-between p-4 border-b gap-2"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {/* Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === 'all' ? 'opacity-100' : 'opacity-60'
              }`}
              style={{
                backgroundColor: filter === 'all' ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                color: 'var(--color-text-primary)'
              }}
            >
              Todas
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === 'unread' ? 'opacity-100' : 'opacity-60'
              }`}
              style={{
                backgroundColor: filter === 'unread' ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                color: 'var(--color-text-primary)'
              }}
            >
              Sin leer
            </button>
            <button
              onClick={() => setFilter('read')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === 'read' ? 'opacity-100' : 'opacity-60'
              }`}
              style={{
                backgroundColor: filter === 'read' ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                color: 'var(--color-text-primary)'
              }}
            >
              Leídas
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="p-2 rounded-lg hover:bg-opacity-80 transition-all"
                style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                title="Marcar todas como leídas"
              >
                <CheckCheck size={18} style={{ color: 'var(--color-text-secondary)' }} />
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                className="p-2 rounded-lg hover:bg-opacity-80 transition-all"
                style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                title="Eliminar todas"
              >
                <Trash2 size={18} style={{ color: 'var(--color-text-secondary)' }} />
              </button>
            )}
            <button
              onClick={() => {
                navigate('/settings/notifications');
                onClose();
              }}
              className="p-2 rounded-lg hover:bg-opacity-80 transition-all"
              style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
              title="Configuración"
            >
              <Settings size={18} style={{ color: 'var(--color-text-secondary)' }} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div
                className="text-sm"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Cargando notificaciones...
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
              <div
                className="text-sm"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {error}
              </div>
              <button
                onClick={loadNotifications}
                className="px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: 'var(--color-text-primary)'
                }}
              >
                Reintentar
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
              <Bell size={48} style={{ color: 'var(--color-text-tertiary)', opacity: 0.3 }} />
              <p
                className="text-sm text-center"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {filter === 'unread' ? 'No hay notificaciones sin leer' : 'No hay notificaciones'}
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {notifications.map(notification => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={() => handleNotificationClick(notification)}
                  onMarkAsRead={handleMarkAsRead}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
