# CÓDIGO COMPLETO DEL MICRÓFONO - PARA DEBUGGING

## PROBLEMA
El botón de micrófono NO pide permisos y NO graba audio cuando se hace click.

## ARCHIVOS INVOLUCRADOS

### 1. ChatPage.jsx (Inicializa el hook)
**Ubicación:** `/Users/pg/Documents/CHAT AL-E/src/features/chat/pages/ChatPage.jsx`

```javascript
// Línea 30
const canUseVoice = useCapability('voice');

// Línea 60-75
const voiceMode = canUseVoice ? useVoiceMode({
  accessToken,                    // JWT token de Supabase (REQUERIDO)
  sessionId: currentConversation?.session_id || currentConversation?.id,
  workspaceId: 'core',
  onResponse: (responseText) => {
    console.log('✅ [Voice] Respuesta de AL-E:', responseText.substring(0, 100));
  },
  onError: (error) => {
    console.error('❌ [Voice] Error:', error);
    alert(`Error de voz: ${error.message}`);
  },
  handsFreeEnabled: handsFree
}) : null;
```

**PROBLEMA POTENCIAL:** Si `canUseVoice` es `false`, `voiceMode` será `null` y el botón no funcionará.

---

### 2. MessageThread.jsx (Renderiza el botón)
**Ubicación:** `/Users/pg/Documents/CHAT AL-E/src/features/chat/components/MessageThread.jsx`

```javascript
// Línea 118-145 - Selector de modo Voz/Texto
<button
  onClick={() => voiceMode.setMode(voiceMode.mode === 'text' ? 'voice' : 'text')}
  className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
    voiceMode.mode === 'voice'
      ? 'bg-gray-700 text-white border border-gray-600'
      : 'bg-transparent text-gray-400 hover:bg-gray-800 border border-gray-700'
  }`}
>
  {voiceMode.mode === 'voice' ? (
    <><Waves size={12} md:size={14} /> <span className="hidden sm:inline">Voz</span></>
  ) : (
    <><MessageSquare size={12} md:size={14} /> <span className="hidden sm:inline">Texto</span></>
  )}
</button>

// Línea 134-144 - Botón de micrófono (ESTE ES EL IMPORTANTE)
{voiceMode.mode === 'voice' && (
  <button
    onClick={voiceMode.isListening ? voiceMode.stopAll : voiceMode.startListening}
    className={`p-2 rounded-full transition-all ${
      voiceMode.isListening
        ? 'bg-red-600 text-white animate-pulse'
        : 'bg-gray-700 text-white hover:bg-gray-600 border border-gray-600'
    }`}
  >
    <Mic size={14} md:size={16} />
  </button>
)}

// Línea 146-162 - Botón Manos Libres
{voiceMode.mode === 'voice' && (
  <button
    onClick={onToggleHandsFree}
    className={`flex items-center gap-1.5 px-2 md:px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
      handsFree
        ? 'bg-blue-600 text-white border border-blue-500'
        : 'bg-transparent text-gray-400 hover:bg-gray-800 border border-gray-700'
    }`}
    title={handsFree ? 'Desactivar manos libres' : 'Activar manos libres'}
  >
    <Waves size={12} md:size={14} />
    <span className="hidden sm:inline">Manos Libres</span>
  </button>
)}
```

**PROBLEMA POTENCIAL:** 
- Si `voiceMode` es `null`, esto crashea
- Si `voiceMode.mode !== 'voice'`, el botón no se muestra

---

### 3. useVoiceMode.js (LÓGICA PRINCIPAL DEL MICRÓFONO)
**Ubicación:** `/Users/pg/Documents/CHAT AL-E/src/hooks/useVoiceMode.js`

```javascript
/**
 * startRecording - Función que se ejecuta al hacer click en el micrófono
 */
const startRecording = useCallback(async () => {
  if (isSending) {
    console.warn('⚠️ Ya hay un proceso en curso, esperando...');
    return;
  }

  if (!accessToken) {
    const err = new Error('No hay sesión activa');
    setError(err);
    onError?.(err);
    return;
  }

  try {
    console.log('🎤 [P0-2] Iniciando grabación...');
    
    // 🔥 SOLICITAR PERMISO DE MICRÓFONO
    console.log('🎤 [P0-2] Solicitando permisos de micrófono...');
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      } 
    });
    
    // VERIFICAR que el stream tiene audio tracks
    if (!stream || stream.getAudioTracks().length === 0) {
      throw new Error('No se pudo acceder al micrófono. Verifica permisos.');
    }
    
    console.log('✅ [P0-2] Permisos concedidos, tracks activos:', stream.getAudioTracks().length);
    streamRef.current = stream;

    // Determinar formato soportado
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : 'audio/mp4';

    const mediaRecorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = mediaRecorder;
    audioChunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        console.log(`📊 [P0-2] Chunk recibido: ${event.data.size} bytes`);
        audioChunksRef.current.push(event.data);
      } else {
        console.warn('⚠️ [P0-2] Chunk vacío recibido');
      }
    };

    mediaRecorder.onstop = async () => {
      console.log('🛑 [P0-2] Grabación detenida, procesando...');
      console.log(`📦 [P0-2] Total chunks: ${audioChunksRef.current.length}`);
      
      // Detener stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      const bytesGrabados = audioBlob.size;
      console.log(`🎵 [P0-2] Blob creado: ${bytesGrabados} bytes, tipo: ${audioBlob.type}`);
      
      audioChunksRef.current = [];

      // SI BYTES = 0, NO MANDAR REQUEST
      if (bytesGrabados === 0) {
        const errorMsg = `⚠️ [P0-2] NO SE GRABÓ AUDIO (bytes: 0)`;
        console.error(errorMsg);
        setStatus('idle');
        setError(new Error('No se capturó audio'));
        onError?.(new Error('No se capturó audio (0 bytes). Verifica que tu micrófono esté funcionando y habla más tiempo.'));
        return;
      }

      console.log(`✅ [P0-2] Audio válido: ${bytesGrabados} bytes - Enviando al backend...`);
      await sendAudioToBackend(audioBlob);
    };

    // INICIAR GRABACIÓN
    mediaRecorder.start();
    setStatus('recording');
    console.log('✅ [P0-2] MediaRecorder iniciado');

  } catch (error) {
    console.error('❌ [P0-2] Error iniciando grabación:', error);
    setStatus('idle');
    setError(error);
    onError?.(error);
  }
}, [accessToken, isSending, onError]);
```

---

### 4. CapabilitiesContext.jsx (CONTROLA SI VOZ ESTÁ HABILITADA)
**Ubicación:** `/Users/pg/Documents/CHAT AL-E/src/contexts/CapabilitiesContext.jsx`

```javascript
// Línea 88-95 - Si hay error cargando capabilities
setCapabilities({
  chat: true,
  voice: true,  // ✅ VOZ HABILITADA POR DEFAULT
  integrations: false,
  collaboration: false,
  actions: false,
  memory: true,
  'mail.send': false,
  'calendar.create': false,
  'calendar.list': false
});
```

---

## PASOS PARA DEBUGGEAR

### 1. Abrir Console en navegador
- F12 → Console

### 2. Verificar que voiceMode NO es null
```javascript
// En console, escribe:
console.log('voiceMode:', voiceMode);
```
**Esperado:** Debe mostrar un objeto con `{mode: 'text', status: 'idle', startListening: function, ...}`
**Si es null:** El problema está en `canUseVoice = false`

### 3. Verificar capabilities
```javascript
// En console:
localStorage.getItem('capabilities')
```
**Esperado:** Debe incluir `"voice":true`

### 4. Forzar modo voz manualmente
```javascript
// En console:
voiceMode.setMode('voice')
```
**Esperado:** Debe mostrar el botón de micrófono

### 5. Click en micrófono y ver console
**Esperado:**
```
🎤 [P0-2] Iniciando grabación...
🎤 [P0-2] Solicitando permisos de micrófono...
[Popup de permisos aparece]
✅ [P0-2] Permisos concedidos, tracks activos: 1
✅ [P0-2] MediaRecorder iniciado
```

**Si no sale NADA:** La función `startListening` NO se está ejecutando

---

## POSIBLES CAUSAS

### ❌ Causa 1: voiceMode es null
**Fix:** Ejecutar SQL para capabilities o forzar en código

### ❌ Causa 2: Botón no visible porque mode='text'
**Fix:** Click en botón "Voz" primero, luego click en micrófono

### ❌ Causa 3: onClick no se ejecuta
**Fix:** Verificar que voiceMode.startListening existe

### ❌ Causa 4: Permisos bloqueados en navegador
**Fix:** Chrome → Settings → Privacy → Site Settings → Micrófono → Permitir

---

## COMANDO PARA VER ERRORES EN VIVO
```bash
# En terminal:
cd "/Users/pg/Documents/CHAT AL-E"
npm run dev

# Luego en navegador:
# http://localhost:3000/chat
# F12 → Console
# Click en botón Voz
# Click en botón Micrófono
# Ver qué dice la console
```

---

## ARCHIVOS COMPLETOS PARA REVISAR

1. **src/features/chat/pages/ChatPage.jsx** - Inicializa voiceMode
2. **src/features/chat/components/MessageThread.jsx** - Renderiza botones
3. **src/hooks/useVoiceMode.js** - Lógica del micrófono
4. **src/contexts/CapabilitiesContext.jsx** - Capabilities gate

---

## SI NADA FUNCIONA: OVERRIDE TEMPORAL

En `src/features/chat/pages/ChatPage.jsx` línea 30:

```javascript
// FORZAR VOZ SIEMPRE HABILITADA (temporal)
const canUseVoice = true; // useCapability('voice');
```

Esto elimina el capability gate y fuerza que voiceMode siempre se cree.
