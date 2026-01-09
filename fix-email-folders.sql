-- 🔧 SCRIPT PARA REASIGNAR CORREOS A FOLDERS CORRECTOS
-- Ejecutar en Supabase SQL Editor

-- PASO 1: Ver estado actual
SELECT 
  ef.folder_type,
  COUNT(em.id) as total_correos
FROM email_folders ef
LEFT JOIN email_messages em ON em.folder_id = ef.id
WHERE ef.account_id IN (SELECT id FROM email_accounts LIMIT 1)
GROUP BY ef.folder_type
ORDER BY ef.folder_type;

-- PASO 2: Identificar correos enviados (tienen from_address = cuenta del usuario)
-- Primero obtener el email de la cuenta activa
DO $$
DECLARE
  v_account_id UUID;
  v_account_email TEXT;
  v_sent_folder_id UUID;
  v_inbox_folder_id UUID;
BEGIN
  -- Obtener primera cuenta activa
  SELECT id, from_email INTO v_account_id, v_account_email
  FROM email_accounts
  WHERE is_active = true
  LIMIT 1;
  
  RAISE NOTICE 'Cuenta: % (%)', v_account_email, v_account_id;
  
  -- Obtener folder_id de "Sent"
  SELECT id INTO v_sent_folder_id
  FROM email_folders
  WHERE account_id = v_account_id
    AND folder_type = 'Sent'
  LIMIT 1;
  
  -- Obtener folder_id de "Inbox"
  SELECT id INTO v_inbox_folder_id
  FROM email_folders
  WHERE account_id = v_account_id
    AND folder_type = 'Inbox'
  LIMIT 1;
  
  RAISE NOTICE 'Sent folder: %', v_sent_folder_id;
  RAISE NOTICE 'Inbox folder: %', v_inbox_folder_id;
  
  -- MOVER correos enviados (from = cuenta) a Sent
  UPDATE email_messages
  SET folder_id = v_sent_folder_id
  WHERE account_id = v_account_id
    AND from_address ILIKE '%' || v_account_email || '%'
    AND folder_id != v_sent_folder_id;
  
  RAISE NOTICE 'Correos movidos a Sent: %', (SELECT COUNT(*) FROM email_messages WHERE folder_id = v_sent_folder_id);
  
  -- MOVER correos recibidos (from != cuenta) a Inbox
  UPDATE email_messages
  SET folder_id = v_inbox_folder_id
  WHERE account_id = v_account_id
    AND from_address NOT ILIKE '%' || v_account_email || '%'
    AND folder_id != v_inbox_folder_id;
  
  RAISE NOTICE 'Correos movidos a Inbox: %', (SELECT COUNT(*) FROM email_messages WHERE folder_id = v_inbox_folder_id);
END $$;

-- PASO 3: Verificar resultado
SELECT 
  ef.folder_type,
  COUNT(em.id) as total_correos,
  STRING_AGG(DISTINCT em.from_address, ', ') as ejemplos_remitentes
FROM email_folders ef
LEFT JOIN email_messages em ON em.folder_id = ef.id
WHERE ef.account_id IN (SELECT id FROM email_accounts WHERE is_active = true LIMIT 1)
GROUP BY ef.folder_type
ORDER BY ef.folder_type;
