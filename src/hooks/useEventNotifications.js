/**
 * useEventNotifications.js
 * Hook para verificar eventos próximos y mostrar notificaciones
 */

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { notifyUpcomingEvent, getNotificationPermission } from '@/lib/notifications';

export function useEventNotifications(userId) {
  const notifiedEventsRef = useRef(new Set());
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!userId) return;

    // Verificar permisos
    if (getNotificationPermission() !== 'granted') {
      console.log('ℹ️ Notificaciones no habilitadas');
      return;
    }

    console.log('✅ Sistema de notificaciones de eventos activado');

    // Función para verificar eventos próximos
    const checkUpcomingEvents = async () => {
      try {
        const now = new Date();
        const in30Minutes = new Date(now.getTime() + 30 * 60000);

        // Obtener eventos en los próximos 30 minutos
        const { data: events, error } = await supabase
          .from('calendar_events')
          .select('*')
          .eq('owner_user_id', userId)
          .gte('start_at', now.toISOString())
          .lte('start_at', in30Minutes.toISOString())
          .order('start_at', { ascending: true });

        if (error) {
          console.error('Error obteniendo eventos:', error);
          return;
        }

        if (!events || events.length === 0) {
          return;
        }

        console.log(`📅 ${events.length} evento(s) próximo(s) encontrado(s)`);

        // Notificar eventos que no hemos notificado
        for (const event of events) {
          const eventKey = `${event.id}-${event.start_at}`;
          
          if (!notifiedEventsRef.current.has(eventKey)) {
            const minutesUntil = Math.floor(
              (new Date(event.start_at) - now) / 60000
            );

            // Notificar si está a 30, 15, 5 minutos o menos
            if (minutesUntil <= 30) {
              console.log(`🔔 Notificando evento: ${event.title} en ${minutesUntil} min`);
              notifyUpcomingEvent(event);
              notifiedEventsRef.current.add(eventKey);
            }
          }
        }

        // Limpiar eventos ya pasados del Set
        const cutoffTime = new Date(now.getTime() - 60 * 60000); // 1 hora atrás
        const keysToDelete = [];
        
        for (const key of notifiedEventsRef.current) {
          const [, timestamp] = key.split('-');
          if (new Date(timestamp) < cutoffTime) {
            keysToDelete.push(key);
          }
        }
        
        keysToDelete.forEach(key => notifiedEventsRef.current.delete(key));
        
      } catch (error) {
        console.error('Error verificando eventos:', error);
      }
    };

    // Verificar inmediatamente
    checkUpcomingEvents();

    // Verificar cada 1 minuto
    intervalRef.current = setInterval(checkUpcomingEvents, 60000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [userId]);
}
