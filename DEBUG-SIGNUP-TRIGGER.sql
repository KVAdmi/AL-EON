-- =====================================================
-- DEBUG: Ver por qué el trigger no funciona
-- =====================================================

-- 1. Verificar si el trigger existe
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 2. Ver si la función existe
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'handle_new_user';

-- 3. Ver estructura de user_profiles
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles';

-- 4. Ver políticas RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_profiles';

-- 5. Intentar crear un usuario manualmente para ver el error
DO $$
DECLARE
  new_user_id UUID := gen_random_uuid();
  new_email TEXT := 'test_' || floor(random() * 1000)::text || '@test.com';
BEGIN
  -- Simular lo que hace Supabase Auth
  RAISE NOTICE 'Creando usuario de prueba: %', new_email;
  
  -- Llamar directamente a la función del trigger
  BEGIN
    INSERT INTO public.user_profiles (
      user_id,
      email,
      display_name,
      avatar_url,
      created_at,
      updated_at
    )
    VALUES (
      new_user_id,
      new_email,
      split_part(new_email, '@', 1),
      NULL,
      NOW(),
      NOW()
    );
    RAISE NOTICE '✅ Perfil creado exitosamente';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ ERROR: % - %', SQLERRM, SQLSTATE;
  END;
  
  -- Limpiar
  DELETE FROM public.user_profiles WHERE user_id = new_user_id;
  RAISE NOTICE 'Limpieza completada';
END $$;

-- =====================================================
-- EJECUTAR ESTO Y COMPARTIR LOS RESULTADOS
-- =====================================================
