# 🚨 URGENTE: Falta ENCRYPTION_KEY en Backend

## ❌ Errores Actuales

### 1. ENCRYPTION_KEY no definida
```
Error: ENCRYPTION_KEY no definida en .env
```

### 2. Columna 'provider' no existe
```
Could not find the 'provider' column of 'email_accounts' in the schema cache
```

**Causa:** El backend busca `provider` pero Supabase tiene `provider_label`

## 🎯 Solución para AL-E Core

### 1. Generar la clave de encriptación

```bash
# En el servidor de AL-E Core, ejecuta:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Ejemplo de output:
```
a7f3e9d2c8b1a4f6e5d8c9b2a3f4e7d6c8b9a2f3e4d5c6b7a8f9e0d1c2b3a4f5
```

### 2. Agregar al `.env` del backend

```env
# Clave para encriptar contraseñas SMTP/IMAP en la BD
ENCRYPTION_KEY=a7f3e9d2c8b1a4f6e5d8c9b2a3f4e7d6c8b9a2f3e4d5c6b7a8f9e0d1c2b3a4f5
```

### 3. Código para encriptar/desencriptar (si no existe)

**Archivo: `utils/encryption.js`**

```javascript
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-gcm';

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
  throw new Error('ENCRYPTION_KEY debe tener al menos 32 caracteres');
}

// Asegurar que la clave tenga exactamente 32 bytes
const KEY = Buffer.from(ENCRYPTION_KEY.substring(0, 64), 'hex');

/**
 * Encripta texto
 */
function encrypt(text) {
  if (!text) return null;
  
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Formato: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Desencripta texto
 */
function decrypt(encrypted) {
  if (!encrypted) return null;
  
  const [ivHex, authTagHex, encryptedText] = encrypted.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

module.exports = { encrypt, decrypt };
```

### 4. Usar en el endpoint `/api/email/accounts`

```javascript
const { encrypt, decrypt } = require('../utils/encryption');

// POST /api/email/accounts
router.post('/api/email/accounts', authMiddleware, async (req, res) => {
  try {
    const {
      provider,      // ✅ Frontend envía: 'gmail', 'outlook', 'yahoo', 'other'
      fromName,
      fromEmail,
      imap,
      smtp
    } = req.body;
    
    const userId = req.user.id; // Del JWT
    
    // ✅ Validar que existan datos SMTP
    if (!smtp?.host || !smtp?.user || !smtp?.password) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Datos SMTP incompletos' 
      });
    }
    
    // ✅ Encriptar contraseñas ANTES de guardar
    const imapPassEnc = imap?.password ? encrypt(imap.password) : null;
    const smtpPassEnc = smtp?.password ? encrypt(smtp.password) : null;
    
    const { data, error } = await supabase
      .from('email_accounts')
      .insert({
        owner_user_id: userId,
        provider_label: provider, // ✅ Usar provider_label para guardar
        from_name: fromName,
        from_email: fromEmail,
        
        // IMAP
        imap_host: imap?.host || null,
        imap_port: imap?.port || 993,
        imap_secure: imap?.secure !== false, // Default true
        imap_user: imap?.user || fromEmail,
        imap_pass_enc: imapPassEnc,
        
        // SMTP
        smtp_host: smtp.host,
        smtp_port: smtp.port || 587,
        smtp_secure: smtp.secure || false,
        smtp_user: smtp.user,
        smtp_pass_enc: smtpPassEnc,
        
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('[Email] Error guardando cuenta:', error);
      return res.status(400).json({ 
        ok: false, 
        error: error.message 
      });
    }
    
    console.log('[Email] ✅ Cuenta guardada:', data.id);
    
    res.json({
      ok: true,
      account: data
    });
    
  } catch (err) {
    console.error('[Email] Error en POST /api/email/accounts:', err);
    res.status(500).json({ 
      ok: false, 
      error: err.message 
    });
  }
});
```

### 5. Reiniciar el servidor

```bash
# Si usas PM2:
pm2 restart al-e-core

# Si usas systemd:
sudo systemctl restart al-e-core

# Si usas Docker:
docker-compose restart
```

---

## ✅ Verificación

Después de aplicar:

1. ✅ Variable `ENCRYPTION_KEY` definida en `.env`
2. ✅ Archivo `utils/encryption.js` creado
3. ✅ Endpoint usa `encrypt()` para contraseñas
4. ✅ Servidor reiniciado

Frontend debería funcionar sin cambios.

---

## � Checklist

- [ ] Generar `ENCRYPTION_KEY` con crypto.randomBytes(32)
- [ ] Agregar a `.env` del backend
- [ ] Crear `utils/encryption.js`
- [ ] Actualizar endpoint `/api/email/accounts`
  - [ ] Leer `provider` del body (no `providerLabel`)
  - [ ] Guardar en columna `provider_label` de Supabase
  - [ ] Encriptar `imap.password` → `imap_pass_enc`
  - [ ] Encriptar `smtp.password` → `smtp_pass_enc`
  - [ ] Validar campos obligatorios de SMTP
- [ ] Reiniciar servidor
- [ ] Probar desde frontend que ya NO sale el error

---

## 🔍 Debug: Ver qué envía el frontend

El frontend envía este JSON:

```json
{
  "provider": "gmail",
  "fromName": "Patricia Garibay",
  "fromEmail": "p.garibay@infinitykode.com",
  "imap": {
    "host": "imap.hostinger.com",
    "port": 993,
    "secure": true,
    "user": "p.garibay@infinitykode.com",
    "password": "contraseña_del_usuario"
  },
  "smtp": {
    "host": "smtp.hostinger.com",
    "port": 465,
    "secure": true,
    "user": "p.garibay@infinitykode.com",
    "password": "contraseña_del_usuario"
  }
}
```

**El backend debe:**
1. Leer `req.body.provider` (no `providerLabel`)
2. Guardarlo en `provider_label` de Supabase
3. Encriptar `imap.password` y `smtp.password`
4. Responder con JSON: `{ ok: true, account: {...} }`

## 📋 Checklist

- [ ] Generar `ENCRYPTION_KEY` con crypto.randomBytes(32)
- [ ] Agregar a `.env` del backend
- [ ] Crear `utils/encryption.js`
- [ ] Actualizar endpoint `/api/email/accounts`
- [ ] Reiniciar servidor
- [ ] Probar desde frontend que ya NO sale el error
