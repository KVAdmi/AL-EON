import React from 'react';
import { Clock, MapPin, Users } from 'lucide-react';

export default function EventCard({ event, compact = false, onClick }) {
  function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  function getDuration(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const minutes = Math.floor((end - start) / (1000 * 60));
    
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    }
  }

  // Colores basados en el tipo/categoría (si tuviéramos)
  const accentColor = 'var(--color-accent)';

  if (compact) {
    return (
      <button
        onClick={onClick}
        className="w-full p-2.5 rounded-lg text-left transition-all hover:shadow-sm border"
        style={{
          backgroundColor: 'var(--color-bg-primary)',
          borderColor: 'var(--color-border)',
          borderLeftWidth: '3px',
          borderLeftColor: accentColor,
        }}
      >
        <div 
          className="text-xs font-medium mb-1"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          {formatTime(event.startTime)}
        </div>
        <div 
          className="text-sm font-semibold line-clamp-2"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {event.title}
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="w-full p-4 rounded-xl text-left transition-all hover:shadow-md border"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        borderColor: 'var(--color-border)',
        borderLeftWidth: '4px',
        borderLeftColor: accentColor,
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 
          className="font-semibold text-lg"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {event.title}
        </h4>
        <span 
          className="px-2.5 py-1 text-xs rounded-full font-medium whitespace-nowrap ml-2"
          style={{
            backgroundColor: `${accentColor}20`,
            color: accentColor,
          }}
        >
          {getDuration(event.startTime, event.endTime)}
        </span>
      </div>

      <div className="space-y-1.5">
        <div 
          className="flex items-center gap-2 text-sm"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <Clock size={14} />
          <span>
            {formatTime(event.startTime)} - {formatTime(event.endTime)}
          </span>
        </div>

        {event.location && (
          <div 
            className="flex items-center gap-2 text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <MapPin size={14} />
            <span className="line-clamp-1">{event.location}</span>
          </div>
        )}

        {event.attendees && event.attendees.length > 0 && (
          <div 
            className="flex items-center gap-2 text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <Users size={14} />
            <span>{event.attendees.length} asistente(s)</span>
          </div>
        )}
      </div>

      {event.description && (
        <p 
          className="mt-3 text-sm line-clamp-2"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          {event.description}
        </p>
      )}
    </button>
  );
}
