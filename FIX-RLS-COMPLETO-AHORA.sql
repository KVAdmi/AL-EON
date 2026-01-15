-- ============================================
-- FIX DEFINITIVO RLS - ELIMINAR TODO Y RECREAR
-- ============================================

-- PASO 1: DESHABILITAR RLS COMPLETAMENTE
ALTER TABLE IF EXISTS user_projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS project_members DISABLE ROW LEVEL SECURITY;

-- PASO 2: ELIMINAR **TODAS** LAS POLICIES (sin importar el nombre)
DO $$ 
DECLARE 
  r RECORD;
BEGIN
  -- Eliminar todas las policies de user_projects
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_projects') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON user_projects';
  END LOOP;
  
  -- Eliminar todas las policies de project_members
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'project_members') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON project_members';
  END LOOP;
END $$;

-- PASO 3: RE-HABILITAR RLS
ALTER TABLE user_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PASO 4: CREAR POLICIES SIMPLES (SIN RECURSIÓN)
-- ============================================

-- user_projects: SELECT
CREATE POLICY "select_own_projects_v2" ON user_projects
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- user_projects: INSERT
CREATE POLICY "insert_own_projects_v2" ON user_projects
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

-- user_projects: UPDATE
CREATE POLICY "update_own_projects_v2" ON user_projects
  FOR UPDATE USING (
    user_id = auth.uid()
  );

-- user_projects: DELETE
CREATE POLICY "delete_own_projects_v2" ON user_projects
  FOR DELETE USING (
    user_id = auth.uid()
  );

-- project_members: SELECT
CREATE POLICY "select_members_v2" ON project_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR
    project_id IN (
      SELECT id FROM user_projects WHERE user_id = auth.uid()
    )
  );

-- project_members: INSERT
CREATE POLICY "insert_members_v2" ON project_members
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM user_projects WHERE user_id = auth.uid()
    )
  );

-- project_members: UPDATE
CREATE POLICY "update_members_v2" ON project_members
  FOR UPDATE USING (
    user_id = auth.uid()
    OR
    project_id IN (
      SELECT id FROM user_projects WHERE user_id = auth.uid()
    )
  );

-- project_members: DELETE
CREATE POLICY "delete_members_v2" ON project_members
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM user_projects WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- PASO 5: VERIFICAR
-- ============================================
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename IN ('user_projects', 'project_members')
ORDER BY tablename, cmd, policyname;
