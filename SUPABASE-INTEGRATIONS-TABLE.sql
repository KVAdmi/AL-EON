-- ============================================
-- Tabla para guardar integraciones OAuth
-- ============================================

-- Crear tabla si no existe
CREATE TABLE IF NOT EXISTS user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL, -- 'github', 'aws', 'openai', etc.
  config JSONB NOT NULL DEFAULT '{}', -- Configuración específica de la integración
  access_token TEXT, -- OAuth access token (encriptado)
  refresh_token TEXT, -- OAuth refresh token (encriptado)
  expires_at TIMESTAMPTZ, -- Cuándo expira el access token
  scopes TEXT[], -- Permisos otorgados
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraint: Un usuario solo puede tener una integración por tipo
  UNIQUE(user_id, integration_type)
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_user_integrations_user_id 
ON user_integrations(user_id);

CREATE INDEX IF NOT EXISTS idx_user_integrations_type 
ON user_integrations(integration_type);

-- Row Level Security (RLS)
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver sus propias integraciones
CREATE POLICY "Usuarios pueden ver sus integraciones"
ON user_integrations FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Política: Los usuarios pueden insertar sus propias integraciones
CREATE POLICY "Usuarios pueden crear integraciones"
ON user_integrations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Política: Los usuarios pueden actualizar sus propias integraciones
CREATE POLICY "Usuarios pueden actualizar integraciones"
ON user_integrations FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Política: Los usuarios pueden eliminar sus propias integraciones
CREATE POLICY "Usuarios pueden eliminar integraciones"
ON user_integrations FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_user_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_user_integrations_updated_at ON user_integrations;
CREATE TRIGGER trigger_update_user_integrations_updated_at
BEFORE UPDATE ON user_integrations
FOR EACH ROW
EXECUTE FUNCTION update_user_integrations_updated_at();

-- ============================================
-- Comentarios de documentación
-- ============================================

COMMENT ON TABLE user_integrations IS 'Almacena las integraciones OAuth de cada usuario con servicios externos';
COMMENT ON COLUMN user_integrations.integration_type IS 'Tipo de integración: github, aws, openai, netlify, supabase, etc';
COMMENT ON COLUMN user_integrations.config IS 'Configuración específica en JSON (región AWS, project URL, etc)';
COMMENT ON COLUMN user_integrations.access_token IS 'Token de acceso OAuth (debe estar encriptado en producción)';
COMMENT ON COLUMN user_integrations.scopes IS 'Array de permisos otorgados (ej: ["repo", "read:user"])';
