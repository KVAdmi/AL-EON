-- ============================================
-- FIX URGENTE: Eliminar recursión infinita en user_projects
-- ============================================
-- ERROR: "infinite recursion detected in policy for relation 'user_projects'"
-- CAUSA: Policy SELECT de user_projects hace JOIN con project_members
--        que a su vez tiene policy que hace JOIN con user_projects
-- 
-- SOLUCIÓN: Policies SIMPLES sin JOINs circulares
-- ============================================

-- 1. DESHABILITAR RLS
ALTER TABLE user_projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;

-- 2. ELIMINAR TODAS LAS POLICIES
DROP POLICY IF EXISTS "Users can view own and shared projects" ON user_projects;
DROP POLICY IF EXISTS "Users can view their projects" ON user_projects;
DROP POLICY IF EXISTS "Users can view shared projects" ON user_projects;
DROP POLICY IF EXISTS "Users can create projects" ON user_projects;
DROP POLICY IF EXISTS "Users can update own projects" ON user_projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON user_projects;
DROP POLICY IF EXISTS "Users can view own projects" ON user_projects;
DROP POLICY IF EXISTS "Users can view accepted shared projects" ON user_projects;

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

-- 3. RE-HABILITAR RLS
ALTER TABLE user_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. POLICIES SIMPLES SIN RECURSIÓN
-- ============================================

-- user_projects: VER PROPIOS + COMPARTIDOS (sin recursión)
CREATE POLICY "select_own_projects" ON user_projects
  FOR SELECT USING (
    user_id = auth.uid()  -- Tus proyectos
    OR 
    id IN (  -- O proyectos donde eres miembro
      SELECT project_id 
      FROM project_members 
      WHERE user_id = auth.uid() 
        AND accepted_at IS NOT NULL
    )
  );

CREATE POLICY "insert_own_projects" ON user_projects
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "update_own_projects" ON user_projects
  FOR UPDATE USING (user_id = auth.uid());  -- Solo dueño

CREATE POLICY "delete_own_projects" ON user_projects
  FOR DELETE USING (user_id = auth.uid());  -- Solo dueño

-- project_members: VER TODOS LOS MIEMBROS DE TUS PROYECTOS
CREATE POLICY "select_project_members" ON project_members
  FOR SELECT USING (
    user_id = auth.uid()  -- Tu propio membership
    OR
    project_id IN (  -- O miembros de proyectos que posees
      SELECT id FROM user_projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "insert_project_members" ON project_members
  FOR INSERT WITH CHECK (
    project_id IN (  -- Solo dueño puede invitar
      SELECT id FROM user_projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "update_project_members" ON project_members
  FOR UPDATE USING (
    user_id = auth.uid()  -- Actualizar tu propio membership
    OR
    project_id IN (  -- O dueño puede actualizar cualquiera
      SELECT id FROM user_projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "delete_project_members" ON project_members
  FOR DELETE USING (
    project_id IN (  -- Solo dueño puede eliminar
      SELECT id FROM user_projects WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 5. VERIFICAR
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('user_projects', 'project_members')
ORDER BY tablename, policyname;
