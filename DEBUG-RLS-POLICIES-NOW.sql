-- ============================================
-- DEBUG: Ver políticas RLS ACTUALES
-- ============================================

-- 1. Ver TODAS las policies de user_projects
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as "USING condition",
  with_check as "WITH CHECK condition"
FROM pg_policies
WHERE tablename = 'user_projects'
ORDER BY policyname;

-- 2. Ver TODAS las policies de project_members
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as "USING condition",
  with_check as "WITH CHECK condition"
FROM pg_policies
WHERE tablename = 'project_members'
ORDER BY policyname;

-- 3. Verificar si RLS está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE tablename IN ('user_projects', 'project_members');

-- 4. Test con tu usuario actual
SELECT 
  'TEST: Proyectos visibles para ti' as test,
  COUNT(*) as total
FROM user_projects 
WHERE user_id = auth.uid();

-- 5. Ver TODOS los proyectos SIN RLS (desde función de servicio)
-- NOTA: Esto solo funciona si tienes permisos de servicio
