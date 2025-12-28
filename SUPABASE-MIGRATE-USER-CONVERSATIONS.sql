-- ============================================
-- MIGRACIÓN: user_conversations → ae_messages
-- ============================================
-- Problema: Core solo lee ae_messages, pero conversaciones viejas están en user_conversations
-- Solución: Migrar datos de user_conversations a ae_sessions + ae_messages

-- PASO 1: Migrar conversaciones a ae_sessions
-- --------------------------------------------
INSERT INTO ae_sessions (
  id,
  user_id_uuid,
  workspace_id,
  assistant_id,
  title,
  created_at,
  updated_at,
  total_messages,
  mode
)
SELECT 
  conversation_id::uuid,
  user_id,
  'core' as workspace_id,
  'AL-E' as assistant_id,
  title,
  created_at,
  updated_at,
  jsonb_array_length(messages) as total_messages,
  'universal' as mode
FROM user_conversations
WHERE conversation_id::text ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
ON CONFLICT (id) DO NOTHING;

-- PASO 2: Migrar mensajes individuales a ae_messages
-- --------------------------------------------
-- Nota: Este proceso expande el JSONB de messages y crea una fila por cada mensaje
WITH expanded_messages AS (
  SELECT 
    user_id,
    conversation_id::uuid as session_id,
    jsonb_array_elements(messages) as message_data
  FROM user_conversations
  WHERE conversation_id::text ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
)
INSERT INTO ae_messages (
  id,
  session_id,
  user_id_uuid,
  role,
  content,
  created_at
)
SELECT 
  (message_data->>'id')::uuid,
  session_id,
  user_id,
  message_data->>'role',
  message_data->>'content',
  to_timestamp((message_data->>'timestamp')::bigint / 1000.0)
FROM expanded_messages
WHERE message_data->>'id' IS NOT NULL
  AND message_data->>'role' IS NOT NULL
  AND message_data->>'content' IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- PASO 3: Verificar migración
-- --------------------------------------------
SELECT 
  'user_conversations' as origen,
  COUNT(*) as total_conversaciones,
  SUM(jsonb_array_length(messages)) as total_mensajes
FROM user_conversations
UNION ALL
SELECT 
  'ae_sessions' as destino,
  COUNT(*) as total_conversaciones,
  (SELECT COUNT(*) FROM ae_messages) as total_mensajes
FROM ae_sessions;

-- PASO 4: (OPCIONAL) Limpiar user_conversations después de verificar
-- --------------------------------------------
-- ⚠️ SOLO EJECUTA ESTO DESPUÉS DE VERIFICAR QUE TODO SE MIGRÓ CORRECTAMENTE
-- DELETE FROM user_conversations;

-- ============================================
-- NOTAS
-- ============================================
-- 1. Este script migra SOLO conversaciones con conversation_id válido (UUID)
-- 2. Los mensajes mantienen su ID original (no duplicados)
-- 3. ON CONFLICT DO NOTHING previene duplicados si ejecutas dos veces
-- 4. Después de migrar, Core podrá leer TODAS las conversaciones desde ae_messages
