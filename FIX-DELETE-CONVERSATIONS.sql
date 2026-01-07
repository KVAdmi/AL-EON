-- ============================================
-- 🔧 FIX: Permitir eliminar conversaciones
-- ============================================
-- Problema: No se pueden eliminar conversaciones manualmente
-- Solución: Verificar y corregir políticas RLS en user_conversations
-- ============================================

-- 1. Verificar políticas actuales
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_conversations';

-- 2. Habilitar RLS si no está habilitado
ALTER TABLE user_conversations ENABLE ROW LEVEL SECURITY;

-- 3. Eliminar política de DELETE existente si hay conflictos
DROP POLICY IF EXISTS "Usuarios borran solo sus conversaciones" ON user_conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON user_conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON user_conversations;

-- 4. Crear política correcta para DELETE
CREATE POLICY "Usuarios borran solo sus conversaciones"
  ON user_conversations 
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 5. Verificar que las demás políticas existan
DROP POLICY IF EXISTS "Usuarios ven solo sus conversaciones" ON user_conversations;
DROP POLICY IF EXISTS "Usuarios insertan solo sus conversaciones" ON user_conversations;
DROP POLICY IF EXISTS "Usuarios actualizan solo sus conversaciones" ON user_conversations;

CREATE POLICY "Usuarios ven solo sus conversaciones"
  ON user_conversations 
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios insertan solo sus conversaciones"
  ON user_conversations 
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios actualizan solo sus conversaciones"
  ON user_conversations 
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. Verificar políticas finales
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE tablename = 'user_conversations'
ORDER BY cmd;

-- ============================================
-- RESULTADO ESPERADO:
-- ============================================
-- Deberías ver 4 políticas:
-- ✅ Usuarios ven solo sus conversaciones (SELECT)
-- ✅ Usuarios insertan solo sus conversaciones (INSERT)
-- ✅ Usuarios actualizan solo sus conversaciones (UPDATE)
-- ✅ Usuarios borran solo sus conversaciones (DELETE)
-- ============================================
