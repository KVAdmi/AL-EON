# 🔴 BUG CRÍTICO EN BACKEND - Cifrado de Contraseñas

## Problema
El endpoint `POST /api/mail/accounts/:accountId/sync` falla con:
```
Error al descifrar credencial
```

## Causa Raíz
El backend NO PUEDE descifrar las contraseñas que él mismo cifró. Hay un problema en:
1. La función de cifrado cuando se guarda la cuenta
2. La función de descifrado cuando se intenta hacer sync

## Evidencia
1. Usuario crea cuenta nueva desde cero
2. Backend responde "Cuenta creada" (código 200)
3. Backend guarda `smtp_pass_enc` y `imap_pass_enc` en la DB
4. Usuario hace click en "Sincronizar"
5. Backend intenta leer las contraseñas de la DB
6. Backend falla al descifrarlas con error: "Error al descifrar credencial"

## Logs del Frontend
```javascript
🔵 [EmailAccountForm] Guardando cuenta...
{
  isUpdate: false,
  accountId: undefined,
  payload: {
    ownerUserId: "a56e5204-7ff5-47fc-814b-b52e5c6af5d6",
    fromName: "Patricia Garibay",
    fromEmail: "p.garibay@infinitykode.com",
    smtpHost: "smtp.hostinger.com",
    smtpPort: 465,
    smtpSecure: true,
    smtpUser: "p.garibay@infinitykode.com",
    smtpPass: "***", // Contraseña real enviada
    imapHost: "imap.hostinger.com",
    imapPort: 993,
    imapSecure: true,
    imapUser: "p.garibay@infinitykode.com",
    imapPass: "***" // Contraseña real enviada
  }
}
✅ Cuenta creada
```

Luego al sincronizar:
```javascript
🔄 [MailInboxPage] Sincronizando cuenta: b554e58d-f052-49c0-9957-e03e146c5de
❌ Error: Error al descifrar credencial
```

## Lo que DEBE pasar
1. Frontend envía contraseñas en **texto plano** en el payload
2. Backend las cifra con su algoritmo y las guarda en `smtp_pass_enc`, `imap_pass_enc`
3. Backend las descifra cuando necesita hacer sync IMAP/SMTP
4. Sync funciona ✅

## Lo que ESTÁ pasando
1. Frontend envía contraseñas en **texto plano** ✅
2. Backend las cifra y las guarda ✅
3. Backend NO PUEDE descifrarlas ❌ (BUG AQUÍ)
4. Sync falla ❌

## Archivos del Backend a Revisar
```
/backend/src/api/email/accounts.js  (o similar)
- Función: createEmailAccount() 
- Función: encryptPassword()
- Función: decryptPassword()
- Función: syncAccount()
```

## Posibles Causas
1. **Clave de cifrado diferente** - Se usa una clave para cifrar y otra para descifrar
2. **Algoritmo inconsistente** - Se cifra con AES pero se descifra con otro método
3. **Salt/IV diferente** - El vector de inicialización no se guarda/recupera correctamente
4. **Encoding diferente** - Se cifra en base64 pero se descifra esperando hex
5. **Variable de entorno perdida** - `ENCRYPTION_KEY` no está disponible al descifrar

## Solución Temporal (INSEGURA - Solo para debugging)
```sql
-- En Supabase, guardar contraseñas SIN cifrar
UPDATE email_accounts
SET 
  smtp_pass_enc = 'Garibay030874@',  -- TEXTO PLANO
  imap_pass_enc = 'Garibay030874@'   -- TEXTO PLANO
WHERE id = 'b554e58d-f052-49c0-9957-e03e146c5de';
```

## Solución Real Requerida
El backend debe:
1. Usar la MISMA función de cifrado/descifrado
2. Guardar el IV (initialization vector) junto con el password cifrado
3. Tener logs detallados de errores de cifrado
4. Hacer test unitario de encrypt/decrypt antes de guardar

## Urgencia
🔴 **BLOQUEADOR** - El módulo de email NO funciona sin esto

## Responsable
Backend Team - revisar archivos de cifrado/descifrado de contraseñas
