-- ========================================
-- SUPABASE RLS FIX COMPLETO
-- Arregla 403 en user_profiles, user_settings y storage
-- ========================================

-- ========================================
-- 1. USER_PROFILES - RLS POLICIES
-- ========================================

-- Habilitar RLS si no está habilitado
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- BORRAR policies antiguas si existen (evitar duplicados)
DROP POLICY IF EXISTS "user_profiles_select_own" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_own" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own" ON public.user_profiles;

-- POLICY: SELECT - Usuario puede ver solo su perfil
CREATE POLICY "user_profiles_select_own"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- POLICY: INSERT - Usuario puede crear solo su perfil
CREATE POLICY "user_profiles_insert_own"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- POLICY: UPDATE - Usuario puede actualizar solo su perfil
CREATE POLICY "user_profiles_update_own"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ========================================
-- 2. USER_SETTINGS - RLS POLICIES
-- ========================================

-- Habilitar RLS si no está habilitado
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- BORRAR policies antiguas si existen
DROP POLICY IF EXISTS "user_settings_select_own" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_insert_own" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_update_own" ON public.user_settings;

-- POLICY: SELECT - Usuario puede ver solo su configuración
CREATE POLICY "user_settings_select_own"
ON public.user_settings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- POLICY: INSERT - Usuario puede crear solo su configuración
CREATE POLICY "user_settings_insert_own"
ON public.user_settings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- POLICY: UPDATE - Usuario puede actualizar solo su configuración
CREATE POLICY "user_settings_update_own"
ON public.user_settings
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ========================================
-- 3. STORAGE BUCKET - user-files
-- ========================================

-- Crear bucket si no existe (public = false para seguridad)
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-files', 'user-files', false)
ON CONFLICT (id) DO NOTHING;

-- BORRAR policies antiguas si existen
DROP POLICY IF EXISTS "user_files_upload_own" ON storage.objects;
DROP POLICY IF EXISTS "user_files_read_own" ON storage.objects;
DROP POLICY IF EXISTS "user_files_delete_own" ON storage.objects;

-- POLICY: UPLOAD - Usuario puede subir archivos a su carpeta (userId/*)
CREATE POLICY "user_files_upload_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- POLICY: READ - Usuario puede leer archivos de su carpeta
CREATE POLICY "user_files_read_own"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- POLICY: DELETE - Usuario puede eliminar archivos de su carpeta
CREATE POLICY "user_files_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ========================================
-- 4. VERIFICACIÓN (comentar para no ejecutar)
-- ========================================

-- Verificar policies de user_profiles
-- SELECT * FROM pg_policies WHERE tablename = 'user_profiles';

-- Verificar policies de user_settings
-- SELECT * FROM pg_policies WHERE tablename = 'user_settings';

-- Verificar policies de storage
-- SELECT * FROM storage.policies WHERE bucket_id = 'user-files';

-- ========================================
-- ✅ SCRIPT COMPLETADO
-- ========================================
-- Ejecutar este script en Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ========================================
