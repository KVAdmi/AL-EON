-- =====================================================
-- TABLAS PARA AWS SES MAIL SYSTEM
-- =====================================================

-- 1. mail_accounts - Cuentas de correo (SES, Gmail, Outlook, IMAP)
CREATE TABLE IF NOT EXISTS public.mail_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('ses_inbound', 'gmail', 'outlook', 'imap', 'ses')),
  domain text NOT NULL, -- ej: al-eon.com o infinitykode.mx
  
  -- Configuración del proveedor
  config jsonb DEFAULT '{}'::jsonb, -- Configuración específica del proveedor
  
  -- AWS SES específico
  aws_region text, -- us-east-1, eu-west-1, etc.
  aws_access_key_id text,
  aws_secret_access_key_enc text, -- Encriptado
  s3_bucket text, -- Bucket para almacenar emails recibidos
  
  -- Estado
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error')),
  last_sync_at timestamp with time zone,
  error_message text,
  
  -- Metadatos
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. mail_messages - Mensajes de correo recibidos/enviados
CREATE TABLE IF NOT EXISTS public.mail_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.mail_accounts(id) ON DELETE CASCADE,
  
  -- Origen y identificación
  source text NOT NULL DEFAULT 'ses', -- ses, gmail, outlook, imap
  message_id text NOT NULL, -- Header Message-ID único
  
  -- Direcciones
  from_email text NOT NULL,
  from_name text,
  to_email text NOT NULL,
  to_name text,
  cc_emails jsonb DEFAULT '[]'::jsonb,
  bcc_emails jsonb DEFAULT '[]'::jsonb,
  reply_to text,
  
  -- Contenido
  subject text NOT NULL,
  body_text text,
  body_html text,
  snippet text, -- Preview de 200 caracteres
  
  -- Metadatos del mensaje
  received_at timestamp with time zone NOT NULL DEFAULT now(),
  sent_at timestamp with time zone,
  
  -- Almacenamiento S3 (para SES)
  s3_bucket text,
  s3_key text, -- Ruta completa del archivo en S3
  s3_url text, -- URL pre-firmada si es necesario
  
  -- Headers completos
  raw_headers jsonb DEFAULT '{}'::jsonb,
  
  -- Clasificación y estado
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'archived', 'deleted', 'spam')),
  folder text DEFAULT 'inbox', -- inbox, sent, drafts, spam, trash
  
  -- Banderas y etiquetas
  is_starred boolean DEFAULT false,
  is_important boolean DEFAULT false,
  flag text CHECK (flag IN ('urgent', 'important', 'pending', 'follow_up', 'low_priority')),
  labels jsonb DEFAULT '[]'::jsonb,
  
  -- Anti-spam
  spam_score numeric DEFAULT 0,
  is_spam boolean DEFAULT false,
  spam_reason text,
  
  -- Adjuntos
  has_attachments boolean DEFAULT false,
  attachments_json jsonb DEFAULT '[]'::jsonb,
  
  -- Thread/Conversación
  thread_id text,
  in_reply_to text,
  references text,
  
  -- Tamaño
  size_bytes bigint,
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Constraint único para message_id
  CONSTRAINT mail_messages_message_id_unique UNIQUE (message_id)
);

-- 3. mail_drafts - Borradores de correo
CREATE TABLE IF NOT EXISTS public.mail_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.mail_messages(id) ON DELETE SET NULL, -- Opcional, si es respuesta
  account_id uuid REFERENCES public.mail_accounts(id) ON DELETE CASCADE,
  
  -- Direcciones
  to_emails jsonb DEFAULT '[]'::jsonb,
  cc_emails jsonb DEFAULT '[]'::jsonb,
  bcc_emails jsonb DEFAULT '[]'::jsonb,
  
  -- Contenido
  subject text,
  draft_text text,
  draft_html text,
  
  -- Adjuntos
  attachments_json jsonb DEFAULT '[]'::jsonb,
  
  -- Estado
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_send', 'sent', 'failed')),
  
  -- Envío programado
  scheduled_send_at timestamp with time zone,
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 4. mail_attachments - Adjuntos de correos
CREATE TABLE IF NOT EXISTS public.mail_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.mail_messages(id) ON DELETE CASCADE,
  draft_id uuid REFERENCES public.mail_drafts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Información del archivo
  filename text NOT NULL,
  content_type text NOT NULL,
  size_bytes bigint NOT NULL,
  
  -- Almacenamiento
  storage_path text, -- Ruta en Supabase Storage o S3
  s3_bucket text,
  s3_key text,
  download_url text,
  
  -- Metadatos
  is_inline boolean DEFAULT false,
  content_id text, -- Para imágenes inline
  
  created_at timestamp with time zone DEFAULT now()
);

-- 5. mail_filters - Filtros y reglas de correo
CREATE TABLE IF NOT EXISTS public.mail_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.mail_accounts(id) ON DELETE CASCADE,
  
  name text NOT NULL,
  description text,
  
  -- Condiciones (JSON con reglas)
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Ejemplo: {"from_contains": "spam", "subject_contains": "oferta"}
  
  -- Acciones (JSON con acciones a ejecutar)
  actions jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Ejemplo: {"move_to": "spam", "mark_as_read": true, "set_flag": "spam"}
  
  priority integer DEFAULT 0, -- Orden de ejecución
  is_active boolean DEFAULT true,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 6. mail_sync_log - Log de sincronización
CREATE TABLE IF NOT EXISTS public.mail_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.mail_accounts(id) ON DELETE CASCADE,
  
  sync_type text NOT NULL CHECK (sync_type IN ('manual', 'auto', 'webhook', 'ses_notification')),
  status text NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
  
  messages_fetched integer DEFAULT 0,
  messages_new integer DEFAULT 0,
  messages_updated integer DEFAULT 0,
  
  errors text,
  details jsonb DEFAULT '{}'::jsonb,
  
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  duration_ms integer
);

-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- mail_accounts
CREATE INDEX IF NOT EXISTS idx_mail_accounts_user_id ON public.mail_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_mail_accounts_domain ON public.mail_accounts(domain);
CREATE INDEX IF NOT EXISTS idx_mail_accounts_status ON public.mail_accounts(status);

-- mail_messages
CREATE INDEX IF NOT EXISTS idx_mail_messages_user_id ON public.mail_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_mail_messages_account_id ON public.mail_messages(account_id);
CREATE INDEX IF NOT EXISTS idx_mail_messages_received_at_desc ON public.mail_messages(user_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_mail_messages_status ON public.mail_messages(user_id, status);
CREATE INDEX IF NOT EXISTS idx_mail_messages_folder ON public.mail_messages(user_id, folder);
CREATE INDEX IF NOT EXISTS idx_mail_messages_thread_id ON public.mail_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_mail_messages_from_email ON public.mail_messages(from_email);
CREATE INDEX IF NOT EXISTS idx_mail_messages_to_email ON public.mail_messages(to_email);
CREATE INDEX IF NOT EXISTS idx_mail_messages_spam ON public.mail_messages(user_id, is_spam);

-- mail_drafts
CREATE INDEX IF NOT EXISTS idx_mail_drafts_user_id ON public.mail_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_mail_drafts_status ON public.mail_drafts(status);
CREATE INDEX IF NOT EXISTS idx_mail_drafts_updated_at ON public.mail_drafts(updated_at DESC);

-- mail_attachments
CREATE INDEX IF NOT EXISTS idx_mail_attachments_message_id ON public.mail_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_mail_attachments_draft_id ON public.mail_attachments(draft_id);
CREATE INDEX IF NOT EXISTS idx_mail_attachments_user_id ON public.mail_attachments(user_id);

-- mail_filters
CREATE INDEX IF NOT EXISTS idx_mail_filters_user_id ON public.mail_filters(user_id);
CREATE INDEX IF NOT EXISTS idx_mail_filters_active ON public.mail_filters(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_mail_filters_priority ON public.mail_filters(priority);

-- mail_sync_log
CREATE INDEX IF NOT EXISTS idx_mail_sync_log_account_id ON public.mail_sync_log(account_id);
CREATE INDEX IF NOT EXISTS idx_mail_sync_log_started_at ON public.mail_sync_log(started_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.mail_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_sync_log ENABLE ROW LEVEL SECURITY;

-- Políticas para mail_accounts
CREATE POLICY "Users can view own mail accounts"
  ON public.mail_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own mail accounts"
  ON public.mail_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mail accounts"
  ON public.mail_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own mail accounts"
  ON public.mail_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para mail_messages
CREATE POLICY "Users can view own mail messages"
  ON public.mail_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own mail messages"
  ON public.mail_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mail messages"
  ON public.mail_messages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own mail messages"
  ON public.mail_messages FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para mail_drafts
CREATE POLICY "Users can view own mail drafts"
  ON public.mail_drafts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own mail drafts"
  ON public.mail_drafts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mail drafts"
  ON public.mail_drafts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own mail drafts"
  ON public.mail_drafts FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para mail_attachments
CREATE POLICY "Users can view own mail attachments"
  ON public.mail_attachments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own mail attachments"
  ON public.mail_attachments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own mail attachments"
  ON public.mail_attachments FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para mail_filters
CREATE POLICY "Users can view own mail filters"
  ON public.mail_filters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own mail filters"
  ON public.mail_filters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mail filters"
  ON public.mail_filters FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own mail filters"
  ON public.mail_filters FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para mail_sync_log (solo lectura)
CREATE POLICY "Users can view sync log for their accounts"
  ON public.mail_sync_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.mail_accounts
      WHERE mail_accounts.id = mail_sync_log.account_id
      AND mail_accounts.user_id = auth.uid()
    )
  );

-- =====================================================
-- FUNCIONES Y TRIGGERS
-- =====================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_mail_accounts_updated_at BEFORE UPDATE ON public.mail_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mail_messages_updated_at BEFORE UPDATE ON public.mail_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mail_drafts_updated_at BEFORE UPDATE ON public.mail_drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mail_filters_updated_at BEFORE UPDATE ON public.mail_filters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VISTAS ÚTILES
-- =====================================================

-- Vista de estadísticas por cuenta
CREATE OR REPLACE VIEW mail_account_stats AS
SELECT 
  ma.id as account_id,
  ma.user_id,
  ma.domain,
  ma.status,
  COUNT(DISTINCT mm.id) as total_messages,
  COUNT(DISTINCT mm.id) FILTER (WHERE mm.status = 'new') as unread_count,
  COUNT(DISTINCT mm.id) FILTER (WHERE mm.is_starred = true) as starred_count,
  COUNT(DISTINCT mm.id) FILTER (WHERE mm.is_spam = true) as spam_count,
  MAX(mm.received_at) as last_message_at
FROM public.mail_accounts ma
LEFT JOIN public.mail_messages mm ON mm.account_id = ma.id
GROUP BY ma.id, ma.user_id, ma.domain, ma.status;

-- Vista de mensajes recientes con detalles de cuenta
CREATE OR REPLACE VIEW mail_messages_with_account AS
SELECT 
  mm.*,
  ma.domain,
  ma.provider,
  ma.status as account_status
FROM public.mail_messages mm
JOIN public.mail_accounts ma ON ma.id = mm.account_id;

-- =====================================================
-- COMENTARIOS
-- =====================================================

COMMENT ON TABLE public.mail_accounts IS 'Cuentas de correo configuradas (AWS SES, Gmail, Outlook, IMAP)';
COMMENT ON TABLE public.mail_messages IS 'Mensajes de correo recibidos y enviados';
COMMENT ON TABLE public.mail_drafts IS 'Borradores de correos pendientes de envío';
COMMENT ON TABLE public.mail_attachments IS 'Archivos adjuntos de correos y borradores';
COMMENT ON TABLE public.mail_filters IS 'Reglas y filtros automáticos para clasificación de correos';
COMMENT ON TABLE public.mail_sync_log IS 'Registro de sincronizaciones de correo';

COMMENT ON COLUMN public.mail_messages.message_id IS 'Header Message-ID único del correo (RFC 5322)';
COMMENT ON COLUMN public.mail_messages.s3_key IS 'Ruta del archivo completo en S3 (para AWS SES)';
COMMENT ON COLUMN public.mail_messages.raw_headers IS 'Headers completos del correo en formato JSON';
COMMENT ON COLUMN public.mail_messages.flag IS 'Bandera de clasificación: urgent, important, pending, follow_up, low_priority';
COMMENT ON COLUMN public.mail_messages.spam_score IS 'Puntuación de spam (0-10, donde >5 es probable spam)';
