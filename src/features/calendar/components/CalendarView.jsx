import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import EventCard from './EventCard';

export default function CalendarView({ events, selectedDate, onDateChange, onEventClick, onEventUpdated }) {
  const [view, setView] = useState('week'); // 'week' | 'list'

  // Generar días de la semana actual
  function getWeekDays(date) {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay()); // Domingo
    start.setHours(0, 0, 0, 0);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  }

  const weekDays = getWeekDays(selectedDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Agrupar eventos por día
  function getEventsForDay(day) {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    // ✅ FIX: Verificar que events sea un array antes de filtrar
    if (!Array.isArray(events)) {
      return [];
    }

    return events.filter(event => {
      const eventStart = new Date(event.startTime);
      return eventStart >= dayStart && eventStart <= dayEnd;
    }).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  }

  function handlePrevWeek() {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    onDateChange(newDate);
  }

  function handleNextWeek() {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    onDateChange(newDate);
  }

  function handleToday() {
    onDateChange(new Date());
  }

  function formatWeekRange() {
    const start = weekDays[0];
    const end = weekDays[6];
    
    if (start.getMonth() === end.getMonth()) {
      return `${start.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`;
    } else {
      return `${start.toLocaleDateString('es-ES', { month: 'short' })} - ${end.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}`;
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={handleToday}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium border transition-all hover:opacity-80 text-sm"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          >
            Hoy
          </button>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={handlePrevWeek}
              className="p-1.5 sm:p-2 rounded-lg transition-all hover:opacity-80"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
              }}
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={handleNextWeek}
              className="p-1.5 sm:p-2 rounded-lg transition-all hover:opacity-80"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
              }}
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          <h3 
            className="text-sm sm:text-lg font-semibold capitalize"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {formatWeekRange()}
          </h3>
        </div>

        {/* View toggle */}
        <div 
          className="flex rounded-lg border overflow-hidden w-full sm:w-auto"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <button
            onClick={() => setView('week')}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-all ${
              view === 'week' ? 'font-semibold' : ''
            }`}
            style={{
              backgroundColor: view === 'week' ? 'var(--color-bg-secondary)' : 'transparent',
              color: 'var(--color-text-primary)',
            }}
          >
            Semana
          </button>
          <button
            onClick={() => setView('list')}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-all border-l ${
              view === 'list' ? 'font-semibold' : ''
            }`}
            style={{
              backgroundColor: view === 'list' ? 'var(--color-bg-secondary)' : 'transparent',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          >
            Lista
          </button>
        </div>
      </div>

      {/* Week Grid View */}
      {view === 'week' && (
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1 sm:gap-2 overflow-auto">
          {weekDays.map((day, index) => {
            const isToday = day.getTime() === today.getTime();
            const dayEvents = getEventsForDay(day);

            return (
              <div
                key={index}
                className="flex flex-col border rounded-lg sm:rounded-xl overflow-hidden min-h-[120px] sm:min-h-[150px]"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: isToday ? 'var(--color-accent)' : 'var(--color-border)',
                  borderWidth: isToday ? '2px' : '1px',
                }}
              >
                {/* Day header */}
                <div 
                  className="p-2 sm:p-3 text-center border-b"
                  style={{
                    backgroundColor: isToday ? 'var(--color-accent)' : 'var(--color-bg-primary)',
                    borderColor: 'var(--color-border)',
                  }}
                >
                  <div 
                    className="text-[10px] sm:text-xs font-medium mb-0.5 sm:mb-1 uppercase"
                    style={{ color: isToday ? '#FFFFFF' : 'var(--color-text-secondary)' }}
                  >
                    {day.toLocaleDateString('es-ES', { weekday: 'short' })}
                  </div>
                  <div 
                    className="text-lg sm:text-2xl font-bold"
                    style={{ color: isToday ? '#FFFFFF' : 'var(--color-text-primary)' }}
                  >
                    {day.getDate()}
                  </div>
                </div>

                {/* Events */}
                <div className="flex-1 overflow-y-auto p-1 sm:p-2 space-y-1 sm:space-y-2">
                  {dayEvents.length > 0 ? (
                    dayEvents.map(event => (
                      <EventCard
                        key={event.id}
                        event={event}
                        compact
                        onClick={() => onEventClick(event)}
                      />
                    ))
                  ) : (
                    <div 
                      className="text-center py-2 sm:py-4 text-[10px] sm:text-xs"
                      style={{ color: 'var(--color-text-tertiary)' }}
                    >
                      Sin eventos
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="flex-1 overflow-y-auto space-y-6">
          {weekDays.map((day, index) => {
            const isToday = day.getTime() === today.getTime();
            const dayEvents = getEventsForDay(day);

            if (dayEvents.length === 0) return null;

            return (
              <div key={index}>
                <div 
                  className="flex items-center gap-3 mb-3 pb-2 border-b"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <div 
                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${
                      isToday ? 'text-white' : ''
                    }`}
                    style={{
                      backgroundColor: isToday ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
                      color: isToday ? '#FFFFFF' : 'var(--color-text-primary)',
                    }}
                  >
                    {day.getDate()}
                  </div>
                  <div>
                    <div 
                      className="font-semibold capitalize"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {day.toLocaleDateString('es-ES', { weekday: 'long' })}
                    </div>
                    <div 
                      className="text-sm"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {day.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pl-4">
                  {dayEvents.map(event => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onClick={() => onEventClick(event)}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {events.length === 0 && (
            <div 
              className="text-center py-12 rounded-xl border"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
              }}
            >
              <Calendar size={48} className="mx-auto mb-3" style={{ color: 'var(--color-text-tertiary)' }} />
              <p style={{ color: 'var(--color-text-secondary)' }}>
                No hay eventos esta semana
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
