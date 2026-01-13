# 🔧 INSTRUCCIONES TÉCNICAS - EQUIPO CORE

**Fecha:** 11 de enero de 2026  
**Destinatario:** Desarrolladores AL-E Core  
**Servidor:** EC2 100.27.201.233  
**Estado actual:** 60% funcional, 27.5% parcial, 12.5% no funcional

---

## 🚨 P0 - CRÍTICOS (DEADLINE: 12-14 ENE)

### P0-1: CONFIGURAR ENVÍO DE CORREOS (12 ENE, 18:00)

**Problema:** `mail.send` declarado como `true` pero AWS SES NO configurado.

**Evidencia:**
```typescript
// actionGateway.ts línea 88:
const CAPABILITIES = {
  'mail.send': true,  // ← MENTIRA
}

// emailTools.ts líneas 274-333:
export async function sendEmail(userId, draft) {
  // Requiere AWS_SES_* variables ← NO ESTÁN
}
```

**SOLUCIÓN A (Recomendada):**

1. Configurar variables en EC2:
```bash
# En /home/ubuntu/AL-E-Core/.env
AWS_SES_REGION=us-east-1
AWS_SES_ACCESS_KEY=AKIA...
AWS_SES_SECRET_KEY=...
AWS_SES_FROM_EMAIL=noreply@al-eon.com
```

2. Verificar dominio en AWS SES Console:
```bash
https://console.aws.amazon.com/ses/
→ Verified identities
→ Create identity
→ Domain: al-eon.com
→ Seguir instrucciones DNS
```

3. Test de envío:
```bash
cd /home/ubuntu/AL-E-Core
node -e "
const AWS = require('aws-sdk');
const ses = new AWS.SES({ region: 'us-east-1' });
ses.sendEmail({
  Source: 'noreply@al-eon.com',
  Destination: { ToAddresses: ['p.garibay@infinitykode.com'] },
  Message: {
    Subject: { Data: 'Test AL-E SES' },
    Body: { Text: { Data: 'Funciona' } }
  }
}).promise().then(console.log).catch(console.error);
"
```

**SOLUCIÓN B (Alternativa):**

Usar SMTP de Hostinger (ya configurado para IMAP):

```typescript
// src/ai/tools/emailTools.ts
import nodemailer from 'nodemailer';

const transport = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.HOSTINGER_EMAIL,
    pass: process.env.HOSTINGER_PASSWORD
  }
});

export async function sendEmail(userId, draft) {
  // Usar transport.sendMail() en lugar de AWS SES
}
```

**VERIFICACIÓN:**
```bash
curl -X POST https://api.al-eon.com/api/ai/chat/v2 \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Envía un correo a test@example.com con asunto Test",
    "userId": "aa6e5204-7ff5-47fc-814b-b52e5c6af5d6"
  }'

# Debe retornar:
{
  "toolResults": [{
    "tool": "send_email",
    "status": "success",
    "evidence": { "messageId": "..." }
  }]
}
```

---

### P0-2: IMPLEMENTAR WORKER DE NOTIFICACIONES (14 ENE, 18:00)

**Problema:** `notification_jobs` se crean pero NUNCA se ejecutan.

**Evidencia:**
```sql
SELECT * FROM notification_jobs WHERE status='pending';
-- Hay registros pendientes pero ningún worker los procesa
```

**SOLUCIÓN:**

1. Crear worker:
```typescript
// src/workers/notificationWorker.ts

import cron from 'node-cron';
import { supabase } from '../lib/supabase';
import { sendTelegramMessage } from '../services/telegram';

// Ejecutar cada minuto
cron.schedule('* * * * *', async () => {
  console.log('[NOTIFICATION WORKER] Checking pending jobs...');
  
  const { data: pending, error } = await supabase
    .from('notification_jobs')
    .select('*')
    .eq('status', 'pending')
    .lte('run_at', new Date().toISOString())
    .limit(10);

  if (error) {
    console.error('[NOTIFICATION WORKER] Error:', error);
    return;
  }

  console.log(`[NOTIFICATION WORKER] Found ${pending.length} jobs`);

  for (const job of pending) {
    try {
      if (job.channel === 'telegram') {
        await sendTelegramMessage(
          job.payload.chatId,
          formatEventReminder(job.payload)
        );
      }
      
      // Marcar como enviado
      await supabase
        .from('notification_jobs')
        .update({ 
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', job.id);
        
      console.log(`[NOTIFICATION WORKER] ✅ Job ${job.id} sent`);
      
    } catch (err) {
      console.error(`[NOTIFICATION WORKER] ❌ Job ${job.id} failed:`, err);
      
      await supabase
        .from('notification_jobs')
        .update({ 
          status: 'failed',
          error: err.message
        })
        .eq('id', job.id);
    }
  }
});

function formatEventReminder(payload) {
  return `🔔 Recordatorio de evento:\n\n` +
    `📅 ${payload.title}\n` +
    `🕐 ${payload.start_at}\n` +
    `📍 ${payload.location || 'Sin ubicación'}`;
}

export function startNotificationWorker() {
  console.log('[NOTIFICATION WORKER] Started');
}
```

2. Iniciar en app:
```typescript
// src/index.ts

import { startNotificationWorker } from './workers/notificationWorker';

// Después de app.listen()
startNotificationWorker();
```

3. Instalar dependencia:
```bash
cd /home/ubuntu/AL-E-Core
npm install node-cron
pm2 restart al-e-core
```

**VERIFICACIÓN:**
```bash
# Ver logs
pm2 logs al-e-core | grep "NOTIFICATION WORKER"

# Debe mostrar:
# [NOTIFICATION WORKER] Started
# [NOTIFICATION WORKER] Checking pending jobs...
# [NOTIFICATION WORKER] Found X jobs
# [NOTIFICATION WORKER] ✅ Job abc123 sent
```

---

### P0-3: IMPLEMENTAR REFRESH DE OAUTH TOKENS (13 ENE, 18:00)

**Problema:** Tokens de Gmail/Outlook expiran después de 1 hora.

**Evidencia:**
```typescript
// oauth.ts NO refresca automáticamente
// user_integrations.expires_at pasa y tokens no se renuevan
```

**SOLUCIÓN:**

```typescript
// src/api/auth/oauth.ts

async function refreshTokenIfNeeded(integration: UserIntegration) {
  const expiresAt = new Date(integration.expires_at);
  const now = new Date();
  const timeLeft = expiresAt.getTime() - now.getTime();
  
  // Si quedan menos de 5 minutos, refrescar
  if (timeLeft < 5 * 60 * 1000) {
    console.log(`🔄 Refreshing token for ${integration.integration_type}...`);
    
    const refreshed = await refreshAccessToken(integration);
    
    // Actualizar en DB
    await supabase
      .from('user_integrations')
      .update({
        access_token: refreshed.access_token,
        expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', integration.id);
    
    console.log(`✅ Token refreshed for ${integration.integration_type}`);
    
    return refreshed.access_token;
  }
  
  return integration.access_token;
}

async function refreshAccessToken(integration: UserIntegration) {
  if (integration.integration_type.includes('google')) {
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: integration.refresh_token,
      grant_type: 'refresh_token'
    });
    
    return {
      access_token: response.data.access_token,
      expires_in: response.data.expires_in
    };
  }
  
  if (integration.integration_type.includes('microsoft')) {
    const response = await axios.post(
      `https://login.microsoftonline.com/common/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: MICROSOFT_CLIENT_ID,
        client_secret: MICROSOFT_CLIENT_SECRET,
        refresh_token: integration.refresh_token,
        grant_type: 'refresh_token',
        scope: 'offline_access Mail.ReadWrite'
      })
    );
    
    return {
      access_token: response.data.access_token,
      expires_in: response.data.expires_in
    };
  }
  
  throw new Error(`Unsupported integration type: ${integration.integration_type}`);
}

// Ejecutar ANTES de cada operación IMAP/SMTP
export async function getValidAccessToken(userId: string, accountId: string) {
  const { data: integration } = await supabase
    .from('user_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('account_id', accountId)
    .single();
  
  if (!integration) throw new Error('Integration not found');
  
  return await refreshTokenIfNeeded(integration);
}
```

**INTEGRAR en emailTools:**
```typescript
// src/ai/tools/emailTools.ts

import { getValidAccessToken } from '../../api/auth/oauth';

export async function listEmails(userId, filters) {
  const account = await getAccount(filters.accountId);
  
  // ANTES de conectar IMAP:
  if (account.account_type === 'gmail_oauth') {
    const validToken = await getValidAccessToken(userId, account.id);
    account.access_token = validToken;
  }
  
  // Continuar con IMAP...
}
```

**VERIFICACIÓN:**
```bash
# Esperar 1 hora después de conectar Gmail
# Intentar leer correos
# NO debe fallar con "Invalid credentials"
```

---

## 🟡 P1 - CONTRATOS CON FRONTEND (13 ENE, 18:00)

### P1-1: CONTRATO MAIL

**Problema:** Core devuelve correos sin diferenciar carpetas correctamente.

**REGLA OBLIGATORIA:**

```typescript
// src/ai/tools/emailTools.ts

export async function listEmails(userId, filters) {
  // VALIDAR que filters.label está presente
  if (!filters.label) {
    throw new Error('label is required: INBOX | SENT | DRAFT | SPAM | TRASH');
  }
  
  // VALIDAR que es un label válido
  const validLabels = ['INBOX', 'SENT', 'DRAFT', 'SPAM', 'TRASH'];
  if (!validLabels.includes(filters.label)) {
    throw new Error(`Invalid label: ${filters.label}`);
  }
  
  console.log(`📬 Listing emails for label: ${filters.label}`);
  
  // Buscar folder por folder_type
  const { data: folders } = await supabase
    .from('email_folders')
    .select('id')
    .eq('account_id', filters.accountId)
    .eq('folder_type', filters.label.toLowerCase());  // ← CRÍTICO
  
  if (!folders || folders.length === 0) {
    return { emails: [], label: filters.label };
  }
  
  const folderIds = folders.map(f => f.id);
  
  // Buscar mensajes SOLO en esas folders
  const { data: messages } = await supabase
    .from('email_messages')
    .select('*')
    .in('folder_id', folderIds)
    .eq('owner_user_id', userId)
    .order('date', { ascending: false })
    .limit(filters.limit || 20);
  
  // SIEMPRE retornar el label en la respuesta
  return {
    emails: messages,
    label: filters.label,
    count: messages.length
  };
}
```

**REGLA REPLY:**

```typescript
export async function replyEmail(userId, args) {
  // VALIDAR que threadId y messageId están presentes
  if (!args.threadId || !args.messageId) {
    throw new Error('threadId and messageId are required for reply');
  }
  
  // Obtener mensaje original
  const { data: original } = await supabase
    .from('email_messages')
    .select('*')
    .eq('id', args.messageId)
    .single();
  
  if (!original) {
    throw new Error(`Message ${args.messageId} not found`);
  }
  
  // Construir reply con headers RFC
  const replyHeaders = {
    'In-Reply-To': original.message_id,
    'References': original.references 
      ? `${original.references} ${original.message_id}` 
      : original.message_id
  };
  
  // Enviar con SMTP
  const messageId = await sendEmailWithHeaders({
    to: original.from,
    subject: `Re: ${original.subject}`,
    body: args.body,
    headers: replyHeaders,
    threadId: args.threadId
  });
  
  // SOLO si messageId existe, declarar éxito
  if (!messageId) {
    throw new Error('Failed to send reply: no messageId returned');
  }
  
  return {
    status: 'success',
    messageId,
    threadId: args.threadId
  };
}
```

---

### P1-2: CONTRATO ATTACHMENTS

**Problema:** LLM a veces dice "no puedo ver archivos" aunque `attachmentProcessor` existe.

**REGLA OBLIGATORIA:**

```typescript
// src/ai/orchestrator.ts

private async processMessage(userId, userMessage, attachments) {
  let enhancedMessage = userMessage;
  
  // SI HAY ATTACHMENTS, procesar ANTES del LLM
  if (attachments && attachments.length > 0) {
    console.log(`📎 Processing ${attachments.length} attachments...`);
    
    for (const file of attachments) {
      try {
        const extracted = await attachmentProcessor.process(file);
        
        // INYECTAR en el mensaje
        enhancedMessage += `\n\n[ARCHIVO: ${file.name}]\n${extracted.text}\n[FIN ARCHIVO]`;
        
        console.log(`✅ Processed ${file.name}: ${extracted.text.length} chars`);
        
      } catch (err) {
        console.error(`❌ Error processing ${file.name}:`, err);
        
        // INYECTAR ERROR en el mensaje (no ocultar)
        enhancedMessage += `\n\n[ERROR TÉCNICO: No pude procesar ${file.name}: ${err.message}]`;
      }
    }
  }
  
  // PROHIBIDO que el LLM diga "no puedo ver archivos"
  // El texto ya está inyectado en enhancedMessage
  
  return enhancedMessage;
}
```

**ACTUALIZAR SYSTEM PROMPT:**

```typescript
// src/ai/prompts/aleon.ts

export const aleonSystemPrompt = `
...

REGLA SOBRE ARCHIVOS:

- Si el usuario adjuntó un archivo, el contenido YA está en el contexto.
- Busca secciones marcadas con [ARCHIVO: nombre] ... [FIN ARCHIVO].
- SI está presente, analiza el contenido directamente.
- SI hay [ERROR TÉCNICO], explica el error al usuario.
- PROHIBIDO decir "no puedo ver archivos" si el contenido está presente.

Ejemplo:
Usuario: "Resume este PDF"
Contexto contiene: [ARCHIVO: doc.pdf] Este es el texto extraído... [FIN ARCHIVO]
Respuesta correcta: "El documento explica..."
Respuesta PROHIBIDA: "No puedo ver archivos PDF"

...
`;
```

---

### P1-3: CONTRATO VOZ

**Problema:** Core recibe buffers vacíos (audio.size === 0).

**REGLA OBLIGATORIA:**

```typescript
// src/api/voice.ts

router.post('/stt', upload.single('audio'), async (req, res) => {
  const audioFile = req.file;
  
  // VALIDAR que audio existe y tiene contenido
  if (!audioFile) {
    console.error('❌ No audio file received');
    return res.status(400).json({ 
      error: 'No audio file provided' 
    });
  }
  
  if (audioFile.size === 0) {
    console.error('❌ Audio file is empty (0 bytes)');
    return res.status(400).json({ 
      error: 'Audio file is empty' 
    });
  }
  
  console.log(`🎙️ Received audio: ${audioFile.size} bytes, ${audioFile.mimetype}`);
  
  // Validar duración mínima (si es posible)
  // ...
  
  // Transcribir con Whisper
  const text = await transcribeWithWhisper(audioFile);
  
  if (!text || text.trim() === '') {
    console.error('❌ Whisper returned empty text');
    return res.status(400).json({ 
      error: 'Could not transcribe audio (empty result)' 
    });
  }
  
  console.log(`✅ Transcribed: "${text}"`);
  
  res.json({ text });
});

router.post('/tts', async (req, res) => {
  const { text } = req.body;
  
  if (!text || text.trim() === '') {
    console.error('❌ No text provided for TTS');
    return res.status(400).json({ 
      error: 'No text provided' 
    });
  }
  
  console.log(`🔊 Generating TTS for: "${text.substring(0, 50)}..."`);
  
  const audioBuffer = await generateTTS(text);
  
  if (!audioBuffer || audioBuffer.length === 0) {
    console.error('❌ TTS returned empty buffer');
    return res.status(500).json({ 
      error: 'Could not generate audio (empty result)' 
    });
  }
  
  console.log(`✅ Generated audio: ${audioBuffer.length} bytes`);
  
  res.set('Content-Type', 'audio/mpeg');
  res.send(audioBuffer);
});
```

---

## 🟢 P2 - GUARDRAILS (INMEDIATO)

### P2-1: NUNCA MENTIR

**REGLA YA IMPLEMENTADA (verificar que funciona):**

```typescript
// src/ai/orchestrator.ts líneas 432-463

// Si modeClassification.evidenceRequired && !evidence:
if (modeClassification.evidenceRequired && !toolResults?.evidence?.id) {
  console.error('🚨 P0 VIOLATION: Tool ejecutado SIN evidencia');
  
  return {
    toolFailed: true,
    toolError: 'No pude completar la acción. Motivo técnico: sin evidencia',
    explanation: 'Se requería evidencia pero no se obtuvo'
  };
}
```

**VERIFICAR que NO se bypassea:**

```bash
# Test: Pedir enviar correo sin AWS SES configurado
curl -X POST https://api.al-eon.com/api/ai/chat/v2 \
  -H "Authorization: Bearer $JWT" \
  -d '{"message": "Envía correo a test@example.com"}'

# Debe retornar:
{
  "response": "No pude enviar el correo. Motivo técnico: AWS SES no configurado",
  "toolResults": []
}

# NO DEBE decir: "He enviado el correo" ❌
```

---

### P2-2: NO DECIR "NO" A LA PRIMERA

**IMPLEMENTAR EN ORCHESTRATOR:**

```typescript
// src/ai/orchestrator.ts

private async attemptAction(intent, userMessage, ctx) {
  console.log(`🔍 Attempting action: ${intent.primary}`);
  
  // 1️⃣ BUSCAR herramientas disponibles
  const availableTools = this.findAvailableTools(intent);
  
  if (availableTools.length === 0) {
    console.log('⚠️ No tools available, searching alternatives...');
    
    // Intentar con herramientas similares
    const alternatives = this.findAlternativeTools(intent);
    
    if (alternatives.length > 0) {
      console.log(`✅ Found ${alternatives.length} alternatives`);
      return await this.executeTools(alternatives, userMessage, ctx);
    }
  }
  
  // 2️⃣ INTENTAR ejecutar con parámetros mínimos
  try {
    return await this.executeTools(availableTools, userMessage, ctx);
  } catch (err) {
    console.log('⚠️ First attempt failed, retrying with fallback...');
    
    // 3️⃣ CONFIGURAR: intentar con parámetros diferentes
    const fallback = this.createFallbackParams(availableTools, err);
    
    try {
      return await this.executeTools(fallback.tools, userMessage, ctx);
    } catch (err2) {
      // 4️⃣ ESCALAR: reportar error técnico REAL
      console.error('❌ All attempts failed:', err2);
      
      return {
        toolFailed: true,
        toolError: `Intenté ejecutar esta acción. Falló en el paso ${fallback.step} por ${err2.message}. Siguiente opción viable: ${fallback.suggestion}`
      };
    }
  }
}
```

**PROHIBIR FRASES en SYSTEM PROMPT:**

```typescript
// src/ai/prompts/aleon.ts

export const aleonSystemPrompt = `
...

PROHIBIDO RESPONDER:

❌ "No tengo acceso"
❌ "No puedo hacer eso"
❌ "No es posible"
❌ "No tengo información sobre eso"

Sin antes haber INTENTADO:
1. Buscar herramientas disponibles
2. Ejecutar con parámetros mínimos
3. Reintentar con fallback
4. Configurar lo que falte

SOLO puedes declarar imposibilidad si:
- Violación legal/ética
- Falta de credenciales confirmada (después de revisar)
- Error técnico documentado (con logs)

Formato obligatorio cuando falla:
"Intenté ejecutar esta acción.
Falló en el paso ___ por ___ (error técnico).
Siguiente opción viable: ___."

...
`;
```

---

## 📋 CHECKLIST DE ENTREGA

### Para P0-1 (AWS SES / SMTP):

```bash
□ Variables AWS_SES_* configuradas en .env
□ Dominio verificado en AWS SES Console
□ Test de envío exitoso
□ runtime-capabilities.json actualizado con estado real
□ Logs muestran "✅ Email sent: messageId=..."
□ Frontend recibe messageId en toolResults
```

### Para P0-2 (Worker Notificaciones):

```bash
□ notificationWorker.ts creado
□ Cron schedule configurado (cada minuto)
□ Worker iniciado en index.ts
□ PM2 logs muestran "[NOTIFICATION WORKER] Started"
□ Test: crear evento con notificación → se envía Telegram
□ notification_jobs cambian de pending → sent
```

### Para P0-3 (OAuth Refresh):

```bash
□ refreshTokenIfNeeded() implementado
□ getValidAccessToken() integrado en emailTools
□ Test: esperar 1 hora → leer correos → NO falla
□ Logs muestran "🔄 Refreshing token..."
□ user_integrations.expires_at se actualiza
```

### Para P1 (Contratos):

```bash
□ listEmails() valida label obligatorio
□ replyEmail() valida threadId y messageId
□ attachmentProcessor inyecta texto ANTES del LLM
□ System prompt prohíbe "no puedo ver archivos"
□ STT/TTS validan buffers no vacíos
□ Logs muestran tamaños de audio
```

### Para P2 (Guardrails):

```bash
□ Evidence validation activa (ya existe)
□ attemptAction() intenta antes de decir "no"
□ System prompt prohíbe frases defensivas
□ Test: acción sin capability → intenta alternativas
□ Test: acción imposible → explica por qué
```

---

## 🚀 COMANDOS DE DESPLIEGUE

```bash
# 1. Conectar a EC2
ssh ubuntu@100.27.201.233

# 2. Ir al proyecto
cd /home/ubuntu/AL-E-Core

# 3. Pull cambios
git pull origin main

# 4. Instalar dependencias nuevas (si hay)
npm install

# 5. Compilar TypeScript
npm run build

# 6. Reiniciar con PM2
pm2 restart al-e-core

# 7. Ver logs en tiempo real
pm2 logs al-e-core --lines 100

# 8. Verificar health
curl https://api.al-eon.com/health
```

---

## 📊 VALIDACIÓN FINAL

Ejecutar cada test y confirmar:

```bash
✅ Leer INBOX → retorna label="INBOX"
✅ Leer SENT → retorna label="SENT"
✅ Enviar correo → retorna messageId real (no simulado)
✅ Reply → mantiene threadId en headers
✅ Adjuntar PDF → texto inyectado en contexto
✅ Grabar voz → STT retorna texto real
✅ TTS → audio buffer >0 bytes
✅ Crear evento → notification_job creado
✅ Esperar 1 min → notificación enviada por Telegram
✅ OAuth después de 1h → token refrescado automáticamente
✅ Acción sin evidencia → NO dice "he hecho X"
✅ Acción sin capability → intenta alternativas antes de decir "no"
```

---

**DOCUMENTO TÉCNICO COMPLETADO**  
**Generado:** 11 de enero de 2026  
**Versión:** 1.0  
**Estado:** LISTO PARA IMPLEMENTAR
