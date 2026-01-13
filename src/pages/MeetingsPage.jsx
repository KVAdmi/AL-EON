/**
 * MeetingsPage.jsx
 * Página principal de reuniones: grabador en vivo + historial
 */

import React, { useState } from 'react';
import MeetingsRecorderLive from '@/features/meetings/components/MeetingsRecorderLive';
import MeetingsViewer from '@/features/meetings/components/MeetingsViewer';

export default function MeetingsPage() {
  const [activeTab, setActiveTab] = useState('recorder'); // recorder | history

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Tabs */}
      <div 
        className="border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('recorder')}
              className={`py-4 px-2 font-medium transition-all relative ${
                activeTab === 'recorder' ? 'opacity-100' : 'opacity-50 hover:opacity-75'
              }`}
              style={{ color: 'var(--color-text-primary)' }}
            >
              🎙️ Grabar Reunión
              {activeTab === 'recorder' && (
                <div 
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                />
              )}
            </button>
            
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-2 font-medium transition-all relative ${
                activeTab === 'history' ? 'opacity-100' : 'opacity-50 hover:opacity-75'
              }`}
              style={{ color: 'var(--color-text-primary)' }}
            >
              📂 Historial
              {activeTab === 'history' && (
                <div 
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="py-6">
        {activeTab === 'recorder' ? (
          <MeetingsRecorderLive />
        ) : (
          <MeetingsViewer />
        )}
      </div>
    </div>
  );
}
