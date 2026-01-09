-- ============================================
-- AL-EON - SETUP AVATAR DE USUARIO
-- ============================================

-- 1. Agregar columna user_avatar_url a user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS user_avatar_url TEXT;

COMMENT ON COLUMN user_profiles.user_avatar_url IS 'URL del avatar personalizado del usuario';

-- 2. El bucket ale-avatars ya existe y se usará para ambos avatares (usuario y asistente)
-- Las políticas existentes ya permiten subir/actualizar/eliminar archivos del propio usuario

-- 3. Índice para mejorar consultas por user_avatar_url
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_avatar 
ON user_profiles(user_avatar_url) 
WHERE user_avatar_url IS NOT NULL;

-- ============================================
-- VERIFICACIÓN
-- ============================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name IN ('user_avatar_url', 'assistant_avatar_url');
