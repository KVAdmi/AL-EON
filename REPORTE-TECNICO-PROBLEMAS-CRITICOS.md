# REPORTE TÉCNICO: PROBLEMAS CRÍTICOS NO RESUELTOS
## Sistema AL-EON - Frontend React

**Fecha**: 21 de enero de 2026  
**Periodo de trabajo**: 3 semanas  
**Estado**: BLOQUEADO - Requiere intervención de equipo senior  

---

## RESUMEN EJECUTIVO

Después de 3 semanas de trabajo continuo, el sistema AL-EON presenta **4 problemas críticos no resueltos** que bloquean funcionalidades esenciales del producto. A pesar de múltiples intentos de corrección (6 commits, 8+ archivos modificados, 5 estrategias diferentes), los errores persisten en producción.

### Estado de funcionalidades:
- ❌ **Modo voz (micrófono)**: Error de inicialización persistente
- ❌ **Integración Telegram**: Bot no se conecta desde frontend
- ❌ **Chat del bot Telegram**: No se visualizan conversaciones
- ❌ **Grabación de reuniones**: Micrófono no funciona

---

## PROBLEMA 1: ERROR DE MODO VOZ - "Cannot access 'ce' before initialization"

### Descripción del problema
Al activar el modo de voz en `/chat`, aparece inmediatamente un banner rojo con el error:
```
"Cannot access 'ce' before initialization"
```

### Causa raíz identificada
**Minificación de Vite en producción** convierte nombres de variables, causando errores de referencia antes de inicialización (TDZ - Temporal Dead Zone):

```javascript
// Código original (desarrollo):
const startRecording = useCallback(async () => { ... });
const sendAudioToBackend = useCallback(async (audioBlob) => { ... });

// Código minificado (producción):
const ce = useCallback(async () => { ... });  // startRecording
const de = useCallback(async (audioBlob) => { ... });  // sendAudioToBackend

// Error ocurre aquí:
startRecordingRef.current?.();  // Intenta acceder a 'ce' antes de que se inicialice
```

### Archivo afectado
**`src/hooks/useVoiceMode.js`** (594 líneas)

#### Fragmento problemático (líneas 58-59):
```javascript
const sendAudioToBackendRef = useRef(null);
const startRecordingRef = useRef(null); // Ref para evitar ciclo de dependencias
```

#### Fragmento problemático (líneas 122-280):
```javascript
const startRecording = useCallback(async () => {
  console.log('[🎙️] startRecording iniciando...');
  
  if (isRecordingRef.current) {
    console.warn('[🎙️] Ya está grabando, ignorando...');
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 16000
      } 
    });
    
    streamRef.current = stream;
    audioChunksRef.current = [];

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    });
    
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      console.log('[🎙️] MediaRecorder stopped, procesando audio...');
      
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      audioChunksRef.current = [];

      if (audioBlob.size > 0) {
        // 🔥 AQUÍ OCURRE EL ERROR EN PRODUCCIÓN
        const sendFn = sendAudioToBackendRef.current;
        if (sendFn) {
          await sendFn(audioBlob);
        }
      }
    };

    mediaRecorder.start();
    isRecordingRef.current = true;
    
  } catch (error) {
    console.error('[🎙️] Error al iniciar grabación:', error);
    if (onError) {
      onError('No se pudo acceder al micrófono. Por favor, verifica los permisos.');
    }
  }
}, [onError]);  // ⚠️ Dependencias limitadas para evitar ciclos
```

#### Fragmento problemático (líneas 283-498):
```javascript
const sendAudioToBackend = useCallback(async (audioBlob) => {
  console.log('[📤] sendAudioToBackend iniciando...', audioBlob.size, 'bytes');

  try {
    setIsProcessingAI(true);

    // 1️⃣ STT - Speech to Text
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    
    const sttResponse = await fetch(`${BACKEND_URL}/api/voice/stt`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` },
      body: formData
    });

    if (!sttResponse.ok) {
      throw new Error('Error en transcripción de voz');
    }

    const sttData = await sttResponse.json();
    const userText = sttData.text || sttData.transcription;

    // 2️⃣ Chat - Enviar al modelo de IA
    const chatBody = {
      message: userText,
      sessionId: sessionId || 'default-session',
      workspaceId: workspaceId || 'default-workspace',
      mode: mode || 'chat',
      voice: true,  // 🎯 Flag para indicar que viene de voz
      gender: ttsGender || 'female'  // 🎯 Género de la voz TTS
    };

    const chatResponse = await fetch(`${BACKEND_URL}/api/ai/chat/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(chatBody)
    });

    if (!chatResponse.ok) {
      throw new Error('Error al procesar mensaje');
    }

    const chatData = await chatResponse.json();
    const aiText = chatData.response || chatData.message;

    // 3️⃣ TTS - Text to Speech
    const ttsResponse = await fetch(`${BACKEND_URL}/api/voice/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        text: aiText,
        gender: ttsGender || 'female'
      })
    });

    if (!ttsResponse.ok) {
      throw new Error('Error al sintetizar voz');
    }

    const audioArrayBuffer = await ttsResponse.arrayBuffer();
    const audioBlob = new Blob([audioArrayBuffer], { type: 'audio/mpeg' });

    // 4️⃣ Reproducir audio
    await playAudio(audioBlob);

    // 5️⃣ Si está en modo manos libres, reiniciar grabación
    if (isHandsFreeRef.current) {
      console.log('[🔄] Modo manos libres activo, reiniciando grabación...');
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (isHandsFreeRef.current) {
        // 🔥 AQUÍ TAMBIÉN OCURRE EL ERROR
        startRecordingRef.current?.();
      }
    }

    if (onResponse) {
      onResponse({ userText, aiText, audioBlob });
    }

  } catch (error) {
    console.error('[📤] Error en sendAudioToBackend:', error);
    if (onError) {
      onError(error.message || 'Error al procesar audio');
    }
  } finally {
    setIsProcessingAI(false);
  }
}, [accessToken, sessionId, workspaceId, mode, ttsGender, onResponse, onError]);
```

#### Fragmento de los useEffect (líneas 503-510):
```javascript
// Mantener una referencia estable para usarla desde callbacks nativos (MediaRecorder)
useEffect(() => {
  sendAudioToBackendRef.current = sendAudioToBackend;
}, [sendAudioToBackend]);

// 🔥 NUEVO: Mantener referencia de startRecording para evitar ciclos
useEffect(() => {
  startRecordingRef.current = startRecording;
}, [startRecording]);
```

### Intentos de solución realizados

#### Intento 1 (Commit `08300c5`): Eliminar función problemática
```javascript
// ANTES:
const checkMicrophonePermission = async () => { ... };

// DESPUÉS:
// Función eliminada, lógica movida a startRecording
```
**Resultado**: ❌ Error persistió

#### Intento 2 (Commit `62f5d2b`): Usar refs para romper ciclo
```javascript
// Crear refs
const sendAudioToBackendRef = useRef(null);
const startRecordingRef = useRef(null);

// Usar refs en lugar de funciones directas
sendAudioToBackendRef.current?.(audioBlob);
startRecordingRef.current?.();
```
**Resultado**: ❌ Error persistió

#### Intento 3: Remover de dependencias
```javascript
// ANTES:
}, [onError, sendAudioToBackend]);  // ← Ciclo circular

// DESPUÉS:
}, [onError]);  // ← Solo dependencias esenciales
```
**Resultado**: ❌ Error persistió

#### Intento 4: Usar refs actualizados
```javascript
useEffect(() => {
  sendAudioToBackendRef.current = sendAudioToBackend;
}, [sendAudioToBackend]);
```
**Resultado**: ❌ Error persistió

#### Intento 5 (Commit `b67f2fe`): Agregar segundo useEffect
```javascript
useEffect(() => {
  startRecordingRef.current = startRecording;
}, [startRecording]);
```
**Resultado**: ❌ Error persistió

### Por qué fallan todas las soluciones

El problema fundamental es que **Vite minifica el código de forma agresiva** y:

1. Las funciones `useCallback` se crean en orden específico
2. La minificación cambia los nombres de variables (`startRecording` → `ce`)
3. Los refs intentan acceder a estas variables antes de que se asignen
4. React no garantiza el orden de inicialización de hooks en producción minificada

### Soluciones NO intentadas (requieren conocimiento avanzado)

#### Opción A: Source maps en producción
```javascript
// vite.config.js
export default defineConfig({
  build: {
    sourcemap: true,  // Ver errores reales, no minificados
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
})
```
**Riesgo**: Expone código fuente en producción

#### Opción B: Reestructurar completamente el hook
- Separar en hooks más pequeños
- Usar Context API en lugar de refs
- Eliminar todas las dependencias circulares
- Convertir en máquina de estados (XState o Zustand)

**Estimación**: 8-16 horas de desarrollo + testing

#### Opción C: Usar biblioteca de terceros
Reemplazar `useVoiceMode.js` con:
- `react-speech-recognition`
- `web-speech-api`
- `@speechly/react-client`

**Estimación**: 4-8 horas de integración

---

## PROBLEMA 2: TELEGRAM BOT NO SE CONECTA

### Descripción del problema
El bot de Telegram ya está configurado en Supabase (tabla `telegram_accounts`), pero el frontend no logra:
1. Obtener la información del bot desde la base de datos
2. Mostrar el nombre del bot en `TelegramSettingsPage.jsx`
3. Permitir conexión desde la interfaz

### Archivo afectado
**`src/pages/TelegramSettingsPage.jsx`**

#### Fragmento problemático (líneas 1-50):
```javascript
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Send, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function TelegramSettingsPage() {
  const { user, accessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [telegramAccount, setTelegramAccount] = useState(null);
  const [botInfo, setBotInfo] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);

  // Cargar información del bot y cuenta de Telegram
  useEffect(() => {
    if (user) {
      loadBotInfo();
      loadTelegramAccount();
    }
  }, [user]);

  const loadBotInfo = async () => {
    try {
      // 🔥 PROBLEMA: No existe endpoint /api/telegram/bot-info
      const response = await fetch('https://api.al-eon.com/api/telegram/bot-info', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBotInfo(data);
      }
    } catch (error) {
      console.error('Error al cargar info del bot:', error);
      // Falback: usar nombre hardcodeado
      setBotInfo({
        username: 'al_eon_bot',  // ⚠️ Nombre quemado en código
        name: 'AL-E Assistant'
      });
    }
  };

  const loadTelegramAccount = async () => {
    try {
      // 🔥 PROBLEMA: Query directa a Supabase sin verificar RLS
      const { data, error } = await supabase
        .from('telegram_accounts')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error al cargar cuenta de Telegram:', error);
        setTelegramAccount(null);
      } else {
        setTelegramAccount(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };
```

#### Fragmento del botón de enlace (líneas 273-295):
```javascript
{/* Botón para abrir Telegram directamente */}
{botInfo?.username && (
  <a
    href={`https://t.me/${botInfo.username}`}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
    style={{
      backgroundColor: 'var(--color-accent)',
      color: 'var(--color-text-button)'
    }}
  >
    <Send className="w-4 h-4" />
    Abrir @{botInfo.username} en Telegram
  </a>
)}
```

### Problemas identificados

1. **Endpoint inexistente**: `/api/telegram/bot-info` no existe en el backend
2. **Hardcoded fallback**: Nombre del bot está quemado (`al_eon_bot`)
3. **RLS no verificado**: No sabemos si las políticas permiten leer `telegram_accounts`
4. **Sin manejo de errores**: Si Supabase falla, no se muestra mensaje al usuario

### Solución esperada (NO implementada)

```javascript
const loadBotInfo = async () => {
  try {
    // Opción 1: Crear endpoint en backend
    const response = await fetch('https://api.al-eon.com/api/telegram/bot-info', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    // Opción 2: Leer directamente de Supabase
    const { data, error } = await supabase
      .from('telegram_bots')  // ← Tabla que debería existir
      .select('username, name')
      .single();
    
    if (data) {
      setBotInfo(data);
    }
  } catch (error) {
    setError('No se pudo cargar la información del bot');
  }
};
```

---

## PROBLEMA 3: NO SE VISUALIZAN CHATS DEL BOT

### Descripción del problema
Aunque el bot de Telegram procesa mensajes en el backend, el frontend no muestra:
1. Historial de conversaciones con el bot
2. Mensajes recibidos/enviados
3. Estado de sincronización

### Archivos relacionados (NO implementados correctamente)

**`src/pages/TelegramSettingsPage.jsx`**: Solo muestra configuración, no conversaciones
**`src/features/chat/`**: No tiene integración con mensajes de Telegram

### Fragmento donde debería estar (NO EXISTE):
```javascript
// ❌ ESTE CÓDIGO NO EXISTE EN EL PROYECTO

import TelegramChatViewer from '@/features/telegram/TelegramChatViewer';

// Debería mostrar:
// - Lista de conversaciones
// - Mensajes por conversación
// - Timestamps
// - Estado de entrega

<TelegramChatViewer userId={user.id} />
```

### Consulta a base de datos que debería funcionar:
```sql
-- Verificar mensajes de Telegram en Supabase
SELECT 
  tm.id,
  tm.message_text,
  tm.from_user,
  tm.created_at,
  ta.telegram_chat_id,
  ta.telegram_username
FROM telegram_messages tm
JOIN telegram_accounts ta ON tm.telegram_account_id = ta.id
WHERE ta.user_id = '{user_id}'
ORDER BY tm.created_at DESC;
```

### Por qué no funciona
1. **No hay componente** que muestre los mensajes
2. **No hay queries** al backend o Supabase para obtener mensajes
3. **No hay endpoints** documentados para obtener historial de Telegram
4. **No hay diseño UI** para visualización de chats

---

## PROBLEMA 4: MICRÓFONO DE REUNIONES NO FUNCIONA

### Descripción del problema
En la página `/reuniones`, el botón "🎙️ Grabar Reunión" no activa el micrófono correctamente.

### Archivo afectado
**`src/features/meetings/components/MeetingsRecorderLive.jsx`**

#### Fragmento problemático (asumido, similar a useVoiceMode):
```javascript
// ⚠️ Probablemente tiene el mismo error de inicialización

const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // ... configuración de MediaRecorder
  } catch (error) {
    // 🔥 Error no se maneja correctamente
    console.error('Error al acceder al micrófono:', error);
  }
};
```

### Relación con Problema 1
Es muy probable que este problema tenga la **misma causa raíz** que el modo voz:
- Minificación de Vite
- Refs no inicializados
- Dependencias circulares

---

## ANÁLISIS DE IMPACTO

### Funcionalidades bloqueadas
| Funcionalidad | Estado | Usuarios afectados | Criticidad |
|---------------|--------|-------------------|------------|
| Modo voz en chat | ❌ No funciona | 100% | CRÍTICA |
| Conexión Telegram | ❌ No funciona | 100% | ALTA |
| Visualización chats bot | ❌ No existe | 100% | ALTA |
| Grabación reuniones | ❌ No funciona | 100% | MEDIA |

### Tiempo invertido sin resultados
- **3 semanas** de trabajo continuo
- **6 commits** realizados
- **8+ archivos** modificados
- **5 estrategias** diferentes intentadas
- **0 problemas resueltos**

---

## RECOMENDACIONES PARA DIRECCIÓN TÉCNICA

### Acción inmediata requerida

1. **Asignar desarrollador senior React/Vite**
   - Experiencia en hooks avanzados
   - Conocimiento de build optimization
   - Familiaridad con debugging en producción

2. **Implementar source maps temporalmente**
   - Permite ver errores reales en producción
   - Identificar línea exacta del problema
   - Costo: Expone código fuente (mitigable con obfuscación adicional)

3. **Reestructurar `useVoiceMode.js`**
   - Separar en hooks más pequeños (8-16 horas)
   - Eliminar dependencias circulares
   - Implementar máquina de estados
   - Testing exhaustivo en dev y producción

4. **Implementar funcionalidades faltantes de Telegram**
   - Crear endpoint `/api/telegram/bot-info` (2 horas)
   - Desarrollar componente `TelegramChatViewer` (8 horas)
   - Configurar RLS policies correctamente (1 hora)
   - Testing de integración (4 horas)

### Estimación de tiempo para resolución

| Problema | Solución | Tiempo estimado | Riesgo |
|----------|----------|-----------------|--------|
| Modo voz | Reestructurar hook | 16-24 horas | ALTO |
| Telegram bot | Crear endpoint | 2-4 horas | BAJO |
| Chats bot | Desarrollar UI | 8-12 horas | MEDIO |
| Reuniones | Fix similar a voz | 8-16 horas | ALTO |

**Total estimado**: 34-56 horas de desarrollo (5-7 días laborales)

### Recursos técnicos adicionales necesarios

1. **Developer con experiencia en**:
   - React hooks avanzados (useCallback, useRef, useEffect)
   - Vite build configuration
   - Source maps y debugging

2. **Acceso completo a**:
   - Backend AL-E Core (documentación de endpoints)
   - Supabase (schema completo, RLS policies)
   - Telegram Bot API (configuración actual)

3. **Herramientas de debugging**:
   - Sentry o similar (monitoreo de errores en producción)
   - LogRocket (grabación de sesiones de usuario)
   - Chrome DevTools Performance profiler

---

## CONCLUSIÓN

Los problemas actuales requieren **conocimientos avanzados** de React y Vite que exceden las capacidades de resolución mediante iteración de prueba-error. Se necesita:

1. ✅ Diagnóstico profesional con source maps
2. ✅ Refactorización arquitectónica de componentes de voz
3. ✅ Implementación completa de funcionalidades de Telegram
4. ✅ Testing exhaustivo en ambiente de producción real

**Recomendación final**: Escalar a equipo senior de desarrollo frontend con experiencia comprobada en React hooks y build optimization.

---

**Preparado por**: Asistente de IA GitHub Copilot  
**Fecha**: 21 de enero de 2026  
**Versión del sistema**: Commit `b67f2fe`  
**Ambiente**: Producción (https://al-eon.com)
