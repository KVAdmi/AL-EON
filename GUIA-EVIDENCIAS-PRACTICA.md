# 📸 GUÍA PRÁCTICA: CÓMO OBTENER EVIDENCIAS

**Para:** Patricia  
**Fecha:** 14 enero 2026  
**Objetivo:** Capturar screenshots del Network tab para cerrar el proyecto

---

## 🎯 OPCIÓN 1: PROBAR TTS (MÁS FÁCIL)

### **Paso 1: Abrir el HTML de prueba**

```bash
# En tu Mac:
open "/Users/pg/Documents/CHAT AL-E/test-tts.html"
```

Esto abrirá un navegador con una interfaz para probar TTS.

### **Paso 2: Probar voces**

1. ✅ Verifica que diga: "Soporte TTS: ✅ Soportado"
2. ✅ Selecciona una voz mexicana (🇲🇽 Voces Mexicanas)
3. ✅ Click en "Hablar"
4. ✅ Deberías escuchar el texto

### **Evidencia obtenida:**

- ✅ TTS funciona localmente
- ✅ Voces mexicanas disponibles
- ✅ No necesita Backend (es local)

**Screenshot necesario:**
- Captura la pantalla mostrando que funciona

---

## 🎯 OPCIÓN 2: PROBAR ENDPOINTS CON SCRIPT

### **Paso 1: Obtener tu JWT Token**

1. Ve a https://al-eon.netlify.app
2. Haz login
3. Abre DevTools (Cmd + Option + I)
4. Tab **Application** → **Local Storage** → https://al-eon.netlify.app
5. Busca la clave que contiene "supabase" o "auth"
6. Dentro verás un objeto con `access_token`
7. **Copia el valor del access_token** (es un string largo que empieza con "eyJ...")

### **Paso 2: Ejecutar el script**

```bash
cd "/Users/pg/Documents/CHAT AL-E"

# Reemplaza <TU_TOKEN> con el token que copiaste
./test-endpoints.sh "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

El script probará automáticamente:
- ✅ POST /api/ai/chat/v2
- ✅ POST /api/ai/chat/stream
- ✅ POST /api/meetings/live/start
- ✅ GET /api/meetings/live/{id}/status
- ✅ POST /api/meetings/live/{id}/stop
- ✅ GET /api/meetings/{id}/result

### **Evidencia obtenida:**

Verás en terminal si cada endpoint responde **200 OK** o si da error.

**Screenshot necesario:**
- Captura la salida del terminal

---

## 🎯 OPCIÓN 3: PROBAR EN LA APP (COMPLETO)

### **A) Test de Chat**

1. ✅ Abre https://al-eon.netlify.app
2. ✅ Login
3. ✅ Abre DevTools → Tab **Network**
4. ✅ Filtra por "Fetch/XHR"
5. ✅ Envía un mensaje: "Hola"
6. ✅ Busca request que diga "chat" o "ai"
7. ✅ Haz click en el request
8. ✅ Ve a tab **Headers**

**Screenshot necesario:**
```
Captura mostrando:
- Request URL: https://api.al-eon.com/api/ai/...
- Status Code: 200 (o el código que salga)
- Request Headers (con Authorization)
- Response Preview (con la respuesta del chat)
```

---

### **B) Test de Voice (STT)**

1. ✅ DevTools → Network tab abierto
2. ✅ Click en botón de micrófono 🎤 en el chat
3. ✅ Habla: "Prueba uno dos tres"
4. ✅ Detén grabación
5. ✅ Busca request: **POST /api/voice/stt**
6. ✅ Haz click en el request

**Screenshot necesario:**
```
Captura mostrando:
- Request URL: https://api.al-eon.com/api/voice/stt
- Status Code: 200 (o el código que salga)
- Payload tab: FormData con "audio" blob
- Response tab: { "success": true, "transcript": "..." }
```

---

### **C) Test de Meetings**

1. ✅ Ve a https://al-eon.netlify.app/reuniones
2. ✅ DevTools → Network tab abierto
3. ✅ Tab "🎙️ Grabar Reunión"
4. ✅ Click "Iniciar Grabación"
5. ✅ Permite micrófono
6. ✅ Habla durante 20 segundos
7. ✅ Click "Finalizar y Generar Minuta"
8. ✅ Espera a que aparezca la minuta

**Screenshots necesarios (5 requests):**

```
1. POST /api/meetings/live/start
   - Status: 200
   - Response: { "meetingId": "..." }

2. POST /api/meetings/live/{id}/chunk
   - Status: 200
   - Payload: FormData con audio blob

3. GET /api/meetings/live/{id}/status
   - Status: 200
   - Response: { "transcript": "..." }

4. POST /api/meetings/live/{id}/stop
   - Status: 200

5. GET /api/meetings/{id}/result
   - Status: 200
   - Response: { "status": "done", "result": {...} }
```

---

## 📊 RESUMEN DE EVIDENCIAS NECESARIAS

### **Mínimo indispensable:**

1. ✅ **1 screenshot de chat:** Request + Status + Response
2. ✅ **1 screenshot de voice STT:** Request + Status + Response
3. ✅ **1 screenshot de meetings:** Request /start + Status + meetingId

### **Ideal (cierre completo):**

- ✅ Salida del script `test-endpoints.sh`
- ✅ Test de TTS (html funciona)
- ✅ 3 screenshots de Network tab (chat, voice, meetings)

---

## 🚨 SI ALGO NO FUNCIONA

### **Chat da 404:**
```
❌ Request URL: https://api.al-eon.com/api/chat/stream
❌ Status: 404 Not Found

Problema: Ruta incorrecta
Solución: Verificar que Backend tenga /api/ai/chat/v2
```

### **Voice da 401:**
```
❌ Status: 401 Unauthorized

Problema: JWT token inválido o expirado
Solución: Logout + Login + copiar nuevo token
```

### **Meetings da 502:**
```
❌ Status: 502 Bad Gateway

Problema: Backend está caído o no responde
Solución: Verificar que Core esté corriendo en EC2
```

### **CORS error en Console:**
```
❌ Access to fetch at 'https://api.al-eon.com' from origin 
   'https://al-eon.netlify.app' has been blocked by CORS policy

Problema: Backend no tiene CORS configurado para netlify.app
Solución: Agregar CORS header en Core backend
```

---

## 📦 ENTREGA

**Cuando tengas los screenshots:**

1. Nómbralos descriptivamente:
   - `chat-request-200.png`
   - `voice-stt-request-200.png`
   - `meetings-start-200.png`

2. Si hay errores:
   - `chat-request-404-error.png`
   - `console-cors-error.png`

3. Envía junto con:
   - Salida del script `test-endpoints.sh` (copiar del terminal)
   - Descripción de qué funcionó y qué no

---

## ✅ CHECKLIST RÁPIDO

- [ ] Probé TTS con test-tts.html → funciona ✅
- [ ] Ejecuté test-endpoints.sh → veo status codes
- [ ] Capturé screenshot de chat → 200 OK
- [ ] Capturé screenshot de voice → 200 OK
- [ ] Capturé screenshot de meetings → 200 OK
- [ ] Si hay errores, los documenté

---

**Con esto cerramos oficialmente. Sin screenshots seguimos en teoría.** 🚀
