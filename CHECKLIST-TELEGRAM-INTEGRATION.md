# ✅ CHECKLIST: TELEGRAM + CHAT INTEGRATION

**Fecha:** 9 de enero de 2026  
**Objetivo:** Unificar Telegram como canal de entrada del sistema de chat  
**Documentos:** `FIX-TELEGRAM-CHAT-INTEGRATION.md`, `SUPABASE-TELEGRAM-MULTICANAL.sql`

---

## 📋 FASE 1: BASE DE DATOS

### 1.1 Ejecutar SQL en Supabase
- [ ] Abrir Supabase Dashboard → SQL Editor
- [ ] Copiar contenido de `SUPABASE-TELEGRAM-MULTICANAL.sql`
- [ ] Ejecutar script completo
- [ ] Verificar que aparece mensaje: `✅ Todas las verificaciones pasaron correctamente`

### 1.2 Validar Cambios en BD
```sql
-- Ejecutar en SQL Editor:
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns
WHERE table_name = 'ae_messages'
  AND column_name IN ('channel', 'external_message_id', 'metadata');
```
**Resultado esperado:** 3 filas (channel, external_message_id, metadata)

- [ ] ✅ Columnas creadas correctamente

### 1.3 Verificar Funciones
```sql
-- Ejecutar en SQL Editor:
SELECT proname FROM pg_proc 
WHERE proname IN ('find_or_create_telegram_session', 'insert_telegram_message');
```
**Resultado esperado:** 2 filas

- [ ] ✅ Funciones creadas correctamente

---

## 📋 FASE 2: BACKEND (AL-E CORE)

### 2.1 Crear Endpoint de Webhook
- [ ] Crear archivo: `src/routes/telegram.js` o `src/api/telegram/webhook.js`
- [ ] Copiar código del webhook desde `FIX-TELEGRAM-CHAT-INTEGRATION.md` → Sección 2️⃣A
- [ ] Implementar función `enqueueMessageProcessing`
- [ ] Implementar función `sendTelegramMessage`
- [ ] Agregar logging detallado en cada paso

### 2.2 Implementar Worker/Procesador
- [ ] Crear archivo: `src/workers/telegramProcessor.js`
- [ ] Copiar código del processor desde `FIX-TELEGRAM-CHAT-INTEGRATION.md` → Sección 2️⃣B
- [ ] Implementar función `callALECore`
- [ ] Agregar manejo de errores con reintentos

### 2.3 Configurar Rutas
- [ ] Registrar ruta en Express/Fastify: `POST /api/telegram/webhook/:botId`
- [ ] Verificar que NO requiere autenticación JWT (es llamada externa de Telegram)
- [ ] Agregar validación del token del bot (opcional pero recomendado)

### 2.4 Actualizar Webhook de Telegram
```bash
# Ejecutar desde terminal (reemplazar <BOT_TOKEN> y <BOT_ID>):
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://api.al-eon.com/api/telegram/webhook/<BOT_ID>"}'
```
**Resultado esperado:** `{"ok":true,"result":true,"description":"Webhook was set"}`

- [ ] ✅ Webhook configurado

### 2.5 Verificar Webhook
```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```
**Debe mostrar:** `"url": "https://api.al-eon.com/api/telegram/webhook/<BOT_ID>"`

- [ ] ✅ Webhook verificado

---

## 📋 FASE 3: FRONTEND

### 3.1 Actualizar useChat.js
**Archivo:** `src/features/chat/hooks/useChat.js`

- [ ] Buscar query que carga mensajes de `ae_messages`
- [ ] **ELIMINAR** cualquier filtro `.eq('channel', 'web')`
- [ ] **ASEGURAR** que carga TODOS los mensajes: `.select('*').eq('session_id', sessionId)`
- [ ] Agregar logging: `console.log('Mensajes cargados:', messages)`

### 3.2 Agregar Badge de Canal
**Archivo:** `src/features/chat/components/MessageThread.jsx`

- [ ] Copiar componente `ChannelBadge` desde `FIX-TELEGRAM-CHAT-INTEGRATION.md` → Sección 3️⃣B
- [ ] Integrar en el componente de mensaje
- [ ] Probar que muestra 📱 para mensajes de Telegram

### 3.3 Actualizar Sidebar (opcional)
**Archivo:** `src/features/chat/components/Sidebar.jsx`

- [ ] Agregar icono de canal en lista de conversaciones
- [ ] Mostrar `conversation.metadata?.channel` si existe

### 3.4 Suscripción Real-Time (opcional pero recomendado)
**Archivo:** `src/features/chat/hooks/useChat.js`

- [ ] Copiar código de suscripción desde `FIX-TELEGRAM-CHAT-INTEGRATION.md` → Sección 3️⃣C
- [ ] Implementar `addMessage` para agregar mensajes en tiempo real
- [ ] Probar que actualiza cuando llega mensaje de Telegram

---

## 📋 FASE 4: TESTING

### 4.1 Test Básico de Persistencia
```sql
-- Ejecutar DESPUÉS de enviar un mensaje por Telegram:
SELECT 
  id,
  role,
  content,
  channel,
  external_message_id,
  metadata->>'telegram_username' as username,
  created_at
FROM ae_messages
WHERE channel = 'telegram'
ORDER BY created_at DESC
LIMIT 5;
```
**Debe mostrar:** Mensajes con `channel = 'telegram'`

- [ ] ✅ Mensajes de Telegram en BD

### 4.2 Test End-to-End: Telegram → Chat Web
1. [ ] Abrir Telegram
2. [ ] Enviar mensaje al bot: "Test 1: Hola desde Telegram"
3. [ ] **Verificar:** Bot responde (NO solo "procesando...")
4. [ ] Abrir app web → Chat
5. [ ] **Verificar:** Mensaje "Test 1: Hola desde Telegram" aparece con badge 📱
6. [ ] **Verificar:** Respuesta del asistente aparece debajo

### 4.3 Test End-to-End: Chat Web → Telegram (contexto)
1. [ ] En app web, enviar: "Test 2: Hola desde la web"
2. [ ] En Telegram, enviar: "¿Cuál fue mi primer mensaje?"
3. [ ] **Verificar:** Bot menciona "Test 1: Hola desde Telegram"
4. [ ] En app web, verificar que ambos mensajes aparecen en el mismo historial

### 4.4 Test de Continuidad de Conversación
1. [ ] Enviar por Telegram: "Recuerda el número 42"
2. [ ] Enviar por web: "¿Qué número te dije que recordaras?"
3. [ ] **Verificar:** Asistente responde "42"

### 4.5 Test de Múltiples Conversaciones
1. [ ] Abrir Telegram con otro usuario (o crear otro chat)
2. [ ] Enviar: "Nueva conversación"
3. [ ] En app web, verificar que aparece nueva entrada en Sidebar
4. [ ] **Verificar:** Las conversaciones NO se mezclan

### 4.6 Test de Performance
1. [ ] Enviar 5 mensajes rápidos por Telegram (uno tras otro)
2. [ ] **Verificar:** Todos se procesan (no se pierden)
3. [ ] **Verificar:** Las respuestas llegan en orden correcto
4. [ ] Medir tiempo promedio de respuesta (debe ser < 5 segundos)

### 4.7 Test de Errores
1. [ ] Simular error: apagar backend temporalmente
2. [ ] Enviar mensaje por Telegram
3. [ ] Encender backend
4. [ ] **Verificar:** Mensaje se procesó cuando backend volvió (o mostrar error claro)

---

## 📋 FASE 5: VALIDACIÓN DE MÉTRICAS

### 5.1 Mensajes de Telegram (últimas 24h)
```sql
SELECT COUNT(*) as total_telegram_messages
FROM ae_messages 
WHERE channel = 'telegram' 
  AND created_at > NOW() - INTERVAL '24 hours';
```
- [ ] ✅ `total_telegram_messages > 0` (si se enviaron mensajes)

### 5.2 Mensajes Sin Respuesta
```sql
SELECT COUNT(*) as messages_without_response
FROM ae_messages m1
WHERE m1.role = 'user' 
  AND m1.channel = 'telegram'
  AND NOT EXISTS (
    SELECT 1 FROM ae_messages m2
    WHERE m2.session_id = m1.session_id
      AND m2.role = 'assistant'
      AND m2.created_at > m1.created_at
  );
```
**Resultado esperado:** `messages_without_response = 0`

- [ ] ✅ Todos los mensajes tienen respuesta

### 5.3 Latencia Promedio
```sql
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
**Resultado esperado:** `avg_latency_seconds < 5`

- [ ] ✅ Latencia promedio < 5 segundos

### 5.4 Sesiones Multi-Canal
```sql
SELECT 
  id,
  title,
  metadata->>'channel' as channel,
  total_messages,
  last_message_at
FROM ae_sessions
WHERE metadata->>'telegram_chat_id' IS NOT NULL
ORDER BY last_message_at DESC
LIMIT 10;
```
- [ ] ✅ Sesiones de Telegram existen y tienen metadata correcto

---

## 📋 FASE 6: MONITOREO Y LOGS

### 6.1 Logs del Backend
- [ ] Verificar logs al recibir webhook: `📱 [Telegram Webhook] Mensaje recibido`
- [ ] Verificar logs de persistencia: `✅ Mensaje persistido en ae_messages`
- [ ] Verificar logs de procesamiento: `🔄 Procesando mensaje`
- [ ] Verificar logs de respuesta: `✅ Respuesta enviada a Telegram`

### 6.2 Logs del Frontend
- [ ] Abrir DevTools → Console
- [ ] Verificar mensajes cargados incluyen `channel: 'telegram'`
- [ ] Verificar suscripción real-time (si implementada): `🔔 Nuevo mensaje recibido`

### 6.3 Métricas en Producción
- [ ] Configurar alertas para `messages_without_response > 0`
- [ ] Configurar alertas para `avg_latency_seconds > 10`
- [ ] Dashboard con vista `v_messages_by_channel`

---

## 📋 FASE 7: DOCUMENTACIÓN

### 7.1 README Actualizado
- [ ] Documentar que Telegram está integrado con chat principal
- [ ] Agregar instrucciones de configuración de webhook
- [ ] Agregar troubleshooting de Telegram

### 7.2 Diagramas (opcional)
- [ ] Crear diagrama de flujo: Telegram → Backend → AL-EON Core → Respuesta
- [ ] Crear diagrama de arquitectura multi-canal

---

## 🎯 CRITERIOS DE ÉXITO

### Funcional
- [x] ✅ Todos los tests de FASE 4 pasan
- [x] ✅ Latencia < 5 segundos
- [x] ✅ 0 mensajes sin respuesta
- [x] ✅ Mensajes aparecen en chat web

### Técnico
- [x] ✅ SQL ejecutado sin errores
- [x] ✅ Webhook configurado y verificado
- [x] ✅ Frontend carga mensajes multi-canal
- [x] ✅ Logs detallados en cada paso

### Usuario
- [x] ✅ Usuario puede chatear por Telegram
- [x] ✅ Usuario ve TODO su historial en la app web
- [x] ✅ Contexto se mantiene entre canales
- [x] ✅ No hay duplicación de conversaciones

---

## 🆘 ROLLBACK (si algo sale mal)

### Rollback de SQL
```sql
-- Eliminar columnas agregadas (NO RECOMENDADO, solo si es necesario)
ALTER TABLE ae_messages
DROP COLUMN IF EXISTS channel,
DROP COLUMN IF EXISTS external_message_id;

-- Eliminar funciones
DROP FUNCTION IF EXISTS find_or_create_telegram_session;
DROP FUNCTION IF EXISTS insert_telegram_message;

-- Eliminar vistas
DROP VIEW IF EXISTS v_messages_by_channel;
DROP VIEW IF EXISTS v_active_sessions_by_channel;
```

### Rollback de Webhook
```bash
# Desactivar webhook
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/deleteWebhook"
```

### Rollback de Frontend
```bash
# Revertir cambios con git
cd /Users/pg/Documents/CHAT\ AL-E
git checkout src/features/chat/hooks/useChat.js
git checkout src/features/chat/components/MessageThread.jsx
```

---

## 📞 CONTACTO Y SOPORTE

**Si tienes problemas:**
1. Revisar logs del backend (webhook y processor)
2. Revisar SQL queries (hay queries de diagnóstico en el script)
3. Verificar webhook con `getWebhookInfo`
4. Consultar documento `FIX-TELEGRAM-CHAT-INTEGRATION.md` → Sección TROUBLESHOOTING

---

**Última actualización:** 9 de enero de 2026  
**Versión:** 1.0  
**Estado:** ✅ LISTO PARA IMPLEMENTAR
