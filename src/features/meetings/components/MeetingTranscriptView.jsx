/**
 * MeetingTranscriptView.jsx
 * Visualización de transcripción con diarización de speakers
 */

import React from 'react';
import { Clock, User } from 'lucide-react';

const SPEAKER_COLORS = [
  { bg: '#e3f2fd', color: '#1565c0' },    // SPEAKER_00 - Azul
  { bg: '#f3e5f5', color: '#6a1b9a' },    // SPEAKER_01 - Morado
  { bg: '#e8f5e9', color: '#2e7d32' },    // SPEAKER_02 - Verde
  { bg: '#fff3e0', color: '#e65100' },    // SPEAKER_03 - Naranja
  { bg: '#fce4ec', color: '#c2185b' },    // SPEAKER_04 - Rosa
  { bg: '#e0f2f1', color: '#00695c' },    // SPEAKER_05 - Teal
];

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getSpeakerColor(speakerIndex) {
  return SPEAKER_COLORS[speakerIndex % SPEAKER_COLORS.length];
}

export default function MeetingTranscriptView({ segments, duration }) {
  if (!segments || segments.length === 0) {
    return (
      <div 
        className="text-center py-8"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        <User size={48} className="mx-auto mb-3 opacity-30" />
        <p>No hay segmentos de transcripción</p>
      </div>
    );
  }

  // Extraer speakers únicos
  const speakers = [...new Set(segments.map(s => s.speaker))];
  const speakerMap = {};
  speakers.forEach((speaker, idx) => {
    speakerMap[speaker] = idx;
  });

  return (
    <div className="space-y-4">
      {/* Header con info */}
      <div 
        className="flex items-center gap-4 p-3 rounded-lg border text-sm"
        style={{
          backgroundColor: 'var(--color-bg-tertiary)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-text-secondary)'
        }}
      >
        <div className="flex items-center gap-2">
          <User size={16} />
          <span>{speakers.length} participante(s)</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={16} />
          <span>Duración: {formatTime(duration || segments[segments.length - 1]?.end || 0)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>{segments.length} segmentos</span>
        </div>
      </div>

      {/* Leyenda de speakers */}
      <div className="flex flex-wrap gap-2">
        {speakers.map((speaker) => {
          const color = getSpeakerColor(speakerMap[speaker]);
          return (
            <div
              key={speaker}
              className="px-3 py-1 rounded-full text-sm font-semibold"
              style={{
                backgroundColor: color.bg,
                color: color.color
              }}
            >
              {speaker}
            </div>
          );
        })}
      </div>

      {/* Segmentos */}
      <div className="space-y-3">
        {segments.map((segment, idx) => {
          const color = getSpeakerColor(speakerMap[segment.speaker]);
          
          return (
            <div
              key={idx}
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)'
              }}
            >
              {/* Header del segmento */}
              <div className="flex items-center justify-between mb-2">
                <div
                  className="px-3 py-1 rounded-full text-sm font-semibold"
                  style={{
                    backgroundColor: color.bg,
                    color: color.color
                  }}
                >
                  {segment.speaker}
                </div>
                <div 
                  className="text-xs font-mono"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  {formatTime(segment.start)} - {formatTime(segment.end)}
                </div>
              </div>

              {/* Texto */}
              <p 
                className="text-sm leading-relaxed"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {segment.text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
