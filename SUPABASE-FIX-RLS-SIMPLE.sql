-- ============================================
-- FIX URGENTE: Ver proyectos en el menú
-- ============================================
-- Problema: RLS bloqueando proyectos propios

-- 1. DESHABILITAR RLS temporalmente en user_projects
ALTER TABLE user_projects DISABLE ROW LEVEL SECURITY;

-- 2. Eliminar todas las policies viejas
DROP POLICY IF EXISTS "Users can view their projects" ON user_projects;
DROP POLICY IF EXISTS "Users can view shared projects" ON user_projects;
DROP POLICY IF EXISTS "Users can create projects" ON user_projects;
DROP POLICY IF EXISTS "Users can update their projects" ON user_projects;
DROP POLICY IF EXISTS "Users can delete their projects" ON user_projects;

-- 3. Habilitar RLS de nuevo
ALTER TABLE user_projects ENABLE ROW LEVEL SECURITY;

-- 4. Crear policy SIMPLE para ver proyectos propios
CREATE POLICY "Users can view own projects" ON user_projects
  FOR SELECT USING (user_id = auth.uid());

-- 5. Crear policy para INSERTAR proyectos
CREATE POLICY "Users can create projects" ON user_projects
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 6. Crear policy para ACTUALIZAR proyectos propios
CREATE POLICY "Users can update own projects" ON user_projects
  FOR UPDATE USING (user_id = auth.uid());

-- 7. Crear policy para ELIMINAR proyectos propios
CREATE POLICY "Users can delete own projects" ON user_projects
  FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- ARREGLAR project_members también
-- ============================================

-- 8. DESHABILITAR RLS temporalmente
ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;

-- 9. Eliminar policies viejas
DROP POLICY IF EXISTS "Users can view project members" ON project_members;
DROP POLICY IF EXISTS "Project owners can manage members" ON project_members;
DROP POLICY IF EXISTS "Users can view members of their projects" ON project_members;
DROP POLICY IF EXISTS "Project owners can add members" ON project_members;
DROP POLICY IF EXISTS "Users can update their own membership or owners can update" ON project_members;
DROP POLICY IF EXISTS "Project owners can remove members" ON project_members;

-- 10. Habilitar RLS de nuevo
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- 11. Policy SIMPLE para ver membresías
CREATE POLICY "View own memberships" ON project_members
  FOR SELECT USING (user_id = auth.uid());

-- 12. Policy para ver membresías de proyectos propios (para owners)
CREATE POLICY "View members of own projects" ON project_members
  FOR SELECT USING (
    project_id IN (SELECT id FROM user_projects WHERE user_id = auth.uid())
  );

-- 13. Policy para insertar (solo owners)
CREATE POLICY "Add members to own projects" ON project_members
  FOR INSERT WITH CHECK (
    project_id IN (SELECT id FROM user_projects WHERE user_id = auth.uid())
  );

-- 14. Policy para actualizar (usuario puede aceptar su invitación)
CREATE POLICY "Update own membership" ON project_members
  FOR UPDATE USING (user_id = auth.uid());

-- 15. Policy para eliminar (solo owners)
CREATE POLICY "Remove members from own projects" ON project_members
  FOR DELETE USING (
    project_id IN (SELECT id FROM user_projects WHERE user_id = auth.uid())
  );

-- ============================================
-- VERIFICACIÓN
-- ============================================
SELECT 'Tus proyectos:' as info, id, name, created_at
FROM user_projects
WHERE user_id = auth.uid()
ORDER BY created_at DESC;
