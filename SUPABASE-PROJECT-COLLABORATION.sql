-- ============================================
-- COLABORACIÓN MULTI-USUARIO EN PROYECTOS
-- ============================================

-- 1. Tabla para miembros de proyectos
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES user_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'owner', 'editor', 'viewer'
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- 2. Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);

-- 3. RLS: Solo miembros pueden ver otros miembros del proyecto
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view project members" ON project_members;
CREATE POLICY "Users can view project members" ON project_members
  FOR SELECT USING (
    -- Puede ver si es miembro del proyecto
    user_id = auth.uid() OR
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Project owners can manage members" ON project_members;
CREATE POLICY "Project owners can manage members" ON project_members
  FOR ALL USING (
    -- Solo el owner del proyecto puede agregar/quitar miembros
    project_id IN (
      SELECT id FROM user_projects WHERE user_id = auth.uid()
    )
  );

-- 4. Agregar owner automáticamente cuando se crea proyecto
CREATE OR REPLACE FUNCTION add_project_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO project_members (project_id, user_id, role, accepted_at)
  VALUES (NEW.id, NEW.user_id, 'owner', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_add_project_owner ON user_projects;
CREATE TRIGGER trigger_add_project_owner
  AFTER INSERT ON user_projects
  FOR EACH ROW
  EXECUTE FUNCTION add_project_owner();

-- 5. Actualizar RLS de user_projects para incluir colaboradores
DROP POLICY IF EXISTS "Users can view their projects" ON user_projects;
CREATE POLICY "Users can view their projects" ON user_projects
  FOR SELECT USING (
    user_id = auth.uid() OR
    id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

-- 6. Agregar columna para metadata de usuario en ae_messages (si no existe)
ALTER TABLE ae_messages ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE ae_messages ADD COLUMN IF NOT EXISTS user_display_name TEXT;

-- 7. Vista para obtener proyectos con info de colaboradores
CREATE OR REPLACE VIEW project_members_view AS
SELECT 
  pm.id,
  pm.project_id,
  pm.user_id,
  pm.role,
  pm.invited_at,
  pm.accepted_at,
  u.email,
  u.raw_user_meta_data->>'display_name' as display_name,
  u.raw_user_meta_data->>'avatar_url' as avatar_url,
  p.name as project_name,
  p.description as project_description
FROM project_members pm
JOIN auth.users u ON pm.user_id = u.id
JOIN user_projects p ON pm.project_id = p.id;

-- 8. Función para invitar usuario por email
CREATE OR REPLACE FUNCTION invite_user_to_project(
  p_project_id UUID,
  p_user_email TEXT,
  p_role TEXT DEFAULT 'member'
)
RETURNS JSON AS $$
DECLARE
  v_invited_user_id UUID;
  v_result JSON;
BEGIN
  -- Buscar usuario por email
  SELECT id INTO v_invited_user_id
  FROM auth.users
  WHERE email = p_user_email;

  -- Si no existe, retornar error
  IF v_invited_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Usuario no encontrado'
    );
  END IF;

  -- Verificar que el usuario actual es owner del proyecto
  IF NOT EXISTS (
    SELECT 1 FROM user_projects 
    WHERE id = p_project_id AND user_id = auth.uid()
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Solo el dueño puede invitar usuarios'
    );
  END IF;

  -- Insertar miembro (o actualizar si ya existe)
  INSERT INTO project_members (project_id, user_id, role, invited_by)
  VALUES (p_project_id, v_invited_user_id, p_role, auth.uid())
  ON CONFLICT (project_id, user_id) 
  DO UPDATE SET 
    role = EXCLUDED.role,
    invited_by = EXCLUDED.invited_by,
    invited_at = NOW();

  RETURN json_build_object(
    'success', true,
    'user_id', v_invited_user_id,
    'email', p_user_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Verificación
SELECT 
  'project_members table created' as status,
  COUNT(*) as total_members
FROM project_members;

-- ============================================
-- NOTAS PARA CORE
-- ============================================
-- Core necesita implementar:
-- 
-- 1. **Leer metadata de usuario en cada mensaje**:
--    - message.user_email
--    - message.user_display_name
--
-- 2. **Incluir en contexto OpenAI**:
--    Antes: "Usuario: Hola"
--    Ahora: "Patricia (patricia@example.com): Hola"
--
-- 3. **Detectar cambio de usuario**:
--    Si el mensaje anterior era de Juan y el actual es de Patricia,
--    agregar nota: "[Nueva intervención de Patricia]"
--
-- 4. **Responder con contexto**:
--    "Patricia, según lo que mencionaste antes..."
--    "Como Juan comentó en el mensaje anterior..."
--
-- 5. **Payload del frontend incluirá**:
--    {
--      message: "...",
--      sessionId: "...",
--      workspaceId: "project-uuid",
--      userEmail: "patricia@example.com",
--      userDisplayName: "Patricia Garibay"
--    }
