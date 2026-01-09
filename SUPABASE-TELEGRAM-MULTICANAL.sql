-- ============================================
-- FIX TELEGRAM + CHAT: MULTI-CANAL
-- ============================================
-- Fecha: 9 de enero de 2026
-- Objetivo: Unificar Telegram como canal de entrada del chat principal
-- ============================================

-- PASO 1: Agregar campos multi-canal a ae_messages
-- ============================================

ALTER TABLE ae_messages
ADD COLUMN IF NOT EXISTS channel VARCHAR(20) DEFAULT 'web' 
  CHECK (channel IN ('web', 'telegram', 'email', 'voice')),
ADD COLUMN IF NOT EXISTS external_message_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Comentarios para documentación
COMMENT ON COLUMN ae_messages.channel IS 
  'Canal de entrada del mensaje: web (chat web), telegram (bot), email (correo), voice (voz)';
  
COMMENT ON COLUMN ae_messages.external_message_id IS 
  'ID del mensaje en el sistema externo. Ej: telegram message_id, email message_id';
  
COMMENT ON COLUMN ae_messages.metadata IS 
  'Datos adicionales específicos del canal. Ej: {"telegram_chat_id": "123", "telegram_username": "user"}';


-- PASO 2: Índices para búsqueda eficiente
-- ============================================

CREATE INDEX IF NOT EXISTS idx_ae_messages_channel 
  ON ae_messages(channel);

CREATE INDEX IF NOT EXISTS idx_ae_messages_external_id 
  ON ae_messages(external_message_id) 
  WHERE external_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ae_messages_metadata 
  ON ae_messages USING GIN (metadata);


-- PASO 3: Agregar metadata a ae_sessions para tracking de canal
-- ============================================

-- Ya existe en ae_sessions, pero asegurar que tenga metadata
ALTER TABLE ae_sessions
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_ae_sessions_metadata 
  ON ae_sessions USING GIN (metadata);

COMMENT ON COLUMN ae_sessions.metadata IS 
  'Metadatos de la sesión. Incluye: {"channel": "telegram", "telegram_chat_id": "123"}';


-- PASO 4: Migrar datos existentes (si los hay)
-- ============================================

-- Todos los mensajes sin channel → asumir 'web'
UPDATE ae_messages
SET channel = 'web'
WHERE channel IS NULL;

-- Todas las sesiones sin metadata → inicializar
UPDATE ae_sessions
SET metadata = '{}'::jsonb
WHERE metadata IS NULL;


-- PASO 5: RLS Policies (verificar que permitan multi-canal)
-- ============================================

-- Las policies existentes deben seguir funcionando
-- Solo verificar que NO filtren por canal

-- Si existe alguna policy que filtre por canal, eliminarla:
-- DROP POLICY IF EXISTS "policy_name" ON ae_messages;

-- Las policies actuales deben permitir SELECT/INSERT/UPDATE basado en user_id
-- sin importar el canal


-- PASO 6: Función auxiliar para buscar sesión por canal
-- ============================================

CREATE OR REPLACE FUNCTION find_or_create_telegram_session(
  p_user_id UUID,
  p_telegram_chat_id TEXT,
  p_telegram_username TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id UUID;
BEGIN
  -- Buscar sesión existente
  SELECT id INTO v_session_id
  FROM ae_sessions
  WHERE user_id_uuid = p_user_id
    AND metadata->>'telegram_chat_id' = p_telegram_chat_id
  ORDER BY last_message_at DESC
  LIMIT 1;
  
  -- Si no existe, crear nueva
  IF v_session_id IS NULL THEN
    INSERT INTO ae_sessions (
      user_id_uuid,
      workspace_id,
      assistant_id,
      title,
      mode,
      metadata,
      created_at,
      last_message_at
    )
    VALUES (
      p_user_id,
      'core',
      'AL-E',
      'Telegram: @' || p_telegram_username,
      'universal',
      jsonb_build_object(
        'telegram_chat_id', p_telegram_chat_id,
        'telegram_username', p_telegram_username,
        'channel', 'telegram'
      ),
      NOW(),
      NOW()
    )
    RETURNING id INTO v_session_id;
  END IF;
  
  RETURN v_session_id;
END;
$$;

COMMENT ON FUNCTION find_or_create_telegram_session IS 
  'Busca o crea una sesión asociada a un chat de Telegram';


-- PASO 7: Función para insertar mensaje de Telegram
-- ============================================

CREATE OR REPLACE FUNCTION insert_telegram_message(
  p_session_id UUID,
  p_user_id UUID,
  p_role TEXT,
  p_content TEXT,
  p_telegram_message_id TEXT,
  p_telegram_chat_id TEXT,
  p_telegram_username TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_message_id UUID;
BEGIN
  INSERT INTO ae_messages (
    session_id,
    user_id_uuid,
    role,
    content,
    channel,
    external_message_id,
    metadata,
    created_at
  )
  VALUES (
    p_session_id,
    p_user_id,
    p_role,
    p_content,
    'telegram',
    p_telegram_message_id,
    jsonb_build_object(
      'telegram_chat_id', p_telegram_chat_id,
      'telegram_username', p_telegram_username,
      'telegram_message_id', p_telegram_message_id
    ),
    NOW()
  )
  RETURNING id INTO v_message_id;
  
  -- Actualizar last_message_at en sesión
  UPDATE ae_sessions
  SET last_message_at = NOW(),
      total_messages = total_messages + 1
  WHERE id = p_session_id;
  
  RETURN v_message_id;
END;
$$;

COMMENT ON FUNCTION insert_telegram_message IS 
  'Inserta un mensaje de Telegram en ae_messages y actualiza la sesión';


-- PASO 8: Verificación de integridad
-- ============================================

-- Verificar que no haya mensajes huérfanos
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM ae_messages m
  WHERE NOT EXISTS (
    SELECT 1 FROM ae_sessions s WHERE s.id = m.session_id
  );
  
  IF orphan_count > 0 THEN
    RAISE WARNING 'Se encontraron % mensajes huérfanos sin sesión', orphan_count;
  ELSE
    RAISE NOTICE 'Verificación OK: Todos los mensajes tienen sesión válida';
  END IF;
END $$;


-- PASO 9: Vistas útiles para monitoreo
-- ============================================

-- Vista: Mensajes por canal
CREATE OR REPLACE VIEW v_messages_by_channel AS
SELECT 
  channel,
  COUNT(*) as total_messages,
  COUNT(DISTINCT session_id) as unique_sessions,
  COUNT(DISTINCT user_id_uuid) as unique_users,
  MIN(created_at) as first_message,
  MAX(created_at) as last_message
FROM ae_messages
GROUP BY channel;

COMMENT ON VIEW v_messages_by_channel IS 
  'Estadísticas de mensajes agrupados por canal';


-- Vista: Sesiones activas por canal
CREATE OR REPLACE VIEW v_active_sessions_by_channel AS
SELECT 
  metadata->>'channel' as channel,
  COUNT(*) as active_sessions,
  COUNT(DISTINCT user_id_uuid) as unique_users,
  MAX(last_message_at) as last_activity
FROM ae_sessions
WHERE last_message_at > NOW() - INTERVAL '7 days'
GROUP BY metadata->>'channel';

COMMENT ON VIEW v_active_sessions_by_channel IS 
  'Sesiones activas en los últimos 7 días por canal';


-- PASO 10: Consultas de validación
-- ============================================

-- Validar estructura
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'ae_messages'
  AND column_name IN ('channel', 'external_message_id', 'metadata')
ORDER BY ordinal_position;

-- Validar índices
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'ae_messages'
  AND indexname LIKE '%channel%' OR indexname LIKE '%external%'
ORDER BY indexname;

-- Contar mensajes por canal
SELECT * FROM v_messages_by_channel;


-- ============================================
-- NOTAS IMPORTANTES
-- ============================================

-- 1. Este script es IDEMPOTENTE (puede ejecutarse múltiples veces)
-- 2. NO elimina datos existentes
-- 3. Las funciones SECURITY DEFINER permiten que el backend las use
-- 4. Las vistas son útiles para monitoreo en producción
-- 5. Verificar RLS policies después de ejecutar

-- ============================================
-- VALIDACIÓN POST-EJECUCIÓN
-- ============================================

-- Verificar que todo está OK:
DO $$
BEGIN
  -- Verificar columnas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ae_messages' AND column_name = 'channel'
  ) THEN
    RAISE EXCEPTION 'Columna channel no existe en ae_messages';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ae_messages' AND column_name = 'external_message_id'
  ) THEN
    RAISE EXCEPTION 'Columna external_message_id no existe en ae_messages';
  END IF;
  
  -- Verificar índices
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'ae_messages' AND indexname = 'idx_ae_messages_channel'
  ) THEN
    RAISE EXCEPTION 'Índice idx_ae_messages_channel no existe';
  END IF;
  
  -- Verificar funciones
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'find_or_create_telegram_session'
  ) THEN
    RAISE EXCEPTION 'Función find_or_create_telegram_session no existe';
  END IF;
  
  RAISE NOTICE '✅ Todas las verificaciones pasaron correctamente';
END $$;


-- ============================================
-- FIN DEL SCRIPT
-- ============================================
