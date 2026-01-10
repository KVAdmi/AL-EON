# 🔍 DIAGNÓSTICO SISTEMA DE VOZ - AL-EON

## PROBLEMA IDENTIFICADO

El hook `useVoiceMode` está configurado con parámetros **incorrectos** en `ChatPage.jsx`:

### ❌ CÓDIGO ACTUAL (INCORRECTO):
```jsx
const voiceMode = canUseVoice ? useVoiceMode({
  onMessage: async (text, meta) => { // ← PARÁMETRO INCORRECTO
    if (!currentConversation) {
      createConversation();
    }
    const response = await sendMessage(text, null, meta);
    return response;
  },
  language: 'es-MX', // ← NO EXISTE EN EL HOOK
  handsFreeEnabled: handsFree
}) : null;
```

### ✅ FIRMA CORRECTA DEL HOOK:
```javascript
export function useVoiceMode({
  accessToken, // ← REQUERIDO - JWT token de Supabase
  sessionId,   // ← REQUERIDO - ID de sesión
  workspaceId = 'core',
  onResponse,  // ← Callback con respuesta de AL-E: (text) => void
  onError,     // ← Callback de error
  handsFreeEnabled = false
} = {})
```

---

## ✅ SOLUCIÓN REQUERIDA

### PASO 1: Actualizar ChatPage.jsx

```jsx
const voiceMode = canUseVoice ? useVoiceMode({
  accessToken,                    // ✅ JWT token de Supabase
  sessionId: currentConversation?.session_id || currentConversation?.id, // ✅ ID de sesión
  workspaceId: 'core',           // ✅ Workspace ID
  onResponse: (responseText) => { // ✅ Callback correcto
    // La respuesta ya se agregó por el backend, solo actualizar UI
    console.log('✅ [Voice] Respuesta recibida:', responseText);
  },
  onError: (error) => {           // ✅ Manejo de errores
    console.error('❌ [Voice] Error:', error);
    alert(`Error de voz: ${error.message}`);
  },
  handsFreeEnabled: handsFree     // ✅ Modo manos libres
}) : null;
```

---

## PASO 2: Verificar que currentConversation.session_id existe

El backend de AL-E Core requiere `sessionId` para el chat. Necesitamos verificar que:

1. ✅ `currentConversation.session_id` existe
2. ✅ Si no existe, crear uno al crear la conversación

---

## PASO 3: Probar flujo end-to-end

1. Click en "Modo Voz Manos Libres"
2. Click en "Grabar"
3. Hablar al micrófono
4. Verificar en consola:
   - `✅ Grabación iniciada`
   - `📤 Enviando audio a /api/voice/stt...`
   - `✅ STT: "texto transcrito"`
   - `💬 Enviando mensaje al chat...`
   - `✅ Respuesta: "..."`
   - `🔊 Solicitando audio con /api/voice/tts...`
   - `🎵 Reproduciendo respuesta...`
   - `✅ Audio reproducido completamente`

---

## CHECKLIST DE VERIFICACIÓN

### Frontend:
- [ ] `accessToken` se pasa correctamente
- [ ] `sessionId` existe y es válido
- [ ] `onResponse` callback definido
- [ ] `onError` callback definido
- [ ] Permisos de micrófono solicitados
- [ ] MediaRecorder captura audio (size > 0)
- [ ] Audio se envía a `/api/voice/stt`
- [ ] Respuesta de TTS se reproduce con `new Audio()`

### Backend:
- [ ] `/api/voice/stt` responde con `{ text: "..." }`
- [ ] `/api/ai/chat` responde con `{ response: "..." }`
- [ ] `/api/voice/tts` responde con blob de audio MP3
- [ ] Logs muestran audio recibido y procesado

---

## CRITERIO DE ÉXITO

✅ **LISTO cuando**:
1. Usuario habla al micrófono
2. Consola muestra: `✅ STT: "texto transcrito"`
3. AL-E responde con texto
4. Consola muestra: `✅ Respuesta: "..."`
5. Usuario **ESCUCHA** la voz de AL-E
6. En modo manos libres, el ciclo se repite automáticamente

---

## PRÓXIMO PASO

**APLICAR FIX EN `ChatPage.jsx`**
