import React, { useState } from 'react';
import { createEvent } from '@/services/calendarService';
import { scheduleNotification } from '@/services/notificationsService';
import { useToast } from '@/ui/use-toast';
import { X, Calendar, Clock, MapPin, Users, Bell, Loader2 } from 'lucide-react';

export default function CreateEventModal({ userId, initialDate, onClose, onEventCreated }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    startDate: initialDate ? initialDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endDate: initialDate ? initialDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    endTime: '10:00',
    description: '',
    location: '',
    attendees: '',
    reminder: null, // null | '15' | '60' | '1440'
  });

  function handleChange(field, value) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!userId) return;

    try {
      setLoading(true);

      // Construir fechas ISO
      const startTime = new Date(`${formData.startDate}T${formData.startTime}`).toISOString();
      const endTime = new Date(`${formData.endDate}T${formData.endTime}`).toISOString();

      // Validar que end > start
      if (new Date(endTime) <= new Date(startTime)) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'La fecha de fin debe ser posterior a la de inicio',
        });
        setLoading(false);
        return;
      }

      const eventData = {
        userId,
        title: formData.title,
        startTime,
        endTime,
        ...(formData.description && { description: formData.description }),
        ...(formData.location && { location: formData.location }),
        ...(formData.attendees && { 
          attendees: formData.attendees.split(',').map(e => e.trim()).filter(e => e)
        }),
      };

      const createdEvent = await createEvent(eventData);

      // Si hay recordatorio, programarlo
      if (formData.reminder && createdEvent.id) {
        const reminderMinutes = parseInt(formData.reminder);
        const reminderDate = new Date(startTime);
        reminderDate.setMinutes(reminderDate.getMinutes() - reminderMinutes);

        await scheduleNotification({
          userId,
          type: 'calendar_reminder',
          title: `Recordatorio: ${formData.title}`,
          message: `Tu evento "${formData.title}" comienza en ${reminderMinutes === 15 ? '15 minutos' : reminderMinutes === 60 ? '1 hora' : '1 día'}`,
          scheduledFor: reminderDate.toISOString(),
          channel: 'telegram',
          metadata: {
            eventId: createdEvent.id,
            eventTitle: formData.title,
            eventStartTime: startTime,
          },
        });
      }

      toast({
        title: 'Evento creado',
        description: formData.reminder 
          ? `"${formData.title}" se creó con recordatorio`
          : `"${formData.title}" se creó correctamente`,
      });

      onEventCreated();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo crear el evento',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--color-bg-secondary)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-3">
            <Calendar size={24} style={{ color: 'var(--color-accent)' }} />
            <h2 
              className="text-xl font-bold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Nuevo evento
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-all hover:opacity-80"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label 
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Título del evento
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
              placeholder="Ej: Reunión de equipo"
              required
              autoFocus
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label 
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Fecha de inicio
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border"
                style={{
                  backgroundColor: 'var(--color-bg-primary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                required
              />
            </div>

            <div>
              <label 
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Hora de inicio
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => handleChange('startTime', e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border"
                style={{
                  backgroundColor: 'var(--color-bg-primary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                required
              />
            </div>

            <div>
              <label 
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Fecha de fin
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border"
                style={{
                  backgroundColor: 'var(--color-bg-primary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                required
              />
            </div>

            <div>
              <label 
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Hora de fin
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => handleChange('endTime', e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border"
                style={{
                  backgroundColor: 'var(--color-bg-primary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                required
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label 
              className="block text-sm font-medium mb-1.5 flex items-center gap-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              <MapPin size={14} />
              Ubicación (opcional)
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
              placeholder="Ej: Sala de conferencias A"
            />
          </div>

          {/* Attendees */}
          <div>
            <label 
              className="block text-sm font-medium mb-1.5 flex items-center gap-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              <Users size={14} />
              Asistentes (opcional)
            </label>
            <input
              type="text"
              value={formData.attendees}
              onChange={(e) => handleChange('attendees', e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
              placeholder="email1@example.com, email2@example.com"
            />
            <p 
              className="text-xs mt-1"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Separa los emails con comas
            </p>
          </div>

          {/* Description */}
          <div>
            <label 
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Descripción (opcional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full px-4 py-3 rounded-lg border resize-none"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
                minHeight: '100px',
              }}
              placeholder="Detalles adicionales del evento..."
            />
          </div>

          {/* Reminder */}
          <div>
            <label 
              className="block text-sm font-medium mb-2 flex items-center gap-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              <Bell size={14} />
              Recordarme
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: null, label: 'Sin recordatorio' },
                { value: '15', label: '15 minutos antes' },
                { value: '60', label: '1 hora antes' },
                { value: '1440', label: '1 día antes' },
              ].map(option => (
                <button
                  key={option.value || 'none'}
                  type="button"
                  onClick={() => handleChange('reminder', option.value)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                    formData.reminder === option.value ? 'font-semibold' : ''
                  }`}
                  style={{
                    backgroundColor: formData.reminder === option.value 
                      ? 'var(--color-accent)' 
                      : 'var(--color-bg-primary)',
                    borderColor: formData.reminder === option.value
                      ? 'var(--color-accent)'
                      : 'var(--color-border)',
                    color: formData.reminder === option.value
                      ? '#FFFFFF'
                      : 'var(--color-text-primary)',
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {formData.reminder && (
              <p 
                className="text-xs mt-2"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Recibirás una notificación por Telegram
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 rounded-xl font-medium transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: '#FFFFFF',
              }}
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? 'Creando...' : 'Crear evento'}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-3 rounded-xl font-medium border transition-all hover:opacity-90 disabled:opacity-50"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
