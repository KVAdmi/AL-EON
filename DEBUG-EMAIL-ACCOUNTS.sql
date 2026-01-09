-- ============================================
-- DEBUG: Verificar cuentas de email
-- ============================================

-- 1. Ver TODAS las cuentas (incluyendo inactivas)
SELECT 
  id,
  owner_user_id,
  email_address,
  provider,
  is_active,
  created_at,
  updated_at
FROM email_accounts
ORDER BY created_at DESC;

-- 2. Ver cuentas SOLO activas
SELECT 
  id,
  owner_user_id,
  email_address,
  provider,
  is_active
FROM email_accounts
WHERE is_active = true;

-- 3. Ver cuentas de un usuario específico (reemplaza con tu user_id)
-- SELECT 
--   id,
--   owner_user_id,
--   email_address,
--   provider,
--   is_active
-- FROM email_accounts
-- WHERE owner_user_id = 'TU_USER_ID_AQUI';

-- ============================================
-- FIX: Activar cuenta si está inactiva
-- ============================================

-- Si tu cuenta está con is_active = false, ejecuta esto:
-- UPDATE email_accounts
-- SET is_active = true
-- WHERE email_address = 'p.garibay@infinitykode.com';

-- O activar TODAS las cuentas:
-- UPDATE email_accounts
-- SET is_active = true
-- WHERE is_active = false;
