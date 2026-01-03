# 🚨 URGENTE: Falta ENCRYPTION_KEY en Backend

## ❌ Error Actual
```
Error: ENCRYPTION_KEY no definida en .env
```

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
      providerLabel,
      fromName,
      fromEmail,
      imap,
      smtp
    } = req.body;
    
    const userId = req.user.id; // Del JWT
    
    // ✅ Encriptar contraseñas ANTES de guardar
    const imapPassEnc = imap.pass ? encrypt(imap.pass) : null;
    const smtpPassEnc = smtp.pass ? encrypt(smtp.pass) : null;
    
    const { data, error } = await supabase
      .from('email_accounts')
      .insert({
        owner_user_id: userId,
        provider_label: providerLabel,
        from_name: fromName,
        from_email: fromEmail,
        
        // IMAP
        imap_host: imap.host,
        imap_port: imap.port,
        imap_secure: imap.secure,
        imap_user: imap.user,
        imap_pass_enc: imapPassEnc, // ✅ Encriptado
        
        // SMTP
        smtp_host: smtp.host,
        smtp_port: smtp.port,
        smtp_secure: smtp.secure,
        smtp_user: smtp.user,
        smtp_pass_enc: smtpPassEnc, // ✅ Encriptado
        
        is_active: true
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

## 🔐 Seguridad

- ❌ **NUNCA** commitear `ENCRYPTION_KEY` a git
- ❌ **NUNCA** compartir la clave en Slack/email
- ✅ **SOLO** en variables de entorno del servidor
- ✅ Hacer backup de la clave en gestor de secrets (AWS Secrets Manager, Vault, etc.)

---

## 📋 Checklist

- [ ] Generar `ENCRYPTION_KEY` con crypto.randomBytes(32)
- [ ] Agregar a `.env` del backend
- [ ] Crear `utils/encryption.js`
- [ ] Actualizar endpoint `/api/email/accounts`
- [ ] Reiniciar servidor
- [ ] Probar desde frontend que ya NO sale el error
