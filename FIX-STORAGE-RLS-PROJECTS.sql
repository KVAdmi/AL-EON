-- ============================================
-- FIX STORAGE RLS PARA PROYECTOS
-- ============================================
-- Problema: No se pueden subir archivos a proyectos
-- Path esperado: {userId}/projects/{projectId}/
-- ============================================

-- 1. Verificar bucket existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-files', 'user-files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. ELIMINAR policies viejas de storage
DROP POLICY IF EXISTS "user_files_upload_own" ON storage.objects;
DROP POLICY IF EXISTS "user_files_read_own" ON storage.objects;
DROP POLICY IF EXISTS "user_files_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios pueden subir a su carpeta" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios pueden leer sus archivos" ON storage.objects;
DROP POLICY IF EXISTS "Acceso público de lectura" ON storage.objects;

-- 3. CREAR policies nuevas y simples

-- UPLOAD: Usuario puede subir a su propia carpeta {userId}/*
CREATE POLICY "upload_own_files_v2"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- SELECT: Usuario puede leer sus propios archivos
CREATE POLICY "select_own_files_v2"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- DELETE: Usuario puede eliminar sus propios archivos
CREATE POLICY "delete_own_files_v2"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- UPDATE: Usuario puede actualizar sus propios archivos
CREATE POLICY "update_own_files_v2"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- 4. VERIFICAR
-- ============================================
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY cmd, policyname;
