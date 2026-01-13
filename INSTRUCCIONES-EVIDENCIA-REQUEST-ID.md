# 📋 INSTRUCCIONES PARA EVIDENCIA CON REQUEST-ID

**Fecha:** 13 enero 2026  
**Commit:** 47072be - Request-ID system implementado  
**Estado:** ✅ DESPLEGADO en Netlify (auto-deploy desde main)

---

## 🎯 QUÉ SE IMPLEMENTÓ

Sistema de correlación de logs entre **Frontend (Console/Network)** y **Core (PM2 logs)** usando **Request-ID único (UUID v4)** en TODOS los requests críticos:

✅ **Email:**
- `POST /api/mail/send` - Enviar email
- `POST /api/email/accounts/{accountId}/sync` - Sincronizar cuenta
- `PATCH /api/mail/messages/{messageId}/move` - Mover email a folder

✅ **Voice (Voz):**
- `POST /api/voice/stt` - Speech-to-Text (audio → texto)
- `POST /api/ai/chat` - Enviar mensaje a AL-E Core
- `POST /api/voice/tts` - Text-to-Speech (texto → audio)

✅ **Formato de Log:**
```
[REQ] id=abc123-def456-... endpoint=/api/mail/send status=200
[REQ ERROR] id=abc123-def456-... endpoint=/api/voice/stt error=<mensaje>
```

---

## 📦 ARCHIVOS MODIFICADOS

1. **`src/utils/requestId.js`** (NUEVO)
   - `generateRequestId()` - Genera UUID v4 único
   - `logRequest(requestId, endpoint, status, extras)` - Log exitoso
   - `logRequestError(requestId, endpoint, error)` - Log error

2. **`src/services/emailService.js`**
   - `fetchWithRequestId()` - Wrapper de fetch con Request-ID automático
   - `sendEmail()` - Usa fetchWithRequestId
   - `syncEmailAccount()` - Usa fetchWithRequestId
   - `moveToFolder()` - Usa fetchWithRequestId

3. **`src/hooks/useVoiceMode.js`**
   - STT request: header `x-request-id` + logs
   - Chat request: header `x-request-id` + logs
   - TTS request: header `x-request-id` + logs

---

## 🔍 CÓMO OBTENER EVIDENCIA

### 1️⃣ FRONTEND - Console Logs

**Abre DevTools (Chrome/Firefox):**
1. Click derecho → Inspeccionar → Console
2. Realiza la acción (enviar email, usar micrófono, etc)
3. Busca en console: `[REQ]` o `[REQ ERROR]`

**Ejemplo - Email exitoso:**
```
[REQ-MAIL] 📤 Iniciando envío de email - id=abc123-def456-789xyz
[REQ] 📤 POST /api/mail/send - id=abc123-def456-789xyz
[EmailService] ✅ Email enviado: {...}
[REQ] id=abc123-def456-789xyz endpoint=/api/mail/send status=200 userId=user_xyz accountId=acc_123
```

**Ejemplo - Voice (STT → Chat → TTS):**
```
[REQ-VOICE] 📤 STT - id=stt123-456 sessionId=session_xyz
[REQ] 📤 POST /api/voice/stt - id=stt123-456
[REQ] id=stt123-456 endpoint=/api/voice/stt status=200 sessionId=session_xyz textLength=45

[REQ-VOICE] 📤 CHAT - id=chat789-012 sessionId=session_xyz
[REQ] 📤 POST /api/ai/chat - id=chat789-012
[REQ] id=chat789-012 endpoint=/api/ai/chat status=200 sessionId=session_xyz responseLength=120

[REQ-VOICE] 📤 TTS - id=tts345-678 sessionId=session_xyz
[REQ] 📤 POST /api/voice/tts - id=tts345-678
[REQ] id=tts345-678 endpoint=/api/voice/tts status=200 sessionId=session_xyz audioBlobSize=45600
```

---

### 2️⃣ FRONTEND - Network Tab

**Captura Headers en DevTools:**
1. Inspeccionar → Network → Filter: `fetch/xhr`
2. Realiza la acción
3. Click en request → Headers → Request Headers
4. Buscar: `x-request-id: abc123-def456-789xyz`

**Tomar screenshot:**
- Request URL: `https://api.al-eon.com/api/mail/send`
- Request Headers: `x-request-id: abc123-...`
- Response Status: `200 OK`
- Response Body: `{ "messageId": "...", "success": true }`

---

### 3️⃣ BACKEND (CORE) - PM2 Logs

**SSH al servidor EC2:**
```bash
ssh -i your-key.pem ubuntu@<ec2-ip>
```

**Comandos para buscar Request-ID en logs:**

**A. Ver logs recientes con Request-ID:**
```bash
pm2 logs al-e-core --lines 300 | grep "\[REQ\]"
```

**B. Buscar Request-ID específico:**
```bash
pm2 logs al-e-core --lines 500 | grep "abc123-def456-789xyz"
```

**C. Filtrar por endpoint (ejemplo: mail):**
```bash
pm2 logs al-e-core --lines 300 | egrep "\[REQ\]|\[MAIL\]"
```

**D. Filtrar por voice (STT/TTS/Chat):**
```bash
pm2 logs al-e-core --lines 300 | egrep "\[REQ\]|\[STT\]|\[TTS\]|\[CHAT\]"
```

**Ejemplo de log esperado en Core:**
```
2026-01-13T14:30:45.123Z [REQ] id=abc123-def456-789xyz user=user_xyz session=session_123 route=/api/mail/send
2026-01-13T14:30:45.250Z [MAIL] ✅ Email enviado via SMTP accountId=acc_123 messageId=<...>
```

---

## 📊 FORMATO DE EVIDENCIA REQUERIDO

Para cada feature (Email, Voice, Sessions):

### ✅ BLOQUE DE EVIDENCIA COMPLETO

```markdown
## 🧪 FEATURE: [Email Send / Voice STT / Session Isolation]

### 1. REQUEST-ID
`abc123-def456-789xyz`

### 2. FRONTEND LOGS (Console)
```
[REQ-MAIL] 📤 Iniciando envío de email - id=abc123-def456-789xyz
[REQ] id=abc123-def456-789xyz endpoint=/api/mail/send status=200 userId=user_xyz accountId=acc_123
```

### 3. NETWORK SCREENSHOT
[Adjuntar screenshot de DevTools → Network → Headers mostrando `x-request-id`]

### 4. CORE PM2 LOGS
```
2026-01-13T14:30:45.123Z [REQ] id=abc123-def456-789xyz user=user_xyz session=session_123 route=/api/mail/send
2026-01-13T14:30:45.250Z [MAIL] ✅ Email enviado via SMTP accountId=acc_123
```

### 5. RESULTADO
✅ EXITOSO / ❌ FALLÓ

### 6. NOTAS
- User ID correcto: `user_xyz`
- Session ID correcto: `session_123`
- Correlación Frontend ↔ Core: VERIFICADA
```

---

## 🚨 CASOS DE PRUEBA PRIORITARIOS

### P0-1: SESSION ISOLATION
**Test:** Login User A → logout → login User B → verificar no hay data de A
**Evidence:**
- Screenshot de Console con `[AUTH] 🧹 Estado limpiado: sessionStorage`
- Screenshot de UI mostrando NO hay conversaciones de User A cuando B logea

### P0-2: MICROPHONE VALIDATION
**Test:** Click micrófono → hablar → verificar bytes > 0 antes de enviar
**Evidence:**
- Console log: `✅ [P0-2] BYTES GRABADOS: 45600 bytes`
- Request-ID de `/api/voice/stt` con status 200
- Core PM2 log confirmando STT recibido y procesado

### P0-3: EMAIL UI ERROR HANDLING
**Test:** Enviar email con credenciales inválidas o destinatario mal formado
**Evidence:**
- Console log: `[REQ ERROR] id=... endpoint=/api/mail/send error=<mensaje real del backend>`
- Screenshot de Toast mostrando error REAL (no "Enviado exitosamente")
- Textarea SIEMPRE editable (no bloqueada)

### P0-4: EMAIL FOLDERS (Ya implementado 11/ene)
**Test:** Sincronizar cuenta → verificar folders visibles (Inbox, Sent, Drafts)
**Evidence:**
- Console log: `[EmailService] 🏷️ Label estándar: INBOX`
- Screenshot de sidebar mostrando folders correctos

---

## ⚠️ IMPORTANTE - NO EJECUTADO AÚN

El archivo **`FIX-PRIVACIDAD-CRITICO-13-ENE-2026.sql`** DEBE ejecutarse en **Supabase SQL Editor** antes de probar privacy:

```sql
-- Ejecutar manualmente en Supabase:
-- 1. Dashboard → SQL Editor → New Query
-- 2. Pegar contenido completo de FIX-PRIVACIDAD-CRITICO-13-ENE-2026.sql
-- 3. Run
-- 4. Verificar con queries al final del archivo
```

**Sin este SQL ejecutado:**
- ❌ TODOS los usuarios siguen viendo TODAS las conversaciones
- ❌ RLS policies NO están aplicadas
- ❌ Privacy ROTO

---

## 🎯 NEXT STEPS (Para Usuario)

1. ✅ Verificar Netlify deploy exitoso (2-3 min después de push 47072be)
2. ✅ Abrir https://chat.al-eon.com en Chrome
3. ✅ Abrir DevTools (Console + Network)
4. 🔨 **EJECUTAR SQL** en Supabase antes de cualquier test de privacy
5. 🧪 Realizar tests P0-1, P0-2, P0-3, P0-4
6. 📸 Capturar evidencia según formato arriba
7. 📋 Pegar bloques de evidencia con Request-IDs correlacionados

---

## 📞 COMANDOS ÚTILES PARA CORE TEAM

```bash
# Ver logs en tiempo real con Request-IDs
pm2 logs al-e-core --raw | grep "\[REQ\]"

# Buscar Request-ID específico (reemplazar abc123...)
pm2 logs al-e-core --lines 1000 --nostream | grep "abc123-def456-789xyz"

# Ver errores con Request-ID
pm2 logs al-e-core --err --lines 200 | grep "\[REQ ERROR\]"

# Filtrar por feature (mail, voice, auth)
pm2 logs al-e-core --lines 300 | egrep "\[REQ\]|\[MAIL\]"
pm2 logs al-e-core --lines 300 | egrep "\[REQ\]|\[STT\]|\[TTS\]"
pm2 logs al-e-core --lines 300 | egrep "\[REQ\]|\[AUTH\]"
```

---

## ✅ CONFIRMACIÓN TÉCNICA

- **Formato exacto:** `[REQ] id=<uuid> endpoint=<path> status=<code>`
- **Header inyectado:** `x-request-id` en TODOS los fetch al Core
- **UUID v4:** `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx` (36 chars con guiones)
- **Logging:** Frontend Console + Core PM2 con mismo Request-ID
- **Deployado:** Commit 47072be → GitHub → Netlify auto-deploy
- **Fecha:** 13 enero 2026 14:30 CST

---

**READY PARA EVIDENCIA. NO MÁS "PROBALO Y AVÍSAME". DAME LOGS.**
