/**
 * MailPendingPage.jsx
 * Vista de correos pendientes de envío
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getPendingDrafts } from '@/services/mailService';
import { Clock, ArrowLeft, Mail, RefreshCw } from 'lucide-react';
import { useToast } from '@/ui/use-toast';

export default function MailPendingPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.access_token) {
      loadDrafts();
    }
  }, [session]);

  async function loadDrafts() {
    if (!session?.access_token) return;

    try {
      setLoading(true);
      const data = await getPendingDrafts(session.access_token);
      setDrafts(data);
    } catch (error) {
      console.error('Error cargando borradores:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudieron cargar los borradores',
      });
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('es-MX', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div 
      className="h-screen flex flex-col"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/mail')}
            className="p-2 rounded-lg hover:bg-[var(--color-bg-hover)]"
            style={{ color: 'var(--color-text-primary)' }}
          >
            <ArrowLeft size={20} />
          </button>
          <h1 
            className="text-xl font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Pendientes de envío
          </h1>
        </div>

        <button
          onClick={loadDrafts}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-[var(--color-bg-hover)] disabled:opacity-50"
          style={{ color: 'var(--color-text-primary)' }}
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <RefreshCw 
              size={48} 
              className="animate-spin mb-4 opacity-50"
              style={{ color: 'var(--color-text-secondary)' }}
            />
            <p style={{ color: 'var(--color-text-secondary)' }}>
              Cargando borradores...
            </p>
          </div>
        ) : drafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <Clock 
              size={64} 
              className="mb-4 opacity-20"
              style={{ color: 'var(--color-text-secondary)' }}
            />
            <h3 
              className="text-lg font-medium mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              No hay correos pendientes
            </h3>
            <p 
              className="text-center"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Los correos guardados para enviar después aparecerán aquí
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className="p-4 hover:bg-[var(--color-bg-hover)]"
              >
                <div className="flex items-start gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: '#F59E0B', color: 'white' }}
                  >
                    <Clock size={20} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span 
                        className="font-medium truncate"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        Para: {draft.to_emails?.join(', ') || 'Sin destinatario'}
                      </span>
                      <span 
                        className="text-xs shrink-0"
                        style={{ color: 'var(--color-text-tertiary)' }}
                      >
                        {formatDate(draft.created_at)}
                      </span>
                    </div>

                    <div 
                      className="text-sm mb-1"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {draft.subject || 'Sin asunto'}
                    </div>

                    <div 
                      className="text-xs line-clamp-2"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {draft.draft_text?.substring(0, 150)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
