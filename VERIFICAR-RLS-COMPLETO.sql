-- ============================================
-- 🔍 VERIFICACIÓN COMPLETA DE POLÍTICAS RLS
-- ============================================
-- Ejecuta esto para ver TODAS las políticas actuales

-- 1. Ver TODAS las tablas y si tienen RLS habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Ver TODAS las políticas existentes en TODAS las tablas
SELECT 
    schemaname,
    tablename, 
    policyname,
    permissive,
    roles,
    cmd,
    qual AS using_expression,
    with_check AS with_check_expression
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- 3. Verificar específicamente tablas de EMAIL
SELECT 
    tablename, 
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN (
    'email_accounts',
    'email_messages', 
    'email_folders',
    'email_drafts',
    'email_attachments'
  )
ORDER BY tablename, cmd;

-- 4. Verificar tabla user_profiles
SELECT 
    tablename, 
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY cmd;

-- 5. Verificar otras tablas importantes
SELECT 
    tablename, 
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN (
    'conversations',
    'messages',
    'projects',
    'project_members',
    'user_settings'
  )
ORDER BY tablename, cmd;

-- 6. Ver tablas SIN políticas RLS (PELIGRO!)
SELECT 
    t.schemaname,
    t.tablename,
    t.rowsecurity AS rls_enabled,
    COUNT(p.policyname) AS policy_count
FROM pg_tables t
LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = t.schemaname
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
GROUP BY t.schemaname, t.tablename, t.rowsecurity
HAVING COUNT(p.policyname) = 0
ORDER BY t.tablename;

-- 7. Ver triggers activos en auth.users (para verificar que no cause problemas en signup)
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND trigger_schema = 'auth'
ORDER BY trigger_name;

-- ============================================
-- 📋 RESULTADO ESPERADO:
-- ============================================
-- ✅ user_profiles: debe tener policies para INSERT, SELECT, UPDATE
-- ✅ email_accounts: debe filtrar por owner_user_id = auth.uid()
-- ✅ email_messages: debe filtrar por account_id que pertenezca al usuario
-- ✅ conversations, messages: deben filtrar por user_id = auth.uid()
-- ❌ Tablas con RLS enabled pero SIN policies = PELIGRO
