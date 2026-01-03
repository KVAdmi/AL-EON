-- =====================================================
-- MIGRACIÓN: INTEGRACIÓN CON TABLAS EXISTENTES
-- =====================================================
-- Este script adapta las nuevas tablas para trabajar con el schema existente

BEGIN;

-- =====================================================
-- PASO 1: RENOMBRAR/AJUSTAR TABLAS EXISTENTES
-- =====================================================

-- Si ya tienes mail_messages, mail_threads, renombrarlas temporalmente
DO $$
BEGIN
  -- Verificar si existe mail_messages anterior (del schema viejo)
  IF EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'mail_messages'
    AND EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'mail_messages' 
      AND column_name = 'text_body' -- Campo del schema viejo
    )
  ) THEN
    -- Renombrar tabla vieja
    ALTER TABLE IF EXISTS public.mail_messages RENAME TO mail_messages_old;
    RAISE NOTICE 'Tabla mail_messages antigua renombrada a mail_messages_old';
  END IF;

  IF EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'mail_threads'
  ) THEN
    ALTER TABLE IF EXISTS public.mail_threads RENAME TO mail_threads_old;
    RAISE NOTICE 'Tabla mail_threads antigua renombrada a mail_threads_old';
  END IF;
END $$;

-- =====================================================
-- PASO 2: CREAR TABLAS NUEVAS PARA SES
-- =====================================================

-- Tabla: mail_accounts (Nueva)
CREATE TABLE IF NOT EXISTS public.mail_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('ses_inbound', 'ses', 'gmail', 'outlook', 'imap')),
  domain text NOT NULL,
  
  -- AWS SES Configuration
  aws_region text,
  aws_access_key_id text,
  aws_secret_access_key_enc text,
  s3_bucket text,
  
  -- General config
  config jsonb DEFAULT '{}'::jsonb,
  
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error')),
  last_sync_at timestamp with time zone,
  error_message text,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Tabla: mail_messages_new (Nueva estructura mejorada)
CREATE TABLE IF NOT EXISTS public.mail_messages_new (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.mail_accounts(id) ON DELETE CASCADE,
  
  source text NOT NULL DEFAULT 'ses',
  message_id text NOT NULL UNIQUE,
  
  from_email text NOT NULL,
  from_name text,
  to_email text NOT NULL,
  to_name text,
  cc_emails jsonb DEFAULT '[]'::jsonb,
  bcc_emails jsonb DEFAULT '[]'::jsonb,
  reply_to text,
  
  subject text NOT NULL,
  body_text text,
  body_html text,
  snippet text,
  
  received_at timestamp with time zone NOT NULL DEFAULT now(),
  sent_at timestamp with time zone,
  
  s3_bucket text,
  s3_key text,
  s3_url text,
  
  raw_headers jsonb DEFAULT '{}'::jsonb,
  
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'archived', 'deleted', 'spam')),
  folder text DEFAULT 'inbox',
  
  is_starred boolean DEFAULT false,
  is_important boolean DEFAULT false,
  flag text CHECK (flag IN ('urgent', 'important', 'pending', 'follow_up', 'low_priority')),
  labels jsonb DEFAULT '[]'::jsonb,
  
  spam_score numeric DEFAULT 0,
  is_spam boolean DEFAULT false,
  spam_reason text,
  
  has_attachments boolean DEFAULT false,
  attachments_json jsonb DEFAULT '[]'::jsonb,
  
  thread_id text,
  in_reply_to text,
  references_text text,
  
  size_bytes bigint,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Tabla: mail_drafts_new
CREATE TABLE IF NOT EXISTS public.mail_drafts_new (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.mail_messages_new(id) ON DELETE SET NULL,
  account_id uuid REFERENCES public.mail_accounts(id) ON DELETE CASCADE,
  
  to_emails jsonb DEFAULT '[]'::jsonb,
  cc_emails jsonb DEFAULT '[]'::jsonb,
  bcc_emails jsonb DEFAULT '[]'::jsonb,
  
  subject text,
  draft_text text,
  draft_html text,
  
  attachments_json jsonb DEFAULT '[]'::jsonb,
  
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_send', 'sent', 'failed')),
  scheduled_send_at timestamp with time zone,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Tabla: mail_attachments_new
CREATE TABLE IF NOT EXISTS public.mail_attachments_new (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.mail_messages_new(id) ON DELETE CASCADE,
  draft_id uuid REFERENCES public.mail_drafts_new(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  filename text NOT NULL,
  content_type text NOT NULL,
  size_bytes bigint NOT NULL,
  
  storage_path text,
  s3_bucket text,
  s3_key text,
  download_url text,
  
  is_inline boolean DEFAULT false,
  content_id text,
  
  created_at timestamp with time zone DEFAULT now()
);

-- Tabla: mail_filters
CREATE TABLE IF NOT EXISTS public.mail_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.mail_accounts(id) ON DELETE CASCADE,
  
  name text NOT NULL,
  description text,
  
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  actions jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  priority integer DEFAULT 0,
  is_active boolean DEFAULT true,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Tabla: mail_sync_log_new
CREATE TABLE IF NOT EXISTS public.mail_sync_log_new (
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
-- PASO 3: MIGRAR DATOS DE TABLAS ANTIGUAS (SI EXISTEN)
-- =====================================================

DO $$
BEGIN
  -- Migrar desde email_accounts a mail_accounts
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'email_accounts') THEN
    INSERT INTO public.mail_accounts (
      id, user_id, provider, domain, config, status, created_at, updated_at
    )
    SELECT 
      id,
      owner_user_id,
      CASE 
        WHEN provider_label ILIKE '%ses%' THEN 'ses'
        WHEN provider_label ILIKE '%gmail%' THEN 'gmail'
        WHEN provider_label ILIKE '%outlook%' THEN 'outlook'
        ELSE 'imap'
      END,
      COALESCE(
        substring(smtp_host from '(?:@|\.)([\w-]+\.\w+)$'),
        'unknown.com'
      ),
      jsonb_build_object(
        'smtp_host', smtp_host,
        'smtp_port', smtp_port,
        'smtp_user', smtp_user,
        'imap_host', imap_host,
        'imap_port', imap_port
      ),
      CASE WHEN is_active THEN 'active' ELSE 'paused' END,
      created_at,
      updated_at
    FROM public.email_accounts
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Migrados registros de email_accounts';
  END IF;

  -- Migrar mensajes de mail_messages_old si existe
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'mail_messages_old') THEN
    -- Aquí puedes agregar lógica de migración si necesitas datos históricos
    RAISE NOTICE 'Tabla mail_messages_old detectada - requiere migración manual si es necesaria';
  END IF;
END $$;

-- =====================================================
-- PASO 4: CREAR ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_mail_accounts_user_id ON public.mail_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_mail_accounts_domain ON public.mail_accounts(domain);
CREATE INDEX IF NOT EXISTS idx_mail_accounts_status ON public.mail_accounts(status);

CREATE INDEX IF NOT EXISTS idx_mail_messages_new_user_id ON public.mail_messages_new(user_id);
CREATE INDEX IF NOT EXISTS idx_mail_messages_new_account_id ON public.mail_messages_new(account_id);
CREATE INDEX IF NOT EXISTS idx_mail_messages_new_received_at ON public.mail_messages_new(user_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_mail_messages_new_status ON public.mail_messages_new(user_id, status);
CREATE INDEX IF NOT EXISTS idx_mail_messages_new_folder ON public.mail_messages_new(user_id, folder);
CREATE INDEX IF NOT EXISTS idx_mail_messages_new_thread_id ON public.mail_messages_new(thread_id);
CREATE INDEX IF NOT EXISTS idx_mail_messages_new_spam ON public.mail_messages_new(user_id, is_spam);

CREATE INDEX IF NOT EXISTS idx_mail_drafts_new_user_id ON public.mail_drafts_new(user_id);
CREATE INDEX IF NOT EXISTS idx_mail_drafts_new_status ON public.mail_drafts_new(status);

CREATE INDEX IF NOT EXISTS idx_mail_filters_user_id ON public.mail_filters(user_id);
CREATE INDEX IF NOT EXISTS idx_mail_filters_active ON public.mail_filters(user_id, is_active);

-- =====================================================
-- PASO 5: HABILITAR RLS
-- =====================================================

ALTER TABLE public.mail_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_messages_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_drafts_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_attachments_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_sync_log_new ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users manage own mail accounts" ON public.mail_accounts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own mail messages" ON public.mail_messages_new
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own mail drafts" ON public.mail_drafts_new
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own attachments" ON public.mail_attachments_new
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own filters" ON public.mail_filters
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users view own sync log" ON public.mail_sync_log_new
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.mail_accounts
      WHERE mail_accounts.id = mail_sync_log_new.account_id
      AND mail_accounts.user_id = auth.uid()
    )
  );

-- =====================================================
-- PASO 6: CREAR TRIGGERS
-- =====================================================

CREATE TRIGGER update_mail_accounts_updated_at BEFORE UPDATE ON public.mail_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mail_messages_new_updated_at BEFORE UPDATE ON public.mail_messages_new
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mail_drafts_new_updated_at BEFORE UPDATE ON public.mail_drafts_new
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mail_filters_updated_at BEFORE UPDATE ON public.mail_filters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PASO 7: RENOMBRAR TABLAS NUEVAS (OPCIONAL)
-- =====================================================

-- Si quieres usar los nombres sin el sufijo _new:
-- DROP TABLE IF EXISTS public.mail_messages CASCADE;
-- ALTER TABLE public.mail_messages_new RENAME TO mail_messages;
-- (Hacer lo mismo con drafts, attachments, sync_log)

COMMIT;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migración completada';
  RAISE NOTICE 'Tablas creadas:';
  RAISE NOTICE '  - mail_accounts';
  RAISE NOTICE '  - mail_messages_new';
  RAISE NOTICE '  - mail_drafts_new';
  RAISE NOTICE '  - mail_attachments_new';
  RAISE NOTICE '  - mail_filters';
  RAISE NOTICE '  - mail_sync_log_new';
END $$;
