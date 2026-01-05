-- ============================================
-- 🔧 SOLUCIÓN: Deshabilitar trigger que está causando error 500
-- ============================================

-- 1. Ver qué triggers existen en auth.users
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND trigger_schema = 'auth';

-- 2. Deshabilitar el trigger que crea perfiles automáticamente
-- (Este es el que está causando el error 500)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Eliminar la función asociada si existe
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 4. Verificar que no haya triggers activos
SELECT 
  trigger_name,
  event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND trigger_schema = 'auth';
