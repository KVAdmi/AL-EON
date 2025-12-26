-- =====================================================
-- PERSONALIZACIÓN DE IDENTIDAD (Usuario + Asistente)
-- =====================================================
-- Ejecutar en Supabase SQL Editor
-- Objetivo: Permitir que cada usuario personalice cómo quiere que le digan
--           y cómo se llama su IA

-- 1. Agregar columnas de personalización a user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS preferred_name TEXT,
  ADD COLUMN IF NOT EXISTS assistant_name TEXT DEFAULT 'Luma',
  ADD COLUMN IF NOT EXISTS tone_pref TEXT DEFAULT 'barrio';

-- 2. Comentarios para documentación
COMMENT ON COLUMN public.user_profiles.preferred_name IS 'Cómo quiere el usuario que la IA le diga (ej. "Patto")';
COMMENT ON COLUMN public.user_profiles.assistant_name IS 'Nombre personalizado del asistente IA (ej. "Luma")';
COMMENT ON COLUMN public.user_profiles.tone_pref IS 'Tono de conversación preferido: barrio/pro/neutral';

-- 3. Validar que los datos existentes tengan defaults
UPDATE public.user_profiles
SET 
  assistant_name = COALESCE(assistant_name, 'Luma'),
  tone_pref = COALESCE(tone_pref, 'barrio')
WHERE assistant_name IS NULL OR tone_pref IS NULL;

-- 4. Índice para optimizar búsquedas por user_id (si no existe ya)
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Verificar que las columnas se crearon correctamente:
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
  AND column_name IN ('preferred_name', 'assistant_name', 'tone_pref')
ORDER BY column_name;

-- Ver estructura completa de la tabla:
SELECT * FROM public.user_profiles LIMIT 1;
