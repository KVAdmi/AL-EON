-- ============================================
-- MIGRACIÓN: user_conversations → ae_messages
-- ============================================
-- Problema: Core solo lee ae_messages, pero conversaciones viejas están en user_conversations
-- Solución: Migrar datos de user_conversations a ae_sessions + ae_messages

-- PASO 1: Migrar conversaciones a ae_sessions
-- --------------------------------------------
-- Nota: Generamos UUIDs nuevos porque conversation_id usa formato custom (timestamp_suffix)
-- Guardamos el mapeo en una tabla temporal para usarlo en PASO 2
CREATE TEMP TABLE IF NOT EXISTS conversation_id_mapping AS
SELECT 
  conversation_id as old_id,
  gen_random_uuid() as new_uuid,
  user_id,
  title,
  created_at,
  updated_at,
  jsonb_array_length(messages) as total_messages
FROM user_conversations;

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
  new_uuid,
  user_id,
  'core' as workspace_id,
  'AL-E' as assistant_id,
  title,
  created_at,
  updated_at,
  total_messages,
  'universal' as mode
FROM conversation_id_mapping
ON CONFLICT (id) DO NOTHING;

-- PASO 2: Migrar mensajes individuales a ae_messages
-- --------------------------------------------
-- Nota: Usamos el mapeo de conversation_id_mapping para relacionar con ae_sessions
WITH expanded_messages AS (
  SELECT 
    uc.user_id,
    m.new_uuid as session_id,
    jsonb_array_elements(uc.messages) as message_data
  FROM user_conversations uc
  JOIN conversation_id_mapping m ON uc.conversation_id = m.old_id
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
  gen_random_uuid() as id,
  session_id,
  user_id,
  message_data->>'role',
  message_data->>'content',
  to_timestamp((message_data->>'timestamp')::bigint / 1000.0)
FROM expanded_messages
WHERE message_data->>'role' IS NOT NULL
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

-- PASO 4: Limpiar tabla temporal
-- --------------------------------------------
DROP TABLE IF EXISTS conversation_id_mapping;

-- PASO 5: (OPCIONAL) Limpiar user_conversations después de verificar
-- --------------------------------------------
-- ⚠️ SOLO EJECUTA ESTO DESPUÉS DE VERIFICAR QUE TODO SE MIGRÓ CORRECTAMENTE
-- DELETE FROM user_conversations;

-- ============================================
-- NOTAS
-- ============================================
-- 1. Este script migra TODAS las conversaciones de user_conversations (incluso con IDs custom)
-- 2. Genera UUIDs nuevos para ae_sessions y ae_messages (porque IDs originales no son UUID)
-- 3. Los mensajes mantienen su contenido, role y timestamp original
-- 4. ON CONFLICT DO NOTHING previene duplicados si ejecutas dos veces
-- 5. Después de migrar, Core podrá leer TODAS las conversaciones desde ae_messages
