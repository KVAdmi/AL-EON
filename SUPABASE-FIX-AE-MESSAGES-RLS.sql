-- ============================================
-- FIX: RLS para ae_messages
-- ============================================
-- Problema: Backend (AL-E Core) no puede leer historial de ae_messages
-- Causa: No hay políticas RLS configuradas
-- Solución: Agregar políticas que permitan a usuarios leer/escribir sus propios mensajes

-- PASO 1: Habilitar RLS en ae_messages (si no está habilitado)
-- --------------------------------------------
ALTER TABLE ae_messages ENABLE ROW LEVEL SECURITY;

-- PASO 2: Eliminar políticas existentes (si las hay)
-- --------------------------------------------
DROP POLICY IF EXISTS "Users can read their own messages" ON ae_messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON ae_messages;
DROP POLICY IF EXISTS "Users can read messages from their sessions" ON ae_messages;
DROP POLICY IF EXISTS "Users can insert messages to their sessions" ON ae_messages;

-- PASO 3: Crear políticas RLS
-- --------------------------------------------

-- Política 1: Usuarios pueden LEER mensajes de sus propias sesiones
CREATE POLICY "Users can read messages from their sessions"
  ON ae_messages FOR SELECT
  USING (
    -- Opción A: Si ae_messages.user_id_uuid está poblado
    user_id_uuid = auth.uid()
    OR
    -- Opción B: Si ae_messages.session_id vincula con ae_sessions.user_id_uuid
    session_id IN (
      SELECT id FROM ae_sessions WHERE user_id_uuid = auth.uid()
    )
  );

-- Política 2: Usuarios pueden INSERTAR mensajes a sus propias sesiones
CREATE POLICY "Users can insert messages to their sessions"
  ON ae_messages FOR INSERT
  WITH CHECK (
    -- Validar que el usuario es dueño de la sesión
    session_id IN (
      SELECT id FROM ae_sessions WHERE user_id_uuid = auth.uid()
    )
    OR
    -- O que el user_id_uuid coincide
    user_id_uuid = auth.uid()
  );

-- PASO 4: Verificar que las políticas se crearon correctamente
-- --------------------------------------------
-- Ejecuta esto para validar:
/*
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'ae_messages'
ORDER BY policyname;
*/

-- PASO 5: Testing manual
-- --------------------------------------------
-- Desde un cliente autenticado (con JWT), ejecuta:
/*
-- 1. Insertar un mensaje de prueba
INSERT INTO ae_messages (session_id, role, content, user_id_uuid)
VALUES (
  'tu-session-id-aqui',
  'user',
  'Test message',
  auth.uid()
);

-- 2. Leer mensajes de tu sesión
SELECT id, session_id, role, content, created_at
FROM ae_messages
WHERE session_id = 'tu-session-id-aqui'
ORDER BY created_at;
*/

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
-- 1. Si AL-E Core usa SUPABASE_SERVICE_ROLE_KEY:
--    Las políticas RLS NO aplican (tiene acceso total)
--    
-- 2. Si AL-E Core usa el JWT del usuario (Authorization: Bearer):
--    Las políticas RLS SÍ aplican (debe cumplir las condiciones)
--
-- 3. Verifica en tus logs de Core qué tipo de client usa:
--    - Service Role = sin restricciones RLS
--    - User JWT = con restricciones RLS (necesita estas políticas)
