# 🔧 FIX: Error de Credenciales en Sincronización de Email

## 📋 Problema Identificado

```
Error: Invalid credentials (Failure)
Error cargando emails: Error: Invalid credentials (Failure)
[EmailService] Error en getInbox: Error: Invalid credentials (Failure)
```

### Causa Raíz
El backend (`https://api.al-eon.com`) está devolviendo **"Invalid credentials"** cuando intenta:
1. Sincronizar correos vía IMAP
2. Conectarse con las credenciales guardadas en Supabase

### Posibles Causas

1. **Contraseña IMAP incorrecta o expirada**
   - Gmail/Outlook requieren "contraseñas de aplicación", no la contraseña normal
   - Las credenciales pueden haber cambiado

2. **Problema de encriptación en el backend**
   - El backend puede no estar desencriptando correctamente las contraseñas
   - La clave de encriptación (`ENCRYPTION_KEY`) puede estar mal configurada

3. **Backend no configurado correctamente**
   - Falta la variable de entorno `ENCRYPTION_KEY`
   - El servidor IMAP no es accesible desde el backend

## ✅ Soluciones Aplicadas

### 1. Mejor Manejo de Errores en `emailService.js`
```javascript
// Ahora muestra mensajes más descriptivos:
❌ Credenciales IMAP inválidas. Por favor verifica tu usuario y contraseña
❌ Error del servidor al sincronizar. El backend puede estar desconectado
```

### 2. Sincronización NO Bloqueante en `EmailConfigWizard.jsx`
```javascript
// Antes: Si fallaba sync, no se guardaba la cuenta
// Ahora: La cuenta se guarda, sync es opcional
try {
  await syncEmailAccount(account.id);
  toast.success('✓ Sincronización completa');
} catch (syncError) {
  toast.warning('⚠️ Cuenta guardada pero la sincronización falló.');
  // No bloquea el proceso
}
```

### 3. Fallback a Lectura Directa de Supabase
```javascript
// EmailInbox.jsx ya lee directo de Supabase si el backend falla
// Los correos YA guardados en la BD se seguirán mostrando
```

## 🔧 Acciones Necesarias

### Para el Usuario (Frontend)
1. **Verifica las credenciales de tu cuenta de email**:
   - Ve a Configuración → Cuentas de Email
   - Edita la cuenta problemática
   - **Para Gmail**: Usa una "Contraseña de aplicación" (no tu contraseña normal)
     - https://myaccount.google.com/apppasswords
   - **Para Outlook**: Habilita acceso IMAP y usa contraseña de aplicación

2. **Sincroniza manualmente**:
   - Haz clic en "Sincronizar ahora" solo cuando las credenciales sean correctas
   - Si falla, NO afectará los correos ya descargados

### Para el Backend (Urgente)
El backend necesita configurar correctamente:

```bash
# .env del backend
ENCRYPTION_KEY=tu_clave_secreta_de_32_caracteres_minimo

# Verificar que el módulo de IMAP esté instalado
npm install imap
npm install nodemailer
```

**Archivo a revisar en el backend**: 
- `src/services/emailService.js` o similar
- Buscar funciones como `decryptPassword()` o `connectIMAP()`

### SQL: Verificar Datos en Supabase
```sql
-- Ver cuentas guardadas (las contraseñas están encriptadas)
SELECT 
  id,
  owner_user_id,
  from_email,
  imap_host,
  imap_port,
  smtp_host,
  smtp_port,
  is_active,
  created_at
FROM email_accounts
WHERE owner_user_id = auth.uid();

-- NO ejecutes esto (las contraseñas están encriptadas):
-- SELECT imap_pass, smtp_pass FROM email_accounts;
```

## 🎯 Resultado Esperado

**ANTES** del fix:
- ❌ Si sync falla → Cuenta no se guarda
- ❌ Errores confusos en consola
- ❌ Usuario bloqueado sin poder usar email

**DESPUÉS** del fix:
- ✅ Si sync falla → Cuenta SE GUARDA de todas formas
- ✅ Mensajes de error claros y accionables
- ✅ Usuario puede sincronizar manualmente cuando arregle las credenciales
- ✅ Los correos ya descargados siguen funcionando (lectura de Supabase)

## 📝 Notas Técnicas

### Orden de Prioridad al Leer Emails
1. **Primero**: Intentar leer desde backend (IMAP en vivo)
2. **Fallback**: Si falla, leer de `email_messages` en Supabase
3. **Siempre**: Los correos enviados se guardan en Supabase automáticamente

### Estado de las Tablas
- `email_accounts`: ✅ Tiene las cuentas configuradas
- `email_messages`: ✅ Tiene los correos descargados previamente
- `email_drafts`: ✅ Tiene los borradores guardados

### Próximos Pasos
1. Ejecutar este fix en producción
2. Verificar que el backend tenga `ENCRYPTION_KEY` configurado
3. Crear una UI para "Probar conexión" antes de guardar cuenta
4. Agregar botón "Reconfigurar credenciales" en cuentas existentes

## 🚀 Deploy
```bash
git add .
git commit -m "Fix: Manejo de errores de credenciales IMAP y sync no bloqueante"
git push origin main
```
