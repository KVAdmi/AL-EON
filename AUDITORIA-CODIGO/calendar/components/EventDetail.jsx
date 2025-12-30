import React, { useState } from 'react';
import { updateEvent, cancelEvent, deleteEvent } from '@/services/calendarService';
import { useToast } from '@/ui/use-toast';
import { X, Clock, MapPin, Users, Edit3, Trash2, Ban, Loader2 } from 'lucide-react';

export default function EventDetail({ event, onClose, onEventUpdated, onEventDeleted }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: event.title,
    description: event.description || '',
    location: event.location || '',
  });

  function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function getDuration(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const minutes = Math.floor((end - start) / (1000 * 60));
    
    if (minutes < 60) {
      return `${minutes} minutos`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours} hora${hours > 1 ? 's' : ''} ${mins} minutos` : `${hours} hora${hours > 1 ? 's' : ''}`;
    }
  }

  async function handleSave() {
    if (!event.id) return;

    try {
      setLoading(true);
      await updateEvent(event.id, formData);
      toast({
        title: 'Evento actualizado',
        description: 'Los cambios se guardaron correctamente',
      });
      setIsEditing(false);
      onEventUpdated();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo actualizar el evento',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!confirm('¿Cancelar este evento?')) return;

    try {
      setLoading(true);
      await cancelEvent(event.id);
      toast({
        title: 'Evento cancelado',
        description: 'El evento se canceló correctamente',
      });
      onEventUpdated();
      onClose();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo cancelar el evento',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar permanentemente este evento?')) return;

    try {
      setLoading(true);
      await deleteEvent(event.id);
      toast({
        title: 'Evento eliminado',
        description: 'El evento se eliminó permanentemente',
      });
      onEventDeleted();
      onClose();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo eliminar el evento',
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
          <h2 
            className="text-xl font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Detalles del evento
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-all hover:opacity-80"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {isEditing ? (
            <>
              {/* Edit form */}
              <div>
                <label 
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Título
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--color-bg-primary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                />
              </div>

              <div>
                <label 
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Ubicación
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--color-bg-primary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                />
              </div>

              <div>
                <label 
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg border resize-none"
                  style={{
                    backgroundColor: 'var(--color-bg-primary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                    minHeight: '100px',
                  }}
                />
              </div>
            </>
          ) : (
            <>
              {/* View mode */}
              <div>
                <h3 
                  className="text-2xl font-bold mb-4"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {event.title}
                </h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Clock size={20} style={{ color: 'var(--color-accent)', marginTop: '2px' }} />
                  <div>
                    <p 
                      className="font-medium capitalize"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {formatDateTime(event.startTime)}
                    </p>
                    <p 
                      className="text-sm mt-1"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      Hasta: {formatDateTime(event.endTime)}
                    </p>
                    <p 
                      className="text-sm mt-1"
                      style={{ color: 'var(--color-text-tertiary)' }}
                    >
                      Duración: {getDuration(event.startTime, event.endTime)}
                    </p>
                  </div>
                </div>

                {event.location && (
                  <div className="flex items-start gap-3">
                    <MapPin size={20} style={{ color: 'var(--color-accent)', marginTop: '2px' }} />
                    <p style={{ color: 'var(--color-text-primary)' }}>
                      {event.location}
                    </p>
                  </div>
                )}

                {event.attendees && event.attendees.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Users size={20} style={{ color: 'var(--color-accent)', marginTop: '2px' }} />
                    <div>
                      <p 
                        className="font-medium mb-1"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {event.attendees.length} asistente(s)
                      </p>
                      <ul 
                        className="text-sm space-y-1"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {event.attendees.map((attendee, index) => (
                          <li key={index}>{attendee}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {event.description && (
                <div 
                  className="p-4 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--color-bg-primary)',
                    borderColor: 'var(--color-border)',
                  }}
                >
                  <h4 
                    className="font-semibold mb-2"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    Descripción
                  </h4>
                  <p 
                    className="text-sm whitespace-pre-wrap"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {event.description}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div 
          className="px-6 py-4 border-t flex items-center justify-between"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {isEditing ? (
            <div className="flex gap-2 w-full">
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 py-2.5 px-4 rounded-xl font-medium transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: '#FFFFFF',
                }}
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                Guardar cambios
              </button>
              <button
                onClick={() => setIsEditing(false)}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl font-medium border transition-all hover:opacity-90"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Cancelar
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 rounded-lg font-medium border transition-all hover:opacity-80 flex items-center gap-2"
                  style={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <Edit3 size={16} />
                  Editar
                </button>

                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg font-medium border transition-all hover:opacity-80 flex items-center gap-2"
                  style={{
                    borderColor: 'var(--color-border)',
                    color: '#f59e0b',
                  }}
                >
                  <Ban size={16} />
                  Cancelar evento
                </button>
              </div>

              <button
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 rounded-lg font-medium border transition-all hover:opacity-80 flex items-center gap-2"
                style={{
                  borderColor: '#ef4444',
                  color: '#ef4444',
                }}
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
                Eliminar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
