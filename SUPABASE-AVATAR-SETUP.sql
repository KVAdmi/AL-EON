-- ============================================
-- AL-EON - SETUP AVATAR PERSONALIZADO PARA AL-E
-- ============================================

-- 1. Agregar columna avatar_url a user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS assistant_avatar_url TEXT;

COMMENT ON COLUMN user_profiles.assistant_avatar_url IS 'URL del avatar personalizado de AL-E para este usuario';

-- 2. Crear bucket para avatares de AL-E
INSERT INTO storage.buckets (id, name, public)
VALUES ('ale-avatars', 'ale-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Políticas de seguridad para el bucket ale-avatars

-- Permitir a usuarios autenticados SUBIR sus propios avatares
CREATE POLICY "Users can upload their own AL-E avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ale-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Permitir a usuarios autenticados ACTUALIZAR sus propios avatares
CREATE POLICY "Users can update their own AL-E avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'ale-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Permitir a usuarios autenticados ELIMINAR sus propios avatares
CREATE POLICY "Users can delete their own AL-E avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'ale-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Permitir a TODOS (público) VER los avatares (porque son públicos)
CREATE POLICY "Anyone can view AL-E avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'ale-avatars');

-- 4. Índice para mejorar consultas por assistant_avatar_url
CREATE INDEX IF NOT EXISTS idx_user_profiles_assistant_avatar 
ON user_profiles(assistant_avatar_url) 
WHERE assistant_avatar_url IS NOT NULL;

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Ver la estructura actualizada
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles'
  AND column_name = 'assistant_avatar_url';

-- Ver el bucket creado
SELECT * FROM storage.buckets WHERE id = 'ale-avatars';

-- Ver las políticas creadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'objects' AND policyname LIKE '%AL-E avatar%';
