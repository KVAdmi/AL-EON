# 🔴 REPORTE DE ESTABILIDAD FRONTEND - 17 ENERO 2026

## CONTEXTO

Este documento diagnostica y soluciona los problemas críticos del frontend de AL-E reportados hoy:

1. ❌ Telegram se queda en loading infinito o se cae
2. ❌ Subida de documentos falla por rutas inválidas (undefined/projects/...)
3. ❌ PDFs e imágenes no se procesan
4. ❌ El micrófono / manos libres no es estable
5. ❌ Settings de voz muestran pantalla negra
6. ❌ La app móvil tiene boot timeout
7. ❌ Usuario recibe mensajes como "no hay evidencia" cuando sí hay contexto

---

## 🔍 DIAGNÓSTICO COMPLETO

### ✅ 1. BOOT TIMEOUT (MÓVIL Y WEB)

**Estado:** ✅ FUNCIONAL (ya tiene timeout implementado)

**Ubicación:** `src/contexts/AuthContext.jsx`

**Mecanismo actual:**
```javascript
// Línea 8-15
function withTimeout(promise, ms = 8000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('BOOT_TIMEOUT')), ms)
    )
  ]);
}

// Línea 64-95
const initAuth = async () => {
  try {
    await withTimeout(
      (async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        setAccessToken(session?.access_token ?? null);
        
        if (session?.user) {
          await loadUserProfile(session.user.id);
          
          // Capabilities en background (NO BLOQUEA)
          if (session.access_token) {
            loadCapabilities(session.access_token).catch(err => {
              console.warn('[BOOT] ⚠️ Capabilities falló, continuando:', err);
            });
          }
        }
      })(),
      8000 // ← Timeout de 8 segundos
    );
    
    setBootError(null);
  } catch (err) {
    console.error('[BOOT] ❌ error:', err.message);
    setBootError(err.message || 'ERROR_DESCONOCIDO');
  } finally {
    setLoading(false); // ✅ GARANTIZADO
  }
};
```

**Pantalla de error incluida:**
```jsx
// src/App.jsx línea 66-102
if (bootError) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full p-8 rounded-2xl text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold">Error de Conexión</h2>
        <p>{bootError}</p>
        <button onClick={retryBoot}>Reintentar</button>
      </div>
    </div>
  );
}
```

**Conclusión:** ✅ El sistema ya tiene timeout y manejo de errores correcto. Si hay timeouts, es por:
- Red lenta del usuario
- Supabase caído
- Backend capabilities no responde

**Acción:** Ninguna (ya está bien implementado)

---

### 🔴 2. TELEGRAM: LOADING INFINITO / CRASHES

**Estado:** 🔴 CRÍTICO - Falta manejo de errores visible

**Problema identificado:**

1. **TelegramPage.jsx** (línea 32-51): Loading sin timeout
```jsx
if (loading) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div>Cargando...</div>
    </div>
  );
}
```

**Problema:** Si `loadBots()` o `loadChats()` falla silenciosamente, el usuario se queda en loading eterno.

2. **TelegramChat.jsx** (línea 24-71): Errores capturados pero no mostrados al usuario claramente

```jsx
async function loadMessages() {
  try {
    setLoading(true);
    const data = await getMessages(chatId);
    setMessages(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error('[TelegramChat] ❌ Error:', error);
    toast({ variant: 'destructive', title: 'Error', description: error.message });
    setMessages([]); // ← UI queda vacía sin explicación clara
  } finally {
    setLoading(false);
  }
}
```

**Problema:** Si el backend falla, se muestra "No hay mensajes" en vez de "Error cargando mensajes".

3. **telegramService.js** (línea 65-180): Errores de parsing JSON no manejados

```javascript
if (!response.ok) {
  let errorText = '';
  try {
    errorText = await response.text();
  } catch (textError) {
    console.error('No se pudo leer error');
  }
  throw new Error(error.message || 'Error al conectar bot');
}
```

**Problema:** Si el backend devuelve HTML (500/502), el error no es claro.

---

### 🔴 3. SUBIDA DE DOCUMENTOS: RUTAS UNDEFINED

**Estado:** 🟡 PARCIALMENTE CORREGIDO (tiene validación pero no la enforza en todos los lugares)

**Problema identificado:**

**ProjectDocumentsModal.jsx** (línea 48-67):
```jsx
const handleFileUpload = async (e) => {
  const files = Array.from(e.target.files);
  
  // 🔥 HARD BLOCK — CORRECTO
  if (!userId) {
    alert('❌ ERROR: userId no está definido');
    e.target.value = '';
    return;
  }

  if (!project?.id) {
    alert('❌ ERROR: No hay proyecto seleccionado');
    e.target.value = '';
    return;
  }

  // Subir archivo
  const filePath = `${userId}/projects/${project.id}/${sanitizedFileName}`;
  await supabase.storage.from('user-files').upload(filePath, file);
}
```

✅ **Buena práctica:** Bloquea la acción si faltan datos.

❌ **Problema:** El componente se renderiza aunque userId o project.id sean undefined.

**Línea 190-209:**
```jsx
{(!userId || !project?.id) && (
  <div className="bg-red-50">
    ⚠️ No se puede subir archivos: {!userId ? 'Usuario no identificado' : 'Proyecto no seleccionado'}
  </div>
)}

<input
  type="file"
  disabled={isUploading || !userId || !project?.id}
  onChange={handleFileUpload}
/>
```

✅ **Buena práctica:** Muestra error visible y deshabilita input.

**PERO:** El problema es que en **otros componentes** (MessageComposer, useChat) no hay validación similar.

---

### 🔴 4. PDFs E IMÁGENES NO SE PROCESAN

**Estado:** 🔴 CRÍTICO - Falta validación de resultados del procesamiento

**Problema identificado:**

**FileUploadButton.jsx** (línea 58-95):
```jsx
for (const fileData of newFiles) {
  try {
    setFiles(prev =>
      prev.map(f =>
        f.id === fileData.id ? { ...f, status: 'processing' } : f
      )
    );

    // Subir y procesar
    const result = await uploadAndIngestFile(fileData.file, sessionId);

    // Actualizar a success
    setFiles(prev =>
      prev.map(f =>
        f.id === fileData.id ? { ...f, ...result, status: 'success' } : f
      )
    );
  } catch (error) {
    // Actualizar a error
    setFiles(prev =>
      prev.map(f =>
        f.id === fileData.id ? { ...f, status: 'error', error: error.message } : f
      )
    );
  }
}
```

✅ **Buena práctica:** Maneja estados de carga y error.

❌ **Problema:** Si `uploadAndIngestFile` devuelve 200 pero el backend falla internamente, el chip se muestra como "success" aunque no se haya procesado.

**filesService.js** (línea 115-148):
```javascript
export async function uploadAndIngestFile(file, sessionId) {
  const { uploadUrl, fileId, fileUrl } = await getUploadUrl(...);
  await uploadFile(file, uploadUrl);
  
  const result = await ingestFile({
    fileId,
    fileName: file.name,
    sessionId,
    ...
  });

  return {
    id: fileId,
    name: file.name,
    url: fileUrl,
    ...
  };
}
```

❌ **Problema:** Si `ingestFile` devuelve 200 pero el backend no procesó el PDF/imagen, no hay forma de saberlo desde el frontend.

**Solución:** El backend debe devolver en la respuesta:
```json
{
  "ok": true,
  "fileId": "...",
  "processed": true,  // ← NUEVO
  "extractedText": "...", // ← NUEVO (si es PDF)
  "error": null
}
```

Y el frontend debe validar:
```javascript
const result = await ingestFile(...);

if (!result.processed) {
  throw new Error(result.error || 'El archivo no pudo ser procesado');
}
```

---

### 🔴 5. MICRÓFONO / MANOS LIBRES NO ES ESTABLE

**Estado:** 🟡 FUNCIONAL PERO FALTA MANEJO DE ERRORES

**Problema identificado:**

**useVoiceMode.js** (línea 172-261):
```javascript
const startRecording = useCallback(async () => {
  if (isSending) {
    console.warn('⚠️ Ya hay un proceso en curso');
    return;
  }

  if (!accessToken) {
    const err = new Error('No hay sesión activa');
    setError(err);
    onError?.(err); // ← Solo callback, no UI visible
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      }
    });

    const mediaRecorder = new MediaRecorder(stream, { mimeType });
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      if (audioBlob.size === 0) {
        console.error('❌ Audio vacío');
        setStatus('idle');
        return; // ← Usuario no ve error
      }

      await sendAudio(audioBlob);
    };

    mediaRecorder.start(1000);
    setStatus('recording');

  } catch (err) {
    console.error('[VOICE] ❌ Error:', err);
    setError(err);
    onError?.(err);
    setStatus('idle');
  }
}, [isSending, accessToken, onError]);
```

❌ **Problemas:**
1. Si el micrófono no captura nada (audioBlob.size === 0), no hay UI de error.
2. Si getUserMedia falla (permiso denegado), solo se registra en console.error.
3. No hay reintentos automáticos si el stream se desconecta.

**VoiceControls.jsx** (línea 85-130):
```jsx
<button
  onClick={isRecording ? onStopRecording : onStartRecording}
  disabled={disabled || isBusy}
>
  {isRecording ? <MicOff /> : <Mic />}
  {isRecording ? 'Detener' : 'Grabar'}
</button>
```

✅ **Buena práctica:** UI clara de estado.

❌ **Problema:** No muestra errores de permiso denegado o micrófono no disponible en la UI.

---

### 🔴 6. SETTINGS DE VOZ: PANTALLA NEGRA

**Estado:** 🟡 POSIBLE PROBLEMA DE CARGA ASÍNCRONA

**Problema identificado:**

**SettingsPage.jsx** (línea 1-200):
```jsx
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [availableVoices, setAvailableVoices] = useState([]);

  useEffect(() => {
    loadVoices();
    if (window.speechSynthesis) {
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    }
  }, []);

  function loadVoices() {
    if (!window.speechSynthesis) {
      console.warn('[TTS] Web Speech API no disponible');
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    const spanishVoices = voices.filter(v => v.lang.startsWith('es'));
    
    setAvailableVoices(spanishVoices);
    globalAvailableVoices = spanishVoices;
  }

  useEffect(() => {
    loadUserData();
  }, [user]);

  async function loadUserData() {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user?.id) {
        console.warn('⚠️ No hay sesión - usando defaults');
        setProfile({ /* defaults */ });
        setSettings({ /* defaults */ });
        setLoading(false); // ← IMPORTANTE
        return;
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      // ... procesar datos

    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false); // ← IMPORTANTE
    }
  }
}
```

❌ **Problema potencial:**
1. Si `loadUserData()` lanza error antes del `finally`, `loading` nunca se pone en `false`.
2. Si `user` es `null` pero el componente ya montó, se queda en loading.

✅ **Solución ya implementada:** El `finally` garantiza que `loading = false`.

**Posible causa de "pantalla negra":**
- Error de JavaScript no capturado en `TabContent` que rompe el render.
- No hay **Error Boundary** que capture errores de renderizado.

---

### 🔴 7. USUARIO RECIBE "NO HAY EVIDENCIA" CUANDO SÍ HAY CONTEXTO

**Estado:** 🔴 CRÍTICO - Problema de envío de documentos al backend

**Problema identificado:**

**useChat.js** (línea 70-102):
```javascript
export function useChat({ currentConversation, ... }) {
  const sendMessage = async (content, attachments = []) => {
    try {
      // 0. Buscar documentos del proyecto
      let projectDocuments = [];
      if (currentConversation.project_id) {
        const projectPath = `${userId}/projects/${currentConversation.project_id}/`;
        
        const { data, error } = await supabase.storage
          .from('user-files')
          .list(projectPath);

        if (!error && data && data.length > 0) {
          projectDocuments = data.map(doc => {
            const { data: { publicUrl } } = supabase.storage
              .from('user-files')
              .getPublicUrl(`${projectPath}${doc.name}`);
            
            return {
              name: doc.name,
              url: publicUrl,
              size: doc.metadata?.size || 0,
              type: doc.metadata?.mimetype || 'application/octet-stream'
            };
          });

          console.log('📄 Documentos del proyecto:', projectDocuments);
        }
      }

      // 1. Subir attachments
      let uploadedFiles = [];
      if (attachments && attachments.length > 0) {
        for (const file of attachments) {
          const uploaded = await uploadFile(file, userId);
          uploadedFiles.push(uploaded);
        }
      }

      // 2. Preparar payload
      const payload = {
        mode: 'universal',
        userId,
        workspaceId: 'core',
        sessionId: currentConversation.id,
        projectId: currentConversation.project_id || null,
        messages: [...history, { role: 'user', content }],
        attachments: uploadedFiles.length > 0 ? uploadedFiles : undefined,
        projectDocuments: projectDocuments.length > 0 ? projectDocuments : undefined, // ← ESTO SE ENVÍA
        streaming: true
      };

      const response = await fetch(`${BACKEND_URL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      });

      // ... procesar respuesta
    }
  };
}
```

✅ **Buena práctica:** Envía `projectDocuments` al backend.

❌ **Problema:** Si el backend (AL-E Core) no procesa correctamente `projectDocuments`, responde con "no hay evidencia".

**Posibles causas backend:**
1. Backend ignora `projectDocuments` en el payload.
2. Backend no puede descargar las URLs públicas de Supabase.
3. Backend no extrae texto de los PDFs.
4. Backend no incluye los documentos en el contexto del prompt.

**Acción frontend:** Agregar logging para verificar que `projectDocuments` se está enviando:
```javascript
console.log('📤 Payload enviado al backend:', JSON.stringify(payload, null, 2));
```

**Acción backend:** Verificar que `/api/ai/chat` recibe y procesa `projectDocuments`.

---

### 🔴 8. FECHAS INVENTADAS EN AGENDA

**Estado:** 🔴 CRÍTICO - Problema de interpretación del backend

**Problema identificado:**

**Frontend NO genera fechas** — simplemente envía el texto del usuario:
```javascript
const payload = {
  messages: [{ role: 'user', content: 'Agendar reunión mañana a las 3pm' }]
};
```

**Backend** (AL-E Core) debe interpretar "mañana" y convertirlo a fecha ISO.

**Problema:** Si el backend interpreta "mañana" como "hoy + 1 día" pero no considera la zona horaria del usuario, la fecha queda incorrecta.

**Solución backend:**
1. Usar la zona horaria del usuario (guardada en `user_profiles.timezone`).
2. Loggear la fecha interpretada antes de guardarla.
3. Devolver la fecha interpretada en la respuesta para que el frontend la valide:
   ```json
   {
     "response": "Reunión agendada para mañana a las 3pm",
     "tools_used": [
       {
         "name": "create_event",
         "args": {
           "title": "Reunión",
           "start_time": "2026-01-18T15:00:00-06:00", // ← ISO con timezone
           "end_time": "2026-01-18T16:00:00-06:00"
         }
       }
     ]
   }
   ```

**Solución frontend:**
1. Mostrar la fecha interpretada al usuario para confirmarla:
   ```jsx
   {toolsUsed?.some(t => t.name === 'create_event') && (
     <div className="mt-2 p-3 bg-blue-50 rounded">
       📅 Evento creado: {new Date(toolsUsed[0].args.start_time).toLocaleString('es-MX')}
     </div>
   )}
   ```

---

## 🔧 SOLUCIONES IMPLEMENTADAS (AHORA)

Voy a crear fixes incrementales para cada problema crítico.

### FIX 1: Telegram - Manejo de errores visible
### FIX 2: Validación de uploads en todos los componentes
### FIX 3: Validación de procesamiento de archivos
### FIX 4: Error Boundary global para capturar crashes
### FIX 5: Mejoras en logging de contexto enviado al backend

---

## 📋 CHECKLIST DE VERIFICACIÓN POST-FIX

Una vez aplicados los fixes, verificar:

- [ ] La app arranca en < 8s o muestra error claro
- [ ] Telegram muestra "Error cargando chats" si backend falla (no loading infinito)
- [ ] No se puede subir archivos sin userId o projectId válido
- [ ] Chips de archivos muestran "Error procesando" si backend falla
- [ ] Errores de micrófono se muestran en la UI (no solo en console)
- [ ] Settings de voz carga sin pantalla negra
- [ ] Documentos del proyecto se envían correctamente al backend (verificar logs)
- [ ] Fechas agendadas se validan con el usuario antes de confirmar

