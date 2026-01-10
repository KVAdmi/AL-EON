/**
 * notifications.js
 * Sistema de notificaciones push del navegador para eventos/citas
 */

/**
 * Solicitar permiso de notificaciones al usuario
 * @returns {Promise<boolean>} true si se otorgó el permiso
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('⚠️ Este navegador no soporta notificaciones');
    return false;
  }

  if (Notification.permission === 'granted') {
    console.log('✅ Permisos de notificación ya otorgados');
    return true;
  }

  if (Notification.permission === 'denied') {
    console.warn('❌ Permisos de notificación denegados');
    alert('⚠️ Las notificaciones están bloqueadas. Ve a Configuración del navegador → Permisos → Notificaciones y permite este sitio.');
    return false;
  }

  try {
    console.log('📢 Solicitando permiso de notificaciones...');
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('✅ Permiso de notificaciones otorgado');
      
      // Mostrar notificación de bienvenida
      showNotification({
        title: '🎉 ¡Notificaciones activadas!',
        body: 'Ahora recibirás alertas de tus citas y eventos importantes',
        icon: '/logo.png',
        badge: '/logo.png'
      });
      
      return true;
    } else {
      console.warn('❌ Permiso de notificaciones denegado');
      return false;
    }
  } catch (error) {
    console.error('Error solicitando permiso:', error);
    return false;
  }
}

/**
 * Mostrar notificación del navegador
 * @param {Object} options - Opciones de la notificación
 * @param {string} options.title - Título de la notificación
 * @param {string} options.body - Cuerpo del mensaje
 * @param {string} options.icon - URL del ícono
 * @param {string} options.badge - URL del badge
 * @param {string} options.tag - Tag único para agrupar notificaciones
 * @param {boolean} options.requireInteraction - Mantener hasta que usuario interactúe
 * @param {string} options.url - URL a la que navegar al hacer clic
 * @param {Array} options.actions - Botones de acción
 * @returns {Notification|null}
 */
export function showNotification({
  title,
  body,
  icon = '/logo.png',
  badge = '/logo.png',
  tag = 'al-eon-notification',
  requireInteraction = true, // 🔥 FORZAR INTERACCIÓN
  url = null,
  actions = [],
  vibrate = [200, 100, 200, 100, 200] // 🔥 VIBRACIÓN CABRONA
}) {
  if (!('Notification' in window)) {
    console.warn('⚠️ Notificaciones no soportadas');
    return null;
  }

  if (Notification.permission !== 'granted') {
    console.warn('⚠️ No hay permiso para mostrar notificaciones');
    return null;
  }

  try {
    const notification = new Notification(title, {
      body,
      icon,
      badge,
      tag,
      requireInteraction,
      vibrate,
      // silent: false, // 🔥 CON SONIDO
      actions: actions.length > 0 ? actions : undefined,
      data: { url }
    });

    // Reproducir SONIDO adicional (además del sistema)
    playNotificationSound();

    // Manejar clic en la notificación
    notification.onclick = function(event) {
      event.preventDefault();
      window.focus();
      
      if (url) {
        window.location.href = url;
      }
      
      notification.close();
    };

    console.log('✅ Notificación mostrada:', title);
    return notification;
  } catch (error) {
    console.error('Error mostrando notificación:', error);
    return null;
  }
}

/**
 * Reproducir sonido de notificación CABRÓN
 */
function playNotificationSound() {
  try {
    // Crear audio context para generar sonido de alerta
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Frecuencia alta (alerta urgente)
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    // Volumen
    gainNode.gain.value = 0.3;

    // Tocar 3 beeps rápidos
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);

    const oscillator2 = audioContext.createOscillator();
    oscillator2.connect(gainNode);
    oscillator2.frequency.value = 900;
    oscillator2.type = 'sine';
    oscillator2.start(audioContext.currentTime + 0.15);
    oscillator2.stop(audioContext.currentTime + 0.25);

    const oscillator3 = audioContext.createOscillator();
    oscillator3.connect(gainNode);
    oscillator3.frequency.value = 1000;
    oscillator3.type = 'sine';
    oscillator3.start(audioContext.currentTime + 0.3);
    oscillator3.stop(audioContext.currentTime + 0.4);

    console.log('🔊 Sonido de alerta reproducido');
  } catch (error) {
    console.warn('⚠️ No se pudo reproducir sonido:', error);
  }
}

/**
 * Notificación para evento/cita próxima
 * @param {Object} event - Datos del evento
 */
export function notifyUpcomingEvent(event) {
  const minutesUntil = Math.floor((new Date(event.start_time) - new Date()) / 60000);
  
  let body = '';
  let requireInteraction = true;
  
  if (minutesUntil <= 5) {
    body = `🚨 ¡URGENTE! Tu evento "${event.title}" comienza en ${minutesUntil} minuto${minutesUntil !== 1 ? 's' : ''}`;
  } else if (minutesUntil <= 15) {
    body = `⏰ Tu evento "${event.title}" comienza en ${minutesUntil} minutos`;
  } else if (minutesUntil <= 30) {
    body = `📅 Recordatorio: "${event.title}" en ${minutesUntil} minutos`;
    requireInteraction = false;
  } else {
    body = `📅 Tienes un evento próximo: "${event.title}"`;
    requireInteraction = false;
  }

  if (event.location) {
    body += `\n📍 ${event.location}`;
  }

  return showNotification({
    title: minutesUntil <= 5 ? '🚨 EVENTO URGENTE' : '📅 Recordatorio de Evento',
    body,
    tag: `event-${event.id}`,
    requireInteraction,
    url: `/calendario?event=${event.id}`,
    vibrate: minutesUntil <= 5 
      ? [300, 100, 300, 100, 300, 100, 300] // 🔥 VIBRACIÓN INTENSA para eventos urgentes
      : [200, 100, 200]
  });
}

/**
 * Notificación para reunión iniciada
 * @param {Object} meeting - Datos de la reunión
 */
export function notifyMeetingStarted(meeting) {
  return showNotification({
    title: '🎙️ Reunión Lista',
    body: `La minuta de "${meeting.title}" está lista para revisar`,
    tag: `meeting-${meeting.id}`,
    requireInteraction: true,
    url: `/reuniones/${meeting.id}`,
    vibrate: [200, 100, 200]
  });
}

/**
 * Notificación para nuevo mensaje de Telegram
 * @param {Object} message - Datos del mensaje
 */
export function notifyTelegramMessage(message) {
  return showNotification({
    title: `💬 ${message.from_name || 'Nuevo mensaje'}`,
    body: message.text || 'Mensaje recibido',
    tag: `telegram-${message.chat_id}`,
    requireInteraction: false,
    url: '/telegram',
    vibrate: [100, 50, 100]
  });
}

/**
 * Notificación para nuevo correo importante
 * @param {Object} email - Datos del email
 */
export function notifyImportantEmail(email) {
  return showNotification({
    title: `📧 ${email.from_name || email.from_email}`,
    body: email.subject || 'Nuevo correo',
    tag: `email-${email.id}`,
    requireInteraction: false,
    url: '/correo',
    vibrate: [100, 50, 100]
  });
}

/**
 * Verificar estado de permisos sin solicitar
 * @returns {string} 'granted' | 'denied' | 'default'
 */
export function getNotificationPermission() {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Cancelar todas las notificaciones activas
 */
export function clearAllNotifications() {
  // Las notificaciones del API de Notification no se pueden limpiar programáticamente
  // pero podemos cerrar las que tengamos referencia
  console.log('ℹ️ Las notificaciones se cerrarán automáticamente');
}
