# 🚀 TAREAS PARA CORE - API MAIL ENDPOINTS

## Endpoints Requeridos

Base URL: `https://api.al-eon.com`

---

### 1. GET `/api/mail/messages`

**Descripción**: Obtener lista de mensajes de correo

**Headers**:
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Query Params**:
- `limit` (opcional): número de mensajes (default: 50)
- `offset` (opcional): offset para paginación (default: 0)
- `status` (opcional): new | read | archived | deleted | spam
- `folder` (opcional): inbox | sent | drafts | spam | trash

**Response Success (200)**:
```json
{
  "success": true,
  "messages": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "account_id": "uuid",
      "source": "ses",
      "message_id": "unique-message-id",
      "from_email": "sender@example.com",
      "from_name": "Sender Name",
      "to_email": "user@al-eon.com",
      "subject": "Subject line",
      "snippet": "Preview of the email...",
      "received_at": "2026-01-03T10:30:00Z",
      "status": "new",
      "folder": "inbox",
      "is_starred": false,
      "flag": "urgent",
      "has_attachments": false,
      "created_at": "2026-01-03T10:30:00Z"
    }
  ],
  "total": 150,
  "hasMore": true
}
```

**Lógica**:
1. Extraer `user_id` del JWT token
2. Query a `mail_messages_new` con filtros
3. Ordenar por `received_at DESC`
4. Aplicar paginación
5. Retornar solo campos necesarios (no body_html completo)

---

### 2. GET `/api/mail/messages/:id`

**Descripción**: Obtener detalle completo de un mensaje

**Headers**:
```
Authorization: Bearer {access_token}
```

**Response Success (200)**:
```json
{
  "success": true,
  "message": {
    "id": "uuid",
    "from_email": "sender@example.com",
    "from_name": "Sender Name",
    "to_email": "user@al-eon.com",
    "subject": "Subject line",
    "body_text": "Plain text body...",
    "body_html": "<html>...</html>",
    "snippet": "Preview...",
    "received_at": "2026-01-03T10:30:00Z",
    "status": "new",
    "folder": "inbox",
    "flag": "urgent",
    "has_attachments": true,
    "attachments_json": [
      {
        "filename": "document.pdf",
        "content_type": "application/pdf",
        "size_bytes": 1024000,
        "download_url": "https://s3.amazonaws.com/..."
      }
    ],
    "raw_headers": {...}
  }
}
```

**Lógica**:
1. Verificar que el mensaje pertenece al usuario (`user_id` del token)
2. Retornar todos los campos incluyendo `body_html`
3. Si `s3_url` existe y `body_html` es null, descargar desde S3

---

### 3. POST `/api/mail/messages/:id/read`

**Descripción**: Marcar mensaje como leído

**Headers**:
```
Authorization: Bearer {access_token}
```

**Response Success (200)**:
```json
{
  "success": true,
  "message": "Message marked as read"
}
```

**Lógica**:
1. Verificar ownership
2. UPDATE `mail_messages_new` SET `status = 'read'` WHERE `id = :id`
3. Actualizar `updated_at`

---

### 4. POST `/api/mail/messages/:id/ai-reply`

**Descripción**: Generar respuesta con IA (AL-E)

**Headers**:
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Body** (opcional):
```json
{
  "tone": "professional",
  "language": "es",
  "includeGreeting": true
}
```

**Response Success (200)**:
```json
{
  "success": true,
  "draft_text": "Estimado/a [nombre],\n\nGracias por tu correo...",
  "message": "Reply generated successfully"
}
```

**Lógica**:
1. Obtener mensaje original (subject, body_text, from_email)
2. Llamar a AL-E Core con prompt:
   ```
   Genera una respuesta profesional al siguiente correo:
   
   De: {from_email}
   Asunto: {subject}
   Mensaje: {body_text}
   
   Tono: {tone}
   Idioma: {language}
   ```
3. Retornar texto generado
4. NO guardar automáticamente, el frontend decide

---

### 5. POST `/api/mail/messages/:id/draft`

**Descripción**: Guardar o actualizar borrador de respuesta

**Headers**:
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Body**:
```json
{
  "draft_text": "Texto del borrador...",
  "draft_html": "<html>...</html>",
  "status": "draft",
  "to_emails": ["recipient@example.com"],
  "cc_emails": [],
  "subject": "Re: Original Subject"
}
```

O para guardar como pendiente:
```json
{
  "draft_text": "Texto del borrador...",
  "status": "pending_send",
  "scheduled_send_at": "2026-01-04T10:00:00Z"
}
```

**Response Success (200)**:
```json
{
  "success": true,
  "draft": {
    "id": "draft-uuid",
    "message_id": "original-message-uuid",
    "status": "draft",
    "created_at": "2026-01-03T12:00:00Z"
  }
}
```

**Lógica**:
1. Verificar ownership del mensaje original
2. Buscar si ya existe draft con `message_id`
3. Si existe: UPDATE
4. Si no: INSERT en `mail_drafts_new`
5. Campos requeridos:
   - `user_id` (del token)
   - `message_id` (mensaje original)
   - `draft_text`
   - `status` (draft | pending_send)
   - `to_emails` (extraer del mensaje original si no viene)
   - `subject` (Re: + subject original)

---

### 6. GET `/api/mail/drafts`

**Descripción**: Obtener lista de borradores

**Headers**:
```
Authorization: Bearer {access_token}
```

**Query Params**:
- `status` (opcional): draft | pending_send | sent | failed

**Response Success (200)**:
```json
{
  "success": true,
  "drafts": [
    {
      "id": "uuid",
      "message_id": "original-message-uuid",
      "to_emails": ["recipient@example.com"],
      "subject": "Re: Original Subject",
      "draft_text": "Preview...",
      "status": "pending_send",
      "created_at": "2026-01-03T12:00:00Z",
      "scheduled_send_at": "2026-01-04T10:00:00Z"
    }
  ]
}
```

**Lógica**:
1. Query `mail_drafts_new` WHERE `user_id = :user_id`
2. Filtrar por status si viene
3. Ordenar por `created_at DESC`

---

### 7. PATCH `/api/mail/messages/:id/flag`

**Descripción**: Actualizar bandera de clasificación

**Headers**:
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Body**:
```json
{
  "flag": "urgent"
}
```

**Valores permitidos**: `urgent` | `important` | `pending` | `follow_up` | `low_priority` | `null`

**Response Success (200)**:
```json
{
  "success": true,
  "message": "Flag updated"
}
```

**Lógica**:
1. Verificar ownership
2. UPDATE `mail_messages_new` SET `flag = :flag` WHERE `id = :id`
3. Si flag es null, quitar bandera

---

### 8. POST `/api/mail/messages/:id/spam`

**Descripción**: Marcar mensaje como spam

**Headers**:
```
Authorization: Bearer {access_token}
```

**Response Success (200)**:
```json
{
  "success": true,
  "message": "Message marked as spam"
}
```

**Lógica**:
1. Verificar ownership
2. UPDATE `mail_messages_new` SET:
   - `is_spam = true`
   - `status = 'spam'`
   - `folder = 'spam'`
   - `spam_score = 100`
   - `spam_reason = 'User marked as spam'`
3. Opcional: agregar from_email a lista negra

---

## 🔐 Seguridad

**TODAS las rutas deben**:
1. Validar JWT token
2. Extraer `user_id` del token
3. Verificar ownership: `WHERE user_id = :user_id`
4. No permitir acceso a mensajes de otros usuarios

**Rate Limiting**:
- `/ai-reply`: máx 10 requests/minuto por usuario
- Otros endpoints: máx 100 requests/minuto

---

## 📊 Database Queries Optimizadas

**Inbox listing**:
```sql
SELECT id, from_email, from_name, subject, snippet, 
       received_at, status, flag, has_attachments
FROM mail_messages_new
WHERE user_id = $1 AND folder = 'inbox' AND status != 'deleted'
ORDER BY received_at DESC
LIMIT $2 OFFSET $3;
```

**Message detail**:
```sql
SELECT *
FROM mail_messages_new
WHERE id = $1 AND user_id = $2;
```

**Update read status**:
```sql
UPDATE mail_messages_new
SET status = 'read', updated_at = NOW()
WHERE id = $1 AND user_id = $2;
```

---

## ✅ Testing

**Datos de prueba a crear**:
1. Insertar 5 mensajes fake en `mail_messages_new` con user_id del usuario de test
2. Status variados: new, read
3. Flags variados: urgent, important, null
4. Con y sin attachments
5. Diferentes fechas (hoy, ayer, semana pasada)

**Endpoints de prueba**:
```bash
# 1. Listar mensajes
curl -H "Authorization: Bearer TOKEN" \
  https://api.al-eon.com/api/mail/messages?limit=10

# 2. Ver detalle
curl -H "Authorization: Bearer TOKEN" \
  https://api.al-eon.com/api/mail/messages/{id}

# 3. Generar respuesta
curl -X POST -H "Authorization: Bearer TOKEN" \
  https://api.al-eon.com/api/mail/messages/{id}/ai-reply

# 4. Guardar borrador
curl -X POST -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"draft_text":"Test reply","status":"draft"}' \
  https://api.al-eon.com/api/mail/messages/{id}/draft
```

---

## 🚨 Errores a Manejar

```json
{
  "success": false,
  "error": "MESSAGE_NOT_FOUND",
  "message": "El mensaje no existe o no tienes acceso"
}

{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "Token inválido o expirado"
}

{
  "success": false,
  "error": "AI_GENERATION_FAILED",
  "message": "No se pudo generar la respuesta. Intenta de nuevo."
}

{
  "success": false,
  "error": "DRAFT_SAVE_FAILED",
  "message": "Error al guardar el borrador"
}
```

---

## 📝 Notas Importantes

1. **S3 Download**: Si `body_html` es null pero existe `s3_url`, descargar y cachear en base de datos
2. **AI Tone**: Respetar preferencias del usuario (formal, casual, barrio)
3. **Email Signature**: Agregar firma del usuario (de email_accounts config) al generar respuesta
4. **Threading**: Mantener `thread_id` para agrupar conversaciones
5. **Notifications**: Crear notificación cuando llega correo nuevo (integration con notification_jobs)

---

## 🎯 Prioridad de Implementación

1. ✅ **P0 (URGENTE)**:
   - GET `/api/mail/messages` (inbox)
   - GET `/api/mail/messages/:id` (detalle)
   
2. ✅ **P1 (ALTA)**:
   - POST `/api/mail/messages/:id/ai-reply` (core feature)
   - POST `/api/mail/messages/:id/draft` (guardar)
   - POST `/api/mail/messages/:id/read` (marcar leído)

3. ✅ **P2 (MEDIA)**:
   - GET `/api/mail/drafts` (pendientes)
   - PATCH `/api/mail/messages/:id/flag` (banderas)
   
4. ✅ **P3 (BAJA)**:
   - POST `/api/mail/messages/:id/spam` (spam)

---

**Fecha límite**: ASAP - Frontend ya está listo y esperando estos endpoints
