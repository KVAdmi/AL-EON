-- ============================================
-- AGREGAR COLUMNA PARA AVATAR DE AL-E
-- ============================================

-- Agregar columna assistant_avatar_url a user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS assistant_avatar_url TEXT;

-- Verificar que se agregó
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name = 'assistant_avatar_url';
