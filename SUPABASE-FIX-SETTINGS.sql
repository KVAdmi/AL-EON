-- ==========================================
-- AL-EON: CORRECCIÓN TABLA user_settings
-- ==========================================

-- Verificar y agregar columnas faltantes
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS context_persistent BOOLEAN DEFAULT true;

ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS voice_enabled BOOLEAN DEFAULT false;

ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS ai_model TEXT DEFAULT 'gpt-4';

ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS ai_temperature NUMERIC DEFAULT 0.7;

-- Verificar estructura
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_settings'
ORDER BY ordinal_position;
