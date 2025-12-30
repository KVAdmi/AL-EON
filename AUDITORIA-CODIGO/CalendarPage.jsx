import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getWeekEvents } from '@/services/calendarService';
import { Calendar as CalendarIcon, Plus, ArrowLeft } from 'lucide-react';
import CalendarView from '@/features/calendar/components/CalendarView';
import CreateEventModal from '@/features/calendar/components/CreateEventModal';
import { useToast } from '@/ui/use-toast';

export default function CalendarPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    if (user?.id) {
      loadEvents();
    }
  }, [user, selectedDate]);

  async function loadEvents() {
    if (!user?.id) {
      console.warn('[CalendarPage] No user ID available');
      setLoading(false);
      return;
    }

    try {
      const data = await getWeekEvents(user.id);
      setEvents(data || []);
    } catch (error) {
      console.error('Error cargando eventos:', error);
      // No mostrar toast de error, solo log
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        <div style={{ color: 'var(--color-text-secondary)' }}>
          Cargando...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        <div style={{ color: 'var(--color-text-secondary)' }}>
          Por favor inicia sesión
        </div>
      </div>
    );
  }

  function handleEventCreated() {
    loadEvents();
    setShowCreateModal(false);
  }

  function handleEventUpdated() {
    loadEvents();
  }

  return (
    <>
      <div 
        className="min-h-screen flex flex-col"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        {/* Header */}
        <div 
          className="border-b px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 justify-between"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
            {/* Botón Volver */}
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-all hover:opacity-80 text-sm sm:text-base"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)'
              }}
            >
              <ArrowLeft size={18} />
              <span className="font-medium">Volver</span>
            </button>

            <div className="flex items-center gap-2 sm:gap-3">
              <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: 'var(--color-accent)' }} />
              <h1 
                className="text-xl sm:text-2xl font-bold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Agenda
              </h1>
            </div>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="py-2 sm:py-2.5 px-4 sm:px-5 rounded-xl font-medium transition-all hover:opacity-90 flex items-center gap-2 text-sm sm:text-base w-full sm:w-auto justify-center"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: '#FFFFFF',
            }}
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Nuevo evento</span>
            <span className="sm:hidden">Nuevo</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-2 sm:p-4 md:p-6">
          <CalendarView
            events={events}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onEventClick={(event) => {
              // TODO: Open event detail modal
              console.log('Event clicked:', event);
            }}
            onEventUpdated={handleEventUpdated}
          />
        </div>
      </div>

      {/* Create event modal */}
      {showCreateModal && (
        <CreateEventModal
          userId={user?.id}
          initialDate={selectedDate}
          onClose={() => setShowCreateModal(false)}
          onEventCreated={handleEventCreated}
        />
      )}
    </>
  );
}
