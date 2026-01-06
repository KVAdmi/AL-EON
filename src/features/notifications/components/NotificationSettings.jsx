import React, { useState, useEffect } from 'react';
import { Bell, Mail, MessageCircle, Save, Loader2 } from 'lucide-react';
import * as notificationsService from '@/services/notificationsService';
import { useAuth } from '@/contexts/AuthContext';

export default function NotificationSettings() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState({
    email_enabled: true,
    telegram_enabled: true,
    in_app_enabled: true,
    event_reminders: true,
    message_notifications: true,
    default_reminder_minutes: 15
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    loadPreferences();
  }, []);

  async function loadPreferences() {
    try {
      setLoading(true);
      setError(null);
      const data = await notificationsService.getNotificationPreferences(user.id);
      if (data) {
        setPreferences(data);
      }
    } catch (err) {
      console.error('Error loading preferences:', err);
      setError('No se pudieron cargar las preferencias');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      await notificationsService.updateNotificationPreferences(user.id, preferences);
      
      setSuccessMessage('Preferencias guardadas correctamente');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error saving preferences:', err);
      setError('No se pudieron guardar las preferencias');
    } finally {
      setSaving(false);
    }
  }

  function handleChange(field, value) {
    setPreferences(prev => ({ ...prev, [field]: value }));
  }

  if (loading) {
    return (
      <div
        className="min-h-screen p-6 flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        <div style={{ color: 'var(--color-text-secondary)' }}>
          Cargando configuración...
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen p-6"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1
            className="text-3xl font-bold mb-2"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Configuración de Notificaciones
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Personaliza cómo y cuándo recibes notificaciones
          </p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div
            className="p-4 rounded-xl border"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: '#ef4444',
              color: '#ef4444'
            }}
          >
            {error}
          </div>
        )}

        {successMessage && (
          <div
            className="p-4 rounded-xl border"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: '#10b981',
              color: '#10b981'
            }}
          >
            {successMessage}
          </div>
        )}

        {/* Canales de Notificación */}
        <div
          className="p-6 rounded-xl space-y-6"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)'
          }}
        >
          <h2
            className="text-xl font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Canales de Notificación
          </h2>

          {/* Telegram */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
              >
                <MessageCircle size={20} style={{ color: 'var(--color-accent)' }} />
              </div>
              <div>
                <h3
                  className="font-medium"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Notificaciones por Telegram
                </h3>
                <p
                  className="text-sm"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Recibe notificaciones en tus bots conectados
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.telegram_enabled}
                onChange={(e) => handleChange('telegram_enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                style={{
                  backgroundColor: preferences.telegram_enabled ? 'var(--color-accent)' : 'var(--color-bg-tertiary)'
                }}
              ></div>
            </label>
          </div>

          {/* In-App */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
              >
                <Bell size={20} style={{ color: 'var(--color-accent)' }} />
              </div>
              <div>
                <h3
                  className="font-medium"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Notificaciones en la Aplicación
                </h3>
                <p
                  className="text-sm"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Notificaciones dentro del centro de notificaciones
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.in_app_enabled}
                onChange={(e) => handleChange('in_app_enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                style={{
                  backgroundColor: preferences.in_app_enabled ? 'var(--color-accent)' : 'var(--color-bg-tertiary)'
                }}
              ></div>
            </label>
          </div>
        </div>

        {/* Tipos de Notificación */}
        <div
          className="p-6 rounded-xl space-y-6"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)'
          }}
        >
          <h2
            className="text-xl font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Tipos de Notificación
          </h2>

          {/* Recordatorios de eventos */}
          <div className="flex items-center justify-between">
            <div>
              <h3
                className="font-medium"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Recordatorios de Eventos
              </h3>
              <p
                className="text-sm"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Notificaciones de eventos próximos en tu agenda
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.event_reminders}
                onChange={(e) => handleChange('event_reminders', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                style={{
                  backgroundColor: preferences.event_reminders ? 'var(--color-accent)' : 'var(--color-bg-tertiary)'
                }}
              ></div>
            </label>
          </div>

          {/* Notificaciones de mensajes */}
          <div className="flex items-center justify-between">
            <div>
              <h3
                className="font-medium"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Notificaciones de Mensajes
              </h3>
              <p
                className="text-sm"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Notificaciones de nuevos mensajes y chats
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.message_notifications}
                onChange={(e) => handleChange('message_notifications', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                style={{
                  backgroundColor: preferences.message_notifications ? 'var(--color-accent)' : 'var(--color-bg-tertiary)'
                }}
              ></div>
            </label>
          </div>

          {/* Tiempo por defecto de recordatorios */}
          <div>
            <label
              className="block font-medium mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Tiempo de Recordatorio por Defecto
            </label>
            <select
              value={preferences.default_reminder_minutes}
              onChange={(e) => handleChange('default_reminder_minutes', parseInt(e.target.value))}
              className="w-full px-4 py-2 rounded-lg"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)'
              }}
            >
              <option value={5}>5 minutos antes</option>
              <option value={15}>15 minutos antes</option>
              <option value={30}>30 minutos antes</option>
              <option value={60}>1 hora antes</option>
              <option value={120}>2 horas antes</option>
              <option value={1440}>1 día antes</option>
            </select>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all hover:opacity-90 disabled:opacity-50"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-text-primary)'
            }}
          >
            {saving ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save size={20} />
                Guardar Preferencias
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
