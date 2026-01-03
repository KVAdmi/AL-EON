/**
 * MailInboxPage.jsx
 * Vista de bandeja de entrada de correos
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getMailMessages } from '@/services/mailService';
import { Mail, ArrowLeft, RefreshCw, Flag, Star, AlertCircle } from 'lucide-react';
import { useToast } from '@/ui/use-toast';

export default function MailInboxPage() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (session?.access_token) {
      loadMessages();
    }
  }, [session]);

  async function loadMessages() {
    if (!session?.access_token) return;
    
    try {
      setLoading(true);
      const data = await getMailMessages(session.access_token, {
        limit: 50,
        folder: 'inbox',
      });
      setMessages(data);
    } catch (error) {
      console.error('Error cargando correos:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudieron cargar los correos',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadMessages();
    setRefreshing(false);
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} h`;
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    
    return date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
    });
  }

  function getFlagColor(flag) {
    const colors = {
      urgent: '#EF4444',
      important: '#F59E0B',
      pending: '#3B82F6',
      follow_up: '#8B5CF6',
      low_priority: '#6B7280',
    };
    return colors[flag] || 'transparent';
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
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-[var(--color-bg-hover)]"
            style={{ color: 'var(--color-text-primary)' }}
          >
            <ArrowLeft size={20} />
          </button>
          <h1 
            className="text-xl font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Bandeja de entrada
          </h1>
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 rounded-lg hover:bg-[var(--color-bg-hover)] disabled:opacity-50"
          style={{ color: 'var(--color-text-primary)' }}
        >
          <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
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
              Cargando correos...
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <Mail 
              size={64} 
              className="mb-4 opacity-20"
              style={{ color: 'var(--color-text-secondary)' }}
            />
            <h3 
              className="text-lg font-medium mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              No tienes correos
            </h3>
            <p 
              className="text-center"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Cuando recibas correos aparecerán aquí
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {messages.map((message) => (
              <button
                key={message.id}
                onClick={() => navigate(`/mail/${message.id}`)}
                className="w-full p-4 text-left hover:bg-[var(--color-bg-hover)] transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white font-semibold"
                    style={{ backgroundColor: 'var(--color-accent)' }}
                  >
                    {(message.from_name || message.from_email).charAt(0).toUpperCase()}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span 
                          className={`font-medium truncate ${message.status === 'new' ? 'font-bold' : ''}`}
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {message.from_name || message.from_email}
                        </span>
                        {message.status === 'new' && (
                          <span 
                            className="px-2 py-0.5 rounded-full text-xs font-semibold shrink-0"
                            style={{ 
                              backgroundColor: '#3B82F6',
                              color: 'white' 
                            }}
                          >
                            Nuevo
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        {message.flag && (
                          <Flag 
                            size={14} 
                            fill={getFlagColor(message.flag)}
                            style={{ color: getFlagColor(message.flag) }}
                          />
                        )}
                        {message.is_starred && (
                          <Star 
                            size={14} 
                            fill="#F59E0B"
                            style={{ color: '#F59E0B' }}
                          />
                        )}
                        {message.is_spam && (
                          <AlertCircle 
                            size={14}
                            style={{ color: '#EF4444' }}
                          />
                        )}
                        <span 
                          className="text-xs"
                          style={{ color: 'var(--color-text-tertiary)' }}
                        >
                          {formatDate(message.received_at)}
                        </span>
                      </div>
                    </div>

                    <div 
                      className={`text-sm mb-1 truncate ${message.status === 'new' ? 'font-semibold' : ''}`}
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {message.subject}
                    </div>

                    <div 
                      className="text-xs line-clamp-2"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {message.snippet || message.body_text?.substring(0, 150)}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
