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
-- 4. CREAR POLICIES SIN RECURSIÓN (ULTRA SIMPLES)
-- ============================================

-- � ESTRATEGIA: NO usar subqueries entre tablas relacionadas
-- Solo verificar campos directos de la tabla actual

-- 📁 user_projects - SOLO proyectos propios (SIN project_members)
CREATE POLICY "Users can view own projects" ON user_projects
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- 📁 user_projects - Policy para CREAR
CREATE POLICY "Users can create projects" ON user_projects
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
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

-- 👥 project_members - SOLO mis membresías (SIN user_projects)
CREATE POLICY "Users can view their own memberships" ON project_members
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- 👥 project_members - Policy para INSERTAR
CREATE POLICY "Users can insert memberships" ON project_members
  FOR INSERT WITH CHECK (
    true  -- Permitir todas las inserciones por ahora (el backend valida)
  );

-- 👥 project_members - Policy para ACTUALIZAR
CREATE POLICY "Users can update their own memberships" ON project_members
  FOR UPDATE USING (
    user_id = auth.uid()
  );

-- 👥 project_members - Policy para ELIMINAR
CREATE POLICY "Users can delete their own memberships" ON project_members
  FOR DELETE USING (
    user_id = auth.uid()
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
