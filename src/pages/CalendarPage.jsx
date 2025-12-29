import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getWeekEvents } from '@/services/calendarService';
import { Calendar as CalendarIcon, Plus, ArrowLeft } from 'lucide-react';
import CalendarView from '@/features/calendar/components/CalendarView';
import CreateEventModal from '@/features/calendar/components/CreateEventModal';
import { useToast } from '@/ui/use-toast';

export default function CalendarPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    loadEvents();
  }, [user, selectedDate]);

  async function loadEvents() {
    if (!user) return;

    try {
      setLoading(true);
      const data = await getWeekEvents(user.id);
      setEvents(data || []);
    } catch (error) {
      console.error('Error cargando eventos:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudieron cargar los eventos',
      });
    } finally {
      setLoading(false);
    }
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
        className="h-screen flex flex-col"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        {/* Header */}
        <div 
          className="border-b px-6 py-4 flex items-center justify-between"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-4">
            {/* Botón Volver */}
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:opacity-80"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)'
              }}
            >
              <ArrowLeft size={18} />
              <span className="font-medium">Volver</span>
            </button>

            <div className="flex items-center gap-3">
              <CalendarIcon size={24} style={{ color: 'var(--color-accent)' }} />
              <h1 
                className="text-2xl font-bold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Agenda
              </h1>
            </div>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="py-2.5 px-5 rounded-xl font-medium transition-all hover:opacity-90 flex items-center gap-2"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: '#FFFFFF',
            }}
          >
            <Plus size={18} />
            Nuevo evento
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-6">
          {loading ? (
            <div 
              className="h-full flex items-center justify-center"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Cargando agenda...
            </div>
          ) : (
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
          )}
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
