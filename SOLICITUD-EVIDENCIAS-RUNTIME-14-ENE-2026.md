# 🔍 SOLICITUD DE EVIDENCIAS RUNTIME - CIERRE DE IMPLEMENTACIÓN

**Fecha:** 14 enero 2026  
**Para:** Equipo Frontend  
**De:** Equipo de QA / Integración  
**Asunto:** Evidencia de funcionamiento real (Network tab screenshots)

---

## 🎯 OBJETIVO

Validar que la implementación funciona **en runtime real**, no solo "en papel".

Necesitamos **screenshots del Network tab** para cerrar oficialmente el proyecto.

---

## 🚨 RED FLAG DETECTADO

```diff
- Frontend menciona: /api/chat/stream
+ Core Backend monta: /api/ai/*

❗ Posible mismatch de rutas que puede causar:
   - 404 Not Found
   - 502 Bad Gateway  
   - Chat se queda "pensando" infinito
   - CORS errors
```

---

## 📋 EVIDENCIAS REQUERIDAS

### **A) 🔴 CHAT (CRÍTICO - PRIORITY 1)**

**Necesito 1 screenshot del Network tab con:**

1. ✅ **Request URL completa**
2. ✅ **Status code** (200, 404, 502?)
3. ✅ **Response Preview** (primeros bytes o eventos SSE)
4. ✅ **Request Headers:**
   - `Origin`
   - `Authorization: Bearer ...`
   - `x-request-id`

**Pasos para capturar:**
```
1. Abre Chrome/Edge DevTools → Tab "Network"
2. Filtro: "Fetch/XHR"
3. Envía 1 mensaje en chat: "Hola"
4. Busca request que contenga "chat" o "ai"
5. Haz clic en el request
6. Screenshot mostrando:
   - Headers tab (URL + Status)
   - Preview tab (Response)
```

**Resultado esperado:**
```bash
✅ SI FUNCIONA:
   Request URL: https://api.al-eon.com/api/ai/chat/v2
   Status Code: 200 OK
   Response: { "response": "Hola, ¿en qué puedo ayudarte?", ... }

❌ SI ESTÁ ROTO:
   Request URL: https://api.al-eon.com/api/chat/stream
   Status Code: 404 Not Found
   # O 502 Bad Gateway
   # O CORS error en Console
```

---

### **B) 🟡 STT (Speech-to-Text) - PRIORITY 2**

**Necesito screenshot de:**

1. ✅ Request: `POST /api/voice/stt`
2. ✅ Status: 200 OK
3. ✅ Payload tab: FormData con `audio` blob
4. ✅ Response: `{ "success": true, "transcript": "..." }`

**Pasos:**
```
1. Network tab abierto
2. Click en botón micrófono 🎤 en chat
3. Habla: "Prueba uno dos tres"
4. Detén grabación
5. Busca request "/api/voice/stt"
6. Screenshot de:
   - Headers (URL + Status)
   - Payload (FormData)
   - Response
```

**Resultado esperado:**
```bash
POST https://api.al-eon.com/api/voice/stt
Status: 200 OK
Request:
  audio: (binary) 45.2 KB audio/webm
  model: whisper-large-v3
Response:
  {
    "success": true,
    "transcript": "Prueba uno dos tres"
  }
```

---

### **C) 🟢 MEETINGS (Reuniones) - PRIORITY 3**

**Necesito screenshots de UNA corrida completa de 20 segundos:**

#### **1. START**
```
POST /api/meetings/live/start
Status: 200
Response: { "success": true, "meetingId": "mtg_abc123" }
```

#### **2. CHUNK (al menos 1)**
```
POST /api/meetings/live/{meetingId}/chunk
Status: 200
Payload: FormData { chunk: Blob audio/webm }
```

#### **3. STATUS (durante grabación)**
```
GET /api/meetings/live/{meetingId}/status
Status: 200
Response: { "success": true, "transcript": "Texto parcial..." }
```

#### **4. STOP**
```
POST /api/meetings/live/{meetingId}/stop
Status: 200
Response: { "success": true }
```

#### **5. RESULT (polling)**
```
GET /api/meetings/{meetingId}/result

Primera llamada:
  { "status": "processing" }

Última llamada (después de ~30s):
  { 
    "status": "done",
    "result": {
      "transcript": "...",
      "summary": "...",
      "minuta": "...",
      "acuerdos": [...],
      "tareas": [...]
    }
  }
```

**Pasos:**
```
1. Network tab abierto
2. Ve a /reuniones
3. Click "Iniciar Grabación"
4. Habla durante 20 segundos
5. Click "Finalizar y Generar Minuta"
6. Espera hasta que aparezca la minuta
7. Screenshots de TODOS los requests mencionados arriba
```

---

## 🔍 VERIFICACIÓN DE RUTAS (PARA BACKEND)

**Frontend está configurado para usar:**

```javascript
// Chat normal:
POST https://api.al-eon.com/api/ai/chat/v2

// Chat streaming:
POST https://api.al-eon.com/api/ai/chat/stream

// Voice (STT):
POST https://api.al-eon.com/api/voice/stt

// Meetings:
POST https://api.al-eon.com/api/meetings/live/start
POST https://api.al-eon.com/api/meetings/live/{id}/chunk
GET  https://api.al-eon.com/api/meetings/live/{id}/status
POST https://api.al-eon.com/api/meetings/live/{id}/stop
GET  https://api.al-eon.com/api/meetings/{id}/result
```

**PREGUNTA PARA CORE BACKEND:**

❓ ¿Tienes montados estos endpoints en `/api/ai/*` y `/api/meetings/*`?  
❓ ¿O están en rutas diferentes como `/api/chat/*`?

**Si hay mismatch, ese es el bug.**

---

## ✅ CHECKLIST DE CIERRE

- [ ] Screenshot chat (request URL + status + response)
- [ ] Screenshot STT (request + payload + response)
- [ ] Screenshots meetings (start, chunk, status, stop, result)
- [ ] Confirmación de rutas en Backend
- [ ] Validación de que SQL de privacidad está ejecutado
- [ ] Hard refresh + logout/login realizado

---

## 📦 ENTREGA

**Por favor envíen:**

1. **Screenshots** en alta resolución (PNG)
2. **Nombre de archivos descriptivos:**
   - `chat-request-200.png`
   - `stt-request-response.png`
   - `meetings-flow-complete.png`
3. **Si hay errores:** screenshot del error + Console tab

**Plazo:** ASAP (bloqueante para cierre oficial)

---

## 🚨 NOTAS FINALES

> **"PowerPoint Engineering" vs Runtime Real**
> 
> El código está bien estructurado, pero sin evidencia de que los requests llegan a 200 OK en producción, no podemos cerrar oficialmente.
> 
> **Necesitamos ver que funciona, no que "debería funcionar".**

---

**Contacto:** Patricia / Equipo de Integración  
**URL de prueba:** https://al-eon.netlify.app

---

## 🔧 TROUBLESHOOTING RÁPIDO

### Si chat no funciona:

```javascript
// Verifica en Console:
console.log(import.meta.env.VITE_CORE_BASE_URL)
// Debe imprimir: "https://api.al-eon.com"

// Si dice "undefined", falta el .env:
VITE_CORE_BASE_URL=https://api.al-eon.com
```

### Si STT no funciona:

```javascript
// Verifica permiso de micrófono:
navigator.permissions.query({ name: 'microphone' })
  .then(result => console.log('Mic permission:', result.state))
// Debe decir: "granted"
```

### Si meetings no funcionan:

```javascript
// Verifica que MediaRecorder existe:
console.log('MediaRecorder:', typeof MediaRecorder)
// Debe decir: "function"

// Verifica formatos soportados:
console.log('webm:', MediaRecorder.isTypeSupported('audio/webm'))
// Debe decir: true
```

---

**Con estas evidencias cerramos el proyecto. Sin ellas, seguimos en "teoría".**
