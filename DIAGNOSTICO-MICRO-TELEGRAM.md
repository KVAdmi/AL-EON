# 🚨 DIAGNÓSTICO: Micrófono + Telegram

## ❌ PROBLEMAS REPORTADOS

### 1. Micrófono NO funciona
**Usuario**: "no sirve el micro! no me escucha!!! ni para hablar con ella en manos libres ni para las reiniones que debe escuchar y transcribir y analizar"

**Áreas afectadas**:
- Modo voz en chat (botón micrófono en Sidebar)
- Reuniones en vivo (MeetingsPage - grabación y transcripción)

### 2. Telegram mensajes NO se ven
**Usuario**: "no se ve telegram y se supone ya se deberian ver los mensajes del bot"

---

## 🔍 ANÁLISIS TÉCNICO

### MICRÓFONO - Modo Voz Chat

**Archivo**: `src/features/chat/hooks/useVoiceMode.js`
**Líneas críticas**: 122-150

```javascript
const startListening = async () => {
  try {
    // Solicitar permiso del micrófono explícitamente
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Detener el stream inmediatamente (solo queríamos el permiso)
    stream.getTracks().forEach(track => track.stop());
    
    // Activar el flag para reinicio automático
    shouldContinueRef.current = true;
    
    // Iniciar reconocimiento
    if (recognitionRef.current) {
      setTranscript('');
      recognitionRef.current.start();
      
      toast({
        title: '🎤 Modo voz activado',
        description: 'Habla claramente cerca del micrófono',
      });
    }
  } catch (error) {
    console.error('Error solicitando permiso de micrófono:', error);
    // ...
  }
};
```

**DIAGNÓSTICO**:
✅ Código correcto - solicita permiso explícitamente
✅ Web Speech API configurada correctamente (línea 27-30)
⚠️ **POSIBLE PROBLEMA**: 
  - El usuario puede haber DENEGADO el permiso previamente
  - Navegador bloqueando permisos (Safari/Chrome en modo incógnito)
  - Micrófono no detectado por el navegador

**SOLUCIÓN**: Agregar verificación de permisos ANTES de intentar acceder

---

### MICRÓFONO - Reuniones en Vivo

**Archivo**: `src/pages/MeetingsPage.jsx`
**Líneas críticas**: 129-130

```javascript
async function handleStartLive() {
  try {
    // Solicitar permiso de micrófono
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioStreamRef.current = stream;
    
    // Configurar MediaRecorder
    const recorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    });
    // ...
  }
}
```

**DIAGNÓSTICO**:
✅ Código correcto - solicita audio
⚠️ **POSIBLE PROBLEMA**:
  - MIME type 'audio/webm;codecs=opus' NO soportado en Safari
  - Safari requiere 'audio/mp4' o dejar vacío para auto-detectar
  - Permisos denegados

**SOLUCIÓN**: Detección de soporte + fallback MIME types

---

### TELEGRAM - Mensajes no se ven

**Archivo**: `src/services/telegramService.js`
**Línea**: 401-445

```javascript
export async function getMessages(chatId, options = {}) {
  try {
    console.log('[TelegramService] 📬 getMessages - chatId:', chatId, 'options:', options);
    
    const token = await getAuthToken();
    console.log('[TelegramService] Token obtenido:', token ? '✅' : '❌');
    
    const params = new URLSearchParams({
      chatId,
      ...options,
    });

    const url = `${BACKEND_URL}/api/telegram/messages?${params}`;
    console.log('[TelegramService] Fetching:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
    });

    console.log('[TelegramService] Response status:', response.status);
    // ...
  }
}
```

**DIAGNÓSTICO**:
✅ Servicio correcto con logs detallados
✅ JWT token incluido
⚠️ **POSIBLES PROBLEMAS**:
  1. Backend devuelve array vacío `[]` - no hay mensajes en BD
  2. Backend devuelve 401 - token inválido/expirado
  3. Chat seleccionado tiene `chat.id` (UUID) pero debería enviar `chat.chatId` (Telegram chat ID numérico)
  4. RLS policies bloqueando acceso a `telegram_messages`

**FLUJO DE DATOS**:
```
TelegramPage → selectedBot (bot.id)
  ↓
loadChats(user.id, bot.id) → chats[]
  ↓
TelegramInbox → selectedChat (chat.id, chat.chatId)
  ↓
TelegramChat → getMessages(chat.id) ❌ ← AQUÍ ESTÁ EL ERROR
```

**ERROR ENCONTRADO**: 
`TelegramChat` recibe `chatId` prop, pero este viene de `selectedChat.id` (UUID de BD), cuando debería usar `chat.chatId` (ID numérico de Telegram).

**Archivo**: `src/features/telegram/components/TelegramInbox.jsx`
**Línea**: 120

```jsx
<TelegramChat
  chatId={selectedChat.id}  // ❌ UUID de BD
  // DEBERÍA SER:
  // chatId={selectedChat.chatId}  // ✅ Telegram chat ID
  chatName={selectedChat.name || selectedChat.username}
  botId={botId}
  onMessageSent={onChatsUpdated}
/>
```

---

## 🛠️ SOLUCIONES

### FIX 1: Micrófono - Verificar permisos antes de usar

**Archivo**: `src/features/chat/hooks/useVoiceMode.js`

```javascript
const startListening = async () => {
  if (!isSupported) {
    toast({
      variant: 'destructive',
      title: 'No soportado',
      description: 'Tu navegador no soporta reconocimiento de voz. Usa Chrome, Edge o Safari.',
    });
    return;
  }

  try {
    // 🆕 VERIFICAR PERMISO ACTUAL
    const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
    console.log('🎤 Permiso de micrófono:', permissionStatus.state);

    if (permissionStatus.state === 'denied') {
      toast({
        variant: 'destructive',
        title: 'Permiso denegado',
        description: 'Ve a Configuración del navegador → Privacidad → Micrófono y permite el acceso a este sitio.',
        duration: 8000,
      });
      return;
    }

    // Solicitar permiso del micrófono explícitamente
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log('✅ Micrófono accedido correctamente');
    
    // Detener el stream inmediatamente (solo queríamos el permiso)
    stream.getTracks().forEach(track => track.stop());
    
    // Activar el flag para reinicio automático
    shouldContinueRef.current = true;
    
    // Iniciar reconocimiento
    if (recognitionRef.current) {
      setTranscript('');
      recognitionRef.current.start();
      
      toast({
        title: '🎤 Modo voz activado',
        description: 'Habla claramente cerca del micrófono',
      });
    }
  } catch (error) {
    console.error('❌ Error solicitando permiso de micrófono:', error);
    
    let errorMessage = 'No se pudo acceder al micrófono';
    
    if (error.name === 'NotAllowedError') {
      errorMessage = 'Permiso denegado. Por favor permite el acceso al micrófono en la configuración de tu navegador.';
    } else if (error.name === 'NotFoundError') {
      errorMessage = 'No se encontró ningún micrófono. Verifica que esté conectado.';
    } else if (error.name === 'NotReadableError') {
      errorMessage = 'El micrófono está siendo usado por otra aplicación. Cierra otras apps que puedan estar usándolo.';
    }
    
    toast({
      variant: 'destructive',
      title: 'Error de micrófono',
      description: errorMessage,
      duration: 8000,
    });
  }
};
```

---

### FIX 2: Reuniones - Detectar soporte MIME type

**Archivo**: `src/pages/MeetingsPage.jsx`

```javascript
async function handleStartLive() {
  let stream = null;
  
  try {
    // 🆕 VERIFICAR PERMISO ANTES
    try {
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
      console.log('[Meetings] Permiso de micrófono:', permissionStatus.state);

      if (permissionStatus.state === 'denied') {
        alert('❌ Permiso de micrófono denegado. Ve a Configuración del navegador y permite el acceso al micrófono.');
        return;
      }
    } catch (e) {
      console.warn('[Meetings] No se pudo verificar permiso:', e);
    }

    // Solicitar permiso de micrófono
    console.log('[Meetings] Solicitando acceso al micrófono...');
    stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      } 
    });
    console.log('[Meetings] ✅ Micrófono accedido correctamente');
    audioStreamRef.current = stream;

    const title = prompt(
      'Nombre de la reunión:',
      `Reunión ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
    );
    if (!title) {
      stream.getTracks().forEach(track => track.stop());
      return;
    }

    // Crear reunión
    console.log('[Meetings] Iniciando reunión en backend...');
    const meeting = await startLiveMeeting(title);
    console.log('[Meetings] ✅ Reunión creada:', meeting);
    setCurrentMeetingId(meeting.id);
    
    // 🆕 DETECTAR MIME TYPE SOPORTADO
    let mimeType = 'audio/webm;codecs=opus'; // Default Chrome/Edge
    
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      console.warn('[Meetings] ⚠️ audio/webm NO soportado, intentando audio/mp4...');
      mimeType = 'audio/mp4';
      
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        console.warn('[Meetings] ⚠️ audio/mp4 NO soportado, usando default del navegador');
        mimeType = ''; // Dejar que el navegador elija
      }
    }
    
    console.log('[Meetings] MIME type seleccionado:', mimeType || 'auto');
    
    // Configurar MediaRecorder
    const recorderOptions = mimeType ? { mimeType } : {};
    const recorder = new MediaRecorder(stream, recorderOptions);
    console.log('[Meetings] MediaRecorder creado con opciones:', recorderOptions);
    
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = async (e) => {
      if (!e.data || e.data.size === 0) return;
      if (isPaused) return;
      
      try {
        await sendLiveChunk(meeting.id, e.data);
        console.log('✅ Chunk enviado');
      } catch (error) {
        console.error('❌ Error enviando chunk:', error);
      }
    };

    recorder.start(15000); // Chunk cada 15 segundos
    setIsRecording(true);
    setRecordingTime(0);
    
    // Agregar a la lista
    setMeetings(prev => [meeting, ...prev]);
    
    alert('⚠️ Esta sesión está grabando audio para transcripción. Asegúrate de tener consentimiento.');
  } catch (error) {
    console.error('❌ Error iniciando grabación:', error);
    
    // Detener stream si se obtuvo pero falló después
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    
    let errorMessage = 'No se pudo iniciar la grabación';
    
    if (error.name === 'NotAllowedError') {
      errorMessage = 'Permiso de micrófono denegado. Ve a Configuración del navegador y permite el acceso.';
    } else if (error.name === 'NotFoundError') {
      errorMessage = 'No se encontró micrófono. Verifica que esté conectado.';
    } else if (error.name === 'NotReadableError') {
      errorMessage = 'El micrófono está siendo usado por otra aplicación.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    alert(`❌ ${errorMessage}`);
  }
}
```

---

### FIX 3: Telegram - Usar chatId correcto

**Archivo**: `src/features/telegram/components/TelegramInbox.jsx`
**Línea**: 120

CAMBIAR:
```jsx
<TelegramChat
  chatId={selectedChat.id}  // ❌ UUID de BD
  chatName={selectedChat.name || selectedChat.username}
  botId={botId}
  onMessageSent={onChatsUpdated}
/>
```

POR:
```jsx
<TelegramChat
  chatId={selectedChat.chatId}  // ✅ Telegram chat ID numérico
  chatName={selectedChat.name || selectedChat.username}
  botId={botId}
  onMessageSent={onChatsUpdated}
/>
```

**EXPLICACIÓN**:
- `selectedChat.id`: UUID de la tabla `telegram_chats` en Supabase (ej: "550e8400-e29b-41d4-a716-446655440000")
- `selectedChat.chatId`: ID numérico de Telegram (ej: 123456789)
- Backend espera el `chatId` de Telegram, NO el UUID de BD

---

## 📋 CHECKLIST DE APLICACIÓN

### Paso 1: Fix Micrófono Modo Voz
- [ ] Aplicar cambios en `src/features/chat/hooks/useVoiceMode.js`
- [ ] Verificar permisos con `navigator.permissions.query()`
- [ ] Mejorar mensajes de error con duración más larga

### Paso 2: Fix Micrófono Reuniones
- [ ] Aplicar cambios en `src/pages/MeetingsPage.jsx`
- [ ] Detectar soporte de MIME types
- [ ] Agregar verificación de permisos previa

### Paso 3: Fix Telegram Mensajes
- [ ] Cambiar `chatId={selectedChat.id}` a `chatId={selectedChat.chatId}` en TelegramInbox.jsx
- [ ] Verificar que `getChats()` devuelva el campo `chatId` mapeado correctamente

### Paso 4: Testing
- [ ] Probar modo voz en navegador con micrófono permitido
- [ ] Probar modo voz con micrófono denegado (verificar mensaje de error)
- [ ] Probar inicio de reunión (verificar que MediaRecorder se inicie)
- [ ] Probar Telegram (verificar que mensajes se carguen con logs)

---

## 🎯 RESULTADO ESPERADO

1. **Modo Voz**: 
   - Si permiso denegado → mensaje claro con instrucciones
   - Si permiso otorgado → microfono funciona con Web Speech API

2. **Reuniones**:
   - Detecta MIME type correcto para el navegador
   - MediaRecorder se inicia sin errores
   - Chunks se envían cada 15s

3. **Telegram**:
   - Mensajes se cargan con el `chatId` correcto
   - Logs muestran cantidad de mensajes recibidos
   - Chat funciona correctamente

