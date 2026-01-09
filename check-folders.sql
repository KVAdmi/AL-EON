-- Ver distribución de correos por folder
SELECT 
  ef.folder_type,
  ef.folder_name,
  COUNT(em.id) as total_correos
FROM email_folders ef
LEFT JOIN email_messages em ON em.folder_id = ef.id
WHERE ef.account_id = (SELECT id FROM email_accounts LIMIT 1)
GROUP BY ef.id, ef.folder_type, ef.folder_name
ORDER BY ef.folder_type;

-- Ver últimos 5 correos con su folder
SELECT 
  em.subject,
  em.from_address,
  ef.folder_type,
  ef.folder_name,
  em.created_at
FROM email_messages em
LEFT JOIN email_folders ef ON em.folder_id = ef.id
ORDER BY em.created_at DESC
LIMIT 5;
