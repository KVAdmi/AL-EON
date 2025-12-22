/**
 * useConversations - Hook para manejar sesiones desde AL-E Core Backend
 * NO usa localStorage para conversaciones - todo desde API
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  createSession, 
  getSessions, 
  getSession,
  updateSession,
  deleteSession as deleteSessionAPI 
} from '@/services/sessionsService';

export function useConversationsFromBackend() {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cargar sesiones al montar
  useEffect(() => {
    loadSessions();
  }, []);

  // Guardar sesión activa en localStorage (solo UI)
  useEffect(() => {
    if (currentSessionId) {
      localStorage.setItem('al-eon-active-session', currentSessionId);
    }
  }, [currentSessionId]);

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      const data = await getSessions();
      setSessions(data || []);
      
      // Restaurar sesión activa
      const savedId = localStorage.getItem('al-eon-active-session');
      if (savedId && data.find(s => s.id === savedId)) {
        setCurrentSessionId(savedId);
      } else if (data.length > 0) {
        setCurrentSessionId(data[0].id);
      }
    } catch (err) {
      setError(err.message);
      console.error('Error cargando sesiones:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewSession = useCallback(async () => {
    try {
      setIsLoading(true);
      const newSession = await createSession({ mode: 'universal' }); // ✅ AL-EON usa modo universal
      
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
      
      return newSession;
    } catch (err) {
      setError(err.message);
      console.error('Error creando sesión:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectSession = useCallback((sessionId) => {
    setCurrentSessionId(sessionId);
  }, []);

  const updateSessionTitle = useCallback(async (sessionId, title) => {
    try {
      await updateSession(sessionId, { title });
      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, title } : s
      ));
    } catch (err) {
      setError(err.message);
      console.error('Error actualizando sesión:', err);
    }
  }, []);

  const removeSession = useCallback(async (sessionId) => {
    try {
      await deleteSessionAPI(sessionId);
      setSessions(prev => {
        const filtered = prev.filter(s => s.id !== sessionId);
        
        // Si borramos la activa, cambiar a otra
        if (sessionId === currentSessionId) {
          if (filtered.length > 0) {
            setCurrentSessionId(filtered[0].id);
          } else {
            setCurrentSessionId(null);
          }
        }
        
        return filtered;
      });
    } catch (err) {
      setError(err.message);
      console.error('Error eliminando sesión:', err);
    }
  }, [currentSessionId]);

  const currentSession = sessions.find(s => s.id === currentSessionId);

  return {
    sessions,
    currentSession,
    currentSessionId,
    isLoading,
    error,
    createNewSession,
    selectSession,
    updateSessionTitle,
    removeSession,
    refreshSessions: loadSessions
  };
}
