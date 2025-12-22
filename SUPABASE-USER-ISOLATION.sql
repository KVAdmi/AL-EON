-- ==========================================
-- AL-EON: AISLAMIENTO TOTAL POR USUARIO
-- ROOT USER: pgaribay@infinitykode.com
-- ==========================================

-- 🔐 TABLA: user_profiles
-- Cada usuario tiene su perfil aislado
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ROOT')),
  display_name TEXT,
  avatar_url TEXT,
  preferred_language TEXT DEFAULT 'es',
  timezone TEXT DEFAULT 'America/Mexico_City',
  theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 🔐 RLS: Solo el usuario ve su perfil
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_profiles_select" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_profiles_insert" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_profiles_update" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "user_profiles_delete" ON user_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- 🔐 TABLA: user_settings
-- Configuración independiente por usuario
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response_mode TEXT DEFAULT 'normal' CHECK (response_mode IN ('concise', 'normal', 'detailed')),
  ai_model TEXT DEFAULT 'gpt-4',
  ai_temperature NUMERIC DEFAULT 0.7,
  memory_enabled BOOLEAN DEFAULT true,
  context_persistent BOOLEAN DEFAULT true,
  voice_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 🔐 RLS: Solo el usuario ve su configuración
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_settings_select" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_settings_insert" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_settings_update" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "user_settings_delete" ON user_settings
  FOR DELETE USING (auth.uid() = user_id);

-- 🔐 TABLA: user_integrations
-- Cada usuario conecta SUS integraciones (keys encriptadas)
CREATE TABLE IF NOT EXISTS user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL CHECK (integration_type IN (
    'netlify', 'supabase', 'github', 'openai', 'aws', 'google', 'apple'
  )),
  integration_name TEXT NOT NULL,
  api_key_encrypted TEXT, -- Encriptada en backend
  config JSONB DEFAULT '{}',
  status TEXT DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, integration_type)
);

-- 🔐 RLS: Solo el usuario ve SUS integraciones
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_integrations_select" ON user_integrations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_integrations_insert" ON user_integrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_integrations_update" ON user_integrations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "user_integrations_delete" ON user_integrations
  FOR DELETE USING (auth.uid() = user_id);

-- 🔐 TABLA: user_sessions (auditoría)
-- Historial de sesiones por usuario
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  device TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW()
);

-- 🔐 RLS: Solo el usuario ve sus sesiones
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_sessions_select" ON user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_sessions_insert" ON user_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 🔐 FUNCIÓN: Asignar rol ROOT automáticamente
CREATE OR REPLACE FUNCTION assign_root_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email = 'pgaribay@infinitykode.com' THEN
    NEW.role := 'ROOT';
  ELSE
    NEW.role := 'USER';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 🔐 TRIGGER: Auto-asignar ROOT al crear perfil
CREATE TRIGGER set_root_role
  BEFORE INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION assign_root_role();

-- 🔐 FUNCIÓN: Crear perfil automático al registrarse
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (user_id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  
  INSERT INTO user_settings (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 🔐 TRIGGER: Crear perfil automático
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- ==========================================
-- ÍNDICES PARA PERFORMANCE
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_user_id ON user_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);

-- ==========================================
-- COMENTARIOS
-- ==========================================
COMMENT ON TABLE user_profiles IS 'Perfiles de usuario con rol ROOT/USER. Solo pgaribay@infinitykode.com es ROOT.';
COMMENT ON TABLE user_settings IS 'Configuración aislada por usuario (IA, tema, idioma, etc.)';
COMMENT ON TABLE user_integrations IS 'Integraciones (Netlify, AWS, etc.) - cada usuario conecta las suyas.';
COMMENT ON TABLE user_sessions IS 'Auditoría de sesiones por usuario.';
