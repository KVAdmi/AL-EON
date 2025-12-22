-- ============================================
-- MIGRACIÓN: TEXT user_id → UUID user_id
-- ============================================
-- Objetivo: Convertir user_id de TEXT a UUID en todas las tablas
-- para usar auth.users(id) de Supabase correctamente.

-- ⚠️ IMPORTANTE: EJECUTAR PASO POR PASO, NO TODO DE UNA VEZ

-- PASO 1: Agregar columnas temporales UUID
-- --------------------------------------------
-- EJECUTA ESTO PRIMERO:

ALTER TABLE ae_sessions ADD COLUMN IF NOT EXISTS user_id_uuid UUID;
ALTER TABLE ae_messages ADD COLUMN IF NOT EXISTS user_id_uuid UUID;
ALTER TABLE ae_user_memory ADD COLUMN IF NOT EXISTS user_id_uuid UUID;
ALTER TABLE assistant_memories ADD COLUMN IF NOT EXISTS user_id_uuid UUID;

-- VERIFICA que se crearon las columnas antes de continuar:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ae_sessions';

-- PASO 2: Copiar datos casteables
-- --------------------------------------------
-- EJECUTA ESTO DESPUÉS DEL PASO 1:
-- ⚠️ CAMBIA "user_id" por el nombre REAL de tu columna actual (probablemente "user_text" o similar)

-- PRIMERO: Verifica cómo se llama tu columna actual
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'ae_sessions';

-- LUEGO: Reemplaza "user_id" abajo por el nombre correcto
-- Si tu columna se llama diferente, cambia TODAS las ocurrencias de "user_id" por ese nombre

UPDATE ae_sessions 
SET user_id_uuid = user_id::uuid
WHERE user_id IS NOT NULL 
  AND user_id::text ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

UPDATE ae_messages 
SET user_id_uuid = user_id::uuid
WHERE user_id IS NOT NULL 
  AND user_id::text ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

UPDATE ae_user_memory 
SET user_id_uuid = user_id::uuid
WHERE user_id IS NOT NULL 
  AND user_id::text ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

UPDATE assistant_memories 
SET user_id_uuid = user_id::uuid
WHERE user_id IS NOT NULL 
  AND user_id::text ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

-- PASO 3: Verificar datos no migrables
-- --------------------------------------------
-- Listar registros que NO se migraron (user_id no es UUID)

SELECT 'ae_sessions' as tabla, user_id, count(*) 
FROM ae_sessions 
WHERE user_id_uuid IS NULL 
GROUP BY user_id;

SELECT 'ae_messages' as tabla, user_id, count(*) 
FROM ae_messages 
WHERE user_id_uuid IS NULL 
GROUP BY user_id;

SELECT 'ae_user_memory' as tabla, user_id, count(*) 
FROM ae_user_memory 
WHERE user_id_uuid IS NULL 
GROUP BY user_id;

SELECT 'assistant_memories' as tabla, user_id, count(*) 
FROM assistant_memories 
WHERE user_id_uuid IS NULL 
GROUP BY user_id;

-- DECISIÓN: Opción C - Crear usuario "legacy" para datos no UUID
-- --------------------------------------------
-- Crear usuario legacy SOLO si no existe

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000001'
  ) THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      '00000000-0000-0000-0000-000000000001',
      'authenticated',
      'authenticated',
      'legacy@al-eon.local',
      '$2a$10$dummyencryptedpassword',
      NOW(),
      NOW(),
      NOW(),
      '',
      ''
    );
  END IF;
END $$;

-- Asignar registros no-UUID al usuario legacy
UPDATE ae_sessions SET user_id_uuid = '00000000-0000-0000-0000-000000000001' 
WHERE user_id_uuid IS NULL;

UPDATE ae_messages SET user_id_uuid = '00000000-0000-0000-0000-000000000001' 
WHERE user_id_uuid IS NULL;

UPDATE ae_user_memory SET user_id_uuid = '00000000-0000-0000-0000-000000000001' 
WHERE user_id_uuid IS NULL;

UPDATE assistant_memories SET user_id_uuid = '00000000-0000-0000-0000-000000000001' 
WHERE user_id_uuid IS NULL;

-- PASO 4: Renombrar columnas (swap)
-- --------------------------------------------
-- Hacer backup antes de este paso!

-- Renombrar columnas viejas
ALTER TABLE ae_sessions RENAME COLUMN user_id TO user_id_old;
ALTER TABLE ae_messages RENAME COLUMN user_id TO user_id_old;
ALTER TABLE ae_user_memory RENAME COLUMN user_id TO user_id_old;
ALTER TABLE assistant_memories RENAME COLUMN user_id TO user_id_old;

-- Renombrar columnas nuevas
ALTER TABLE ae_sessions RENAME COLUMN user_id_uuid TO user_id;
ALTER TABLE ae_messages RENAME COLUMN user_id_uuid TO user_id;
ALTER TABLE ae_user_memory RENAME COLUMN user_id_uuid TO user_id;
ALTER TABLE assistant_memories RENAME COLUMN user_id_uuid TO user_id;

-- PASO 5: Agregar restricciones NOT NULL y FK
-- --------------------------------------------

-- Eliminar registros que aún tengan NULL (si optaste por eso)
DELETE FROM ae_sessions WHERE user_id IS NULL;
DELETE FROM ae_messages WHERE user_id IS NULL;
DELETE FROM ae_user_memory WHERE user_id IS NULL;
DELETE FROM assistant_memories WHERE user_id IS NULL;

-- Agregar NOT NULL
ALTER TABLE ae_sessions ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE ae_messages ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE ae_user_memory ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE assistant_memories ALTER COLUMN user_id SET NOT NULL;

-- Agregar Foreign Keys a auth.users
ALTER TABLE ae_sessions 
  ADD CONSTRAINT fk_sessions_user 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ae_messages 
  ADD CONSTRAINT fk_messages_user 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ae_user_memory 
  ADD CONSTRAINT fk_memory_user 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE assistant_memories 
  ADD CONSTRAINT fk_assistant_memories_user 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- PASO 6: Recrear índices
-- --------------------------------------------

-- ae_sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user_workspace 
  ON ae_sessions(user_id, workspace_id);

CREATE INDEX IF NOT EXISTS idx_sessions_last_message 
  ON ae_sessions(last_message_at DESC);

-- ae_messages
CREATE INDEX IF NOT EXISTS idx_messages_session 
  ON ae_messages(session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_messages_user 
  ON ae_messages(user_id);

-- ae_user_memory
CREATE INDEX IF NOT EXISTS idx_memory_user_workspace 
  ON ae_user_memory(user_id, workspace_id);

CREATE INDEX IF NOT EXISTS idx_memory_importance 
  ON ae_user_memory(importance DESC, last_accessed DESC);

-- assistant_memories
CREATE INDEX IF NOT EXISTS idx_assistant_memories_user 
  ON assistant_memories(user_id);

-- PASO 7: Eliminar columnas viejas (OPCIONAL - DESPUÉS DE PROBAR)
-- --------------------------------------------
-- ⚠️ SOLO después de verificar que todo funciona correctamente

-- ALTER TABLE ae_sessions DROP COLUMN user_id_old;
-- ALTER TABLE ae_messages DROP COLUMN user_id_old;
-- ALTER TABLE ae_user_memory DROP COLUMN user_id_old;
-- ALTER TABLE assistant_memories DROP COLUMN user_id_old;

-- PASO 8: Verificación Final
-- --------------------------------------------

-- Contar registros por tabla
SELECT 
  'ae_sessions' as tabla,
  COUNT(*) as total,
  COUNT(DISTINCT user_id) as usuarios_unicos
FROM ae_sessions;

SELECT 
  'ae_messages' as tabla,
  COUNT(*) as total,
  COUNT(DISTINCT user_id) as usuarios_unicos
FROM ae_messages;

SELECT 
  'ae_user_memory' as tabla,
  COUNT(*) as total,
  COUNT(DISTINCT user_id) as usuarios_unicos
FROM ae_user_memory;

-- Verificar que todas las FK funcionan
SELECT 
  s.id as session_id,
  s.user_id,
  u.email,
  s.created_at
FROM ae_sessions s
JOIN auth.users u ON s.user_id = u.id
LIMIT 10;

-- ============================================
-- ROLLBACK (por si algo sale mal)
-- ============================================
-- SOLO usar si necesitas revertir ANTES del PASO 7

/*
-- Restaurar desde backup
ALTER TABLE ae_sessions DROP COLUMN user_id;
ALTER TABLE ae_sessions RENAME COLUMN user_id_old TO user_id;

ALTER TABLE ae_messages DROP COLUMN user_id;
ALTER TABLE ae_messages RENAME COLUMN user_id_old TO user_id;

ALTER TABLE ae_user_memory DROP COLUMN user_id;
ALTER TABLE ae_user_memory RENAME COLUMN user_id_old TO user_id;

ALTER TABLE assistant_memories DROP COLUMN user_id;
ALTER TABLE assistant_memories RENAME COLUMN user_id_old TO user_id;
*/

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
-- 1. HACER BACKUP COMPLETO antes de ejecutar
-- 2. Ejecutar en ambiente de desarrollo primero
-- 3. Probar el backend con usuarios reales después de la migración
-- 4. Monitorear logs por si hay errores de FK
-- 5. Los registros con user_id="patty" o "test" se perderán a menos que:
--    - Los asignes a un usuario legacy
--    - Los elimines manualmente
--    - Los muevas a otra tabla de respaldo
