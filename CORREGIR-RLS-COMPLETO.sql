-- ============================================
-- 🔒 CORRECCIÓN COMPLETA DE POLÍTICAS RLS
-- ============================================
-- IMPORTANTE: Ejecuta primero VERIFICAR-RLS-COMPLETO.sql
-- para ver qué hay actualmente, luego ejecuta esto

-- ============================================
-- 1. USER_PROFILES (crítico para signup)
-- ============================================

-- Habilitar RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes que puedan causar conflictos
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;

-- Crear políticas correctas
CREATE POLICY "Users can insert their own profile"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 2. EMAIL_ACCOUNTS (cada usuario solo ve sus cuentas)
-- ============================================

ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Users can manage their email accounts" ON public.email_accounts;
DROP POLICY IF EXISTS "Users can view own email accounts" ON public.email_accounts;
DROP POLICY IF EXISTS "Users can create email accounts" ON public.email_accounts;
DROP POLICY IF EXISTS "Users can update own email accounts" ON public.email_accounts;
DROP POLICY IF EXISTS "Users can delete own email accounts" ON public.email_accounts;

-- Crear políticas seguras
CREATE POLICY "Users can view their own email accounts"
ON public.email_accounts
FOR SELECT
TO authenticated
USING (owner_user_id = auth.uid());

CREATE POLICY "Users can create their own email accounts"
ON public.email_accounts
FOR INSERT
TO authenticated
WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Users can update their own email accounts"
ON public.email_accounts
FOR UPDATE
TO authenticated
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Users can delete their own email accounts"
ON public.email_accounts
FOR DELETE
TO authenticated
USING (owner_user_id = auth.uid());

-- ============================================
-- 3. EMAIL_MESSAGES (solo mensajes de cuentas del usuario)
-- ============================================

ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages from their accounts" ON public.email_messages;
DROP POLICY IF EXISTS "Users can create messages in their accounts" ON public.email_messages;
DROP POLICY IF EXISTS "Users can update messages in their accounts" ON public.email_messages;
DROP POLICY IF EXISTS "Users can delete messages in their accounts" ON public.email_messages;

CREATE POLICY "Users can view messages from their accounts"
ON public.email_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM email_accounts 
    WHERE email_accounts.id = email_messages.account_id 
    AND email_accounts.owner_user_id = auth.uid()
  )
);

CREATE POLICY "Users can create messages in their accounts"
ON public.email_messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM email_accounts 
    WHERE email_accounts.id = email_messages.account_id 
    AND email_accounts.owner_user_id = auth.uid()
  )
);

CREATE POLICY "Users can update messages in their accounts"
ON public.email_messages
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM email_accounts 
    WHERE email_accounts.id = email_messages.account_id 
    AND email_accounts.owner_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM email_accounts 
    WHERE email_accounts.id = email_messages.account_id 
    AND email_accounts.owner_user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete messages in their accounts"
ON public.email_messages
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM email_accounts 
    WHERE email_accounts.id = email_messages.account_id 
    AND email_accounts.owner_user_id = auth.uid()
  )
);

-- ============================================
-- 4. EMAIL_FOLDERS (solo carpetas de cuentas del usuario)
-- ============================================

ALTER TABLE public.email_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view folders from their accounts" ON public.email_folders;
DROP POLICY IF EXISTS "Users can create folders in their accounts" ON public.email_folders;
DROP POLICY IF EXISTS "Users can update folders in their accounts" ON public.email_folders;
DROP POLICY IF EXISTS "Users can delete folders in their accounts" ON public.email_folders;

CREATE POLICY "Users can view folders from their accounts"
ON public.email_folders
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM email_accounts 
    WHERE email_accounts.id = email_folders.account_id 
    AND email_accounts.owner_user_id = auth.uid()
  )
);

CREATE POLICY "Users can create folders in their accounts"
ON public.email_folders
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM email_accounts 
    WHERE email_accounts.id = email_folders.account_id 
    AND email_accounts.owner_user_id = auth.uid()
  )
);

CREATE POLICY "Users can update folders in their accounts"
ON public.email_folders
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM email_accounts 
    WHERE email_accounts.id = email_folders.account_id 
    AND email_accounts.owner_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM email_accounts 
    WHERE email_accounts.id = email_folders.account_id 
    AND email_accounts.owner_user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete folders in their accounts"
ON public.email_folders
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM email_accounts 
    WHERE email_accounts.id = email_folders.account_id 
    AND email_accounts.owner_user_id = auth.uid()
  )
);

-- ============================================
-- 5. EMAIL_DRAFTS (solo borradores del usuario)
-- ============================================

ALTER TABLE public.email_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their drafts" ON public.email_drafts;
DROP POLICY IF EXISTS "Users can view own drafts" ON public.email_drafts;
DROP POLICY IF EXISTS "Users can create drafts" ON public.email_drafts;
DROP POLICY IF EXISTS "Users can update own drafts" ON public.email_drafts;
DROP POLICY IF EXISTS "Users can delete own drafts" ON public.email_drafts;

CREATE POLICY "Users can view their own drafts"
ON public.email_drafts
FOR SELECT
TO authenticated
USING (owner_user_id = auth.uid());

CREATE POLICY "Users can create their own drafts"
ON public.email_drafts
FOR INSERT
TO authenticated
WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Users can update their own drafts"
ON public.email_drafts
FOR UPDATE
TO authenticated
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Users can delete their own drafts"
ON public.email_drafts
FOR DELETE
TO authenticated
USING (owner_user_id = auth.uid());

-- ============================================
-- 6. EMAIL_ATTACHMENTS (solo adjuntos del usuario)
-- ============================================

ALTER TABLE public.email_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their attachments" ON public.email_attachments;
DROP POLICY IF EXISTS "Users can view attachments" ON public.email_attachments;
DROP POLICY IF EXISTS "Users can create attachments" ON public.email_attachments;
DROP POLICY IF EXISTS "Users can delete attachments" ON public.email_attachments;

CREATE POLICY "Users can view their attachments"
ON public.email_attachments
FOR SELECT
TO authenticated
USING (owner_user_id = auth.uid());

CREATE POLICY "Users can create their attachments"
ON public.email_attachments
FOR INSERT
TO authenticated
WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Users can delete their attachments"
ON public.email_attachments
FOR DELETE
TO authenticated
USING (owner_user_id = auth.uid());

-- ============================================
-- 7. CONVERSATIONS (solo conversaciones del usuario)
-- ============================================

-- Verificar si la tabla existe antes de crear políticas
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversations') THEN
        ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
        DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
        DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
        DROP POLICY IF EXISTS "Users can delete own conversations" ON public.conversations;

        EXECUTE 'CREATE POLICY "Users can view their conversations"
        ON public.conversations
        FOR SELECT
        TO authenticated
        USING (user_id = auth.uid())';

        EXECUTE 'CREATE POLICY "Users can create their conversations"
        ON public.conversations
        FOR INSERT
        TO authenticated
        WITH CHECK (user_id = auth.uid())';

        EXECUTE 'CREATE POLICY "Users can update their conversations"
        ON public.conversations
        FOR UPDATE
        TO authenticated
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid())';

        EXECUTE 'CREATE POLICY "Users can delete their conversations"
        ON public.conversations
        FOR DELETE
        TO authenticated
        USING (user_id = auth.uid())';
        
        RAISE NOTICE 'Políticas creadas para conversations';
    ELSE
        RAISE NOTICE 'Tabla conversations no existe, omitiendo...';
    END IF;
END $$;

-- ============================================
-- 8. MESSAGES (solo mensajes de conversaciones del usuario)
-- ============================================

-- Verificar si la tabla existe antes de crear políticas
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
        ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Users can view messages from their conversations" ON public.messages;
        DROP POLICY IF EXISTS "Users can create messages in their conversations" ON public.messages;
        DROP POLICY IF EXISTS "Users can update messages in their conversations" ON public.messages;
        DROP POLICY IF EXISTS "Users can delete messages in their conversations" ON public.messages;

        -- Verificar si existe la tabla conversations para la política
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversations') THEN
            EXECUTE 'CREATE POLICY "Users can view messages from their conversations"
            ON public.messages
            FOR SELECT
            TO authenticated
            USING (
              EXISTS (
                SELECT 1 FROM conversations 
                WHERE conversations.id = messages.conversation_id 
                AND conversations.user_id = auth.uid()
              )
            )';

            EXECUTE 'CREATE POLICY "Users can create messages in their conversations"
            ON public.messages
            FOR INSERT
            TO authenticated
            WITH CHECK (
              EXISTS (
                SELECT 1 FROM conversations 
                WHERE conversations.id = messages.conversation_id 
                AND conversations.user_id = auth.uid()
              )
            )';

            EXECUTE 'CREATE POLICY "Users can update messages in their conversations"
            ON public.messages
            FOR UPDATE
            TO authenticated
            USING (
              EXISTS (
                SELECT 1 FROM conversations 
                WHERE conversations.id = messages.conversation_id 
                AND conversations.user_id = auth.uid()
              )
            )
            WITH CHECK (
              EXISTS (
                SELECT 1 FROM conversations 
                WHERE conversations.id = messages.conversation_id 
                AND conversations.user_id = auth.uid()
              )
            )';

            EXECUTE 'CREATE POLICY "Users can delete messages in their conversations"
            ON public.messages
            FOR DELETE
            TO authenticated
            USING (
              EXISTS (
                SELECT 1 FROM conversations 
                WHERE conversations.id = messages.conversation_id 
                AND conversations.user_id = auth.uid()
              )
            )';
            
            RAISE NOTICE 'Políticas creadas para messages con conversaciones';
        ELSE
            -- Si no hay tabla conversations, crear políticas simples basadas en user_id
            IF EXISTS (SELECT column_name FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'user_id') THEN
                EXECUTE 'CREATE POLICY "Users can view their messages"
                ON public.messages
                FOR SELECT
                TO authenticated
                USING (user_id = auth.uid())';

                EXECUTE 'CREATE POLICY "Users can create their messages"
                ON public.messages
                FOR INSERT
                TO authenticated
                WITH CHECK (user_id = auth.uid())';

                EXECUTE 'CREATE POLICY "Users can update their messages"
                ON public.messages
                FOR UPDATE
                TO authenticated
                USING (user_id = auth.uid())
                WITH CHECK (user_id = auth.uid())';

                EXECUTE 'CREATE POLICY "Users can delete their messages"
                ON public.messages
                FOR DELETE
                TO authenticated
                USING (user_id = auth.uid())';
                
                RAISE NOTICE 'Políticas creadas para messages sin conversaciones (basadas en user_id)';
            ELSE
                RAISE NOTICE 'Tabla messages no tiene user_id ni conversation_id, omitiendo políticas';
            END IF;
        END IF;
    ELSE
        RAISE NOTICE 'Tabla messages no existe, omitiendo...';
    END IF;
END $$;

-- ============================================
-- 9. USER_SETTINGS (configuración del usuario)
-- ============================================

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;

CREATE POLICY "Users can view their settings"
ON public.user_settings
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create their settings"
ON public.user_settings
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their settings"
ON public.user_settings
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================
-- 10. VERIFICACIÓN FINAL
-- ============================================

-- Ver todas las políticas creadas
SELECT 
    tablename, 
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- Contar políticas por tabla
SELECT 
    tablename,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- ============================================
-- ✅ RESULTADO ESPERADO:
-- ============================================
-- user_profiles: 3 policies (INSERT, SELECT, UPDATE)
-- email_accounts: 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- email_messages: 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- email_folders: 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- email_drafts: 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- email_attachments: 3 policies (SELECT, INSERT, DELETE)
-- conversations: 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- messages: 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- user_settings: 3 policies (SELECT, INSERT, UPDATE)
