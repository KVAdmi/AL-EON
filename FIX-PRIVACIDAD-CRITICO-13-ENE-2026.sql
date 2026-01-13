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

-- 🔍 VERIFICAR ESTRUCTURA DE user_projects
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_projects'
ORDER BY ordinal_position;

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

-- ✅ CREAR policy CORRECTA usando USER_ID (confirmado en estructura)
CREATE POLICY "users_view_own_and_shared_projects" ON user_projects
  FOR SELECT 
  TO authenticated
  USING (
    -- Ver proyectos donde SOY OWNER
    user_id = auth.uid()
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
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_update_own_projects" ON user_projects
  FOR UPDATE 
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_delete_own_projects" ON user_projects
  FOR DELETE 
  TO authenticated
  USING (user_id = auth.uid());

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

-- 🚨 DESHABILITAR RLS PRIMERO (evitar recursión)
ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;

-- ELIMINAR TODAS las policies
DROP POLICY IF EXISTS "Enable access to project members" ON project_members;
DROP POLICY IF EXISTS "users_view_members_of_accessible_projects" ON project_members;
DROP POLICY IF EXISTS "project_owners_manage_members" ON project_members;

-- RE-HABILITAR RLS
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- ✅ POLICY SIN RECURSIÓN: Ver solo registros donde YO estoy involucrado
CREATE POLICY "users_view_own_memberships" ON project_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()  -- Soy el miembro
    OR 
    invited_by = auth.uid()  -- Yo invité a alguien
    OR
    project_id IN (SELECT id FROM user_projects WHERE user_id = auth.uid())  -- Soy owner del proyecto
  );

-- POLICY para INSERT: Solo owners pueden agregar miembros
CREATE POLICY "project_owners_can_add_members" ON project_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (SELECT id FROM user_projects WHERE user_id = auth.uid())
  );

-- POLICY para UPDATE: Actualizar membresías (aceptar invitaciones)
CREATE POLICY "users_can_update_own_membership" ON project_members
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR project_id IN (SELECT id FROM user_projects WHERE user_id = auth.uid()))
  WITH CHECK (user_id = auth.uid() OR project_id IN (SELECT id FROM user_projects WHERE user_id = auth.uid()));

-- POLICY para DELETE: Solo owners pueden remover
CREATE POLICY "project_owners_can_remove_members" ON project_members
  FOR DELETE
  TO authenticated
  USING (project_id IN (SELECT id FROM user_projects WHERE user_id = auth.uid()));

-- ============================================
-- 4. FIX CALENDARIO (calendar_events)
-- ============================================

-- 🔍 PRIMERO: Verificar estructura REAL de la tabla
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'calendar_events'
ORDER BY ordinal_position;

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

-- ✅ CREAR policies usando OWNER_USER_ID (confirmado en estructura)

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
  p.user_id,
  auth.uid() as mi_user_id,
  (p.user_id = auth.uid()) as "soy_owner",
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
