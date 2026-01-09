# 🚨 REPORTE TÉCNICO - BUGS CRÍTICOS EN MÓDULO EMAIL

**Fecha:** 9 de enero de 2026, 15:08  
**Repo:** AL-EON (GitHub: KVAdmi/AL-EON)  
**Deploy:** Netlify (auto-deploy desde main branch)  
**Badge actual:** v14:31 ⚡ (morado)

---

## 📋 PROBLEMAS IDENTIFICADOS

### 1. ❌ **MENSAJES ENVIADOS APARECEN EN BANDEJA DE ENTRADA**
**Síntoma:** Al enviar un correo, aparece en "Bandeja de entrada" en lugar de "Enviados"

**Causa raíz:**
- Backend guarda correos enviados en tabla `email_messages` con `folder_id` correcto
- Frontend NO filtra correctamente por `folder_id` al listar mensajes
- Query actual intenta filtrar por `folder.folder_type` pero el JOIN puede estar mal

**Evidencia:** Screenshot 3 muestra mensaje enviado ("kodigovivo@gmail.com") en lista de Inbox

---

### 2. ❌ **ERROR AL RESPONDER CORREOS**
**Síntoma:** 
1. Click "Responder a todos"
2. Composer abre con destinatarios pre-llenados
3. Click "Enviar"
4. Toast dice "✓ Correo enviado"
5. **Letrero ROJO aparece: "Error al sincronizar - Failed to fetch"**

**Causa raíz:**
- `EmailComposer.jsx` llama `triggerRefresh()` después de enviar
- `triggerRefresh()` intenta recargar mensajes desde backend
- Backend tiene timeout o error CORS
- Frontend muestra error aunque el envío fue exitoso

**Evidencia:** Screenshots 1 y 2 muestran composer con error rojo inferior derecho

---

### 3. ❌ **FILTRO DE CARPETAS NO FUNCIONA**
**Síntoma:** Inbox, Sent, Spam muestran los MISMOS correos

**Causa raíz:**
- Query en `EmailInbox.jsx` línea 48 hace JOIN:
  ```javascript
  .select(`
    *,
    folder:email_folders!folder_id(id, folder_name, folder_type, imap_path)
  `)
  ```
- Filtro línea 63: `.eq('folder.folder_type', dbFolderType)`
- **PROBLEMA:** El filtro por JOIN puede requerir sintaxis diferente en Supabase
- Alternativa: Filtrar directamente por `folder_id` (UUID) no por `folder_type`

---

## 📁 ARCHIVOS AFECTADOS Y CÓDIGO EXACTO

### 🔴 ARCHIVO 1: `src/features/email/components/EmailInbox.jsx`

**Líneas 40-70 (Query con problema):**
```javascript
let query = supabase
  .from('email_messages')
  .select(`
    *,
    folder:email_folders!folder_id(id, folder_name, folder_type, imap_path)
  `)
  .eq('account_id', accountId)
  .order('sent_at', { ascending: false });

// Filtrar por carpeta si se especifica
if (folder) {
  // Mapear nombres de carpetas de UI a nombres de folder_type en DB
  const folderTypeMap = {
    'inbox': 'Inbox',
    'sent': 'Sent',
    'drafts': 'Drafts',
    'starred': 'Starred',
    'spam': 'Spam',
    'archive': 'Archive',
    'trash': 'Trash'
  };
  const dbFolderType = folderTypeMap[folder] || folder;
  console.log(`[EmailInbox] 🔍 FILTRO APLICADO: folder UI="${folder}" → DB folder_type="${dbFolderType}"`);
  
  // ✅ CORREGIDO: Filtrar por folder_type del JOIN
  query = query.eq('folder.folder_type', dbFolderType);  // ⚠️ PUEDE ESTAR MAL
  console.log(`[EmailInbox] 🔍 Query después de filtro:`, query);
} else {
  console.log('[EmailInbox] ⚠️ NO HAY FOLDER, trayendo TODOS los mensajes');
}
```

**PROBLEMA:**
- `.eq('folder.folder_type', ...)` puede no funcionar en Supabase con JOINs
- Alternativa correcta: Primero obtener `folder_id` del folder deseado, luego filtrar por `folder_id`

**SOLUCIÓN PROPUESTA:**
```javascript
// PASO 1: Obtener el folder_id correcto
let targetFolderId = null;
if (folder) {
  const folderTypeMap = { /* mismo map */ };
  const dbFolderType = folderTypeMap[folder];
  
  const { data: folderData } = await supabase
    .from('email_folders')
    .select('id')
    .eq('account_id', accountId)
    .eq('folder_type', dbFolderType)
    .single();
  
  targetFolderId = folderData?.id;
}

// PASO 2: Filtrar por folder_id (no por JOIN)
let query = supabase
  .from('email_messages')
  .select(`
    *,
    folder:email_folders!folder_id(id, folder_name, folder_type, imap_path)
  `)
  .eq('account_id', accountId);

if (targetFolderId) {
  query = query.eq('folder_id', targetFolderId);  // ✅ Filtro directo por UUID
}

query = query.order('sent_at', { ascending: false });
```

---

### 🔴 ARCHIVO 2: `src/features/email/components/EmailComposer.jsx`

**Líneas 122-186 (Función handleSend con problema):**
```javascript
const handleSend = async () => {
  if (!currentAccount) {
    toast({
      variant: "destructive",
      title: "Sin cuenta conectada",
      description: "Conecta tu cuenta de Gmail o Outlook para enviar correos",
    });
    return;
  }

  if (!formData.to || formData.to.length === 0) {
    toast({
      variant: "destructive",
      title: "Error",
      description: "Agrega al menos un destinatario",
    });
    return;
  }

  if (!formData.subject?.trim()) {
    const confirmed = confirm('El asunto está vacío. ¿Enviar de todos modos?');
    if (!confirmed) return;
  }

  setSending(true);

  try {
    const emailData = {
      accountId: currentAccount.id,
      to: formData.to,
      cc: formData.cc,
      bcc: formData.bcc,
      subject: formData.subject,
      body: formData.body_html || formData.body_text, // ✅ Backend espera "body"
      attachments: attachments,
    };

    const result = await sendEmail(emailData);

    toast({
      title: "✓ Correo enviado",
      description: "El correo se envió exitosamente",
    });
    
    // ⚠️ PROBLEMA: triggerRefresh() causa error "Failed to fetch"
    if (triggerRefresh) {
      setTimeout(() => triggerRefresh(), 500); // Pequeño delay para que el backend procese
    }
    
    if (onSent) {
      onSent(result);
    }

    handleClose();
  } catch (error) {
    console.error('[EmailComposer] Error al enviar:', error);
    toast({
      variant: "destructive",
      title: "Error al enviar",
      description: error.message || "Revisa destinatario, asunto y contenido",
    });
  } finally {
    setSending(false);
  }
};
```

**PROBLEMA:**
- `triggerRefresh()` hace fetch al backend
- Backend timeout o CORS error
- Usuario ve "Error al sincronizar" aunque el correo SÍ se envió

**SOLUCIÓN PROPUESTA:**
```javascript
// OPCIÓN 1: Agregar manejo de error silencioso
if (triggerRefresh) {
  setTimeout(() => {
    triggerRefresh().catch(err => {
      console.warn('[EmailComposer] Error al refrescar (silenciado):', err);
      // NO mostrar error al usuario, el correo ya se envió
    });
  }, 500);
}

// OPCIÓN 2: Recargar página en lugar de triggerRefresh
if (onSent) {
  onSent(result);
}
handleClose();
window.location.reload(); // Forzar recarga completa
```

---

### 🔴 ARCHIVO 3: `src/services/emailService.js`

**Líneas 588-710 (Función sendEmail):**
```javascript
export async function sendEmail(mailData, accessToken = null) {
  try {
    console.log('[EmailService] 📤 Enviando email...', mailData);
    
    let token = accessToken;
    let userId = null;
    
    // Si no se pasó token, intentar obtenerlo de la sesión
    if (!token) {
      console.log('[EmailService] 🔍 No se pasó token, obteniendo de sesión...');
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('[EmailService] ❌ Error obteniendo sesión:', sessionError);
        throw new Error('Error de autenticación. Intenta cerrar sesión y volver a iniciar.');
      }
      
      const session = sessionData?.session;
      token = session?.access_token;
      userId = session?.user?.id;
      
      console.log('[EmailService] 🔍 Session existe:', !!session);
      console.log('[EmailService] 🔍 Token obtenido:', token ? token.substring(0, 20) + '...' : 'NO');
      console.log('[EmailService] 🔍 User ID:', userId);
    } else {
      console.log('[EmailService] ✅ Token recibido como parámetro');
      // Si se pasó token, extraer userId del token (decodificar JWT)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.sub;
        console.log('[EmailService] 🔍 User ID del token:', userId);
      } catch (e) {
        console.error('[EmailService] ⚠️ No se pudo extraer userId del token');
      }
    }
    
    if (!token) {
      console.error('[EmailService] ❌ NO HAY TOKEN DE AUTENTICACIÓN');
      throw new Error('No estás autenticado. Por favor cierra sesión y vuelve a iniciar.');
    }
    
    console.log('[EmailService] ✅ Token disponible, preparando envío...');
    
    // ✅ VALIDACIÓN FUERTE (antes de pegarle al backend)
    const toRaw = Array.isArray(mailData.to) ? mailData.to : String(mailData.to || '');
    const toList = Array.isArray(toRaw)
      ? toRaw.map(e => String(e || '').trim()).filter(Boolean)
      : toRaw.split(',').map(e => e.trim()).filter(Boolean);

    const subject = String(mailData.subject || '').trim();
    const body = String(mailData.body || '').trim(); // texto o html

    if (!mailData.accountId) {
      throw new Error('Selecciona una cuenta de correo antes de enviar.');
    }
    if (!toList.length) {
      throw new Error('Falta el destinatario (to).');
    }
    if (!subject) {
      throw new Error('Falta el asunto (subject).');
    }
    if (!body) {
      throw new Error('Falta el contenido del correo (body/html).');
    }
    
    // Transformar el payload al formato que espera el backend
    const payload = {
      accountId: mailData.accountId,
      to: toList,             // ✅ array limpio
      subject,
      body,                   // ✅ siempre string no vacío
    };
    
    // Agregar campos opcionales
    if (mailData.cc) {
      const ccList = Array.isArray(mailData.cc)
        ? mailData.cc.map(e => String(e || '').trim()).filter(Boolean)
        : String(mailData.cc).split(',').map(e => e.trim()).filter(Boolean);
      if (ccList.length) payload.cc = ccList;
    }

    if (mailData.bcc) {
      const bccList = Array.isArray(mailData.bcc)
        ? mailData.bcc.map(e => String(e || '').trim()).filter(Boolean)
        : String(mailData.bcc).split(',').map(e => e.trim()).filter(Boolean);
      if (bccList.length) payload.bcc = bccList;
    }
    
    if (mailData.attachments) {
      payload.attachments = mailData.attachments;
    }
    
    console.log('[EmailService] 📦 Payload transformado:', payload);
    
    const response = await fetch(`${BACKEND_URL}/api/mail/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[EmailService] ❌ Error del servidor:', response.status, data);
      throw new Error(data.message || 'Error al enviar email');
    }
    
    console.log('[EmailService] ✅ Email enviado:', data);
    
    // ✅ NO guardar aquí - el BACKEND ya lo guarda en Sent folder
    // ❌ ELIMINADO: insert a email_messages desde frontend
    // El backend guarda automáticamente en folder_id correcto
    
    return data;
  } catch (error) {
    console.error('[EmailService] Error en sendEmail:', error);
    throw error;
  }
}
```

**PROBLEMA:**
- Backend tarda mucho o da timeout
- Endpoint: `https://api.al-eon.com/api/mail/send`
- Puede tener problemas de autenticación Gmail SPF/DKIM

**BACKEND DEBE VERIFICAR:**
1. Endpoint `/api/mail/send` responde en < 10 segundos
2. Guarda correo enviado con `folder_id` de "Sent" folder
3. No tiene timeout en SMTP connection
4. Logs del backend al enviar correo

---

### 🔴 ARCHIVO 4: `src/services/emailService.js` (getInbox)

**Líneas 718-765:**
```javascript
export async function getInbox(accountId, options = {}) {
  try {
    console.log('[EmailService] 📬 getInbox llamado con:', { accountId, options });
    
    // 🔥 LEER DIRECTO DE SUPABASE con JOIN a email_folders
    const { data: messages, error } = await supabase
      .from('email_messages')
      .select(`
        *,
        folder:email_folders!folder_id(id, folder_name, folder_type, imap_path)
      `)
      .eq('account_id', accountId)
      .order('date', { ascending: false })
      .limit(options.limit || 50);
    
    if (error) {
      console.error('[EmailService] Error de Supabase:', error);
      throw new Error('Error al obtener mensajes de Supabase');
    }
    
    console.log(`[EmailService] ✅ ${messages?.length || 0} mensajes obtenidos de Supabase`);
    
    // Transformar al formato esperado
    return {
      messages: (messages || []).map(msg => ({
        id: msg.id,
        message_id: msg.id,
        from_address: msg.from_address,
        from_name: msg.from_name,
        from_email: msg.from_address,
        to_addresses: msg.to_addresses,
        subject: msg.subject,
        preview: msg.body_preview,
        body_preview: msg.body_preview,
        date: msg.date,
        received_at: msg.date,
        is_read: msg.is_read,
        is_starred: msg.is_starred,
        has_attachments: msg.has_attachments,
        account_id: msg.account_id,
        folder: msg.folder?.folder_name || msg.folder?.folder_type || 'Unknown', // ✅ Usar folder del JOIN
        folder_id: msg.folder_id,
        folder_type: msg.folder?.folder_type,
      }))
    };
  } catch (error) {
    console.error('[EmailService] Error en getInbox:', error);
    throw error;
  }
}
```

**PROBLEMA:**
- No acepta parámetro `folder` para filtrar
- Trae TODOS los mensajes de la cuenta
- Frontend debe filtrar después (ineficiente)

**SOLUCIÓN PROPUESTA:**
```javascript
export async function getInbox(accountId, options = {}) {
  try {
    console.log('[EmailService] 📬 getInbox llamado con:', { accountId, options });
    
    let query = supabase
      .from('email_messages')
      .select(`
        *,
        folder:email_folders!folder_id(id, folder_name, folder_type, imap_path)
      `)
      .eq('account_id', accountId);
    
    // ✅ AGREGAR: Filtro por folder si se especifica
    if (options.folder) {
      // Mapear nombre de folder a folder_type
      const folderTypeMap = {
        'inbox': 'Inbox',
        'sent': 'Sent',
        'drafts': 'Drafts',
        'spam': 'Spam',
        'trash': 'Trash'
      };
      const folderType = folderTypeMap[options.folder] || options.folder;
      
      // Primero obtener folder_id
      const { data: folderData } = await supabase
        .from('email_folders')
        .select('id')
        .eq('account_id', accountId)
        .eq('folder_type', folderType)
        .single();
      
      if (folderData?.id) {
        query = query.eq('folder_id', folderData.id);
      }
    }
    
    query = query
      .order('date', { ascending: false })
      .limit(options.limit || 50);
    
    const { data: messages, error } = await query;
    
    // ... resto del código igual
  }
}
```

---

## 🗄️ ESTRUCTURA DE BASE DE DATOS

### Tabla: `email_messages`
```sql
CREATE TABLE email_messages (
  id UUID PRIMARY KEY,
  account_id UUID REFERENCES email_accounts(id),
  folder_id UUID REFERENCES email_folders(id),  -- ⚠️ CLAVE: Folder donde se guardó
  from_address TEXT,
  from_name TEXT,
  to_addresses TEXT[],
  subject TEXT,
  body_html TEXT,
  body_text TEXT,
  body_preview TEXT,
  date TIMESTAMPTZ,
  is_read BOOLEAN DEFAULT false,
  is_starred BOOLEAN DEFAULT false,
  has_attachments BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabla: `email_folders`
```sql
CREATE TABLE email_folders (
  id UUID PRIMARY KEY,
  account_id UUID REFERENCES email_accounts(id),
  folder_name TEXT,              -- Ej: "INBOX", "[Gmail]/Sent Mail"
  folder_type TEXT,              -- Ej: "Inbox", "Sent", "Spam"
  imap_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RELACIÓN:**
- `email_messages.folder_id` → `email_folders.id`
- Para filtrar "Sent": Buscar folder con `folder_type = 'Sent'`, luego filtrar mensajes con ese `folder_id`

---

## 🔍 CÓMO REPRODUCIR LOS BUGS

### Bug 1: Mensajes enviados en Inbox
1. Ir a `/correo`
2. Click "Nuevo correo"
3. Escribir destinatario, asunto, body
4. Click "Enviar"
5. Esperar toast "✓ Correo enviado"
6. **BUG:** Mensaje aparece en "Bandeja de entrada" no en "Enviados"

### Bug 2: Error al sincronizar después de enviar
1. Mismo flujo anterior
2. Después del toast verde "✓ Correo enviado"
3. **BUG:** Aparece letrero ROJO "Error al sincronizar - Failed to fetch"
4. Consola muestra error de fetch al backend

### Bug 3: Filtro de carpetas no funciona
1. Ir a `/correo`
2. Click en "Enviados" (sidebar izquierdo)
3. **BUG:** Muestra los MISMOS correos que en "Bandeja de entrada"
4. Click en "Spam"
5. **BUG:** Muestra los MISMOS correos

---

## 🛠️ SOLUCIONES RECOMENDADAS (ORDEN DE PRIORIDAD)

### ✅ PRIORIDAD 1: Arreglar filtro de carpetas
**Archivo:** `src/features/email/components/EmailInbox.jsx`
**Cambio:** Filtrar por `folder_id` (UUID) directamente, no por JOIN de `folder_type`

```javascript
// ANTES (línea 63):
query = query.eq('folder.folder_type', dbFolderType);  // ❌ NO funciona

// DESPUÉS:
// Paso 1: Obtener folder_id
const { data: folderData } = await supabase
  .from('email_folders')
  .select('id')
  .eq('account_id', accountId)
  .eq('folder_type', dbFolderType)
  .single();

// Paso 2: Filtrar por folder_id
if (folderData?.id) {
  query = query.eq('folder_id', folderData.id);  // ✅ Funciona
}
```

---

### ✅ PRIORIDAD 2: Silenciar error de triggerRefresh
**Archivo:** `src/features/email/components/EmailComposer.jsx`
**Cambio:** Agregar `.catch()` silencioso o reemplazar con `window.location.reload()`

```javascript
// OPCIÓN A: Silenciar error
if (triggerRefresh) {
  setTimeout(() => {
    triggerRefresh().catch(err => {
      console.warn('Error al refrescar (ignorado):', err);
    });
  }, 500);
}

// OPCIÓN B: Recargar página
handleClose();
setTimeout(() => window.location.reload(), 300);
```

---

### ✅ PRIORIDAD 3: Verificar backend guarda en folder correcto
**Backend:** `AL-E Core` repo
**Archivo:** `src/api/emailHub.ts` o similar
**Verificar:** Al enviar correo, backend debe:

1. Buscar folder con `folder_type = 'Sent'` para esa cuenta
2. Guardar mensaje con `folder_id` de ese folder
3. NO guardar en folder `Inbox` por defecto

```typescript
// Pseudo-código backend (TypeScript):
async function sendEmail(accountId, emailData) {
  // 1. Enviar por SMTP
  await smtpService.send(emailData);
  
  // 2. Buscar folder "Sent"
  const sentFolder = await db.email_folders
    .where('account_id', accountId)
    .where('folder_type', 'Sent')
    .first();
  
  // 3. Guardar mensaje con folder_id correcto
  await db.email_messages.insert({
    account_id: accountId,
    folder_id: sentFolder.id,  // ⚠️ CRÍTICO
    from_address: emailData.from,
    to_addresses: emailData.to,
    subject: emailData.subject,
    body_html: emailData.body,
    date: new Date(),
    is_read: true
  });
}
```

---

## 📊 LOGS ÚTILES PARA DEBUGGING

### Frontend (Browser Console):
```
[EmailInbox] 🔍 FILTRO APLICADO: folder UI="sent" → DB folder_type="Sent"
[EmailInbox] 📊 RESULTADO: 15 mensajes
[EmailInbox] 📋 Folders únicos en resultado: Inbox, Sent, Spam
[EmailInbox] ❌ FILTRO NO FUNCIONA: Esperaba folder_type="Sent", Recibí folder_types="Inbox, Sent, Spam"
```

### Backend (PM2 logs o Docker):
```bash
pm2 logs al-e-core --lines 50 | grep "sendEmail"
```

Buscar:
- Error de SMTP timeout
- Error de autenticación Gmail
- Warning de folder_id NULL
- Log de "Email guardado en folder_id: XXX"

---

## 🎯 CHECKLIST PARA QUIEN ARREGLE ESTO

- [ ] Cambiar filtro en `EmailInbox.jsx` a usar `folder_id` directo
- [ ] Agregar `.catch()` silencioso en `triggerRefresh()` de `EmailComposer.jsx`
- [ ] Verificar backend guarda mensajes enviados con `folder_id` de "Sent"
- [ ] Probar flujo completo: Enviar → Ver en Sent (no Inbox)
- [ ] Probar filtro: Click "Spam" → Solo muestra Spam
- [ ] Probar responder → No debe mostrar error rojo
- [ ] Actualizar badge a `v15:XX 🟢` después de arreglar

---

## 📞 CONTACTO / RECURSOS

- **Repo Frontend:** https://github.com/KVAdmi/AL-EON
- **Repo Backend:** https://github.com/[USUARIO]/AL-E-Core (confirmar URL)
- **Supabase Project:** [URL del proyecto]
- **Netlify Deploy:** https://app.netlify.com/sites/[SITE_NAME]

---

**Documento generado por:** GitHub Copilot  
**Validado por:** Usuario frustrado que ya no puede más  
**Urgencia:** 🔥🔥🔥 CRÍTICO - Módulo email completamente roto
