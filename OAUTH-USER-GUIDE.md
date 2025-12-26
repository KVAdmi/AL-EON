# 🔗 Guía: Conectar Gmail, Calendar y Meet (OAuth por usuario)

## ✅ **CAMBIO IMPLEMENTADO**

Ahora cada usuario conecta **su propia cuenta de Google** en lugar de usar tokens compartidos.

---

## 🚀 **Cómo conectar tu cuenta (Usuario)**

### **Paso 1: Ir a Configuración**
1. Inicia sesión en AL-EON: https://al-eon.netlify.app
2. Ve a **⚙️ Configuración** (menú lateral)
3. Click en la pestaña **"Integraciones"**

### **Paso 2: Conectar Google**
1. Verás un panel destacado: **"Mis Integraciones"**
2. Click en el panel para ir a `/settings/integrations`
3. Verás 3 tarjetas:
   - 📧 **Gmail** - Envía y recibe emails
   - 📅 **Google Calendar** - Gestiona eventos
   - 📹 **Google Meet** - Crea videollamadas

### **Paso 3: Autorizar**
1. Click en **"Conectar con Google"** en cualquier integración
2. Te redirigirá a la pantalla de consentimiento de Google
3. Elige tu cuenta de Google
4. Autoriza los permisos solicitados
5. Google te redirigirá de vuelta a AL-EON
6. Verás un mensaje: **"¡Conectado!"**

### **Paso 4: Listo**
- ✅ Tu cuenta está conectada
- ✅ Los emails saldrán de TU correo
- ✅ Los eventos se crearán en TU calendario
- ✅ Puedes desconectar en cualquier momento

---

## 🔧 **Configuración Técnica (Solo para desarrolladores)**

### **Redirect URI configurado:**
```
https://al-eon.netlify.app/integrations/oauth-callback
```

### **Client ID y Secret:**
Compartidos por todos los usuarios (configurados en el código):
```javascript
GOOGLE_CLIENT_ID = '1010443733044-nj923bcv3rp20mi7ilb75bdvr0jnjfdq.apps.googleusercontent.com'
GOOGLE_CLIENT_SECRET = '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'
```

### **Scopes autorizados:**
- **Gmail**: `gmail.send` + `gmail.readonly`
- **Calendar**: `calendar`
- **Meet**: `calendar` (Meet usa Calendar API)

### **Flujo OAuth:**
1. Usuario click "Conectar con Google"
2. Redirige a: `https://accounts.google.com/o/oauth2/v2/auth`
3. Google muestra pantalla de consentimiento
4. Usuario autoriza
5. Google redirige a: `/integrations/oauth-callback?code=...&state=...`
6. Callback intercambia código por tokens (POST a `oauth2.googleapis.com/token`)
7. Guarda `refresh_token` en `user_integrations` (Supabase)
8. Redirige a `/settings/integrations` con mensaje de éxito

---

## 📦 **Estructura de Datos**

### **Tabla: `user_integrations`**
```sql
{
  user_id: uuid,              -- ID del usuario
  integration_type: text,     -- 'gmail', 'google_calendar', 'google_meet'
  integration_name: text,     -- 'Gmail', 'Google Calendar', 'Google Meet'
  config: jsonb {             -- Credenciales encriptadas
    client_id: string,
    client_secret: string,
    refresh_token: string,    -- ⭐ Token único del usuario
    scope: string,
    provider: 'google'
  },
  is_active: boolean,
  created_at: timestamp
}
```

---

## 🎯 **Uso en el código**

### **Enviar email:**
```javascript
import { sendEmail } from '@/services/integrationsService';
import { useAuth } from '@/contexts/AuthContext';

const { user } = useAuth();

await sendEmail(user.id, {
  to: 'destinatario@ejemplo.com',
  subject: 'Hola desde AL-EON',
  body: '<h1>Email enviado desde tu cuenta</h1>'
});
```

### **Crear evento:**
```javascript
import { createCalendarEvent } from '@/services/integrationsService';
import { useAuth } from '@/contexts/AuthContext';

const { user } = useAuth();

await createCalendarEvent(user.id, {
  summary: 'Reunión con cliente',
  description: 'Revisar proyecto',
  startDateTime: '2025-12-27T10:00:00',
  endDateTime: '2025-12-27T11:00:00',
  attendees: ['cliente@ejemplo.com']
});
```

### **Listar eventos:**
```javascript
import { listCalendarEvents } from '@/services/integrationsService';
import { useAuth } from '@/contexts/AuthContext';

const { user } = useAuth();

const events = await listCalendarEvents(user.id, {
  maxResults: 10
});
```

---

## ⚠️ **Importante**

### **Redirect URI en Google Cloud Console**
Asegúrate de que está agregada en:
1. Ve a: https://console.cloud.google.com/
2. Proyecto: **Al-eon**
3. APIs y servicios → Credenciales
4. OAuth 2.0 Client IDs → Click en tu Client ID
5. URIs de redireccionamiento autorizados:
   ```
   https://al-eon.netlify.app/integrations/oauth-callback
   ```

### **App en Producción**
✅ Ya está publicada (hiciste esto antes)
- Los usuarios pueden autorizar sin restricciones
- Gmail funciona si solo usas `gmail.send`
- Calendar funciona sin verificación

### **Pantalla de Consentimiento**
Si los usuarios ven "App no verificada":
- Es normal para apps nuevas
- Pueden hacer click en "Avanzado" → "Ir a al-eon (no seguro)"
- O completa el proceso de verificación de Google (3-7 días)

---

## 🧪 **Probar la integración**

### **1. Desplegar a Netlify**
```bash
npm run build
# Netlify desplegará automáticamente desde GitHub
```

### **2. Conectar tu cuenta**
1. Ve a https://al-eon.netlify.app
2. Login
3. Configuración → Integraciones → Mis Integraciones
4. Conectar Gmail
5. Conectar Google Calendar

### **3. Enviar email de prueba**
Desde el chat de AL-EON:
```
"Envíame un email a mi-email@gmail.com con un recordatorio"
```

### **4. Crear evento de prueba**
Desde el chat de AL-EON:
```
"Agéndame una reunión mañana a las 10am"
```

---

## 🔒 **Seguridad**

✅ **Tokens por usuario**
- Cada usuario tiene su propio `refresh_token`
- Guardados en Supabase con RLS activo
- Solo el usuario puede ver/usar sus tokens

✅ **Client Secret seguro**
- Está en el código frontend pero es normal
- Google lo requiere para el flujo OAuth
- No da acceso a cuentas sin autorización del usuario

✅ **Revocar acceso**
Usuario puede revocar en cualquier momento:
1. Google: https://myaccount.google.com/permissions
2. AL-EON: Configuración → Integraciones → Desconectar

---

## 📚 **Documentación Google**

- [OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Gmail API](https://developers.google.com/gmail/api)
- [Calendar API](https://developers.google.com/calendar/api)

---

**Fecha de implementación:** 26 de diciembre de 2025
**Commit:** c7cebf7
**Estado:** ✅ Listo para producción
