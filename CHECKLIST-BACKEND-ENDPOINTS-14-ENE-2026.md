# ✅ CHECKLIST DE CIERRE - VALIDACIÓN BACKEND

**Fecha:** 14 enero 2026  
**Para:** Equipo Backend (Core)  
**Responsable:** Validar que endpoints coincidan con Frontend

---

## 🎯 PROBLEMA DETECTADO

```diff
❌ Frontend menciona en docs: /api/chat/stream
✅ Frontend REALMENTE usa:     /api/ai/chat/v2 y /api/ai/chat/stream
⚠️  Backend en logs dice:       chatRouter montado en /api/ai

🔥 NECESITAMOS CONFIRMAR: ¿Existen TODOS estos endpoints?
```

---

## 📋 ENDPOINTS QUE FRONTEND CONSUME

### **1. CHAT (CRÍTICO)**

#### **A) Chat normal (sin streaming)**
```bash
POST https://api.al-eon.com/api/ai/chat/v2

Headers:
  Authorization: Bearer <JWT>
  Content-Type: application/json
  x-request-id: <UUID>

Body:
{
  "message": "Hola",
  "sessionId": "conv_abc123",
  "userId": "user_xyz",
  "files": []
}

Response esperada (200 OK):
{
  "response": "Hola, ¿en qué puedo ayudarte?",
  "sessionId": "conv_abc123",
  "timestamp": "2026-01-14T...",
  "speak_text": "Hola, ¿en qué puedo ayudarte?",
  "should_speak": true
}
```

**Archivo Frontend:** `src/lib/aleCoreClient.js` línea 66

**Pregunta:** ✅ ¿Este endpoint existe? ¿Responde 200?

---

#### **B) Chat con streaming (SSE)**
```bash
POST https://api.al-eon.com/api/ai/chat/stream

Headers:
  Authorization: Bearer <JWT>
  Content-Type: application/json
  Accept: text/event-stream
  x-request-id: <UUID>

Body:
{
  "messages": [
    { "role": "user", "content": "Hola" }
  ],
  "sessionId": "conv_abc123",
  "userId": "user_xyz"
}

Response esperada (200 OK + SSE):
data: {"delta": "Hola"}
data: {"delta": ","}
data: {"delta": " ¿en"}
data: {"delta": " qué"}
...
data: [DONE]
```

**Archivo Frontend:** `src/lib/streamingClient.js` línea 36

**Pregunta:** ✅ ¿Este endpoint existe? ¿Hace streaming con SSE?

---

### **2. VOICE (STT)**

```bash
POST https://api.al-eon.com/api/voice/stt

Headers:
  Authorization: Bearer <JWT>
  x-request-id: <UUID>

Body (multipart/form-data):
  audio: <Blob audio/webm>
  model: whisper-large-v3

Response esperada (200 OK):
{
  "success": true,
  "transcript": "Texto transcrito del audio"
}
```

**Archivo Frontend:** `src/hooks/useVoiceModeCore.js` línea 75

**Pregunta:** ✅ ¿Este endpoint existe? ¿Usa Groq Whisper?

---

### **3. MEETINGS (5 endpoints)**

#### **A) Iniciar reunión**
```bash
POST https://api.al-eon.com/api/meetings/live/start

Headers:
  Authorization: Bearer <JWT>
  Content-Type: application/json
  x-request-id: <UUID>

Body:
{
  "title": "Reunión 14/01/2026",
  "description": "Grabada desde modo altavoz",
  "participants": [],
  "auto_send_enabled": false
}

Response esperada (200 OK):
{
  "success": true,
  "meetingId": "mtg_abc123",
  "message": "Meeting created"
}
```

**Pregunta:** ✅ ¿Existe? ¿Crea entrada en BD?

---

#### **B) Enviar chunk de audio**
```bash
POST https://api.al-eon.com/api/meetings/live/{meetingId}/chunk

Headers:
  Authorization: Bearer <JWT>
  x-request-id: <UUID>

Body (multipart/form-data):
  chunk: <Blob audio/webm>

Response esperada (200 OK):
{
  "success": true,
  "message": "Chunk processed"
}
```

**Pregunta:** ✅ ¿Existe? ¿Transcribe chunk con Whisper?

---

#### **C) Polling de transcripción en vivo**
```bash
GET https://api.al-eon.com/api/meetings/live/{meetingId}/status

Headers:
  Authorization: Bearer <JWT>

Response esperada (200 OK):
{
  "success": true,
  "transcript": "Texto transcrito hasta ahora..."
}
```

**Pregunta:** ✅ ¿Existe? ¿Retorna transcripción parcial?

---

#### **D) Finalizar reunión**
```bash
POST https://api.al-eon.com/api/meetings/live/{meetingId}/stop

Headers:
  Authorization: Bearer <JWT>
  x-request-id: <UUID>

Response esperada (200 OK):
{
  "success": true,
  "message": "Meeting finalized"
}
```

**Pregunta:** ✅ ¿Existe? ¿Dispara análisis de minuta?

---

#### **E) Obtener resultado final**
```bash
GET https://api.al-eon.com/api/meetings/{meetingId}/result

Headers:
  Authorization: Bearer <JWT>

Response esperada (200 OK):

# Mientras procesa:
{
  "status": "processing",
  "message": "Still processing..."
}

# Cuando termina:
{
  "status": "done",
  "result": {
    "transcript": "Transcripción completa...",
    "summary": "Resumen ejecutivo...",
    "minuta": "Minuta formal...",
    "acuerdos": ["Acuerdo 1", "Acuerdo 2"],
    "tareas": ["Tarea 1", "Tarea 2"]
  }
}
```

**Pregunta:** ✅ ¿Existe? ¿Usa GPT para generar minuta?

---

## 🔥 RED FLAGS POSIBLES

### **A) Rutas no coinciden**
```bash
❌ Frontend usa: /api/ai/chat/v2
❌ Backend tiene: /api/chat/v2
→ Resultado: 404 Not Found
```

**Solución:** Alinear rutas o agregar alias/proxy

---

### **B) CORS no configurado**
```bash
❌ Frontend (al-eon.netlify.app) → Backend (api.al-eon.com)
❌ Backend no tiene CORS para netlify.app
→ Resultado: CORS policy error
```

**Solución:**
```javascript
// En Core backend (Express):
app.use(cors({
  origin: [
    'https://al-eon.netlify.app',
    'http://localhost:5173'  // Para desarrollo
  ],
  credentials: true
}));
```

---

### **C) JWT no válido**
```bash
❌ Frontend manda: Bearer eyJhbGc...
❌ Backend espera: otro formato o secret distinto
→ Resultado: 401 Unauthorized
```

**Solución:** Verificar que Supabase JWT es validado correctamente

---

### **D) Endpoint no existe**
```bash
❌ Frontend hace: POST /api/meetings/live/start
❌ Backend no tiene ese endpoint
→ Resultado: 404 Not Found o 405 Method Not Allowed
```

**Solución:** Implementar endpoint o corregir ruta en Frontend

---

## ✅ CHECKLIST DE VALIDACIÓN BACKEND

**Por favor confirma cada uno:**

- [ ] **Chat v2:**
  - [ ] Endpoint `/api/ai/chat/v2` existe
  - [ ] Acepta POST con JSON
  - [ ] Valida JWT de Supabase
  - [ ] Retorna 200 + respuesta de GPT
  - [ ] Incluye `speak_text` y `should_speak`

- [ ] **Chat streaming:**
  - [ ] Endpoint `/api/ai/chat/stream` existe
  - [ ] Hace Server-Sent Events (SSE)
  - [ ] Envía deltas con `data: {...}`
  - [ ] Termina con `data: [DONE]`

- [ ] **Voice STT:**
  - [ ] Endpoint `/api/voice/stt` existe
  - [ ] Acepta multipart/form-data
  - [ ] Usa Groq Whisper
  - [ ] Retorna `{ success, transcript }`

- [ ] **Meetings (5 endpoints):**
  - [ ] `/api/meetings/live/start` existe
  - [ ] `/api/meetings/live/{id}/chunk` existe
  - [ ] `/api/meetings/live/{id}/status` existe
  - [ ] `/api/meetings/live/{id}/stop` existe
  - [ ] `/api/meetings/{id}/result` existe

- [ ] **CORS:**
  - [ ] Permite origen: `https://al-eon.netlify.app`
  - [ ] Permite headers: `Authorization`, `x-request-id`
  - [ ] Permite credentials: true

- [ ] **Auth:**
  - [ ] Valida JWT de Supabase (formato: `Bearer ey...`)
  - [ ] Extrae `user_id` del token
  - [ ] Aplica RLS según `auth.uid()`

---

## 🧪 PRUEBAS RÁPIDAS (Backend)

### **Test 1: Chat v2**
```bash
curl -X POST https://api.al-eon.com/api/ai/chat/v2 \
  -H "Authorization: Bearer <JWT_REAL>" \
  -H "Content-Type: application/json" \
  -d '{"message":"Hola","sessionId":"test_123","userId":"test_user"}'

# Esperado: 200 + JSON con respuesta
```

### **Test 2: Voice STT**
```bash
curl -X POST https://api.al-eon.com/api/voice/stt \
  -H "Authorization: Bearer <JWT_REAL>" \
  -F "audio=@test.webm" \
  -F "model=whisper-large-v3"

# Esperado: 200 + {"success":true,"transcript":"..."}
```

### **Test 3: Meetings start**
```bash
curl -X POST https://api.al-eon.com/api/meetings/live/start \
  -H "Authorization: Bearer <JWT_REAL>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test meeting","description":"Test"}'

# Esperado: 200 + {"success":true,"meetingId":"..."}
```

---

## 📊 RESULTADO ESPERADO

**Si todos los endpoints retornan 200:**
→ ✅ Backend está listo

**Si alguno retorna 404/405:**
→ ❌ Ese endpoint falta o tiene ruta incorrecta

**Si retorna 401:**
→ ❌ Problema con validación de JWT

**Si retorna 500:**
→ ❌ Error interno (revisar logs)

---

## 🚀 PRÓXIMOS PASOS

1. **Backend confirma:** Todos los endpoints existen y funcionan
2. **Frontend captura:** Screenshots del Network tab (200 OK)
3. **QA valida:** Flujo completo end-to-end
4. **Cierre oficial:** Proyecto marcado como COMPLETO

---

**Sin esta validación, no podemos cerrar oficialmente.**

Todo el código Frontend está bien estructurado, pero necesitamos confirmar que Backend está alineado.
