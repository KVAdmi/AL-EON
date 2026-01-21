-- =====================================================
-- FIX CRÍTICO: AGREGAR CAMPO tts_gender A user_settings
-- =====================================================
-- Fecha: 20 de enero de 2026
-- Problema: El frontend espera user_settings.tts_gender pero no existe
-- Archivos afectados:
--   - src/features/chat/pages/ChatPage.jsx (línea 79)
--   - src/pages/SettingsPage.jsx (líneas 43, 262, 1398-1473)
--   - src/types/user.ts (líneas 51, 82)
-- =====================================================

-- PASO 1: Agregar columna tts_gender a user_settings
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS tts_gender text DEFAULT 'female'::text
CHECK (tts_gender IN ('female', 'male'));

-- PASO 2: Actualizar registros existentes (si los hay)
UPDATE public.user_settings
SET tts_gender = 'female'
WHERE tts_gender IS NULL;

-- PASO 3: Verificar el cambio
SELECT 
  id,
  user_id,
  tts_gender,
  voice_enabled,
  created_at
FROM public.user_settings
LIMIT 5;

-- =====================================================
-- RESULTADO ESPERADO:
-- ✅ Campo tts_gender agregado con default 'female'
-- ✅ Constraint para solo permitir 'female' o 'male'
-- ✅ Registros existentes actualizados
-- =====================================================

-- =====================================================
-- VERIFICACIÓN ADICIONAL: assistant_name en user_profiles
-- =====================================================
-- El campo assistant_name ya existe, pero verifica que tenga datos

SELECT 
  id,
  user_id,
  email,
  display_name,
  assistant_name,     -- 🤖 Debe tener valor (default: 'Luma')
  assistant_avatar_url,
  created_at
FROM public.user_profiles
WHERE assistant_name IS NULL
LIMIT 10;

-- Si encuentra registros NULL, ejecutar:
UPDATE public.user_profiles
SET assistant_name = 'Luma'
WHERE assistant_name IS NULL;

-- =====================================================
-- FIN DEL FIX
-- =====================================================
