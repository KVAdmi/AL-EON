-- ========================================
-- VERIFICAR QUE RLS ESTÉ FUNCIONANDO
-- ========================================
-- Ejecuta esto en Supabase SQL Editor para confirmar

-- 1. Verificar que RLS está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS Habilitado"
FROM pg_tables 
WHERE tablename IN ('user_profiles', 'user_settings')
  AND schemaname = 'public';

-- Debe mostrar:
-- user_profiles   | true
-- user_settings   | true

-- ========================================

-- 2. Verificar policies de user_profiles
SELECT 
  policyname as "Nombre Policy",
  cmd as "Operación",
  qual as "Condición USING",
  with_check as "Condición WITH CHECK"
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- Debe mostrar 3 policies:
-- user_profiles_insert_own | INSERT
-- user_profiles_select_own | SELECT
-- user_profiles_update_own | UPDATE

-- ========================================

-- 3. Verificar policies de user_settings
SELECT 
  policyname as "Nombre Policy",
  cmd as "Operación",
  qual as "Condición USING",
  with_check as "Condición WITH CHECK"
FROM pg_policies 
WHERE tablename = 'user_settings'
ORDER BY policyname;

-- Debe mostrar 3 policies:
-- user_settings_insert_own | INSERT
-- user_settings_select_own | SELECT
-- user_settings_update_own | UPDATE

-- ========================================

-- 4. Verificar que tu perfil existe
SELECT 
  user_id,
  display_name,
  preferred_language,
  timezone,
  theme,
  created_at,
  updated_at
FROM user_profiles
WHERE user_id = auth.uid();

-- Si está vacío, crear tu perfil:
INSERT INTO user_profiles (user_id, display_name, preferred_language, timezone, theme)
VALUES (auth.uid(), 'Usuario', 'es', 'America/Mexico_City', 'dark')
ON CONFLICT (user_id) DO NOTHING;

-- ========================================

-- 5. Verificar que tus settings existen
SELECT 
  user_id,
  ai_model,
  ai_temperature,
  context_persistent,
  voice_enabled,
  created_at,
  updated_at
FROM user_settings
WHERE user_id = auth.uid();

-- Si está vacío, crear tus settings:
INSERT INTO user_settings (user_id, ai_model, ai_temperature, context_persistent, voice_enabled)
VALUES (auth.uid(), 'gpt-4', 0.7, true, false)
ON CONFLICT (user_id) DO NOTHING;

-- ========================================

-- 6. Verificar storage bucket
SELECT 
  id,
  name,
  public,
  created_at
FROM storage.buckets
WHERE id = 'user-files';

-- Debe mostrar:
-- user-files | user-files | false | [fecha]

-- ========================================

-- 7. Verificar storage policies
SELECT 
  name as "Nombre Policy",
  definition
FROM storage.policies
WHERE bucket_id = 'user-files'
ORDER BY name;

-- Debe mostrar 3 policies:
-- user_files_delete_own
-- user_files_read_own
-- user_files_upload_own

-- ========================================
-- ✅ Si todo está correcto, el guardado funcionará
-- ========================================
