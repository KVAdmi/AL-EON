-- ============================================
-- Crear bucket para archivos de usuario
-- ============================================

-- Crear bucket si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-files', 'user-files', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acceso
-- Permitir que usuarios suban archivos a su propia carpeta
CREATE POLICY "Usuarios pueden subir a su carpeta"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Permitir que usuarios lean sus propios archivos
CREATE POLICY "Usuarios pueden leer sus archivos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Permitir acceso público de lectura a todos los archivos
CREATE POLICY "Acceso público de lectura"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'user-files');

-- Permitir que usuarios eliminen sus archivos
CREATE POLICY "Usuarios pueden eliminar sus archivos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
