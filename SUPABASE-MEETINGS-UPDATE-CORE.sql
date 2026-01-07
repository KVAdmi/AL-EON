-- ============================================
-- ACTUALIZACIÓN TABLA MEETINGS PARA CORE
-- ============================================
-- Ejecutar en Supabase SQL Editor
-- Este script actualiza la tabla existente sin perder datos
-- ============================================

-- 1. AGREGAR CAMPOS NUEVOS QUE NECESITA CORE
ALTER TABLE meetings 
ADD COLUMN IF NOT EXISTS mode VARCHAR(20) CHECK (mode IN ('live', 'upload')),
ADD COLUMN IF NOT EXISTS participants JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS auto_send_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS send_email BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS send_telegram BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS duration_sec INTEGER,
ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ;

-- 2. MIGRAR DATOS EXISTENTES
-- meeting_type -> mode
UPDATE meetings 
SET mode = meeting_type 
WHERE mode IS NULL AND meeting_type IS NOT NULL;

-- audio_duration_seconds -> duration_sec
UPDATE meetings 
SET duration_sec = audio_duration_seconds 
WHERE duration_sec IS NULL AND audio_duration_seconds IS NOT NULL;

-- 3. CREAR ÍNDICES NUEVOS
CREATE INDEX IF NOT EXISTS idx_meetings_updated_at ON meetings(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_mode ON meetings(mode) WHERE mode IS NOT NULL;

-- 4. ASEGURAR TRIGGER UPDATED_AT
CREATE OR REPLACE FUNCTION update_meetings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS meetings_updated_at_trigger ON meetings;
CREATE TRIGGER meetings_updated_at_trigger
    BEFORE UPDATE ON meetings
    FOR EACH ROW
    EXECUTE FUNCTION update_meetings_updated_at();

-- 5. VERIFICAR RESULTADO
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'meetings'
  AND column_name IN ('mode', 'participants', 'auto_send_enabled', 'send_email', 'send_telegram', 'duration_sec', 'finalized_at')
ORDER BY column_name;

-- ============================================
-- ✅ LISTO! La tabla está actualizada
-- ============================================
-- Campos que CORE necesita:
-- ✓ mode (live/upload)
-- ✓ status (recording/processing/done/error) 
-- ✓ participants (JSONB array)
-- ✓ auto_send_enabled (boolean)
-- ✓ send_email (boolean)
-- ✓ send_telegram (boolean)
-- ✓ duration_sec (integer)
-- ✓ error_message (text)
-- ✓ updated_at (timestamp con trigger)
-- ✓ finalized_at (timestamp)
-- ============================================
