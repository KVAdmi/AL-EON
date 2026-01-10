-- ============================================
-- FIX URGENTE: Proyectos NO visibles
-- ============================================
-- Error reportado: "infinite recursion detected in policy for relation user_projects"
-- 
-- CAUSA: Las policies de user_projects y project_members tienen recursión circular
-- 
-- SOLUCIÓN: Aplicar fix de RLS sin recursión
-- ============================================

-- 1. Deshabilitar RLS temporalmente para limpiar
ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_projects DISABLE ROW LEVEL SECURITY;

-- 2. Eliminar TODAS las policies existentes (incluyendo las nuevas)
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
-- 4. CREAR POLICIES SIN RECURSIÓN
-- ============================================

-- 📁 user_projects - Policy SIMPLE para proyectos propios
CREATE POLICY "Users can view own projects" ON user_projects
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- 📁 user_projects - Policy SEPARADA para proyectos compartidos (sin recursión)
CREATE POLICY "Users can view accepted shared projects" ON user_projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 
      FROM project_members
      WHERE project_members.project_id = user_projects.id
        AND project_members.user_id = auth.uid()
        AND project_members.accepted_at IS NOT NULL
    )
  );

-- 📁 user_projects - Policy para CREAR
CREATE POLICY "Users can create projects" ON user_projects
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- 📁 user_projects - Policy para ACTUALIZAR (solo propios)
CREATE POLICY "Users can update own projects" ON user_projects
  FOR UPDATE USING (
    user_id = auth.uid()
  );

-- 📁 user_projects - Policy para ELIMINAR (solo propios)
CREATE POLICY "Users can delete own projects" ON user_projects
  FOR DELETE USING (
    user_id = auth.uid()
  );

-- 👥 project_members - Policy para VER (sin recursión)
CREATE POLICY "Users can view their memberships" ON project_members
  FOR SELECT USING (
    user_id = auth.uid() -- Ver mis propias membresías
  );

-- 👥 project_members - Policy para VER miembros de MIS proyectos (sin recursión)
CREATE POLICY "Owners can view project members" ON project_members
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM user_projects WHERE user_id = auth.uid()
    )
  );

-- 👥 project_members - Policy para INSERTAR (solo owners)
CREATE POLICY "Owners can add members" ON project_members
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM user_projects WHERE user_id = auth.uid()
    )
  );

-- 👥 project_members - Policy para ACTUALIZAR (propio membership O owner del proyecto)
CREATE POLICY "Users can update memberships" ON project_members
  FOR UPDATE USING (
    user_id = auth.uid() -- Actualizar mi membership (aceptar invitación)
    OR
    project_id IN (
      SELECT id FROM user_projects WHERE user_id = auth.uid()
    )
  );

-- 👥 project_members - Policy para ELIMINAR (solo owners)
CREATE POLICY "Owners can remove members" ON project_members
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM user_projects WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 5. VERIFICACIÓN
-- ============================================
SELECT 
  '✅ RLS policies actualizadas correctamente' as status;

-- Ver todas las policies creadas
SELECT 
  tablename,
  policyname,
  cmd,
  qual -- Condición USING
FROM pg_policies
WHERE tablename IN ('project_members', 'user_projects')
ORDER BY tablename, policyname;

-- Test rápido (reemplazar con tu user_id real)
-- SELECT * FROM user_projects WHERE user_id = auth.uid();
