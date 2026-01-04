-- =====================================================
-- FIX: Actualizar contraseñas de email (texto plano)
-- El backend las cifrará automáticamente al hacer sync
-- =====================================================

-- IMPORTANTE: Reemplaza 'TU_PASSWORD_SMTP' y 'TU_PASSWORD_IMAP' 
-- con tus contraseñas REALES antes de ejecutar

-- Para la cuenta: p.garibay@infinitykode.com
UPDATE email_accounts
SET 
  smtp_pass_enc = 'TU_PASSWORD_SMTP_AQUI',
  imap_pass_enc = 'TU_PASSWORD_IMAP_AQUI',
  updated_at = NOW()
WHERE 
  from_email = 'p.garibay@infinitykode.com'
  AND owner_user_id = 'a56e5204-7ff5-47fc-814b-b52e5c6af5d6';

-- Verificar que se actualizó
SELECT 
  id,
  from_email,
  smtp_host,
  smtp_user,
  LENGTH(smtp_pass_enc) as smtp_pass_length,
  imap_host,
  imap_user,
  LENGTH(imap_pass_enc) as imap_pass_length,
  updated_at
FROM email_accounts
WHERE from_email = 'p.garibay@infinitykode.com';

-- =====================================================
-- ALTERNATIVA: Eliminar cuenta corrupta y crear nueva
-- =====================================================

-- 1. Eliminar cuenta corrupta
DELETE FROM email_accounts
WHERE from_email = 'p.garibay@infinitykode.com'
  AND owner_user_id = 'a56e5204-7ff5-47fc-814b-b52e5c6af5d6';

-- 2. Ahora ve a la UI y crea la cuenta de nuevo
--    Las contraseñas se cifrarán correctamente desde el inicio
