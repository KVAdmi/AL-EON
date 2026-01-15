-- ============================================
-- FIX URGENTE: Permisos de Storage para user-files
-- ============================================
-- PROBLEMA: No se pueden subir archivos a proyectos
-- CAUSA: Falta configurar RLS policies en Storage
-- ============================================

-- 1. HABILITAR RLS en el bucket (si no está)
UPDATE storage.buckets
SET public = false, 
    avif_autodetection = false, 
    file_size_limit = 52428800, -- 50MB
    allowed_mime_types = ARRAY[
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ]
WHERE name = 'user-files';

-- 2. ELIMINAR policies viejas si existen
DROP POLICY IF EXISTS "Users can upload their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;

-- 3. CREAR POLICIES SIMPLES
-- Policy: SELECT (ver archivos)
CREATE POLICY "select_own_files" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'user-files' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: INSERT (subir archivos)
CREATE POLICY "insert_own_files" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'user-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: UPDATE (actualizar archivos)
CREATE POLICY "update_own_files" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'user-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: DELETE (eliminar archivos)
CREATE POLICY "delete_own_files" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'user-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================
-- 4. VERIFICAR
-- ============================================
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
ORDER BY policyname;
