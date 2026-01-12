import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function HistoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, [user]);

  async function loadConversations() {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      console.log('[HistoryPage] 📚 Cargando conversaciones del usuario:', user.id);
      
      const { data, error } = await supabase
        .from('user_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[HistoryPage] ❌ Error al cargar conversaciones:', error);
        throw error;
      }

      console.log(`[HistoryPage] ✅ ${data?.length || 0} conversaciones cargadas`);
      setConversations(data || []);
    } catch (err) {
      console.error('[HistoryPage] Error inesperado:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenConversation(conv) {
    // Navegar al chat con la conversación seleccionada
    navigate(`/chat?session=${conv.id}`);
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6" style={{ color: 'var(--color-text-primary)' }}>
          Historial de Conversaciones
        </h1>
        <div className="text-center py-16">
          <p style={{ color: 'var(--color-text-secondary)' }}>Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6" style={{ color: 'var(--color-text-primary)' }}>
        Historial de Conversaciones
      </h1>

      <div className="space-y-4">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className="rounded-xl shadow p-6 hover:shadow-lg transition-all cursor-pointer"
            style={{ 
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)'
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  {conv.title}
                </h3>
                <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                  {conv.preview}
                </p>
                <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                  <span>{conv.date}</span>
                  <span>{conv.messages} mensajes</span>
                </div>
              </div>
              <button 
                className="px-4 py-2 rounded-lg transition-all"
                style={{ 
                  backgroundColor: 'var(--color-accent)',
                  color: 'var(--color-text-primary)'
                }}
              >
                Abrir
              </button>
            </div>
          </div>
        ))}
      </div>

      {conversations.length === 0 && (
        <div className="text-center py-16">
          <div className="max-w-md mx-auto">
            <svg 
              className="w-24 h-24 mx-auto mb-6 opacity-30" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
              No hay conversaciones aún
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
              Las conversaciones que inicies en el chat aparecerán aquí
            </p>
            <a
              href="/chat"
              className="inline-block px-6 py-3 rounded-xl font-medium transition-all"
              style={{ 
                backgroundColor: 'var(--color-accent)',
                color: 'var(--color-text-primary)'
              }}
            >
              Nueva Conversación
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
