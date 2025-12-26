# 🔑 Configuración de Tokens OAuth en AL-EON

## 📋 Tus Credenciales OAuth

### Client ID (mismo para Gmail y Calendar)
```
1010443733044-nj923bcv3rp20mi7ilb75bdvr0jnjfdq.apps.googleusercontent.com
```

### Client Secret (mismo para Gmail y Calendar)
```
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
```

---

## 📧 **Gmail API**

### Refresh Token
```
[PRIVADO - Ver en Supabase: tabla global_integrations]
```

### Scope autorizado
```
https://www.googleapis.com/auth/gmail.send
```

---

## 📅 **Google Calendar API**

### Refresh Token
```
[PRIVADO - Ver en Supabase: tabla global_integrations]
```

### Scope autorizado
```
https://www.googleapis.com/auth/calendar
```

---

## 🚀 Cómo configurar en AL-EON

### Opción 1: Desde la UI (Recomendado)

1. Inicia sesión en AL-EON: https://al-eon.netlify.app
2. Ve a **Integraciones** (⚙️ o /integrations)
3. Busca **Gmail**:
   - Client ID: `1010443733044-nj923bcv3rp20mi7ilb75bdvr0jnjfdq.apps.googleusercontent.com`
   - Client Secret: `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`
   - Refresh Token: `[PRIVADO - Ver en Supabase]`
   - Click **"Guardar"**

4. Busca **Google Calendar**:
   - Client ID: `1010443733044-nj923bcv3rp20mi7ilb75bdvr0jnjfdq.apps.googleusercontent.com`
   - Client Secret: `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`
   - Refresh Token: `[PRIVADO - Ver en Supabase]`
   - Click **"Guardar"**

### Opción 2: Desde Supabase (Backend)

Si prefieres configurarlo directamente en la base de datos:

```sql
-- Insertar configuración de Gmail
INSERT INTO user_integrations (user_id, integration_type, credentials, is_active)
VALUES (
  'tu-user-id-aqui',
  'gmail',
  jsonb_build_object(
    'client_id', '1010443733044-nj923bcv3rp20mi7ilb75bdvr0jnjfdq.apps.googleusercontent.com',
    'client_secret', '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',
    'refresh_token', '[PRIVADO - Obtener de OAuth Playground]'
  ),
  true
);

-- Insertar configuración de Google Calendar
INSERT INTO user_integrations (user_id, integration_type, credentials, is_active)
VALUES (
  'tu-user-id-aqui',
  'google_calendar',
  jsonb_build_object(
    'client_id', '1010443733044-nj923bcv3rp20mi7ilb75bdvr0jnjfdq.apps.googleusercontent.com',
    'client_secret', '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',
    'refresh_token', '[PRIVADO - Obtener de OAuth Playground]'
  ),
  true
);
```

---

## ✅ Estado de Publicación OAuth

- ✅ **App publicada**: En producción
- ✅ **Google Calendar**: Disponible para todos los usuarios
- ⚠️ **Gmail**: 
  - Funciona para usuarios autorizados
  - Si usas scopes restringidos (leer emails), necesitarás verificación
  - Si solo envías emails (gmail.send), funciona sin verificación

---

## 🔒 Seguridad

**IMPORTANTE:** 
- Estos tokens dan acceso completo a tu Gmail y Calendar
- NO los compartas públicamente
- NO los subas a Git
- Guárdalos SOLO en:
  - Variables de entorno (backend)
  - Base de datos encriptada (Supabase)
  - La página de Integraciones de AL-EON (guardado seguro)

---

## 📚 Recursos

- **OAuth Playground**: https://developers.google.com/oauthplayground/
- **Google Cloud Console**: https://console.cloud.google.com/
- **Permisos de tu cuenta**: https://myaccount.google.com/permissions
- **Gmail API Docs**: https://developers.google.com/gmail/api
- **Calendar API Docs**: https://developers.google.com/calendar/api

---

## 🆘 Solución de Problemas

### "Invalid refresh token"
- El token expiró o fue revocado
- Ve a https://myaccount.google.com/permissions
- Revoca el acceso a "Al-eon"
- Genera un nuevo token desde OAuth Playground

### "Access blocked"
- Tu app aún está en modo Testing
- Ve a Google Cloud Console → Pantalla de consentimiento OAuth
- Click "PUBLICAR APLICACIÓN"

### Gmail no funciona pero Calendar sí
- Gmail puede requerir verificación adicional
- Ve a Google Cloud Console → APIs y servicios
- Click "Preparar para verificación"
- Completa el formulario (3-7 días de espera)

---

**Generado el:** 26 de diciembre de 2025
**Por:** AL-EON Setup Assistant
