-- ============================================
-- FIX: Ver proyectos compartidos en sidebar
-- ============================================
-- PROBLEMA: Los usuarios aceptan invitaciones pero no ven los proyectos compartidos
-- CAUSA: getProjects() solo busca user_id = auth.uid(), no incluye project_members

-- ============================================
-- 1. ARREGLAR RLS de user_projects
-- ============================================

-- Eliminar policy problemática con recursión
DROP POLICY IF EXISTS "Users can view their projects" ON user_projects;
DROP POLICY IF EXISTS "Users can view shared projects" ON user_projects;

-- Policy 1: Ver proyectos PROPIOS
CREATE POLICY "Users can view their own projects" ON user_projects
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- Policy 2: Ver proyectos COMPARTIDOS (aceptados)
CREATE POLICY "Users can view accepted shared projects" ON user_projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = user_projects.id
        AND project_members.user_id = auth.uid()
        AND project_members.accepted_at IS NOT NULL -- ✅ Solo si aceptó
    )
  );

-- ============================================
-- 2. ARREGLAR RLS de project_members
-- ============================================

-- Deshabilitar temporalmente
ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;

-- Eliminar policies antiguas
DROP POLICY IF EXISTS "Users can view project members" ON project_members;
DROP POLICY IF EXISTS "Project owners can manage members" ON project_members;
DROP POLICY IF EXISTS "Users can view members of their projects" ON project_members;
DROP POLICY IF EXISTS "Project owners can add members" ON project_members;
DROP POLICY IF EXISTS "Users can update their own membership or owners can update" ON project_members;
DROP POLICY IF EXISTS "Project owners can remove members" ON project_members;

-- Reactivar RLS
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Policy para VER membresías
CREATE POLICY "Users can view memberships" ON project_members
  FOR SELECT USING (
    user_id = auth.uid() -- Ver mis propias membresías
    OR 
    project_id IN ( -- O ver membresías de proyectos que poseo
      SELECT id FROM user_projects WHERE user_id = auth.uid()
    )
  );

-- Policy para INSERTAR (invitar)
CREATE POLICY "Owners can invite members" ON project_members
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM user_projects WHERE user_id = auth.uid()
    )
  );

-- Policy para ACTUALIZAR (aceptar invitación)
CREATE POLICY "Users can accept invitations" ON project_members
  FOR UPDATE USING (
    user_id = auth.uid() -- Solo puedo actualizar mi propia membresía
    OR
    project_id IN ( -- O soy owner del proyecto (cambiar roles, etc.)
      SELECT id FROM user_projects WHERE user_id = auth.uid()
    )
  );

-- Policy para ELIMINAR (remover miembros)
CREATE POLICY "Owners can remove members" ON project_members
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM user_projects WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 3. VERIFICAR QUE FUNCIONA
-- ============================================

-- Ver todas las policies
SELECT 
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('user_projects', 'project_members')
ORDER BY tablename, policyname;

-- Probar query como usuario
-- (Esto lo hará automáticamente el frontend después)
-- SELECT * FROM user_projects;  -- Debe mostrar propios + compartidos aceptados

-- ============================================
-- NOTA IMPORTANTE
-- ============================================
-- Después de ejecutar este SQL, el FRONTEND también necesita cambios
-- en src/services/projectsService.js para incluir project_members
-- Ver: FIX-SHARED-PROJECTS-FRONTEND.md
