-- ============================================
-- AL-EON MULTI-TENANT SCHEMA
-- AISLAMIENTO TOTAL POR USUARIO
-- ============================================

-- 1️⃣ PERFILES DE USUARIO (EXTENDIDO)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'USER', -- 'ROOT' o 'USER'
  language TEXT DEFAULT 'es',
  timezone TEXT DEFAULT 'America/Mexico_City',
  theme TEXT DEFAULT 'system', -- 'light', 'dark', 'system'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2️⃣ CONFIGURACIÓN DEL USUARIO
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- IA
  model_preference TEXT DEFAULT 'gpt-4',
  temperature DECIMAL(3,2) DEFAULT 0.7,
  response_style TEXT DEFAULT 'normal', -- 'conciso', 'normal', 'detallado'
  memory_enabled BOOLEAN DEFAULT true,
  context_persistence BOOLEAN DEFAULT true,
  
  -- General
  notifications_enabled BOOLEAN DEFAULT true,
  sound_enabled BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 3️⃣ INTEGRACIONES DEL USUARIO
CREATE TABLE IF NOT EXISTS user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  integration_type TEXT NOT NULL, -- 'netlify', 'supabase', 'github', 'openai', 'aws', 'google', 'apple'
  integration_name TEXT NOT NULL, -- Nombre personalizado
  
  -- Configuración (encriptada)
  config JSONB NOT NULL DEFAULT '{}', -- { "api_key": "...", "project_id": "...", etc }
  
  is_active BOOLEAN DEFAULT true,
  last_tested_at TIMESTAMP WITH TIME ZONE,
  test_status TEXT, -- 'success', 'failed', NULL
  test_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Cada usuario puede tener múltiples integraciones del mismo tipo
  UNIQUE(user_id, integration_type, integration_name)
);

-- 4️⃣ SESIONES ACTIVAS (SEGURIDAD)
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  session_token TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  device_info TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  
  is_active BOOLEAN DEFAULT true
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- CADA USUARIO VE SOLO SUS DATOS
-- ============================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Policies: user_profiles
CREATE POLICY "Usuarios solo ven su perfil"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios solo actualizan su perfil"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden crear su perfil"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policies: user_settings
CREATE POLICY "Usuarios solo ven su configuración"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios solo actualizan su configuración"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden crear su configuración"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policies: user_integrations
CREATE POLICY "Usuarios solo ven sus integraciones"
  ON user_integrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios solo crean sus integraciones"
  ON user_integrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios solo actualizan sus integraciones"
  ON user_integrations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios solo eliminan sus integraciones"
  ON user_integrations FOR DELETE
  USING (auth.uid() = user_id);

-- Policies: user_sessions
CREATE POLICY "Usuarios solo ven sus sesiones"
  ON user_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios solo eliminan sus sesiones"
  ON user_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- FUNCIONES AUXILIARES
-- ============================================

-- Función: Crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (user_id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    -- Si es el primer usuario, hacerlo ROOT
    CASE WHEN (SELECT COUNT(*) FROM user_profiles) = 0 THEN 'ROOT' ELSE 'USER' END
  );
  
  INSERT INTO user_settings (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Ejecutar al crear usuario
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Función: Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers: updated_at
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER user_integrations_updated_at
  BEFORE UPDATE ON user_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_user_id ON user_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_type ON user_integrations(integration_type);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);

-- ============================================
-- SEED DATA (OPCIONAL - SOLO DESARROLLO)
-- ============================================

-- Descomentar si quieres datos de prueba
-- INSERT INTO user_integrations (user_id, integration_type, integration_name, config)
-- VALUES (
--   'tu-user-id-aqui',
--   'netlify',
--   'AL-EON Production',
--   '{"site_id": "xxx", "token": "yyy"}'::jsonb
-- );
