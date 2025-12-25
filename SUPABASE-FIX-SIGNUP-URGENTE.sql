-- ============================================
-- 🚨 FIX URGENTE: REGISTRO DE USUARIOS
-- ============================================
-- Problema: El CEO intentó registrarse y obtuvo error de database
-- Causa: Falta el trigger que crea automáticamente user_profiles + user_settings
-- 
-- EJECUTAR ESTO EN SUPABASE SQL EDITOR AHORA:
-- https://supabase.com/dashboard/project/gptwzuqmuvzttajgjrry/sql/new
-- ============================================

-- 1. FUNCIÓN: Crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    -- Si es el primer usuario, hacerlo ROOT, si no, USER
    CASE WHEN (SELECT COUNT(*) FROM public.user_profiles) = 0 THEN 'ROOT' ELSE 'USER' END
  );
  
  -- user_settings solo necesita user_id (las columnas se crean automáticamente)
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. TRIGGER: Ejecutar la función cuando se crea un usuario nuevo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Ver si el trigger está activo:
SELECT 
  tgname AS trigger_name,
  tgenabled AS is_enabled
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- Ver funciones:
SELECT 
  proname AS function_name,
  prosecdef AS is_security_definer
FROM pg_proc
WHERE proname = 'handle_new_user';

-- ============================================
-- ARREGLAR USUARIOS EXISTENTES (si hay alguno sin perfil)
-- ============================================

-- Insertar perfiles faltantes para usuarios que ya existen
INSERT INTO public.user_profiles (user_id, email, role)
SELECT 
  au.id,
  au.email,
  'USER' AS role
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.user_id
WHERE up.user_id IS NULL;

-- Insertar settings faltantes
INSERT INTO public.user_settings (user_id)
SELECT 
  au.id
FROM auth.users au
LEFT JOIN public.user_settings us ON au.id = us.user_id
WHERE us.user_id IS NULL;

-- ============================================
-- TEST (opcional)
-- ============================================

-- Ver cuántos usuarios tienen perfil:
SELECT 
  COUNT(DISTINCT au.id) AS total_users,
  COUNT(DISTINCT up.user_id) AS users_with_profile,
  COUNT(DISTINCT us.user_id) AS users_with_settings
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.user_id
LEFT JOIN public.user_settings us ON au.id = us.user_id;

-- ============================================
-- RESULTADO ESPERADO:
-- ============================================
-- ✅ Trigger creado correctamente
-- ✅ Función handle_new_user() activa con SECURITY DEFINER
-- ✅ Usuarios existentes sin perfil ahora tienen uno
-- ✅ Próximos registros crearán perfil automáticamente

-- ============================================
-- DESPUÉS DE EJECUTAR:
-- ============================================
-- 1. Pedirle al CEO que vuelva a intentar el registro
-- 2. Si ya se registró pero falló, buscar su email en auth.users
--    y ejecutar manualmente:
--    
--    INSERT INTO public.user_profiles (user_id, email, role)
--    VALUES ('[UUID_DEL_CEO]', '[EMAIL_DEL_CEO]', 'ROOT');
--    
--    INSERT INTO public.user_settings (user_id)
--    VALUES ('[UUID_DEL_CEO]');
