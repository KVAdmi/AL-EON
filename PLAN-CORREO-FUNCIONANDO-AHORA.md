# ✅ CORREO FUNCIONANDO - PLAN DE ACCIÓN INMEDIATO

**Fecha:** 9 de enero 2026, 15:36  
**Status:** 🟡 Parcialmente arreglado - NECESITAS EJECUTAR 1 SCRIPT SQL

---

## ✅ LO QUE YA ARREGLÉ (Commit 4945cb8):

### 1. **HTML crudo al responder** - ✅ RESUELTO
**Antes:** Mostraba `<br/><strong>De:</strong>...`  
**Ahora:** Texto limpio con formato:
```
---
De: Luis Atristain
Fecha: 9/1/2026, 3:04:52 p.m.

[contenido original]
```

**Cambio:** `EmailComposer.jsx` líneas 74-95

---

### 2. **Error CORS del backend** - ✅ BYPASSED
**Antes:** "Failed to fetch" en consola  
**Ahora:** Lee directo de Supabase, ignora backend

**Cambio:** `EmailInbox.jsx` líneas 26-32 - Eliminé `try/catch` del backend

---

### 3. **Filtro de folders funciona correctamente** - ✅ CÓDIGO CORRECTO
El código de filtrado está bien:
- Obtiene `folder_id` del folder deseado
- Filtra mensajes por ese `folder_id`
- **PERO** los correos en DB tienen `folder_id` INCORRECTO

---

## 🔴 LO QUE TÚ NECESITAS HACER AHORA (5 minutos):

### **PASO 1: Ir a Supabase SQL Editor**
1. Abrir https://supabase.com/dashboard/project/[TU_PROJECT]/editor
2. Crear nueva query

### **PASO 2: Copiar y ejecutar este script**

```sql
-- 🔧 REASIGNAR CORREOS A FOLDERS CORRECTOS
DO $$
DECLARE
  v_account_id UUID;
  v_account_email TEXT;
  v_sent_folder_id UUID;
  v_inbox_folder_id UUID;
  v_moved_to_sent INT;
  v_moved_to_inbox INT;
BEGIN
  -- Obtener primera cuenta activa
  SELECT id, from_email INTO v_account_id, v_account_email
  FROM email_accounts
  WHERE is_active = true
  LIMIT 1;
  
  RAISE NOTICE 'Procesando cuenta: % (%)', v_account_email, v_account_id;
  
  -- Obtener folder_id de "Sent"
  SELECT id INTO v_sent_folder_id
  FROM email_folders
  WHERE account_id = v_account_id AND folder_type = 'Sent'
  LIMIT 1;
  
  -- Obtener folder_id de "Inbox"
  SELECT id INTO v_inbox_folder_id
  FROM email_folders
  WHERE account_id = v_account_id AND folder_type = 'Inbox'
  LIMIT 1;
  
  IF v_sent_folder_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró folder Sent para cuenta %', v_account_email;
  END IF;
  
  IF v_inbox_folder_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró folder Inbox para cuenta %', v_account_email;
  END IF;
  
  -- MOVER correos ENVIADOS (from = email de la cuenta) a Sent
  WITH updated AS (
    UPDATE email_messages
    SET folder_id = v_sent_folder_id,
        updated_at = NOW()
    WHERE account_id = v_account_id
      AND (
        from_address = v_account_email 
        OR from_address ILIKE v_account_email
        OR from_address ILIKE '%' || SPLIT_PART(v_account_email, '@', 1) || '%'
      )
      AND folder_id != v_sent_folder_id
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_moved_to_sent FROM updated;
  
  -- MOVER correos RECIBIDOS (from != email de la cuenta) a Inbox  
  WITH updated AS (
    UPDATE email_messages
    SET folder_id = v_inbox_folder_id,
        updated_at = NOW()
    WHERE account_id = v_account_id
      AND from_address NOT ILIKE '%' || SPLIT_PART(v_account_email, '@', 1) || '%'
      AND folder_id != v_inbox_folder_id
      AND folder_id != v_sent_folder_id
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_moved_to_inbox FROM updated;
  
  RAISE NOTICE '✅ Correos movidos a Sent: %', v_moved_to_sent;
  RAISE NOTICE '✅ Correos movidos a Inbox: %', v_moved_to_inbox;
  
END $$;

-- Verificar resultado
SELECT 
  ef.folder_type,
  COUNT(em.id) as total_correos
FROM email_folders ef
LEFT JOIN email_messages em ON em.folder_id = ef.id
WHERE ef.account_id = (SELECT id FROM email_accounts WHERE is_active = true LIMIT 1)
GROUP BY ef.folder_type
ORDER BY ef.folder_type;
```

### **PASO 3: Verificar resultado**
Deberías ver algo como:
```
 folder_type | total_correos 
-------------+---------------
 Drafts      |             0
 Inbox       |            12
 Sent        |             5
 Spam        |             0
 Trash       |             0
```

### **PASO 4: Refrescar app**
1. Ir a https://al-eon.com/correo
2. Hard refresh (Cmd+Shift+R)
3. Click "Enviados" → Debería mostrar SOLO correos enviados
4. Click "Bandeja de entrada" → Debería mostrar SOLO correos recibidos

---

## 🧪 PRUEBAS DESPUÉS DEL SCRIPT:

### Test 1: Filtros funcionan
- ✅ "Bandeja de entrada" muestra solo recibidos
- ✅ "Enviados" muestra solo enviados
- ✅ No hay duplicados entre carpetas

### Test 2: Responder correo
- ✅ Click "Responder a todos"
- ✅ Composer muestra texto limpio (NO `<br/><strong>`)
- ✅ Se ve formato legible
- ✅ Enviar funciona sin error rojo

### Test 3: Enviar nuevo correo
- ✅ Aparece en "Enviados"
- ✅ NO aparece en "Bandeja de entrada"

---

## 📊 LOGS ESPERADOS (Browser Console):

```
[EmailInbox] 📬 Cargando mensajes para: { accountId: "...", folder: "sent" }
[EmailInbox] 🔍 FILTRO APLICADO: folder UI="sent" → DB folder_type="Sent"
[EmailInbox] ✅ Folder encontrado: id=abc-123-def
[EmailInbox] 🔍 Filtrando por folder_id: abc-123-def
[EmailInbox] 📊 RESULTADO: 5 mensajes
[EmailInbox] 📋 Folders únicos en resultado: Sent
[EmailInbox] ✅ FILTRO OK: Todos los mensajes son de "Sent"
```

---

## 🔥 SI EL SCRIPT SQL FALLA:

Ejecuta esto para ver qué correos tienes:

```sql
SELECT 
  em.id,
  em.subject,
  em.from_address,
  ef.folder_type,
  ea.from_email as cuenta_email
FROM email_messages em
LEFT JOIN email_folders ef ON em.folder_id = ef.id
LEFT JOIN email_accounts ea ON em.account_id = ea.id
ORDER BY em.created_at DESC
LIMIT 20;
```

Mándame el resultado y te ayudo.

---

## 📁 ARCHIVOS MODIFICADOS:

- ✅ `src/features/email/components/EmailComposer.jsx` - Texto limpio al responder
- ✅ `src/features/email/components/EmailInbox.jsx` - Bypass backend CORS
- 📄 `fix-email-folders.sql` - Script SQL para reasignar folders

---

## ⏱️ TIEMPO TOTAL:

- **Frontend:** ✅ Listo (auto-deploy Netlify en ~2 min)
- **Base de datos:** ⏳ 5 minutos (ejecutar script SQL)

---

**Commit:** `4945cb8`  
**Deploy:** ✅ En progreso (Netlify)  
**Badge:** v15:36 🟡 (amarillo = esperando script SQL)

---

## 💬 SIGUIENTE PASO:

**TÚ:** Ejecuta el script SQL en Supabase  
**YO:** Verifico que todo funcione después

¡VAMOS! 🚀
