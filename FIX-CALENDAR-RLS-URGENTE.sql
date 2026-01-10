-- ============================================
-- FIX URGENTE: AGENDA PERSONAL (calendar_events)
-- ============================================
-- PROBLEMA: Usuario 1 ve sus eventos, Usuario 2 NO ve nada
-- CAUSA: RLS solo permite ver owner_user_id = auth.uid() (sin compartidos)
-- 
-- SOLUCIÓN: Permitir ver eventos donde:
-- 1. Soy owner (owner_user_id = auth.uid())
-- 2. Soy participante (mi email/userId está en participants)
-- ============================================

-- NOTA: Asumiendo que la tabla se llama 'calendar_events' o 'events'
-- Si tienes otro nombre, reemplázalo

-- ============================================
-- OPCIÓN 1: Si la tabla se llama 'calendar_events'
-- ============================================

-- 1. Deshabilitar RLS temporalmente
ALTER TABLE calendar_events DISABLE ROW LEVEL SECURITY;

-- 2. ELIMINAR todas las policies existentes (incluyendo la problemática)
DROP POLICY IF EXISTS "calendar_events_owner_policy" ON calendar_events;
DROP POLICY IF EXISTS "Users can view own events" ON calendar_events;
DROP POLICY IF EXISTS "Users can create own events" ON calendar_events;
DROP POLICY IF EXISTS "Users can update own events" ON calendar_events;
DROP POLICY IF EXISTS "Users can delete own events" ON calendar_events;
DROP POLICY IF EXISTS "Users can view own and shared events" ON calendar_events;

-- 3. Re-habilitar RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- 4. CREAR policies CORRECTAS (con eventos compartidos)

-- 📅 SELECT: Ver eventos donde SOY OWNER (SIN participants, no hay forma de compartir)
CREATE POLICY "Users can view own events" ON calendar_events
  FOR SELECT 
  TO authenticated
  USING (
    owner_user_id = auth.uid()
  );

-- 📅 INSERT: Solo puedo crear eventos como owner
CREATE POLICY "Users can create own events" ON calendar_events
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    owner_user_id = auth.uid()
  );

-- 📅 UPDATE: Solo puedo actualizar mis propios eventos (no eventos compartidos)
CREATE POLICY "Users can update own events" ON calendar_events
  FOR UPDATE 
  TO authenticated
  USING (
    owner_user_id = auth.uid()
  );

-- 📅 DELETE: Solo puedo eliminar mis propios eventos (no eventos compartidos)
CREATE POLICY "Users can delete own events" ON calendar_events
  FOR DELETE 
  TO authenticated
  USING (
    owner_user_id = auth.uid()
  );

-- ============================================
-- OPCIÓN 2: Si la tabla se llama 'events'
-- ============================================

-- Descomenta y usa esto si la tabla se llama 'events':

/*
ALTER TABLE events DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own events" ON events;
DROP POLICY IF EXISTS "Users can create own events" ON events;
DROP POLICY IF EXISTS "Users can update own events" ON events;
DROP POLICY IF EXISTS "Users can delete own events" ON events;
DROP POLICY IF EXISTS "Users can view own and shared events" ON events;

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own events" ON events
  FOR SELECT 
  TO authenticated
  USING (
    owner_user_id = auth.uid()
  );

CREATE POLICY "Users can create own events" ON events
  FOR INSERT 
  TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Users can update own events" ON events
  FOR UPDATE 
  TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "Users can delete own events" ON events
  FOR DELETE 
  TO authenticated
  USING (owner_user_id = auth.uid());
*/

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Ver el nombre real de la tabla
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE column_name IN ('owner_user_id', 'start_at', 'end_at')
  AND table_schema = 'public'
ORDER BY table_name;

-- Ver policies actuales
SELECT 
  tablename,
  policyname,
  cmd,
  qual as "USING condition"
FROM pg_policies
WHERE tablename IN ('calendar_events', 'events')
ORDER BY tablename, policyname;

-- Test: Ver cuántos eventos veo ahora
SELECT 
  'Eventos visibles para mí' as test,
  COUNT(*) as total,
  COUNT(CASE WHEN owner_user_id = auth.uid() THEN 1 END) as "Mis eventos",
  COUNT(CASE WHEN owner_user_id != auth.uid() THEN 1 END) as "Eventos compartidos"
FROM calendar_events; -- O FROM events si ese es el nombre

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
-- 1. Primero ejecuta la query de VERIFICACIÓN para ver el nombre real de la tabla
-- 2. Si la tabla NO se llama 'calendar_events' ni 'events', reemplaza el nombre
-- 3. Si 'participants' tiene otra estructura (no JSONB), ajusta la query EXISTS
-- 4. Si NO hay campo 'participants', no puedes compartir eventos (solo owner)
