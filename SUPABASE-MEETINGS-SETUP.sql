-- ============================================
-- AL-EON - MÓDULO REUNIONES CON MODO ALTAVOZ
-- ============================================
-- UNIFICADO CON BACKEND CORE
-- ============================================

-- 1. Crear tabla meetings (si no existe)
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Metadatos
  title TEXT NOT NULL,
  mode VARCHAR(20) CHECK (mode IN ('live', 'upload')), -- CORE: 'live' o 'upload'
  status VARCHAR(50) DEFAULT 'recording', -- CORE: 'recording', 'processing', 'done', 'error'
  error_message TEXT,
  
  -- Participantes y configuración
  participants JSONB DEFAULT '[]'::jsonb, -- CORE: [{name, email}]
  auto_send_enabled BOOLEAN DEFAULT false, -- CORE: envío automático
  send_email BOOLEAN DEFAULT false, -- CORE: enviar por email
  send_telegram BOOLEAN DEFAULT false, -- CORE: enviar por telegram
  
  -- Audio original
  audio_url TEXT,
  duration_sec INTEGER, -- CORE: duración en segundos
  audio_file_size BIGINT,
  
  -- Transcripción
  transcript_text TEXT,
  transcript_json JSONB, -- con timestamps detallados
  
  -- Minuta estructurada
  minutes_summary TEXT,
  minutes_agreements JSONB, -- [{text, assignee, date}]
  minutes_pending JSONB, -- [{text, priority}]
  minutes_decisions JSONB, -- [{text, impact}]
  minutes_risks JSONB, -- [{text, severity}]
  
  -- Documentos asociados
  attachments JSONB, -- [{name, url, type}]
  
  -- Modo altavoz (legacy, mantener compatibilidad)
  is_live BOOLEAN DEFAULT false,
  live_started_at TIMESTAMPTZ,
  live_ended_at TIMESTAMPTZ,
  live_chunks_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  finalized_at TIMESTAMPTZ -- CORE: cuando se finaliza
);

-- 1.1 Actualizar tabla existente (si ya existe)
ALTER TABLE meetings 
ADD COLUMN IF NOT EXISTS mode VARCHAR(20) CHECK (mode IN ('live', 'upload')),
ADD COLUMN IF NOT EXISTS participants JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS auto_send_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS send_email BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS send_telegram BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS duration_sec INTEGER,
ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ;

-- 1.2 Migrar datos existentes (meeting_type -> mode)
UPDATE meetings 
SET mode = meeting_type 
WHERE mode IS NULL AND meeting_type IS NOT NULL;

-- 1.3 Migrar duración (audio_duration_seconds -> duration_sec)
UPDATE meetings 
SET duration_sec = audio_duration_seconds 
WHERE duration_sec IS NULL AND audio_duration_seconds IS NOT NULL;

-- 2. Índices (CORE + Frontend)
CREATE INDEX IF NOT EXISTS idx_meetings_owner ON meetings(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_created ON meetings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_updated_at ON meetings(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_live ON meetings(is_live) WHERE is_live = true;
CREATE INDEX IF NOT EXISTS idx_meetings_mode ON meetings(mode) WHERE mode IS NOT NULL;

-- 3. RLS Policies
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- Eliminar policies existentes si existen
DROP POLICY IF EXISTS "Users can view own meetings" ON meetings;
DROP POLICY IF EXISTS "Users can create own meetings" ON meetings;
DROP POLICY IF EXISTS "Users can update own meetings" ON meetings;
DROP POLICY IF EXISTS "Users can delete own meetings" ON meetings;

-- Usuarios ven solo sus propias reuniones
CREATE POLICY "Users can view own meetings"
ON meetings FOR SELECT
TO authenticated
USING (auth.uid() = owner_user_id);

-- Usuarios pueden crear sus propias reuniones
CREATE POLICY "Users can create own meetings"
ON meetings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_user_id);

-- Usuarios pueden actualizar sus propias reuniones
CREATE POLICY "Users can update own meetings"
ON meetings FOR UPDATE
TO authenticated
USING (auth.uid() = owner_user_id);

-- Usuarios pueden eliminar sus propias reuniones
CREATE POLICY "Users can delete own meetings"
ON meetings FOR DELETE
TO authenticated
USING (auth.uid() = owner_user_id);

-- 4. Trigger para actualizar updated_at (CORE requirement)
CREATE OR REPLACE FUNCTION update_meetings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS meetings_updated_at ON meetings;
CREATE TRIGGER meetings_updated_at
BEFORE UPDATE ON meetings
FOR EACH ROW
EXECUTE FUNCTION update_meetings_updated_at();

-- 5. Bucket para audios de reuniones
INSERT INTO storage.buckets (id, name, public)
VALUES ('meeting-recordings', 'meeting-recordings', false)
ON CONFLICT (id) DO NOTHING;

-- 6. Políticas de Storage
-- Eliminar policies existentes si existen
DROP POLICY IF EXISTS "Users can upload their meeting recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their meeting recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their meeting recordings" ON storage.objects;

CREATE POLICY "Users can upload their meeting recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'meeting-recordings'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their meeting recordings"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'meeting-recordings'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their meeting recordings"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'meeting-recordings'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Verificar estructura de la tabla
SELECT 
  table_name,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'meetings'
ORDER BY ordinal_position;

-- ============================================
-- TABLAS ADICIONALES PARA CORE (OPCIONAL)
-- ============================================
-- Si CORE necesita estas tablas, descomentar:

/*
-- meeting_assets: chunks de audio en S3
CREATE TABLE IF NOT EXISTS meeting_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  asset_type VARCHAR(50) NOT NULL, -- 'chunk', 'full_audio', 'transcript'
  s3_key TEXT NOT NULL,
  s3_bucket VARCHAR(100) DEFAULT 'meeting-recordings',
  sequence_number INTEGER, -- para chunks ordenados
  file_size BIGINT,
  mime_type VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_meeting_assets_meeting ON meeting_assets(meeting_id);
CREATE INDEX idx_meeting_assets_type ON meeting_assets(asset_type);

-- meeting_transcripts: transcripciones procesadas
CREATE TABLE IF NOT EXISTS meeting_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  transcript_text TEXT NOT NULL,
  transcript_json JSONB, -- con timestamps
  language VARCHAR(10) DEFAULT 'es',
  confidence_score DECIMAL(5,4),
  processed_by VARCHAR(50), -- 'whisper', 'deepgram', etc
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transcripts_meeting ON meeting_transcripts(meeting_id);

-- meeting_minutes: minutas generadas
CREATE TABLE IF NOT EXISTS meeting_minutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  summary TEXT,
  agreements JSONB,
  pending JSONB,
  decisions JSONB,
  risks JSONB,
  generated_by VARCHAR(50) DEFAULT 'gpt-4',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_minutes_meeting ON meeting_minutes(meeting_id);

-- meeting_notifications: envíos de minutas
CREATE TABLE IF NOT EXISTS meeting_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  channel VARCHAR(20) NOT NULL, -- 'email', 'telegram'
  recipient TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_meeting ON meeting_notifications(meeting_id);
CREATE INDEX idx_notifications_status ON meeting_notifications(status);

-- RLS para todas las tablas adicionales
ALTER TABLE meeting_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_minutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meeting assets"
ON meeting_assets FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM meetings 
  WHERE meetings.id = meeting_assets.meeting_id 
  AND meetings.owner_user_id = auth.uid()
));

CREATE POLICY "Users can view own transcripts"
ON meeting_transcripts FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM meetings 
  WHERE meetings.id = meeting_transcripts.meeting_id 
  AND meetings.owner_user_id = auth.uid()
));

CREATE POLICY "Users can view own minutes"
ON meeting_minutes FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM meetings 
  WHERE meetings.id = meeting_minutes.meeting_id 
  AND meetings.owner_user_id = auth.uid()
));

CREATE POLICY "Users can view own notifications"
ON meeting_notifications FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM meetings 
  WHERE meetings.id = meeting_notifications.meeting_id 
  AND meetings.owner_user_id = auth.uid()
));
*/

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
-- 1. Este SQL es compatible con la tabla existente
-- 2. Los ALTER TABLE son idempotentes (IF NOT EXISTS)
-- 3. Se mantienen campos legacy (is_live, etc) por compatibilidad
-- 4. Las tablas adicionales están comentadas, CORE las creará si las necesita
-- 5. Los índices usan IF NOT EXISTS para evitar errores
