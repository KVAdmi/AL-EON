# 📧 Setup AWS SES + Supabase Mail System

## 🎯 Resumen

Este setup te permite recibir correos vía AWS SES y almacenarlos en Supabase con todas las funcionalidades necesarias:

- ✅ Firma de correo personalizada con imagen
- ✅ Banderas de clasificación (Urgente, Importante, Pendiente, etc.)
- ✅ Filtro anti-spam configurable
- ✅ Almacenamiento en S3
- ✅ Búsqueda full-text
- ✅ Hilos/conversaciones
- ✅ Múltiples cuentas de correo

---

## 📁 Archivos incluidos

1. **SUPABASE-SES-MAIL-TABLES.sql** - Tablas principales
2. **SUPABASE-SES-MAIL-FUNCTIONS.sql** - Funciones útiles
3. **SUPABASE-SES-MIGRATION.sql** - Script de migración (compatible con schema existente)

---

## 🚀 Instalación

### Opción A: Instalación Limpia (Sin tablas previas)

```sql
-- 1. Ejecutar en Supabase SQL Editor
-- Orden de ejecución:

-- Paso 1: Crear tablas
\i SUPABASE-SES-MAIL-TABLES.sql

-- Paso 2: Crear funciones
\i SUPABASE-SES-MAIL-FUNCTIONS.sql
```

### Opción B: Migración (Ya tienes email_accounts, etc.)

```sql
-- 1. Ejecutar migración (renombra tablas antiguas automáticamente)
\i SUPABASE-SES-MIGRATION.sql

-- 2. Crear funciones
\i SUPABASE-SES-MAIL-FUNCTIONS.sql
```

### Ejecutar desde Supabase Dashboard

1. Ve a tu proyecto en Supabase
2. Navega a **SQL Editor** en el menú lateral
3. Crea un nuevo query
4. Copia y pega el contenido de cada archivo
5. Ejecuta en orden (Tables → Functions)

---

## 📊 Estructura de Tablas

### `mail_accounts`
Cuentas de correo configuradas (AWS SES, Gmail, Outlook, IMAP)

```sql
{
  id: uuid,
  user_id: uuid,
  provider: 'ses_inbound' | 'gmail' | 'outlook' | 'imap',
  domain: 'al-eon.com',
  aws_region: 'us-east-1',
  aws_access_key_id: 'AKIA...',
  aws_secret_access_key_enc: 'encrypted',
  s3_bucket: 'my-ses-bucket',
  status: 'active' | 'paused' | 'error'
}
```

### `mail_messages`
Mensajes recibidos y enviados

```sql
{
  id: uuid,
  user_id: uuid,
  account_id: uuid,
  message_id: 'unique-rfc5322-id',
  from_email: 'sender@example.com',
  to_email: 'me@al-eon.com',
  subject: 'Asunto',
  body_text: 'Contenido texto plano',
  body_html: '<html>...</html>',
  snippet: 'Preview de 200 caracteres',
  
  -- AWS S3
  s3_bucket: 'my-bucket',
  s3_key: 'emails/2026/01/msg-12345.eml',
  
  -- Estado
  status: 'new' | 'read' | 'archived' | 'deleted' | 'spam',
  folder: 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam',
  
  -- Banderas
  flag: 'urgent' | 'important' | 'pending' | 'follow_up' | 'low_priority',
  is_starred: boolean,
  is_important: boolean,
  
  -- Anti-spam
  is_spam: boolean,
  spam_score: 0-10,
  spam_reason: 'Texto explicativo'
}
```

### `mail_drafts`
Borradores pendientes de envío

### `mail_attachments`
Archivos adjuntos

### `mail_filters`
Reglas automáticas

```sql
{
  conditions: {
    "from_contains": "spam@example.com",
    "subject_contains": "oferta"
  },
  actions: {
    "move_to": "spam",
    "mark_as_read": true,
    "set_flag": "spam"
  }
}
```

### `mail_sync_log`
Historial de sincronizaciones

---

## 🔧 Funciones Útiles

### Marcar como leído
```sql
SELECT mark_message_as_read('uuid-del-mensaje');
```

### Obtener estadísticas
```sql
SELECT get_mail_stats();
-- Retorna: {total_messages, unread_count, spam_count, etc.}
```

### Buscar correos
```sql
SELECT * FROM search_mail_messages('palabra clave');
SELECT * FROM search_mail_messages('reunión', 'inbox');
```

### Marcar como spam
```sql
SELECT mark_as_spam('uuid-del-mensaje', 'Patrón sospechoso detectado');
```

### Aplicar filtros automáticos
```sql
SELECT apply_mail_filters('uuid-del-mensaje');
```

### Obtener conversación completa
```sql
SELECT * FROM get_mail_thread('thread-id-12345');
```

### Limpiar mensajes antiguos
```sql
-- Eliminar de papelera mensajes > 90 días
SELECT cleanup_old_messages(90, 'trash');
```

---

## 🎨 Frontend: Configuración de Correo

Ya está implementado en `/settings/email` con:

### ✅ Formulario incluye:

1. **Firma de correo**
   - Texto personalizado
   - Upload de imagen (JPG/PNG, máx 2MB)
   - Vista previa con botón eliminar

2. **AWS SES Configuration**
   - Región AWS (dropdown)
   - Access Key ID
   - Secret Access Key
   - Bucket S3

3. **Clasificación**
   - Toggle para habilitar banderas
   - Toggle para filtro anti-spam

### Componente actualizado:
- `src/features/email/components/EmailAccountForm.jsx`

---

## 🔐 Configuración AWS SES

### 1. Crear bucket S3

```bash
aws s3 mb s3://my-ses-inbound-bucket --region us-east-1
```

### 2. Política del bucket

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowSESPuts",
      "Effect": "Allow",
      "Principal": {
        "Service": "ses.amazonaws.com"
      },
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::my-ses-inbound-bucket/*",
      "Condition": {
        "StringEquals": {
          "aws:Referer": "YOUR-AWS-ACCOUNT-ID"
        }
      }
    }
  ]
}
```

### 3. Configurar SES Receipt Rule

```bash
aws ses create-receipt-rule \
  --rule-set-name my-ruleset \
  --rule '{
    "Name": "store-in-s3",
    "Enabled": true,
    "Recipients": ["@al-eon.com", "@infinitykode.mx"],
    "Actions": [{
      "S3Action": {
        "BucketName": "my-ses-inbound-bucket",
        "ObjectKeyPrefix": "emails/"
      }
    }]
  }'
```

### 4. Verificar dominio

```bash
aws ses verify-domain-identity --domain al-eon.com
```

---

## 🔄 Flujo de Recepción de Correos

```
1. Email llega a @al-eon.com
   ↓
2. AWS SES recibe el correo
   ↓
3. SES guarda el .eml en S3
   ↓
4. SES dispara SNS notification (opcional)
   ↓
5. Webhook/Lambda procesa el archivo
   ↓
6. Parse del .eml
   ↓
7. INSERT en mail_messages (Supabase)
   ↓
8. Aplicar filtros automáticos
   ↓
9. Frontend obtiene nuevos mensajes
```

---

## 🧪 Testing

### Insertar mensaje de prueba

```sql
INSERT INTO public.mail_messages (
  user_id,
  account_id,
  source,
  message_id,
  from_email,
  to_email,
  subject,
  body_text,
  snippet,
  s3_bucket,
  s3_key,
  status
) VALUES (
  auth.uid(),
  'uuid-de-tu-cuenta',
  'ses',
  'test-' || gen_random_uuid(),
  'test@example.com',
  'me@al-eon.com',
  'Correo de prueba',
  'Este es un correo de prueba del sistema',
  'Este es un correo de prueba del sistema',
  'my-bucket',
  'emails/test.eml',
  'new'
);
```

### Crear filtro de prueba

```sql
INSERT INTO public.mail_filters (
  user_id,
  name,
  conditions,
  actions,
  is_active
) VALUES (
  auth.uid(),
  'Mover spam a carpeta',
  '{"from_contains": "spam"}',
  '{"move_to": "spam", "set_flag": "spam"}',
  true
);
```

---

## 📝 Próximos Pasos

1. ✅ **Tablas creadas** - Listo
2. ✅ **Frontend configuración** - Listo
3. ⏳ **Lambda/Webhook para procesar S3** - Pendiente
4. ⏳ **Parser de .eml files** - Pendiente
5. ⏳ **API endpoint para recibir notificaciones SES** - Pendiente

---

## 🆘 Troubleshooting

### Error: "relation already exists"
- Ejecuta el script de migración: `SUPABASE-SES-MIGRATION.sql`
- Renombra tablas antiguas manualmente

### Error: RLS policies
```sql
-- Verificar políticas
SELECT * FROM pg_policies WHERE tablename LIKE 'mail_%';

-- Deshabilitar RLS temporalmente (solo desarrollo)
ALTER TABLE public.mail_messages DISABLE ROW LEVEL SECURITY;
```

### Error: Permisos de funciones
```sql
-- Re-aplicar permisos
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
```

---

## 📚 Documentación Adicional

- [AWS SES Receiving Email](https://docs.aws.amazon.com/ses/latest/dg/receiving-email.html)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [RFC 5322 (Email Format)](https://www.rfc-editor.org/rfc/rfc5322)

---

## ✅ Checklist de Implementación

- [x] Crear tablas en Supabase
- [x] Crear funciones helper
- [x] Frontend: Formulario de configuración
- [x] Frontend: Upload de firma con imagen
- [x] Frontend: Banderas y spam toggles
- [ ] Backend: Endpoint webhook SES
- [ ] Backend: Parser de archivos .eml
- [ ] Backend: Integración con S3
- [ ] AWS: Configurar SES Receipt Rules
- [ ] AWS: Crear Lambda de procesamiento
- [ ] Testing: Enviar correo de prueba
- [ ] Testing: Verificar inserción en DB
- [ ] Producción: Configurar dominios reales

---

**🎉 ¡Todo listo para recibir correos con AWS SES!**
