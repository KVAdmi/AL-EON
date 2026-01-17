# 🚨 DIAGNÓSTICO DE ERRORES EN PRODUCCIÓN - 17 ENERO 2026

## ESTADO ACTUAL
❌ **VOZ**: Cannot access 'Ee' before initialization  
❌ **REUNIONES**: Internal server error al subir chunks  
❌ **TELEGRAM**: Bots no se ligan correctamente  

---

## 1️⃣ PROBLEMA: VOZ - "Cannot access 'Ee' before initialization"

### Error Real (Console)
```
ChatPage-ae331d7a.js:8:40638
at L.onstop (ChatPage-ae331d7a.js:8:39183)
Error en ciclo de voz: ReferenceError: Cannot access 'Ee' before initialization
```

### Causa Raíz
El callback `mediaRecorder.onstop` está accediendo a variables (`mimeType`, `mediaRecorder.state`) que pueden no estar en el scope correcto después de la minificación de Vite.

### Archivos Afectados
1. **src/hooks/useVoiceMode.js** (líneas 184-230)
   - `mediaRecorder.onstop` usa `mimeType` directamente
   - Accede a `mediaRecorder.state` dentro del callback
   - Variables pueden estar fuera de scope en minificado

2. **src/features/chat/pages/ChatPage.jsx** (líneas 63-78)
   - Hook `useVoiceMode` con callbacks
   - Estado `voiceError` para capturar errores

3. **src/features/chat/components/MessageThread.jsx** (líneas 47, 200-212)
   - Recibe `voiceError` prop pero puede renderizar antes de inicializar

### Fix Requerido
```javascript
// En useVoiceMode.js línea ~184
mediaRecorder.onstop = async () => {
  // 🔥 CAPTURAR EN CLOSURE ANTES DE USAR
  const currentMimeType = mimeType;
  const currentRecorderState = mediaRecorderRef.current?.state || 'stopped';
  
  // ... resto del código usando currentMimeType y currentRecorderState
};
```

---

## 2️⃣ PROBLEMA: REUNIONES - "Internal server error" al subir chunks

### Error Real (Console)
```
[MeetingsService] Error enviando chunk 1: Error: Internal server error
POST https://api.al-eon.com/api/meetings/live/a81117eb-b274-4861-ac68-b2595686d4d4/chunk
Status: 500 (Internal Server Error)
```

### Causa Raíz
1. **startLiveMeeting** no valida que el meeting esté en estado "recording"
2. **uploadLiveChunk** envía chunks sin verificar si el meeting es válido
3. Backend responde 500 porque el meeting no existe o no está en estado correcto

### Archivos Afectados
1. **src/services/meetingsService.js** (líneas 160-230)
   - `startLiveMeeting`: No valida status del meeting creado
   - `uploadLiveChunk`: No valida meetingId antes de enviar

2. **src/features/meetings/components/MeetingsRecorderLive.jsx** (líneas 70-150)
   - `startRecording`: No verifica que startLiveMeeting devuelva estado válido
   - `enqueueChunk`: Envía chunks aunque meeting no esté listo

### Fix Requerido
```javascript
// En meetingsService.js línea ~210
export async function startLiveMeeting(title) {
  // ... código existente ...
  
  const { meetingId, status } = responseData;
  
  // 🔥 VALIDAR ESTADO ANTES DE CONTINUAR
  if (!meetingId) {
    throw new Error('Backend no devolvió meetingId válido');
  }
  
  if (status !== 'recording' && status !== 'active') {
    throw new Error(`Meeting en estado inválido: ${status}. No se pueden subir chunks.`);
  }
  
  return { id: meetingId, status, ...responseData };
}
```

---

## 3️⃣ PROBLEMA: TELEGRAM - Bots no se ligan a usuario

### Error Real (Console)
```
[TelegramService] Bots obtenidos desde Supabase: []
[Telegram] Bots cargados: TelegramPage-cbd7787.js:1
```

### Causa Raíz
1. Query de Supabase filtra por `owner_user_id` pero el bot puede tener otro owner
2. RLS puede estar bloqueando el acceso
3. No hay logging para saber si el bot existe pero no se puede leer

### Archivos Afectados
1. **src/services/telegramService.js** (líneas 245-280)
   - `getUserBots`: Filtra por `owner_user_id` sin validar si hay bots huérfanos
   - No loggea si RLS está bloqueando

2. **src/pages/TelegramSettingsPage.jsx** (líneas 30-50)
   - `loadBots`: No distingue entre "no hay bots" vs "error de permisos"

### Fix Requerido
```javascript
// En telegramService.js línea ~250
const { data, error } = await supabase
  .from('telegram_bots')
  .select('*')
  .eq('owner_user_id', userId)
  .order('created_at', { ascending: false });

// 🔥 SI NO HAY BOTS, VERIFICAR SI EXISTEN SIN FILTRO
if (!data || data.length === 0) {
  const { data: allBots } = await supabase
    .from('telegram_bots')
    .select('id, bot_username, owner_user_id')
    .limit(5);
  
  if (allBots && allBots.length > 0) {
    console.warn('🔍 Hay bots en la tabla pero no para este userId:', allBots);
    throw new Error('Problema de RLS o owner_user_id incorrecto');
  }
}
```

---

## 📋 ARCHIVOS A REVISAR (EN ORDEN)

### PRIORIDAD 1: VOZ (Crash crítico)
- [ ] `src/hooks/useVoiceMode.js` - Líneas 184-230 (mediaRecorder.onstop)
- [ ] `src/features/chat/pages/ChatPage.jsx` - Líneas 63-78 (voiceError state)
- [ ] `src/features/chat/components/MessageThread.jsx` - Líneas 200-212 (error display)

### PRIORIDAD 2: REUNIONES (500 error)
- [ ] `src/services/meetingsService.js` - Líneas 160-230 (startLiveMeeting, uploadLiveChunk)
- [ ] `src/features/meetings/components/MeetingsRecorderLive.jsx` - Líneas 70-150 (startRecording)

### PRIORIDAD 3: TELEGRAM (Funcionalidad rota)
- [ ] `src/services/telegramService.js` - Líneas 245-280 (getUserBots)
- [ ] `src/pages/TelegramSettingsPage.jsx` - Líneas 30-50 (loadBots)

---

## 🎯 CRITERIO DE ÉXITO

### VOZ
✅ No más "Cannot access 'Ee' before initialization"  
✅ Errores de micrófono se muestran en banner rojo  
✅ App no crashea al activar modo voz  

### REUNIONES
✅ startLiveMeeting valida status antes de permitir chunks  
✅ uploadLiveChunk da error específico (404/400) no 500 genérico  
✅ Console loggea el estado del meeting en cada paso  

### TELEGRAM
✅ getUserBots loggea si hay bots sin owner_user_id  
✅ Error específico si RLS bloquea acceso  
✅ UI distingue "no hay bots" vs "error de permisos"  

---

## 📊 DATOS PARA BACKEND

### Meeting ID del error:
```
a81117eb-b274-4861-ac68-b2595686d4d4
```

### Verificar en DB:
```sql
SELECT id, status, created_at, owner_user_id 
FROM meetings 
WHERE id = 'a81117eb-b274-4861-ac68-b2595686d4d4';
```

### User ID de Telegram:
```
5cbc344b-6a78-4468-99b9-78779bf84ae8
```

### Verificar bots:
```sql
SELECT id, bot_username, owner_user_id, created_at
FROM telegram_bots
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🚀 PRÓXIMO PASO

**COPIA EL CÓDIGO COMPLETO** de los archivos que voy a abrir y envíalos al equipo de backend para diagnóstico conjunto.

El problema NO es solo frontend - hay desconexión entre lo que frontend envía y lo que backend espera.
