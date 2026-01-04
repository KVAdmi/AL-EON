-- =====================================================
-- FIX PERMANENTE: Trigger automático para TODOS los usuarios
-- =====================================================

-- 1. ELIMINAR triggers viejos que puedan estar fallando
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. CREAR función que crea perfil automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insertar perfil automáticamente cuando se crea usuario
  INSERT INTO public.user_profiles (
    user_id,
    email,
    display_name,
    avatar_url,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    NOW(),
    NOW()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log el error pero NO fallar el signup
    RAISE WARNING 'Error creando perfil para usuario %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. CREAR trigger que se dispara DESPUÉS de crear usuario en auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. VERIFICAR que la tabla user_profiles existe
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. HABILITAR RLS en user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 6. POLÍTICAS RLS correctas
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;

-- SELECT: Ver su propio perfil
CREATE POLICY "Users can view their own profile"
ON public.user_profiles FOR SELECT
USING (auth.uid() = user_id);

-- UPDATE: Actualizar su propio perfil
CREATE POLICY "Users can update their own profile"
ON public.user_profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- INSERT: El trigger lo hace, pero por si acaso
CREATE POLICY "Users can insert their own profile"
ON public.user_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 7. ÍNDICES para performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);

-- 8. VERIFICAR que todo está correcto
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 9. PROBAR con usuario de prueba (EJECUTAR SOLO PARA TESTING)
-- DO $$
-- DECLARE
--   test_user_id UUID := gen_random_uuid();
-- BEGIN
--   -- Simular inserción en auth.users
--   INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
--   VALUES (
--     test_user_id,
--     'test@example.com',
--     crypt('testpass', gen_salt('bf')),
--     NOW(),
--     '{"display_name": "Test User"}'::jsonb
--   );
--   
--   -- Verificar que se creó el perfil
--   IF EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = test_user_id) THEN
--     RAISE NOTICE '✅ Trigger funcionando correctamente';
--   ELSE
--     RAISE EXCEPTION '❌ Trigger NO funcionó';
--   END IF;
--   
--   -- Limpiar
--   DELETE FROM auth.users WHERE id = test_user_id;
-- END $$;

-- =====================================================
-- RESULTADO ESPERADO:
-- Ahora TODOS los usuarios nuevos tendrán perfil creado
-- automáticamente sin necesidad de código manual
-- =====================================================
