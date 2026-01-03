# 🔧 AWS / SES / S3 / IAM - CONFIGURACIÓN DEFINITIVA

## Objetivo Final
Recibir correos en `@al-eon.com` vía AWS SES Inbound → S3 → Lambda, sin romper DNS de Netlify.

---

## 📋 Estado Actual

✅ **Ya funciona**:
- Netlify DNS gestiona `al-eon.com`
- Web: `al-eon.com` y `www.al-eon.com` apuntan a Netlify
- API: `api.al-eon.com` apunta a tu server
- SES Outbound: envío de correos funciona
- DKIM records configurados y verificados
- S3 bucket: `aleon-mail-inbound` creado
- Lambda: `ale-mail-ingest` existe

❌ **Problemas actuales**:
- Receipt Rule con error "Could not assume provided IAM Role"
- IAM role `ses-inbound-al-eon` mal configurado
- Posible conflicto con múltiples reglas SES

---

## 🎯 TAREA 1: LIMPIAR Y CREAR IAM ROLE CORRECTO

### Paso 1.1: Eliminar role viejo (si existe)

```bash
# En AWS Console > IAM > Roles
# Buscar y ELIMINAR: ses-inbound-al-eon
```

### Paso 1.2: Crear nuevo role correcto

**Nombre**: `ses-receipt-to-s3-al-eon`

**Trusted entity (Trust Policy)**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ses.amazonaws.com"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "AWS:SourceAccount": "TU_AWS_ACCOUNT_ID"
        }
      }
    }
  ]
}
```

**Permissions Policy (inline)**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl"
      ],
      "Resource": "arn:aws:s3:::aleon-mail-inbound/inbound/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetBucketLocation"
      ],
      "Resource": "arn:aws:s3:::aleon-mail-inbound"
    }
  ]
}
```

**Copiar el ARN**:
```
arn:aws:iam::TU_ACCOUNT_ID:role/ses-receipt-to-s3-al-eon
```

---

## 🎯 TAREA 2: CONFIGURAR S3 BUCKET POLICY

### Paso 2.1: Editar Bucket Policy

**AWS Console > S3 > aleon-mail-inbound > Permissions > Bucket Policy**

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
      "Resource": "arn:aws:s3:::aleon-mail-inbound/inbound/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceAccount": "TU_AWS_ACCOUNT_ID"
        }
      }
    }
  ]
}
```

### Paso 2.2: Verificar que Lambda tenga acceso

**IAM > Roles > ale-mail-ingest-role (o el rol de tu Lambda)**

Policy debe incluir:
```json
{
  "Effect": "Allow",
  "Action": [
    "s3:GetObject"
  ],
  "Resource": "arn:aws:s3:::aleon-mail-inbound/inbound/*"
}
```

---

## 🎯 TAREA 3: LIMPIAR RECEIPT RULES

### Paso 3.1: Eliminar reglas viejas

```bash
# AWS Console > SES > Email receiving > Receipt rule sets
# Active rule set: aleon-inbound

# ELIMINAR todas las reglas existentes:
# - al-eon.com
# - store-to-s3
# - cualquier otra
```

### Paso 3.2: Crear UNA SOLA regla definitiva

**Nombre de regla**: `inbound-to-s3-al-eon`

**Configuración**:

1. **Recipients** (opcional, para catch-all dejarlo vacío):
   - Si quieres específico: `al-eon.com`
   - Si quieres catch-all: dejar vacío

2. **Actions** (en orden):

   **Acción 1: S3**
   - Bucket: `aleon-mail-inbound`
   - Object key prefix: `inbound/`
   - Encryption: `None` (por ahora, para simplicidad)
   - IAM role: `arn:aws:iam::TU_ACCOUNT_ID:role/ses-receipt-to-s3-al-eon`
   
   **Acción 2: Lambda** (opcional, solo si quieres procesamiento inmediato)
   - Function: `arn:aws:lambda:us-east-1:TU_ACCOUNT_ID:function:ale-mail-ingest`
   - Invocation type: `Event`

3. **Rule Settings**:
   - Enabled: ✅ YES
   - TLS: ✅ Required
   - Spam and virus scanning: ✅ Enabled

4. **Guardar y activar**

---

## 🎯 TAREA 4: CONFIGURAR S3 EVENT NOTIFICATION

### Paso 4.1: Configurar evento S3 → Lambda

**S3 > aleon-mail-inbound > Properties > Event notifications > Create**

**Configuration**:
- Name: `email-received-trigger`
- Prefix: `inbound/`
- Suffix: (dejar vacío)
- Event types: 
  - ✅ `s3:ObjectCreated:*`
- Destination:
  - Lambda function: `ale-mail-ingest`

**IMPORTANTE**: Esto hace que cada correo guardado en S3 ejecute automáticamente tu Lambda.

---

## 🎯 TAREA 5: VERIFICAR DNS (NO CAMBIAR NADA)

### Paso 5.1: Confirmar que estos records EXISTEN en Netlify DNS:

**MX Records** (recepción):
```
Priority  Host           Value
10        al-eon.com     inbound-smtp.us-east-1.amazonaws.com
```

**DKIM CNAME** (ya están):
```
Host: xxxxx._domainkey.al-eon.com
Value: xxxxx.dkim.amazonses.com
```

**SPF TXT** (envío):
```
Host: al-eon.com
Value: v=spf1 include:amazonses.com ~all
```

**DMARC TXT**:
```
Host: _dmarc.al-eon.com
Value: v=DMARC1; p=quarantine; rua=mailto:postmaster@al-eon.com
```

### Paso 5.2: NO tocar estos records de Netlify:

```
A      al-eon.com          → IP de Netlify
CNAME  www.al-eon.com      → al-eon.netlify.app
A      api.al-eon.com      → TU_SERVER_IP
```

---

## 🎯 TAREA 6: VERIFICAR DOMINIO EN SES (si no está)

```bash
# AWS Console > SES > Verified identities

# Si al-eon.com NO está verificado:
1. Add identity
2. Domain: al-eon.com
3. Copiar DKIM records
4. Agregar en Netlify DNS (si no están)
5. Esperar verificación (hasta 72h, usualmente 10 min)
```

---

## 🎯 TAREA 7: LAMBDA CONFIGURATION

### Paso 7.1: Verificar permisos de Lambda

**IAM Role**: `ale-mail-ingest-role`

**Policies necesarias**:

1. **S3 Read**:
```json
{
  "Effect": "Allow",
  "Action": [
    "s3:GetObject"
  ],
  "Resource": "arn:aws:s3:::aleon-mail-inbound/inbound/*"
}
```

2. **Supabase/API Call** (si hace POST a tu API):
```json
{
  "Effect": "Allow",
  "Action": [
    "secretsmanager:GetSecretValue"
  ],
  "Resource": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:supabase-key-*"
}
```

3. **CloudWatch Logs** (para debugging):
```json
{
  "Effect": "Allow",
  "Action": [
    "logs:CreateLogGroup",
    "logs:CreateLogStream",
    "logs:PutLogEvents"
  ],
  "Resource": "*"
}
```

### Paso 7.2: Environment Variables de Lambda

```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx...
API_BASE_URL=https://api.al-eon.com
```

### Paso 7.3: Timeout y Memory

- **Timeout**: 30 segundos (mínimo)
- **Memory**: 512 MB (procesamiento de emails puede ser pesado)

---

## 🧪 TESTING

### Paso 1: Enviar correo de prueba

```bash
# Desde tu correo personal (Gmail, Outlook)
To: test@al-eon.com
Subject: Test SES Inbound
Body: Este es un correo de prueba
```

### Paso 2: Verificar en S3

```bash
# AWS Console > S3 > aleon-mail-inbound > inbound/
# Debería aparecer un nuevo archivo .eml con timestamp
```

### Paso 3: Verificar Lambda logs

```bash
# AWS Console > Lambda > ale-mail-ingest > Monitor > View logs in CloudWatch
# Buscar logs recientes con el messageId
```

### Paso 4: Verificar en Supabase

```sql
-- Supabase SQL Editor
SELECT *
FROM mail_messages_new
WHERE received_at > NOW() - INTERVAL '1 hour'
ORDER BY received_at DESC;
```

---

## 🚨 TROUBLESHOOTING

### Error: "Could not assume IAM Role"

**Causa**: Trust policy del role no permite a SES asumirlo

**Fix**:
1. IAM > Roles > ses-receipt-to-s3-al-eon > Trust relationships
2. Verificar que Service es `ses.amazonaws.com`
3. Agregar Condition con SourceAccount

### Error: "Access Denied" en S3

**Causa**: Bucket policy no permite a SES escribir

**Fix**:
1. S3 > aleon-mail-inbound > Permissions > Bucket policy
2. Agregar policy con Principal: {"Service": "ses.amazonaws.com"}
3. Verificar Resource con /inbound/*

### Lambda no se ejecuta

**Causa**: S3 event notification no configurado o Lambda sin permisos

**Fix**:
1. S3 > Event notifications > Verificar que existe
2. Lambda > Configuration > Permissions > Resource-based policy
3. Debe permitir s3.amazonaws.com invocar la función

### Correos no llegan

**Causa**: MX record mal configurado o dominio no verificado

**Fix**:
1. Verificar MX con: `dig al-eon.com MX`
2. Debe devolver: `inbound-smtp.us-east-1.amazonaws.com`
3. SES > Verified identities > al-eon.com debe estar ✅ Verified

---

## ✅ CHECKLIST FINAL

```
[ ] IAM Role ses-receipt-to-s3-al-eon creado con trust policy correcto
[ ] S3 Bucket Policy permite a SES escribir
[ ] Receipt Rule Set activo con UNA sola regla
[ ] S3 Action configurada con role correcto
[ ] S3 Event Notification a Lambda configurado
[ ] Lambda tiene permisos para leer S3
[ ] Lambda environment variables configuradas
[ ] DNS MX record apunta a SES inbound
[ ] Dominio verificado en SES
[ ] Test de correo exitoso: email en S3 + Lambda ejecutada + registro en Supabase
```

---

## 📞 AYUDA

Si algo falla, revisar logs en este orden:

1. **SES**: Console > SES > Email receiving > Receipt rules > Metrics
2. **S3**: Bucket > Objects > Verificar nuevos archivos
3. **Lambda**: CloudWatch Logs
4. **Supabase**: SQL query para ver registros nuevos

---

**IMPORTANTE**: NO crear múltiples reglas. UNA sola regla catch-all es suficiente y evita conflictos.

**Región**: Todo debe estar en `us-east-1` (SES, S3, Lambda)

**Tiempo estimado**: 30-60 minutos si sigues los pasos en orden
