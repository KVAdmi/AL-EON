-- ============================================
-- FIX DEFINITIVO: RLS para REUNIONES COMPARTIDAS
-- ============================================
-- PROBLEMA: Usuario owner ve eventos, invitados NO ven nada
-- CAUSA: Policy solo permite ver owner_user_id = auth.uid()
-- 
-- SOLUCIÓN: Permitir ver reuniones donde:
-- 1. Soy owner (owner_user_id = auth.uid())
-- 2. Soy participante (mi email está en participants JSONB)
-- ============================================

-- 1. Habilitar RLS
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- 2. ELIMINAR policies existentes
DROP POLICY IF EXISTS "Users can view own meetings" ON meetings;
DROP POLICY IF EXISTS "Users can create own meetings" ON meetings;
DROP POLICY IF EXISTS "Users can update own meetings" ON meetings;
DROP POLICY IF EXISTS "Users can delete own meetings" ON meetings;
DROP POLICY IF EXISTS "Users can view own and shared meetings" ON meetings;

-- ============================================
-- 3. CREAR POLICIES CORRECTAS (CON COMPARTIDOS)
-- ============================================

-- 📅 SELECT: Ver reuniones donde SOY OWNER o SOY PARTICIPANTE
CREATE POLICY "Users can view own and shared meetings" ON meetings
  FOR SELECT 
  TO authenticated
  USING (
    owner_user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.email = ANY(
        SELECT jsonb_array_elements_text(participants::jsonb -> 'email')
      )
    )
  );

-- 📅 INSERT: Solo puedo crear reuniones como owner
CREATE POLICY "Users can create own meetings" ON meetings
  FOR INSERT 
  TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

-- 📅 UPDATE: Solo puedo actualizar mis propias reuniones (no compartidas)
CREATE POLICY "Users can update own meetings" ON meetings
  FOR UPDATE 
  TO authenticated
  USING (owner_user_id = auth.uid());

-- 📅 DELETE: Solo puedo eliminar mis propias reuniones (no compartidas)
CREATE POLICY "Users can delete own meetings" ON meetings
  FOR DELETE 
  TO authenticated
  USING (owner_user_id = auth.uid());

-- ============================================
-- 4. VERIFICACIÓN
-- ============================================
SELECT 
  '✅ RLS policies de meetings actualizadas CORRECTAMENTE (con compartidos)' as status;

-- Ver todas las policies creadas
SELECT 
  tablename,
  policyname,
  cmd,
  qual as "USING condition"
FROM pg_policies
WHERE tablename = 'meetings'
ORDER BY policyname;

-- Test: Ver cuántas reuniones veo ahora
SELECT 
  'Reuniones visibles para mí' as test,
  COUNT(*) as total,
  COUNT(CASE WHEN owner_user_id = auth.uid() THEN 1 END) as "Mis reuniones",
  COUNT(CASE WHEN owner_user_id != auth.uid() THEN 1 END) as "Reuniones compartidas"
FROM meetings;

-- Ver mis participantes en reuniones
SELECT 
  id,
  title,
  owner_user_id = auth.uid() as "soy_owner",
  participants as "participantes",
  created_at
FROM meetings
ORDER BY created_at DESC
LIMIT 5;
