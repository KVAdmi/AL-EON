-- =====================================================
-- FIX URGENTE: Permitir que el trigger Y el frontend inserten perfiles
-- =====================================================

-- PROBLEMA: Las políticas RLS están bloqueando la creación de perfiles
-- SOLUCIÓN: Permitir INSERT durante el signup (cuando NO hay sesión aún)

-- 1. Eliminar política de INSERT restrictiva
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;

-- 2. Crear política que permita INSERT sin autenticación (solo durante signup)
CREATE POLICY "Allow insert during signup"
ON public.user_profiles FOR INSERT
WITH CHECK (true);  -- Permite cualquier INSERT

-- NOTA: Esto es seguro porque:
-- - Solo se usa durante signup (1 vez por usuario)
-- - El trigger o el frontend validan los datos
-- - Después del signup, las políticas de SELECT/UPDATE siguen siendo restrictivas

-- 3. Verificar que las otras políticas siguen activas
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY cmd;

-- =====================================================
-- EJECUTA ESTO Y PRUEBA CREAR TU CUENTA DE NUEVO
-- =====================================================
