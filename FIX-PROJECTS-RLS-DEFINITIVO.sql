-- ============================================
-- FIX DEFINITIVO: RLS para PROYECTOS COMPARTIDOS
-- ============================================
-- PROBLEMA: Usuario 1 ve sus proyectos, Usuario 2 NO ve nada
-- CAUSA: Policy solo permitía ver user_id = auth.uid() (sin compartidos)
-- 
-- SOLUCIÓN: Permitir ver:
-- 1. Proyectos donde SOY owner (user_id = auth.uid())
-- 2. Proyectos donde SOY miembro (EXISTS en project_members)
-- ============================================

-- 1. Deshabilitar RLS temporalmente
ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_projects DISABLE ROW LEVEL SECURITY;

-- 2. ELIMINAR TODAS las policies existentes
DROP POLICY IF EXISTS "Users can view project members" ON project_members;
DROP POLICY IF EXISTS "Project owners can manage members" ON project_members;
DROP POLICY IF EXISTS "Users can view members of their projects" ON project_members;
DROP POLICY IF EXISTS "Project owners can add members" ON project_members;
DROP POLICY IF EXISTS "Users can update their own membership or owners can update" ON project_members;
DROP POLICY IF EXISTS "Project owners can remove members" ON project_members;
DROP POLICY IF EXISTS "Users can view their memberships" ON project_members;
DROP POLICY IF EXISTS "Owners can view project members" ON project_members;
DROP POLICY IF EXISTS "Owners can add members" ON project_members;
DROP POLICY IF EXISTS "Users can update memberships" ON project_members;
DROP POLICY IF EXISTS "Owners can remove members" ON project_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON project_members;
DROP POLICY IF EXISTS "Users can insert memberships" ON project_members;
DROP POLICY IF EXISTS "Users can update their own memberships" ON project_members;
DROP POLICY IF EXISTS "Users can delete their own memberships" ON project_members;

DROP POLICY IF EXISTS "Users can view their projects" ON user_projects;
DROP POLICY IF EXISTS "Users can view shared projects" ON user_projects;
DROP POLICY IF EXISTS "Users can create projects" ON user_projects;
DROP POLICY IF EXISTS "Users can update own projects" ON user_projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON user_projects;
DROP POLICY IF EXISTS "Users can view own projects" ON user_projects;
DROP POLICY IF EXISTS "Users can view accepted shared projects" ON user_projects;

-- 3. Re-habilitar RLS
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_projects ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. CREAR POLICIES CORRECTAS (CON COMPARTIDOS)
-- ============================================

-- ==========================================
-- TABLA: user_projects
-- ==========================================

-- 📁 SELECT: Ver proyectos donde SOY DUEÑO o SOY MIEMBRO
CREATE POLICY "Users can view own and shared projects" ON user_projects
  FOR SELECT USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = user_projects.id
      AND pm.user_id = auth.uid()
    )
  );

-- 📁 INSERT: Solo puedo crear proyectos como owner
CREATE POLICY "Users can create projects" ON user_projects
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

-- 📁 UPDATE: Solo puedo actualizar mis propios proyectos (no compartidos)
CREATE POLICY "Users can update own projects" ON user_projects
  FOR UPDATE USING (
    user_id = auth.uid()
  );

-- 📁 DELETE: Solo puedo eliminar mis propios proyectos (no compartidos)
CREATE POLICY "Users can delete own projects" ON user_projects
  FOR DELETE USING (
    user_id = auth.uid()
  );

-- ==========================================
-- TABLA: project_members
-- ==========================================

-- 👥 SELECT: Ver membresías donde SOY el miembro O SOY dueño del proyecto
CREATE POLICY "Users can view relevant memberships" ON project_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_projects up
      WHERE up.id = project_members.project_id
      AND up.user_id = auth.uid()
    )
  );

-- 👥 INSERT: Permitir todas (el backend valida permisos)
CREATE POLICY "Users can insert memberships" ON project_members
  FOR INSERT WITH CHECK (
    true
  );

-- 👥 UPDATE: Solo puedo actualizar mis propias membresías O si soy owner del proyecto
CREATE POLICY "Users can update relevant memberships" ON project_members
  FOR UPDATE USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_projects up
      WHERE up.id = project_members.project_id
      AND up.user_id = auth.uid()
    )
  );

-- 👥 DELETE: Solo puedo eliminar mis propias membresías O si soy owner del proyecto
CREATE POLICY "Users can delete relevant memberships" ON project_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_projects up
      WHERE up.id = project_members.project_id
      AND up.user_id = auth.uid()
    )
  );

-- ============================================
-- 5. VERIFICACIÓN
-- ============================================
SELECT 
  '✅ RLS policies actualizadas CORRECTAMENTE (con compartidos)' as status;

-- Ver todas las policies creadas
SELECT 
  tablename,
  policyname,
  cmd,
  qual as "USING condition"
FROM pg_policies
WHERE tablename IN ('project_members', 'user_projects')
ORDER BY tablename, policyname;

-- Test: Ver cuántos proyectos veo ahora
SELECT 
  'Proyectos visibles para mí' as test,
  COUNT(*) as total,
  COUNT(CASE WHEN user_id = auth.uid() THEN 1 END) as "Mis proyectos",
  COUNT(CASE WHEN user_id != auth.uid() THEN 1 END) as "Proyectos compartidos"
FROM user_projects;
