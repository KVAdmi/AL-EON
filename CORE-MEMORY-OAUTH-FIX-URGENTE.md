# 🚨 CORE: FIX MEMORIA Y OAUTH - URGENTE

**Fecha:** 27 de diciembre de 2025  
**Prioridad:** P0 (Crítico)  
**Afecta:** Memoria de conversaciones + OAuth (Gmail/Calendar/Meet)

---

## 📋 CONTEXTO

### ¿Qué es AL-EON?
**AL-EON** es el frontend web (React + Vite) donde los usuarios chatean con AL-E.

### ¿Qué es AL-E Core?
**AL-E Core** es el backend (Node.js/Express) que:
- Recibe mensajes del frontend via `POST /api/ai/chat`
- Procesa con OpenAI (GPT-4)
- Detecta intents (revisar correo, agendar cita, etc.)
- Ejecuta tools (Gmail API, Calendar API, etc.)
- Retorna respuesta al frontend

### Arquitectura Actual
```
┌─────────────┐                    ┌──────────────┐                  ┌──────────────┐
│   AL-EON    │  POST /api/ai/chat │  AL-E Core   │  Tools (Gmail)   │   Supabase   │
│  (Frontend) │ ──────────────────>│  (Backend)   │ ───────────────> │  (Database)  │
│             │<──────────────────-│              │<─────────────────│              │
└─────────────┘   { response }     └──────────────┘   Fetch emails   └──────────────┘
       │                                   │                                  │
       │ Guarda en user_conversations      │ Debe guardar en ae_messages     │
       │ (messages JSONB)                  │ Debe guardar en ae_memory       │
       └───────────────────────────────────┴─────────────────────────────────┘
```

---

## 🔴 PROBLEMA 1: MEMORIA NO FUNCIONA

### Síntoma
Usuario dice: *"Le hablé de mi proyecto Kunna hace 5 mensajes y ahora no se acuerda"*

AL-E responde: *"No tengo acceso a los detalles específicos del proyecto Kunna"* (aunque está en el historial).

### Causa Raíz
**AL-E Core NO está recuperando el historial de mensajes previos.**

Cada request se procesa como si fuera **nueva conversación**, sin contexto anterior.

### Diagnóstico

#### Frontend (AL-EON) - ✅ FUNCIONA CORRECTAMENTE
```javascript
// src/features/chat/hooks/useChat.js

// 1. Frontend envía sessionId en cada request:
const response = await sendToAleCore({
  accessToken,      // JWT de Supabase
  message: "¿cuántas ventas esperas de Kunna?",  // ✅ SOLO mensaje actual
  sessionId: "abc-123-def",  // ✅ ID persistente de conversación
  workspaceId: "core",
  meta: { platform: "AL-EON", timestamp: "..." }
});

// 2. Frontend guarda mensajes en Supabase:
// user_conversations.messages = [
//   { role: "user", content: "Tengo un proyecto llamado Kunna..." },
//   { role: "assistant", content: "Cuéntame más sobre Kunna..." },
//   { role: "user", content: "¿cuántas ventas esperas de Kunna?" }
// ]
```

**✅ Frontend hace TODO correcto:**
- Envía `sessionId` persistente
- Guarda mensajes en `user_conversations`
- NO envía historial (solo mensaje actual)

#### Backend (AL-E Core) - ❌ NO RECUPERA HISTORIAL

**LO QUE DEBERÍA HACER (Y NO ESTÁ HACIENDO):**

```javascript
// POST /api/ai/chat handler (pseudocódigo)

app.post('/api/ai/chat', async (req, res) => {
  const { message, sessionId, workspaceId } = req.body;
  const userId = req.user.id; // De JWT
  
  // ❌ PROBLEMA: Core NO hace esto:
  // 1. Buscar o crear sesión
  let session = await supabase
    .from('ae_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();
  
  if (!session) {
    session = await supabase
      .from('ae_sessions')
      .insert({ id: sessionId, user_id_uuid: userId, workspace_id: workspaceId })
      .single();
  }
  
  // 2. ❌ CRÍTICO: Recuperar historial de mensajes previos
  const previousMessages = await supabase
    .from('ae_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
  
  // 3. ❌ CRÍTICO: Incluir historial en contexto de OpenAI
  const contextMessages = [
    { role: 'system', content: 'Eres AL-E, asistente de Infinity Kode...' },
    ...previousMessages, // ← ¡ESTO FALTA!
    { role: 'user', content: message }
  ];
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: contextMessages // ← Debe incluir historial
  });
  
  // 4. ❌ Guardar nuevo mensaje en ae_messages
  await supabase.from('ae_messages').insert([
    { session_id: sessionId, role: 'user', content: message },
    { session_id: sessionId, role: 'assistant', content: completion.choices[0].message.content }
  ]);
  
  res.json({ response: completion.choices[0].message.content });
});
```

---

## 🔴 PROBLEMA 2: OAUTH NO FUNCIONA (GMAIL/CALENDAR)

### Síntoma
Usuario dice: *"revisa mi correo"*

AL-E responde: *"Tienes 5 correos de Amazon sobre pedidos"* (MENTIRA - usuario NO tiene esos correos).

### Causa Raíz
**AL-E Core NO está usando los tokens OAuth reales para llamar a Gmail API.**

En lugar de eso, está **alucinando** respuestas (inventando correos que no existen).

### Diagnóstico

#### Frontend (AL-EON) - ✅ FUNCIONA CORRECTAMENTE
```javascript
// 1. Usuario conecta Gmail en /settings/integrations
// 2. OAuth flow → Supabase guarda tokens en user_integrations:

// user_integrations:
// {
//   user_id: "uuid-user-123",
//   integration_type: "gmail",
//   access_token: "ya29.a0AfH6SMBx...",
//   refresh_token: "1//0gxxx...",
//   expires_at: "2025-12-27T20:00:00Z",
//   scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
//   connected_at: "2025-12-27T18:00:00Z"
// }
```

**✅ Frontend guardó tokens OAuth correctamente en Supabase.**

#### Backend (AL-E Core) - ❌ NO USA TOKENS

**LO QUE DEBERÍA HACER (Y NO ESTÁ HACIENDO):**

```javascript
// Intent detection: "revisa mi correo" → tool: gmail_read

async function toolGmailRead(userId) {
  // 1. ❌ CRÍTICO: Recuperar tokens OAuth del usuario
  const integration = await supabase
    .from('user_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('integration_type', 'gmail')
    .single();
  
  if (!integration) {
    return { error: 'Gmail no conectado. Conéctalo en Configuración → Integraciones.' };
  }
  
  // 2. ❌ Verificar si token expiró y renovar si es necesario
  if (new Date(integration.expires_at) < new Date()) {
    const newTokens = await refreshGoogleToken(integration.refresh_token);
    integration.access_token = newTokens.access_token;
    
    await supabase
      .from('user_integrations')
      .update({ access_token: newTokens.access_token, expires_at: newTokens.expires_at })
      .eq('id', integration.id);
  }
  
  // 3. ❌ CRÍTICO: Llamar Gmail API con token REAL
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10', {
    headers: {
      'Authorization': `Bearer ${integration.access_token}`
    }
  });
  
  if (!response.ok) {
    return { error: 'Error al acceder a Gmail. Intenta reconectar en Configuración.' };
  }
  
  const data = await response.json();
  
  // 4. ❌ Parsear correos REALES (no inventar)
  const emails = [];
  for (const msg of data.messages) {
    const detail = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
      headers: { 'Authorization': `Bearer ${integration.access_token}` }
    }).then(r => r.json());
    
    emails.push({
      subject: detail.payload.headers.find(h => h.name === 'Subject')?.value,
      from: detail.payload.headers.find(h => h.name === 'From')?.value,
      snippet: detail.snippet
    });
  }
  
  return { emails }; // ← Datos REALES, no inventados
}
```

---

## ✅ SOLUCIÓN COMPLETA

### 1. SQL: Vincular user_conversations con ae_sessions

```sql
-- Agregar columna session_id a user_conversations para vincular con ae_sessions
ALTER TABLE user_conversations 
ADD COLUMN IF NOT EXISTS session_id UUID;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_user_conversations_session_id 
  ON user_conversations(session_id);

-- Agregar FK constraint (opcional, depende de tu flujo)
-- ALTER TABLE user_conversations
-- ADD CONSTRAINT user_conversations_session_id_fkey 
-- FOREIGN KEY (session_id) REFERENCES ae_sessions(id) ON DELETE CASCADE;
```

**Ejecuta este SQL en Supabase SQL Editor.**

---

### 2. Node.js: Recuperar Historial de Mensajes

```javascript
// src/routes/chat.js (o donde manejes POST /api/ai/chat)

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // ← Usa service_role para acceso sin RLS
);

app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, sessionId, workspaceId = 'core' } = req.body;
    const userId = req.user.id; // De JWT (Authorization Bearer)
    
    if (!message || !sessionId) {
      return res.status(400).json({ error: 'message y sessionId son requeridos' });
    }
    
    // 1. 🔥 CRÍTICO: Buscar o crear sesión en ae_sessions
    let { data: session, error: sessionError } = await supabase
      .from('ae_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (sessionError && sessionError.code === 'PGRST116') {
      // No existe, crear nueva
      console.log('📝 Creando nueva sesión:', sessionId);
      
      const { data: newSession, error: createError } = await supabase
        .from('ae_sessions')
        .insert({
          id: sessionId,
          user_id_uuid: userId,
          workspace_id: workspaceId,
          assistant_id: 'AL-E',
          title: message.substring(0, 50), // Primeros 50 chars como título
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          total_messages: 0,
          total_tokens: 0,
          estimated_cost: 0
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Error creando sesión:', createError);
        throw new Error(`Failed to create session: ${createError.message}`);
      }
      
      session = newSession;
      console.log('✅ Sesión creada:', session.id);
    } else if (sessionError) {
      console.error('❌ Error buscando sesión:', sessionError);
      throw new Error(`Failed to fetch session: ${sessionError.message}`);
    } else {
      console.log('✅ Sesión existente encontrada:', session.id);
    }
    
    // 2. 🔥 CRÍTICO: Recuperar historial de mensajes previos
    const { data: previousMessages, error: messagesError } = await supabase
      .from('ae_messages')
      .select('role, content, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(50); // Últimos 50 mensajes (ajusta según necesites)
    
    if (messagesError) throw messagesError;
    
    console.log(`📚 Recuperados ${previousMessages?.length || 0} mensajes previos para session ${sessionId}`);
    
    // 3. 🔥 CRÍTICO: Construir contexto con historial
    const contextMessages = [
      {
        role: 'system',
        content: `Eres AL-E, asistente personal de Infinity Kode (Pachuca, México).
Ayudas con: emails (Gmail), calendario (Google Calendar), videollamadas (Meet), gestión de proyectos, búsqueda web.
Hablas español mexicano, tono casual y directo.
IMPORTANTE: Si el usuario menciona información de mensajes anteriores, RECUÉRDALA (está en el historial).`
      },
      ...(previousMessages || []).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ];
    
    // 4. Detectar intents y ejecutar tools
    const intent = await detectIntent(message, contextMessages);
    
    let toolResult = null;
    if (intent === 'gmail_read') {
      toolResult = await toolGmailRead(userId);
    } else if (intent === 'calendar_list') {
      toolResult = await toolCalendarList(userId);
    }
    // ... otros intents
    
    // 5. Si hay tool result, agregarlo al contexto
    if (toolResult && !toolResult.error) {
      contextMessages.push({
        role: 'function',
        name: intent,
        content: JSON.stringify(toolResult)
      });
    } else if (toolResult?.error) {
      contextMessages.push({
        role: 'system',
        content: `Error ejecutando tool: ${toolResult.error}`
      });
    }
    
    // 6. Llamar a OpenAI con contexto completo
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: contextMessages,
      temperature: 0.7,
      max_tokens: 1000
    });
    
    const assistantResponse = completion.choices[0].message.content;
    
    // 7. 🔥 CRÍTICO: Guardar mensajes en ae_messages
    await supabase.from('ae_messages').insert([
      {
        session_id: sessionId,
        user_id_uuid: userId,
        role: 'user',
        content: message,
        created_at: new Date().toISOString()
      },
      {
        session_id: sessionId,
        user_id_uuid: userId,
        role: 'assistant',
        content: assistantResponse,
        created_at: new Date().toISOString(),
        tokens: completion.usage.total_tokens,
        cost: (completion.usage.total_tokens * 0.00001) // Ajusta según pricing
      }
    ]);
    
    // 8. Actualizar ae_sessions
    await supabase
      .from('ae_sessions')
      .update({
        updated_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
        total_messages: session.total_messages + 2,
        total_tokens: session.total_tokens + completion.usage.total_tokens
      })
      .eq('id', sessionId);
    
    // 9. Retornar respuesta
    res.json({
      response: assistantResponse,
      session_id: sessionId,
      tokens: completion.usage.total_tokens
    });
    
  } catch (error) {
    console.error('❌ Error en /api/ai/chat:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
});
```

---

### 3. Node.js: Tool Gmail Read (Datos Reales)

```javascript
// src/tools/gmail.js

async function toolGmailRead(userId) {
  try {
    // 1. Recuperar tokens OAuth del usuario
    const { data: integration, error: integrationError } = await supabase
      .from('user_integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('integration_type', 'gmail')
      .single();
    
    if (integrationError || !integration) {
      return {
        error: 'OAUTH_NOT_CONNECTED',
        message: 'Gmail no está conectado. Ve a Configuración → Integraciones para conectar tu cuenta.'
      };
    }
    
    // 2. Verificar si token expiró
    if (new Date(integration.expires_at) < new Date()) {
      console.log('🔄 Token expirado, renovando...');
      
      const newTokens = await refreshGoogleToken(integration.refresh_token);
      
      if (!newTokens || newTokens.error) {
        return {
          error: 'OAUTH_TOKEN_EXPIRED',
          message: 'Tu sesión de Gmail expiró. Reconecta en Configuración → Integraciones.'
        };
      }
      
      // Actualizar tokens en BD
      await supabase
        .from('user_integrations')
        .update({
          access_token: newTokens.access_token,
          expires_at: newTokens.expires_at,
          updated_at: new Date().toISOString()
        })
        .eq('id', integration.id);
      
      integration.access_token = newTokens.access_token;
    }
    
    // 3. 🔥 CRÍTICO: Llamar Gmail API con token REAL
    const messagesResponse = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&q=is:unread',
      {
        headers: {
          'Authorization': `Bearer ${integration.access_token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!messagesResponse.ok) {
      const errorData = await messagesResponse.json().catch(() => ({}));
      console.error('❌ Gmail API error:', errorData);
      return {
        error: 'GMAIL_API_ERROR',
        message: 'Error al acceder a Gmail. Intenta reconectar en Configuración.'
      };
    }
    
    const messagesData = await messagesResponse.json();
    
    if (!messagesData.messages || messagesData.messages.length === 0) {
      return { emails: [], message: 'No tienes correos sin leer.' };
    }
    
    // 4. 🔥 CRÍTICO: Obtener detalles REALES de cada correo
    const emails = [];
    for (const msg of messagesData.messages.slice(0, 10)) {
      const detailResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
        {
          headers: {
            'Authorization': `Bearer ${integration.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (detailResponse.ok) {
        const detail = await detailResponse.json();
        
        const headers = detail.payload.headers;
        const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '(Sin asunto)';
        const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || 'Desconocido';
        const date = headers.find(h => h.name.toLowerCase() === 'date')?.value || '';
        
        emails.push({
          id: msg.id,
          subject,
          from,
          snippet: detail.snippet,
          date
        });
      }
    }
    
    // 5. Actualizar last_used_at
    await supabase
      .from('user_integrations')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', integration.id);
    
    console.log(`✅ Recuperados ${emails.length} correos reales de Gmail`);
    
    return { emails };
    
  } catch (error) {
    console.error('❌ Error en toolGmailRead:', error);
    return {
      error: 'GMAIL_TOOL_ERROR',
      message: 'Error al leer correos. Intenta de nuevo.'
    };
  }
}

// Helper: Renovar token de Google
async function refreshGoogleToken(refreshToken) {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Error renovando token:', error);
      return { error: error.error_description || 'Token refresh failed' };
    }
    
    const data = await response.json();
    
    return {
      access_token: data.access_token,
      expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString()
    };
  } catch (error) {
    console.error('❌ Error en refreshGoogleToken:', error);
    return { error: error.message };
  }
}

module.exports = { toolGmailRead };
```

---

### 4. Node.js: Detectar Intent

```javascript
// src/utils/intentDetection.js

async function detectIntent(userMessage, contextMessages) {
  const message = userMessage.toLowerCase();
  
  // Patrones de Gmail
  if (
    message.includes('correo') ||
    message.includes('email') ||
    message.includes('mail') ||
    message.includes('bandeja') ||
    message.includes('inbox')
  ) {
    return 'gmail_read';
  }
  
  // Patrones de Calendar
  if (
    message.includes('evento') ||
    message.includes('cita') ||
    message.includes('reunión') ||
    message.includes('calendario') ||
    message.includes('calendar') ||
    message.includes('agenda')
  ) {
    if (message.includes('crear') || message.includes('agendar')) {
      return 'calendar_create';
    }
    return 'calendar_list';
  }
  
  // Patrones de Meet
  if (
    message.includes('meet') ||
    message.includes('videollamada') ||
    message.includes('video llamada')
  ) {
    return 'meet_create';
  }
  
  // Sin intent específico
  return null;
}

module.exports = { detectIntent };
```

---

## 🔍 VALIDACIÓN

### Cómo verificar que funciona:

#### 1. Memoria:
```bash
# En la BD, verificar que ae_messages tiene registros:
SELECT session_id, role, content, created_at 
FROM ae_messages 
WHERE session_id = 'abc-123-def'
ORDER BY created_at DESC;

# Debe retornar TODOS los mensajes de esa conversación
```

#### 2. OAuth Gmail:
```bash
# En logs de Core, buscar:
"✅ Recuperados 5 correos reales de Gmail"

# NO debe aparecer:
"Tienes correos de Amazon..." (inventado)
```

---

## 📦 VARIABLES DE ENTORNO REQUERIDAS

```bash
# .env en AL-E Core

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenAI
OPENAI_API_KEY=sk-proj-xxx

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx

# Config
PORT=3000
NODE_ENV=production
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [ ] Ejecutar SQL: `ALTER TABLE user_conversations ADD COLUMN session_id UUID`
- [ ] Implementar recuperación de historial en `POST /api/ai/chat`
- [ ] Incluir `previousMessages` en contexto de OpenAI
- [ ] Guardar nuevos mensajes en `ae_messages` después de cada respuesta
- [ ] Implementar `toolGmailRead` con tokens OAuth reales
- [ ] Implementar `refreshGoogleToken` para renovar tokens expirados
- [ ] Agregar manejo de errores OAuth claros (OAUTH_NOT_CONNECTED, etc.)
- [ ] Implementar `toolCalendarList` y `toolMeetCreate` (opcional, mismo patrón)
- [ ] Logs detallados: `console.log('📚 Recuperados X mensajes previos')`
- [ ] Testing manual: crear conversación → enviar 5 mensajes → verificar memoria

---

## 🆘 SOPORTE

Si necesitas ayuda con la implementación:
1. Revisa los logs de Core para ver errores
2. Verifica que las variables de entorno estén configuradas
3. Prueba los endpoints de Supabase manualmente
4. Verifica que los tokens OAuth estén en `user_integrations`

**Prioridad:** P0 - Bloqueante  
**Deadline:** Lo antes posible (usuarios reportan que AL-E no recuerda nada)

---

**Generado por:** AL-EON Frontend Team  
**Para:** AL-E Core Backend Team  
**Fecha:** 27 de diciembre de 2025
