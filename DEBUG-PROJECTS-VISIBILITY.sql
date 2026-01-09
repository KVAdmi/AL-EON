-- ============================================
-- DEBUG: Ver proyectos y por qué no aparecen
-- ============================================

-- 1. Ver TODOS los proyectos (ignorando RLS)
SELECT 
  id,
  user_id,
  name,
  icon,
  is_archived,
  created_at
FROM user_projects
ORDER BY created_at DESC;

-- 2. Ver políticas RLS actuales
SELECT 
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'user_projects';

-- 3. Probar query como usuario autenticado
-- (Esto simula lo que hace el frontend)
-- Reemplaza 'TU_USER_ID' con tu ID real
-- SELECT * FROM user_projects WHERE user_id = 'TU_USER_ID';
