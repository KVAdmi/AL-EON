-- ============================================
-- SISTEMA DE NOTIFICACIONES INTERNAS
-- ============================================

-- 1. Tabla de notificaciones
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'project_invite', 'mention', 'system'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB, -- { project_id, invited_by, etc }
  is_read BOOLEAN DEFAULT false,
  action_url TEXT, -- URL a donde redirigir al hacer click
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- 2. Índices
CREATE INDEX IF NOT EXISTS idx_notifications_user ON user_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON user_notifications(created_at DESC);

-- 3. RLS
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their notifications" ON user_notifications;
CREATE POLICY "Users can view their notifications" ON user_notifications
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their notifications" ON user_notifications;
CREATE POLICY "Users can update their notifications" ON user_notifications
  FOR UPDATE USING (user_id = auth.uid());

-- 4. Función para crear notificación de invitación
CREATE OR REPLACE FUNCTION create_project_invite_notification(
  p_invited_user_id UUID,
  p_project_id UUID,
  p_invited_by_user_id UUID
)
RETURNS void AS $$
DECLARE
  v_project_name TEXT;
  v_inviter_name TEXT;
BEGIN
  -- Obtener nombre del proyecto
  SELECT name INTO v_project_name
  FROM user_projects
  WHERE id = p_project_id;

  -- Obtener nombre del invitador
  SELECT COALESCE(
    raw_user_meta_data->>'display_name',
    email
  ) INTO v_inviter_name
  FROM auth.users
  WHERE id = p_invited_by_user_id;

  -- Crear notificación
  INSERT INTO user_notifications (
    user_id,
    type,
    title,
    message,
    metadata,
    action_url
  ) VALUES (
    p_invited_user_id,
    'project_invite',
    'Invitación a proyecto',
    v_inviter_name || ' te invitó a colaborar en "' || v_project_name || '"',
    jsonb_build_object(
      'project_id', p_project_id,
      'project_name', v_project_name,
      'invited_by', p_invited_by_user_id,
      'invited_by_name', v_inviter_name
    ),
    '/projects/' || p_project_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Actualizar función de invitación para crear notificación
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

  -- Insertar miembro (sin accepted_at, será NULL hasta que acepte)
  INSERT INTO project_members (project_id, user_id, role, invited_by)
  VALUES (p_project_id, v_invited_user_id, p_role, auth.uid())
  ON CONFLICT (project_id, user_id) 
  DO UPDATE SET 
    role = EXCLUDED.role,
    invited_by = EXCLUDED.invited_by,
    invited_at = NOW(),
    accepted_at = NULL; -- ✅ Resetear aceptación si re-invita

  -- ✅ NUEVO: Crear notificación
  PERFORM create_project_invite_notification(
    v_invited_user_id,
    p_project_id,
    auth.uid()
  );

  RETURN json_build_object(
    'success', true,
    'user_id', v_invited_user_id,
    'email', p_user_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Función para aceptar invitación
CREATE OR REPLACE FUNCTION accept_project_invitation(
  p_project_id UUID
)
RETURNS JSON AS $$
BEGIN
  -- Actualizar accepted_at
  UPDATE project_members
  SET accepted_at = NOW()
  WHERE project_id = p_project_id
    AND user_id = auth.uid()
    AND accepted_at IS NULL;

  -- Marcar notificación como leída
  UPDATE user_notifications
  SET is_read = true, read_at = NOW()
  WHERE user_id = auth.uid()
    AND type = 'project_invite'
    AND (metadata->>'project_id')::uuid = p_project_id
    AND is_read = false;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Función para rechazar invitación
CREATE OR REPLACE FUNCTION reject_project_invitation(
  p_project_id UUID
)
RETURNS JSON AS $$
BEGIN
  -- Eliminar de project_members
  DELETE FROM project_members
  WHERE project_id = p_project_id
    AND user_id = auth.uid()
    AND accepted_at IS NULL;

  -- Marcar notificación como leída
  UPDATE user_notifications
  SET is_read = true, read_at = NOW()
  WHERE user_id = auth.uid()
    AND type = 'project_invite'
    AND (metadata->>'project_id')::uuid = p_project_id;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Actualizar RLS de user_projects para SOLO mostrar proyectos aceptados
DROP POLICY IF EXISTS "Users can view their projects" ON user_projects;
CREATE POLICY "Users can view their projects" ON user_projects
  FOR SELECT USING (
    user_id = auth.uid() OR
    id IN (
      SELECT project_id FROM project_members 
      WHERE user_id = auth.uid() 
        AND accepted_at IS NOT NULL -- ✅ Solo si aceptó
    )
  );

-- 9. Vista para obtener invitaciones pendientes
CREATE OR REPLACE VIEW pending_project_invitations AS
SELECT 
  pm.id,
  pm.project_id,
  pm.role,
  pm.invited_at,
  p.name as project_name,
  p.description as project_description,
  p.icon as project_icon,
  inviter.email as invited_by_email,
  inviter.raw_user_meta_data->>'display_name' as invited_by_name
FROM project_members pm
JOIN user_projects p ON pm.project_id = p.id
JOIN auth.users inviter ON pm.invited_by = inviter.id
WHERE pm.user_id = auth.uid()
  AND pm.accepted_at IS NULL;

-- 10. Función para marcar notificación como leída
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE user_notifications
  SET is_read = true, read_at = NOW()
  WHERE id = p_notification_id
    AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Función para marcar todas como leídas
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS void AS $$
BEGIN
  UPDATE user_notifications
  SET is_read = true, read_at = NOW()
  WHERE user_id = auth.uid()
    AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFICACIÓN
-- ============================================
SELECT 'Tabla user_notifications creada' as status,
  COUNT(*) as total_notifications
FROM user_notifications;
