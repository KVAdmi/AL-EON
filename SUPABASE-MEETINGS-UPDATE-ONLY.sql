-- ============================================
-- ACTUALIZAR TABLA MEETINGS PARA CORE
-- ============================================
-- Este archivo SOLO actualiza la tabla existente
-- Si la tabla no existe, usa SUPABASE-MEETINGS-SETUP.sql
-- ============================================

-- 1. Agregar columnas nuevas que necesita CORE
ALTER TABLE meetings 
ADD COLUMN IF NOT EXISTS mode VARCHAR(20) CHECK (mode IN ('live', 'upload')),
ADD COLUMN IF NOT EXISTS participants JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS auto_send_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS send_email BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS send_telegram BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS duration_sec INTEGER,
ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ;

-- 2. Migrar datos existentes (meeting_type -> mode)
UPDATE meetings 
SET mode = meeting_type 
WHERE mode IS NULL AND meeting_type IS NOT NULL;

-- 3. Migrar duración (audio_duration_seconds -> duration_sec)
UPDATE meetings 
SET duration_sec = audio_duration_seconds 
WHERE duration_sec IS NULL AND audio_duration_seconds IS NOT NULL;

-- 4. Crear índices adicionales
CREATE INDEX IF NOT EXISTS idx_meetings_updated_at ON meetings(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_mode ON meetings(mode) WHERE mode IS NOT NULL;

-- 5. Recrear trigger para updated_at
DROP TRIGGER IF EXISTS meetings_updated_at ON meetings;

CREATE OR REPLACE FUNCTION update_meetings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER meetings_updated_at
BEFORE UPDATE ON meetings
FOR EACH ROW
EXECUTE FUNCTION update_meetings_updated_at();

-- ============================================
-- VERIFICACIÓN
-- ============================================
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'meetings'
ORDER BY ordinal_position;
