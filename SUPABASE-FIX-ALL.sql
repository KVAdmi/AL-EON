-- ==========================================
-- AL-EON: CORRECCIÓN COMPLETA
-- ==========================================

-- Agregar TODAS las columnas faltantes en user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'es';

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Mexico_City';

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS display_name TEXT;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system'));

-- Verificar user_profiles
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Verificar user_settings
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_settings'
ORDER BY ordinal_position;

-- Verificar user_integrations
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_integrations'
ORDER BY ordinal_position;
