-- ============================================
-- 🔧 FIX SIGNUP - Políticas RLS para user_profiles
-- ============================================
-- Problema: "Database error saving new user"
-- Causa: Faltan políticas RLS para INSERT en user_profiles
-- Solución: Crear políticas que permitan a usuarios crear su perfil

-- 1. Verificar políticas actuales
SELECT 
  schemaname,
  tablename, 
  policyname, 
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY cmd;

-- 2. Eliminar políticas conflictivas si existen
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.user_profiles;

-- 3. Crear políticas CORRECTAS

-- Política para INSERT (crear perfil)
CREATE POLICY "Users can insert their own profile"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Política para SELECT (leer perfil)
CREATE POLICY "Users can view their own profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Política para UPDATE (actualizar perfil)
CREATE POLICY "Users can update their own profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Verificar que RLS está habilitado
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 5. Verificar las políticas creadas
SELECT 
  tablename, 
  policyname, 
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY cmd;

-- ✅ Después de ejecutar esto, intenta crear un usuario de nuevo
