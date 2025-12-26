-- ============================================
-- 🚨 SISTEMA DE PROYECTOS (como ChatGPT)
-- ============================================
-- Feature: Organizar conversaciones en proyectos
-- UX: Sidebar con carpetas de proyectos
-- Arquitectura: project_id en conversaciones
-- 
-- EJECUTAR ESTO EN SUPABASE SQL EDITOR:
-- https://supabase.com/dashboard/project/gptwzuqmuvzttajgjrry/sql/new
-- ============================================

-- 1. TABLA: Proyectos
CREATE TABLE IF NOT EXISTS user_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Info del proyecto
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6', -- Color del ícono/badge
  icon TEXT DEFAULT '📁', -- Emoji o ícono
  
  -- Organización
  is_archived BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Un usuario puede tener múltiples proyectos
  UNIQUE(user_id, name)
);

-- 2. MODIFICAR tabla de conversaciones para incluir project_id
ALTER TABLE user_conversations 
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES user_projects(id) ON DELETE SET NULL;

-- 3. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_user_projects_user_id 
  ON user_projects(user_id);

CREATE INDEX IF NOT EXISTS idx_user_projects_sort_order 
  ON user_projects(sort_order ASC);

CREATE INDEX IF NOT EXISTS idx_user_conversations_project_id 
  ON user_conversations(project_id);

-- 4. ROW LEVEL SECURITY
ALTER TABLE user_projects ENABLE ROW LEVEL SECURITY;

-- Borrar políticas existentes si existen
DROP POLICY IF EXISTS "Usuarios ven solo sus proyectos" ON user_projects;
DROP POLICY IF EXISTS "Usuarios insertan solo sus proyectos" ON user_projects;
DROP POLICY IF EXISTS "Usuarios actualizan solo sus proyectos" ON user_projects;
DROP POLICY IF EXISTS "Usuarios borran solo sus proyectos" ON user_projects;

-- Políticas: Cada usuario ve solo sus proyectos
CREATE POLICY "Usuarios ven solo sus proyectos"
  ON user_projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios insertan solo sus proyectos"
  ON user_projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios actualizan solo sus proyectos"
  ON user_projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios borran solo sus proyectos"
  ON user_projects FOR DELETE
  USING (auth.uid() = user_id);

-- 5. TRIGGER: Actualizar updated_at
CREATE OR REPLACE FUNCTION update_user_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_projects_updated_at ON user_projects;
CREATE TRIGGER trigger_update_user_projects_updated_at
  BEFORE UPDATE ON user_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_user_projects_updated_at();

-- ============================================
-- DATOS INICIALES (proyectos por defecto)
-- ============================================

-- Insertar proyecto "General" para conversaciones sin proyecto
-- (Se ejecutará automáticamente para cada usuario nuevo via trigger)

CREATE OR REPLACE FUNCTION create_default_project_for_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Crear proyecto "General" para nuevos usuarios
  INSERT INTO public.user_projects (user_id, name, description, color, icon, sort_order)
  VALUES (
    NEW.id,
    'General',
    'Conversaciones sin categorizar',
    '#6B7280',
    '💬',
    0
  )
  ON CONFLICT (user_id, name) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_created_create_default_project ON auth.users;
CREATE TRIGGER on_user_created_create_default_project
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_project_for_user();

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Ver tabla proyectos
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'user_projects'
ORDER BY ordinal_position;

-- Ver columna project_id en conversaciones
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'user_conversations' AND column_name = 'project_id';

-- Ver políticas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE tablename = 'user_projects';

-- ============================================
-- RESULTADO ESPERADO:
-- ============================================
-- ✅ Tabla user_projects creada
-- ✅ Columna project_id agregada a user_conversations
-- ✅ RLS habilitado (cada usuario ve solo sus proyectos)
-- ✅ Trigger para proyecto "General" por defecto
-- ✅ Índices para performance

-- ============================================
-- PRÓXIMO PASO (FRONTEND):
-- ============================================
-- Crear src/services/projectsService.js:
-- - createProject(name, description, color, icon)
-- - getProjects()
-- - updateProject(id, updates)
-- - deleteProject(id)
-- - moveConversationToProject(conversationId, projectId)
--
-- Modificar Sidebar para mostrar:
-- 📁 Proyectos (agrupados)
--   ├─ 💬 General (3 chats)
--   ├─ 🚀 Startup Ideas (5 chats)
--   └─ 📊 Data Analysis (2 chats)
-- 
-- Agregar botón "Nuevo proyecto" en sidebar
-- Modal para crear/editar proyecto (nombre, color, icono)
