-- ============================================
-- FIX: Recursión infinita en project_members
-- ============================================

-- PROBLEMA: La policy "Users can view project members" tiene recursión:
-- "user_id = auth.uid() OR project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())"
-- Cuando hace el SELECT de project_members, vuelve a ejecutar la policy → loop infinito

-- SOLUCIÓN: Simplificar las policies

-- 1. Deshabilitar RLS temporalmente
ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;

-- 2. Eliminar policies problemáticas
DROP POLICY IF EXISTS "Users can view project members" ON project_members;
DROP POLICY IF EXISTS "Project owners can manage members" ON project_members;

-- 3. Crear policies SIMPLES sin recursión
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Policy para VER: Solo si eres miembro del mismo proyecto O si te están invitando
CREATE POLICY "Users can view members of their projects" ON project_members
  FOR SELECT USING (
    user_id = auth.uid() -- Puede ver sus propias membresías
    OR 
    project_id IN ( -- O puede ver miembros de proyectos donde es owner
      SELECT id FROM user_projects WHERE user_id = auth.uid()
    )
  );

-- Policy para INSERTAR: Solo owners del proyecto
CREATE POLICY "Project owners can add members" ON project_members
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM user_projects WHERE user_id = auth.uid()
    )
  );

-- Policy para ACTUALIZAR: Solo el propio usuario (aceptar invitación) O el owner
CREATE POLICY "Users can update their own membership or owners can update" ON project_members
  FOR UPDATE USING (
    user_id = auth.uid() -- Puedo actualizar mi propia membresía (aceptar)
    OR
    project_id IN ( -- O soy owner del proyecto
      SELECT id FROM user_projects WHERE user_id = auth.uid()
    )
  );

-- Policy para ELIMINAR: Solo owners del proyecto
CREATE POLICY "Project owners can remove members" ON project_members
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM user_projects WHERE user_id = auth.uid()
    )
  );

-- 4. ARREGLAR user_projects RLS (también tiene recursión)
DROP POLICY IF EXISTS "Users can view their projects" ON user_projects;

CREATE POLICY "Users can view their projects" ON user_projects
  FOR SELECT USING (
    user_id = auth.uid() -- Proyectos propios siempre
  );

-- Nueva policy separada para proyectos compartidos (SIN recursión)
CREATE POLICY "Users can view shared projects" ON user_projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = user_projects.id
        AND project_members.user_id = auth.uid()
        AND project_members.accepted_at IS NOT NULL
    )
  );

-- ============================================
-- VERIFICACIÓN
-- ============================================
SELECT 
  'RLS policies actualizadas' as status,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('project_members', 'user_projects')
ORDER BY tablename, policyname;
