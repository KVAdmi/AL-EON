-- ============================================
-- AL-EON - MÓDULO REUNIONES CON MODO ALTAVOZ
-- ============================================

-- 1. Crear tabla meetings
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Metadatos
  title TEXT NOT NULL,
  meeting_type TEXT NOT NULL DEFAULT 'upload', -- 'upload' o 'live'
  status TEXT NOT NULL DEFAULT 'processing', -- 'uploading', 'processing', 'done', 'error'
  error_message TEXT,
  
  -- Audio original
  audio_url TEXT,
  audio_duration_seconds INTEGER,
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
  
  -- Modo altavoz
  is_live BOOLEAN DEFAULT false,
  live_started_at TIMESTAMPTZ,
  live_ended_at TIMESTAMPTZ,
  live_chunks_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- 2. Índices
CREATE INDEX idx_meetings_owner ON meetings(owner_user_id);
CREATE INDEX idx_meetings_status ON meetings(status);
CREATE INDEX idx_meetings_created ON meetings(created_at DESC);
CREATE INDEX idx_meetings_live ON meetings(is_live) WHERE is_live = true;

-- 3. RLS Policies
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

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

-- 4. Trigger para actualizar updated_at
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

-- 5. Bucket para audios de reuniones
INSERT INTO storage.buckets (id, name, public)
VALUES ('meeting-recordings', 'meeting-recordings', false)
ON CONFLICT (id) DO NOTHING;

-- 6. Políticas de Storage
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
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'meetings'
ORDER BY ordinal_position;
