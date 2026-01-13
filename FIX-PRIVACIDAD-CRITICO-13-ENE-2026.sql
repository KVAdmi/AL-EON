-- ============================================
-- 🚨 FIX CRÍTICO: PRIVACIDAD ROTA
-- ============================================
-- FECHA: 13 enero 2026
-- PROBLEMA REPORTADO POR PATRICIA:
-- 1. Todos los usuarios ven conversaciones de todos (PRIVACIDAD CRÍTICA)
-- 2. Proyectos compartidos no se ven
-- 3. Calendario no funciona
--
-- EJECUTAR EN SUPABASE DASHBOARD > SQL EDITOR
-- ============================================

-- ============================================
-- 1. FIX CONVERSACIONES (user_conversations)
-- ============================================

-- Ver estado actual
SELECT 
  tablename,
  policyname,
  cmd,
  permissive,
  qual as "USING",
  with_check as "WITH CHECK"
FROM pg_policies
WHERE tablename = 'user_conversations'
ORDER BY policyname;

-- ELIMINAR policies incorrectas
DROP POLICY IF EXISTS "Enable read access for all users" ON user_conversations;
DROP POLICY IF EXISTS "Users can view all conversations" ON user_conversations;
DROP POLICY IF EXISTS "Public conversations" ON user_conversations;

-- CREAR policies CORRECTAS (solo ver propias conversaciones)
CREATE POLICY "users_view_own_conversations" ON user_conversations
  FOR SELECT 
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "users_insert_own_conversations" ON user_conversations
  FOR INSERT 
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_update_own_conversations" ON user_conversations
  FOR UPDATE 
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_delete_own_conversations" ON user_conversations
  FOR DELETE 
  TO authenticated
  USING (user_id = auth.uid());

-- Verificar que RLS está habilitado
ALTER TABLE user_conversations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. FIX PROYECTOS (user_projects + project_members)
-- ============================================

-- Ver estado actual de user_projects
SELECT 
  tablename,
  policyname,
  cmd,
  qual as "USING"
FROM pg_policies
WHERE tablename = 'user_projects'
ORDER BY policyname;

-- ELIMINAR policies problemáticas
DROP POLICY IF EXISTS "projects_select_policy" ON user_projects;
DROP POLICY IF EXISTS "Users can view own projects" ON user_projects;
DROP POLICY IF EXISTS "Enable project access" ON user_projects;

-- CREAR policy CORRECTA para ver proyectos propios Y compartidos
CREATE POLICY "users_view_own_and_shared_projects" ON user_projects
  FOR SELECT 
  TO authenticated
  USING (
    -- Ver proyectos donde SOY OWNER
    owner_user_id = auth.uid()
    OR
    -- Ver proyectos donde SOY MIEMBRO (en project_members)
    id IN (
      SELECT project_id 
      FROM project_members 
      WHERE user_id = auth.uid()
    )
  );

-- Policies para INSERT/UPDATE/DELETE (solo owner)
CREATE POLICY "users_insert_own_projects" ON user_projects
  FOR INSERT 
  TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "users_update_own_projects" ON user_projects
  FOR UPDATE 
  TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "users_delete_own_projects" ON user_projects
  FOR DELETE 
  TO authenticated
  USING (owner_user_id = auth.uid());

-- Verificar RLS
ALTER TABLE user_projects ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. FIX project_members (para invitaciones)
-- ============================================

-- Ver estado actual
SELECT 
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'project_members';

-- ELIMINAR policies incorrectas
DROP POLICY IF EXISTS "Enable access to project members" ON project_members;

-- CREAR policies correctas
CREATE POLICY "users_view_members_of_accessible_projects" ON project_members
  FOR SELECT 
  TO authenticated
  USING (
    -- Ver miembros de proyectos donde SOY OWNER
    project_id IN (
      SELECT id FROM user_projects WHERE owner_user_id = auth.uid()
    )
    OR
    -- Ver miembros de proyectos donde SOY MIEMBRO
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "project_owners_manage_members" ON project_members
  FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM user_projects WHERE owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM user_projects WHERE owner_user_id = auth.uid()
    )
  );

ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. FIX CALENDARIO (calendar_events)
-- ============================================
-- ✅ CONFIRMADO: Tabla 'calendar_events' existe con columna 'owner_user_id'

-- Ver estado actual de policies
SELECT 
  tablename,
  policyname,
  cmd,
  permissive,
  qual as "USING"
FROM pg_policies
WHERE tablename = 'calendar_events'
ORDER BY policyname;

-- Verificar si hay eventos sin owner_user_id
SELECT 
  COUNT(*) as total_eventos,
  COUNT(owner_user_id) as con_owner_user_id,
  COUNT(CASE WHEN owner_user_id IS NULL THEN 1 END) as sin_owner_user_id
FROM calendar_events;

-- DESHABILITAR RLS temporalmente
ALTER TABLE calendar_events DISABLE ROW LEVEL SECURITY;

-- ELIMINAR TODAS las policies conflictivas
DROP POLICY IF EXISTS "calendar_events_owner_policy" ON calendar_events;
DROP POLICY IF EXISTS "Users can view own events" ON calendar_events;
DROP POLICY IF EXISTS "Users can create own events" ON calendar_events;
DROP POLICY IF EXISTS "Users can update own events" ON calendar_events;
DROP POLICY IF EXISTS "Users can delete own events" ON calendar_events;
DROP POLICY IF EXISTS "Enable calendar access" ON calendar_events;
DROP POLICY IF EXISTS "calendar_select_policy" ON calendar_events;

-- RE-HABILITAR RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- CREAR policies limpias y correctas
CREATE POLICY "users_view_own_calendar_events" ON calendar_events
  FOR SELECT 
  TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "users_insert_own_calendar_events" ON calendar_events
  FOR INSERT 
  TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "users_update_own_calendar_events" ON calendar_events
  FOR UPDATE 
  TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "users_delete_own_calendar_events" ON calendar_events
  FOR DELETE 
  TO authenticated
  USING (owner_user_id = auth.uid());

-- ============================================
-- 5. VERIFICACIÓN FINAL
-- ============================================

-- Ver todas las policies aplicadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  qual as "USING",
  with_check as "WITH CHECK"
FROM pg_policies
WHERE tablename IN ('user_conversations', 'user_projects', 'project_members', 'calendar_events')
ORDER BY tablename, policyname;

-- Ver si RLS está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE tablename IN ('user_conversations', 'user_projects', 'project_members', 'calendar_events')
  AND schemaname = 'public';

-- ============================================
-- 6. TESTING (ejecutar como usuario normal, NO service_role)
-- ============================================

-- Test 1: Conversaciones (debe retornar solo MIS conversaciones)
SELECT 
  id,
  user_id,
  title,
  created_at,
  auth.uid() as mi_user_id,
  (user_id = auth.uid()) as "es_mia"
FROM user_conversations
ORDER BY created_at DESC
LIMIT 5;

-- Test 2: Proyectos (debe retornar mis proyectos + proyectos compartidos)
SELECT 
  p.id,
  p.name,
  p.owner_user_id,
  auth.uid() as mi_user_id,
  (p.owner_user_id = auth.uid()) as "soy_owner",
  EXISTS(
    SELECT 1 FROM project_members pm 
    WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
  ) as "soy_miembro"
FROM user_projects p
ORDER BY p.created_at DESC
LIMIT 5;

-- Test 3: Calendario (debe retornar solo MIS eventos)
SELECT 
  id,
  title,
  owner_user_id,
  start_at,
  auth.uid() as mi_user_id,
  (owner_user_id = auth.uid()) as "es_mio"
FROM calendar_events
ORDER BY start_at DESC
LIMIT 5;

-- ============================================
-- 🚨 NOTAS CRÍTICAS
-- ============================================
/*
1. EJECUTAR TODO EN ORDEN (Secciones 1-4)

2. Si hay errores de "policy already exists", ignorar

3. Después de ejecutar, hacer LOGOUT y LOGIN en la app

4. Verificar que:
   ✅ Solo ves TUS conversaciones
   ✅ Ves TUS proyectos + proyectos donde te invitaron
   ✅ Solo ves TUS eventos de calendario

5. Si sigue sin funcionar, enviar:
   - Screenshot del error específico
   - Resultado de las queries de VERIFICACIÓN FINAL (Sección 5)
*/
