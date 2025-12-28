-- ============================================
-- DEBUG: Verificar por qué no migró
-- ============================================

-- 1. Ver los IDs originales
SELECT 
  'IDs en user_conversations' as info,
  conversation_id,
  title,
  user_id,
  jsonb_array_length(messages) as num_mensajes
FROM user_conversations
ORDER BY created_at DESC;

-- 2. Crear tabla temporal de mapeo
CREATE TEMP TABLE conversation_id_mapping AS
SELECT 
  conversation_id as old_id,
  gen_random_uuid() as new_uuid,
  user_id,
  title,
  created_at,
  updated_at,
  jsonb_array_length(messages) as total_messages
FROM user_conversations;

-- 3. Ver el mapeo creado
SELECT 
  'Mapeo creado' as info,
  old_id,
  new_uuid,
  title,
  total_messages
FROM conversation_id_mapping;

-- 4. Intentar el INSERT en ae_sessions y ver cuántas filas se afectan
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
ON CONFLICT (id) DO NOTHING
RETURNING id, title, total_messages;

-- 5. Contar mensajes expandidos
WITH expanded_messages AS (
  SELECT 
    uc.user_id,
    m.new_uuid as session_id,
    jsonb_array_elements(uc.messages) as message_data
  FROM user_conversations uc
  JOIN conversation_id_mapping m ON uc.conversation_id = m.old_id
)
SELECT 
  'Total mensajes a migrar' as info,
  COUNT(*) as total
FROM expanded_messages
WHERE message_data->>'role' IS NOT NULL
  AND message_data->>'content' IS NOT NULL;

-- 6. Ver sample de mensajes expandidos
WITH expanded_messages AS (
  SELECT 
    uc.user_id,
    m.new_uuid as session_id,
    jsonb_array_elements(uc.messages) as message_data
  FROM user_conversations uc
  JOIN conversation_id_mapping m ON uc.conversation_id = m.old_id
)
SELECT 
  'Sample mensajes' as info,
  session_id,
  message_data->>'role' as role,
  LEFT(message_data->>'content', 50) as content_preview,
  message_data->>'timestamp' as timestamp
FROM expanded_messages
LIMIT 5;
