# 🚨 FIX CRÍTICO: TELEGRAM BOT + CHAT (INTEGRACIÓN COMPLETA)

**Fecha:** 9 de enero de 2026  
**Prioridad:** P0 - CRÍTICO  
**Estado:** PARA IMPLEMENTAR

---

## 📋 PROBLEMA ACTUAL

### Síntomas
- ✅ El bot de Telegram **SÍ recibe** mensajes del usuario
- ❌ El bot solo responde **"procesando…"** y nunca envía respuesta final
- ❌ Los mensajes que entran por Telegram **NO aparecen** en el chat de la app web
- ❌ No hay persistencia de mensajes de Telegram
- ❌ No hay bridge entre Telegram y el sistema de chat principal

### Flujo Actual (ROTO)
```
Telegram User
   ↓
Telegram Bot (Webhook OK)
   ↓
Backend recibe mensaje
   ↓
Estado = "processing"
   ❌ NO hay persistencia en ae_messages
   ❌ NO hay bridge al chat web
   ❌ NO hay procesamiento por AL-EON Core
   ❌ NO hay respuesta final enviada
```

### Causa Raíz
Telegram está implementado como **sistema separado** con sus propias tablas (`telegram_chats`, `telegram_messages`) que **NO SE CONECTAN** con el sistema de chat principal (`ae_messages`, `ae_sessions`).

---

## ✅ SOLUCIÓN: TELEGRAM COMO CANAL DE ENTRADA

### Arquitectura Correcta
```
Telegram Bot / Chat Web
   ↓ webhook / HTTP
Backend API
   ↓
persist message (ae_messages, channel: telegram/web)
   ↓
enqueue processing
   ↓
AL-EON Core
   ↓
persist response (ae_messages)
   ↓
emit response to:
   - Telegram (via Telegram API)
   - Chat Web (via real-time subscription)
```

### Principios No Negociables
1. **Telegram NO es chat aparte** → Es otro canal de entrada al MISMO sistema
2. **Un solo historial** → Todos los mensajes en `ae_messages`, sin importar el canal
3. **Procesamiento unificado** → AL-EON Core procesa todo igual
4. **Multi-canal transparente** → El usuario ve TODO su historial en cualquier interface

---

## 🔧 CAMBIOS REQUERIDOS

### 1️⃣ BASE DE DATOS (SUPABASE)

#### A) Actualizar tabla `ae_messages`
```sql
-- Agregar campos para multi-canal
ALTER TABLE ae_messages
ADD COLUMN IF NOT EXISTS channel VARCHAR(20) DEFAULT 'web' 
  CHECK (channel IN ('web', 'telegram', 'email', 'voice')),
ADD COLUMN IF NOT EXISTS external_message_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Índices para búsqueda eficiente
CREATE INDEX IF NOT EXISTS idx_ae_messages_channel 
  ON ae_messages(channel);
  
CREATE INDEX IF NOT EXISTS idx_ae_messages_external_id 
  ON ae_messages(external_message_id) 
  WHERE external_message_id IS NOT NULL;

-- Comentarios
COMMENT ON COLUMN ae_messages.channel IS 
  'Canal de entrada del mensaje: web, telegram, email, voice';
  
COMMENT ON COLUMN ae_messages.external_message_id IS 
  'ID del mensaje en el sistema externo (ej: telegram message_id)';
  
COMMENT ON COLUMN ae_messages.metadata IS 
  'Datos adicionales del canal (ej: {telegram_chat_id, telegram_username})';
```

#### B) Mantener tablas auxiliares de Telegram (para tracking)
```sql
-- telegram_bots: mantener sin cambios
-- telegram_chats: mantener para tracking de conversaciones activas
-- NO crear telegram_messages → todo va a ae_messages
```

---

### 2️⃣ BACKEND (AL-E CORE / API)

#### A) Endpoint: Webhook de Telegram
**Archivo:** `src/routes/telegram.js` o `src/api/telegram/webhook.js`

```javascript
/**
 * POST /api/telegram/webhook/:botId
 * Recibe mensajes de Telegram y los procesa
 */
app.post('/api/telegram/webhook/:botId', async (req, res) => {
  try {
    const { botId } = req.params;
    const update = req.body;
    
    // 1. Validar update
    if (!update.message || !update.message.text) {
      return res.status(200).json({ ok: true }); // Ignorar updates sin texto
    }
    
    const telegramMessage = update.message;
    const chatId = telegramMessage.chat.id.toString();
    const messageText = telegramMessage.text;
    const telegramMessageId = telegramMessage.message_id;
    const username = telegramMessage.from.username || 'user';
    
    console.log(`📱 [Telegram Webhook] Mensaje recibido de @${username}`);
    
    // 2. Obtener info del bot y usuario
    const { data: bot, error: botError } = await supabase
      .from('telegram_bots')
      .select('*')
      .eq('id', botId)
      .single();
    
    if (botError || !bot) {
      console.error('❌ Bot no encontrado:', botId);
      return res.status(404).json({ error: 'Bot no encontrado' });
    }
    
    const userId = bot.owner_user_id;
    
    // 3. Buscar o crear conversación (ae_sessions)
    let { data: session, error: sessionError } = await supabase
      .from('ae_sessions')
      .select('*')
      .eq('user_id_uuid', userId)
      .eq('metadata->telegram_chat_id', chatId)
      .order('last_message_at', { ascending: false })
      .limit(1)
      .single();
    
    if (!session) {
      console.log('📝 Creando nueva sesión para chat de Telegram');
      
      const { data: newSession, error: createError } = await supabase
        .from('ae_sessions')
        .insert({
          user_id_uuid: userId,
          workspace_id: 'core',
          assistant_id: 'AL-E',
          title: `Telegram: @${username}`,
          mode: 'universal',
          metadata: {
            telegram_chat_id: chatId,
            telegram_username: username,
            channel: 'telegram'
          },
          created_at: new Date().toISOString(),
          last_message_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Error creando sesión:', createError);
        throw createError;
      }
      
      session = newSession;
    }
    
    const sessionId = session.id;
    
    // 4. Persistir mensaje del usuario en ae_messages
    const { data: userMessage, error: messageError } = await supabase
      .from('ae_messages')
      .insert({
        session_id: sessionId,
        user_id_uuid: userId,
        role: 'user',
        content: messageText,
        channel: 'telegram',
        external_message_id: telegramMessageId.toString(),
        metadata: {
          telegram_chat_id: chatId,
          telegram_username: username,
          telegram_message_id: telegramMessageId
        },
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (messageError) {
      console.error('❌ Error guardando mensaje:', messageError);
      throw messageError;
    }
    
    console.log('✅ Mensaje persistido en ae_messages:', userMessage.id);
    
    // 5. Enviar mensaje "procesando..." temporal
    await sendTelegramMessage(bot.bot_token_enc, chatId, '⏳ Procesando tu mensaje...');
    
    // 6. Encolar procesamiento asíncrono
    await enqueueMessageProcessing({
      sessionId,
      userId,
      messageId: userMessage.id,
      messageText,
      channel: 'telegram',
      telegramChatId: chatId,
      botToken: bot.bot_token_enc
    });
    
    // 7. Actualizar last_message_at en ae_sessions
    await supabase
      .from('ae_sessions')
      .update({ 
        last_message_at: new Date().toISOString(),
        total_messages: session.total_messages + 1
      })
      .eq('id', sessionId);
    
    // 8. Actualizar telegram_chats (tracking)
    await supabase
      .from('telegram_chats')
      .upsert({
        chat_id: chatId,
        bot_id: botId,
        owner_user_id: userId,
        chat_name: telegramMessage.chat.first_name || username,
        chat_username: username,
        last_message_text: messageText.substring(0, 100),
        last_message_at: new Date().toISOString()
      }, {
        onConflict: 'chat_id,bot_id'
      });
    
    // 9. Responder a Telegram OK (200)
    res.status(200).json({ ok: true });
    
  } catch (error) {
    console.error('❌ [Telegram Webhook] Error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

#### B) Worker/Job: Procesamiento Asíncrono
**Archivo:** `src/workers/telegramProcessor.js`

```javascript
/**
 * Procesa mensaje de Telegram con AL-EON Core
 */
async function enqueueMessageProcessing(data) {
  const {
    sessionId,
    userId,
    messageId,
    messageText,
    channel,
    telegramChatId,
    botToken
  } = data;
  
  try {
    console.log('🔄 Procesando mensaje:', messageId);
    
    // 1. Obtener historial de la sesión (últimos N mensajes)
    const { data: history } = await supabase
      .from('ae_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(20); // Últimos 20 mensajes
    
    // 2. Llamar a AL-EON Core
    const response = await callALECore({
      userId,
      sessionId,
      message: messageText,
      history: history || [],
      workspaceId: 'core'
    });
    
    const assistantResponse = response.reply || response.response;
    
    // 3. Guardar respuesta en ae_messages
    const { data: assistantMessage, error: saveError } = await supabase
      .from('ae_messages')
      .insert({
        session_id: sessionId,
        user_id_uuid: userId,
        role: 'assistant',
        content: assistantResponse,
        channel: 'telegram',
        metadata: {
          telegram_chat_id: telegramChatId,
          processed_at: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (saveError) {
      console.error('❌ Error guardando respuesta:', saveError);
      throw saveError;
    }
    
    console.log('✅ Respuesta guardada en ae_messages:', assistantMessage.id);
    
    // 4. Enviar respuesta final a Telegram
    await sendTelegramMessage(botToken, telegramChatId, assistantResponse);
    
    console.log('✅ Respuesta enviada a Telegram');
    
    // 5. Actualizar ae_sessions
    await supabase
      .from('ae_sessions')
      .update({ 
        last_message_at: new Date().toISOString(),
        total_messages: (history?.length || 0) + 2 // user + assistant
      })
      .eq('id', sessionId);
    
  } catch (error) {
    console.error('❌ Error procesando mensaje:', error);
    
    // Enviar mensaje de error a Telegram
    if (telegramChatId && botToken) {
      await sendTelegramMessage(
        botToken, 
        telegramChatId, 
        '❌ Lo siento, ocurrió un error procesando tu mensaje. Por favor intenta de nuevo.'
      );
    }
    
    // Guardar error en ae_messages (opcional)
    await supabase
      .from('ae_messages')
      .insert({
        session_id: sessionId,
        user_id_uuid: userId,
        role: 'system',
        content: `Error: ${error.message}`,
        channel: 'telegram',
        metadata: {
          error: true,
          error_message: error.message
        },
        created_at: new Date().toISOString()
      });
  }
}

/**
 * Envía mensaje a Telegram
 */
async function sendTelegramMessage(botToken, chatId, text) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown' // Opcional: soporte para formato
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Telegram API error: ${error.description}`);
  }
  
  return await response.json();
}

/**
 * Llama a AL-EON Core para generar respuesta
 */
async function callALECore({ userId, sessionId, message, history, workspaceId }) {
  // Implementación según tu arquitectura actual
  // Puede ser HTTP request a Core o llamada directa a función
  
  const response = await fetch('https://api.al-eon.com/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // ... headers de autenticación
    },
    body: JSON.stringify({
      userId,
      sessionId,
      message,
      history,
      workspaceId
    })
  });
  
  return await response.json();
}
```

---

### 3️⃣ FRONTEND

#### A) Actualizar `useChat.js` para cargar mensajes multi-canal
**Archivo:** `src/features/chat/hooks/useChat.js`

```javascript
// ✅ CAMBIO: Cargar mensajes sin filtrar por canal
// Actualmente: solo mensajes del chat web
// Nuevo: TODOS los mensajes (web, telegram, etc.)

// ANTES (si existía filtro):
// .eq('channel', 'web')

// DESPUÉS (sin filtro de canal):
const { data: messages } = await supabase
  .from('ae_messages')
  .select('*')
  .eq('session_id', sessionId)
  .order('created_at', { ascending: true });

// Los mensajes ahora incluirán channel: 'web', 'telegram', etc.
```

#### B) Mostrar indicador de canal en mensajes
**Archivo:** `src/features/chat/components/MessageThread.jsx`

```jsx
// Agregar badge visual para identificar canal
function ChannelBadge({ channel }) {
  if (channel === 'web') return null; // No mostrar para web (default)
  
  const icons = {
    telegram: '📱',
    email: '📧',
    voice: '🎤'
  };
  
  return (
    <span 
      className="text-xs px-2 py-1 rounded-full"
      style={{ 
        backgroundColor: 'var(--color-bg-tertiary)',
        color: 'var(--color-text-tertiary)'
      }}
    >
      {icons[channel] || '📌'} {channel}
    </span>
  );
}

// Usar en el componente de mensaje:
<div className="message-header">
  <ChannelBadge channel={message.channel} />
  {/* ... resto del mensaje */}
</div>
```

#### C) Suscripción en tiempo real (opcional pero recomendado)
**Archivo:** `src/features/chat/hooks/useChat.js`

```javascript
useEffect(() => {
  if (!currentConversation?.id) return;
  
  // Suscribirse a nuevos mensajes en la conversación actual
  const subscription = supabase
    .channel(`messages:${currentConversation.id}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'ae_messages',
        filter: `session_id=eq.${currentConversation.id}`
      },
      (payload) => {
        console.log('🔔 Nuevo mensaje recibido:', payload.new);
        
        // Agregar mensaje al estado local
        addMessage(currentConversation.id, {
          id: payload.new.id,
          role: payload.new.role,
          content: payload.new.content,
          channel: payload.new.channel,
          timestamp: new Date(payload.new.created_at).getTime()
        });
      }
    )
    .subscribe();
  
  return () => {
    subscription.unsubscribe();
  };
}, [currentConversation?.id]);
```

---

### 4️⃣ ACTUALIZAR SIDEBAR DE CONVERSACIONES

**Archivo:** `src/features/chat/components/Sidebar.jsx`

```jsx
// Mostrar indicador de última actividad por canal
function ConversationItem({ conversation }) {
  const channelIcon = {
    telegram: '📱',
    email: '📧',
    voice: '🎤',
    web: '💬'
  };
  
  const lastChannel = conversation.metadata?.channel || 'web';
  
  return (
    <div className="conversation-item">
      <span className="channel-icon">{channelIcon[lastChannel]}</span>
      <span className="title">{conversation.title}</span>
      {/* ... resto del item */}
    </div>
  );
}
```

---

## ✅ CHECKLIST DE VALIDACIÓN

### Pre-requisitos
- [ ] Las tablas `telegram_bots`, `telegram_chats`, `ae_sessions`, `ae_messages` existen en Supabase
- [ ] El bot de Telegram está conectado y tiene webhook configurado
- [ ] El usuario tiene sesión activa en la app web

### Tests End-to-End

#### Test 1: Mensaje de Telegram → Chat Web
1. [ ] Enviar mensaje por Telegram: "Hola desde Telegram"
2. [ ] Verificar que el bot responde (no solo "procesando...")
3. [ ] Abrir chat web
4. [ ] **Verificar que aparece el mensaje "Hola desde Telegram"** con badge 📱
5. [ ] **Verificar que aparece la respuesta del asistente**

#### Test 2: Mensaje del Chat Web → Aparece en historial
1. [ ] Escribir mensaje en chat web: "Hola desde la web"
2. [ ] **Verificar que el mensaje se guarda con `channel: 'web'`**
3. [ ] **Verificar que aparece en el mismo historial** que los mensajes de Telegram

#### Test 3: Continuidad de conversación
1. [ ] Enviar mensaje por Telegram: "¿Cuál fue mi primer mensaje?"
2. [ ] **Verificar que el asistente menciona "Hola desde Telegram"**
3. [ ] Enviar mensaje por web: "¿Y qué dije por Telegram?"
4. [ ] **Verificar que el asistente tiene contexto completo**

#### Test 4: Múltiples conversaciones
1. [ ] Abrir Telegram con otro usuario (o chat diferente)
2. [ ] Enviar mensaje: "Nueva conversación"
3. [ ] **Verificar que se crea una nueva entrada en Sidebar**
4. [ ] **Verificar que las conversaciones NO se mezclan**

#### Test 5: Performance
1. [ ] Enviar 5 mensajes rápidos por Telegram
2. [ ] **Verificar que todos se procesan (no se pierden)**
3. [ ] **Verificar que las respuestas llegan en orden**
4. [ ] **Verificar que el chat web se actualiza en tiempo real**

---

## 🚫 PROHIBICIONES

### NO hacer:
- ❌ **Mantener flujos separados** para Telegram y Chat Web
- ❌ **Responder "procesando..."** sin enviar respuesta final
- ❌ **Procesar mensajes de Telegram sin persistirlos** en `ae_messages`
- ❌ **Ocultar mensajes por canal** en el frontend (debe mostrar TODO)
- ❌ **Crear tablas `telegram_messages`** (todo va a `ae_messages`)

### SÍ hacer:
- ✅ **Un solo historial unificado** en `ae_messages`
- ✅ **Procesamiento asíncrono** para no bloquear webhook
- ✅ **Respuestas finales** siempre, con manejo de errores
- ✅ **Multi-canal transparente** en toda la UI
- ✅ **Real-time sync** entre canales

---

## 📊 MÉTRICAS DE ÉXITO

### KPIs
- **100%** de mensajes de Telegram persisten en `ae_messages`
- **100%** de mensajes de Telegram reciben respuesta final (no solo "procesando...")
- **100%** de mensajes de Telegram aparecen en el chat web
- **< 5 segundos** de latencia promedio (Telegram → respuesta)
- **0** mensajes perdidos
- **0** conversaciones duplicadas

### Monitoreo
```sql
-- Mensajes de Telegram en las últimas 24h
SELECT COUNT(*) 
FROM ae_messages 
WHERE channel = 'telegram' 
  AND created_at > NOW() - INTERVAL '24 hours';

-- Mensajes sin respuesta
SELECT COUNT(*) 
FROM ae_messages m1
WHERE m1.role = 'user' 
  AND m1.channel = 'telegram'
  AND NOT EXISTS (
    SELECT 1 FROM ae_messages m2
    WHERE m2.session_id = m1.session_id
      AND m2.role = 'assistant'
      AND m2.created_at > m1.created_at
  );

-- Latencia promedio
SELECT 
  AVG(
    EXTRACT(EPOCH FROM (
      (SELECT MIN(created_at) FROM ae_messages WHERE role = 'assistant' AND session_id = m1.session_id AND created_at > m1.created_at)
      - m1.created_at
    ))
  ) as avg_latency_seconds
FROM ae_messages m1
WHERE m1.role = 'user' 
  AND m1.channel = 'telegram'
  AND m1.created_at > NOW() - INTERVAL '24 hours';
```

---

## 📝 NOTAS IMPORTANTES

### Orden de Implementación
1. **Base de datos** (SQL primero, sin esto nada funciona)
2. **Backend webhook** (debe recibir y persistir)
3. **Backend worker** (debe procesar y responder)
4. **Frontend** (mostrar mensajes multi-canal)
5. **Testing** (validar flujo completo)

### Compatibilidad hacia atrás
- ✅ Mensajes antiguos en `ae_messages` sin `channel` → asumir `channel: 'web'`
- ✅ Frontend debe funcionar aunque no existan mensajes de Telegram
- ✅ Tablas `telegram_chats` mantener para tracking (no eliminar)

### Escalabilidad
- Para **alta carga**, considerar:
  - Queue system (Redis, RabbitMQ) en vez de `enqueueMessageProcessing` síncrono
  - Rate limiting en webhook de Telegram
  - Caching de respuestas frecuentes

---

## 🎯 ENTREGABLES

### Para Backend (Core)
- [ ] SQL ejecutado en Supabase
- [ ] Endpoint `/api/telegram/webhook/:botId` implementado
- [ ] Worker/Job de procesamiento asíncrono
- [ ] Función `sendTelegramMessage` probada
- [ ] Logs detallados en cada paso

### Para Frontend
- [ ] `useChat.js` cargando mensajes sin filtro de canal
- [ ] Badge de canal visible en mensajes
- [ ] Sidebar mostrando indicador de canal
- [ ] Real-time subscription (opcional)

### Para Validación
- [ ] Todos los tests del checklist ✅
- [ ] Métricas de latencia < 5s
- [ ] 0 mensajes perdidos en 24h de prueba
- [ ] Documentación actualizada

---

## 🆘 TROUBLESHOOTING

### Problema: Webhook no recibe mensajes
```bash
# Verificar webhook configurado
curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo

# Debe mostrar: "url": "https://api.al-eon.com/api/telegram/webhook/<BOT_ID>"
```

### Problema: Mensajes no se guardan en ae_messages
```sql
-- Verificar RLS policies
SELECT * FROM pg_policies WHERE tablename = 'ae_messages';

-- Debe haber policy para insertar con service_role
```

### Problema: Frontend no muestra mensajes de Telegram
```javascript
// En DevTools console:
console.log('Mensajes cargados:', messages);
// Debe incluir mensajes con channel: 'telegram'

// Verificar query de Supabase:
const { data, error } = await supabase
  .from('ae_messages')
  .select('*')
  .eq('session_id', sessionId);
console.log('Query result:', data, error);
```

---

**FIN DEL DOCUMENTO**

👉 **Siguiente paso:** Implementar en orden: SQL → Backend → Frontend → Testing
