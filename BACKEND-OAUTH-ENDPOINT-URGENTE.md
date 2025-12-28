# 🚨 URGENTE: Implementar Endpoint OAuth en Backend

## 📋 PROBLEMA ACTUAL

Frontend envía correctamente:
```javascript
POST https://api.al-eon.com/api/auth/google/callback
{
  "code": "4/0AanRRrv...", // ✅ Code de Google
  "userId": "aa6e5204-7ff5-47fc-814b-b52e5c6af5d6", // ✅ UUID del usuario
  "integrationType": "gmail", // ✅ Tipo de integración
  "redirect_uri": "https://al-eon.com/integrations/oauth-callback" // ✅ URI correcta
}
```

Pero backend responde:
```json
{
  "ok": false,
  "error": "TOKEN_EXCHANGE_FAILED",
  "message": "No se pudo obtener tokens de Google"
}
```

---

## 🔧 SOLUCIÓN: Implementar Endpoint

### **Archivo: `src/api/oauth.ts` (o similar)**

```typescript
import express from 'express';
import { google } from 'googleapis';
import { supabase } from '../lib/supabase';

const router = express.Router();

// Configuración de Google OAuth
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  'https://al-eon.com/integrations/oauth-callback' // Debe coincidir con Google Console
);

// ✅ ENDPOINT QUE NECESITAS IMPLEMENTAR
router.post('/api/auth/google/callback', async (req, res) => {
  try {
    const { code, userId, integrationType, redirect_uri } = req.body;

    // 1️⃣ Validar campos requeridos
    if (!code) {
      return res.status(400).json({
        ok: false,
        error: 'MISSING_CODE',
        message: 'Campo code es requerido'
      });
    }

    if (!userId) {
      return res.status(400).json({
        ok: false,
        error: 'MISSING_USER_ID',
        message: 'Campo userId es requerido'
      });
    }

    if (!integrationType || !['gmail', 'google_calendar', 'google_meet'].includes(integrationType)) {
      return res.status(400).json({
        ok: false,
        error: 'INVALID_INTEGRATION_TYPE',
        message: 'integrationType debe ser: gmail, google_calendar o google_meet'
      });
    }

    console.log('[OAuth] Intercambiando code por tokens...', {
      userId,
      integrationType,
      codeLength: code.length
    });

    // 2️⃣ Intercambiar code por tokens (usando Google API)
    oauth2Client.redirectUri = redirect_uri || 'https://al-eon.com/integrations/oauth-callback';
    
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.access_token) {
      throw new Error('No se recibió access_token de Google');
    }

    console.log('[OAuth] ✅ Tokens obtenidos:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiresIn: tokens.expiry_date
    });

    // 3️⃣ Obtener info del usuario de Google
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    console.log('[OAuth] Info del usuario de Google:', {
      email: userInfo.email,
      name: userInfo.name
    });

    // 4️⃣ Guardar tokens en Supabase
    const { error: dbError } = await supabase
      .from('user_integrations')
      .upsert({
        user_id: userId,
        integration_type: integrationType,
        integration_name: `${userInfo.name} (${userInfo.email})`,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        scopes: tokens.scope?.split(' ') || [],
        is_active: true,
        metadata: {
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture
        }
      }, {
        onConflict: 'user_id,integration_type'
      });

    if (dbError) {
      console.error('[OAuth] ❌ Error guardando en BD:', dbError);
      throw new Error(`Error guardando tokens: ${dbError.message}`);
    }

    console.log('[OAuth] ✅ Tokens guardados en Supabase');

    // 5️⃣ Responder éxito
    return res.json({
      ok: true,
      message: 'Integración conectada correctamente',
      integration: {
        type: integrationType,
        email: userInfo.email,
        name: userInfo.name
      }
    });

  } catch (error) {
    console.error('[OAuth] ❌ Error en callback:', error);
    
    // Errores específicos de Google OAuth
    if (error.message?.includes('invalid_grant')) {
      return res.status(400).json({
        ok: false,
        error: 'INVALID_CODE',
        message: 'El código de autorización expiró o es inválido. Intenta de nuevo.'
      });
    }

    return res.status(400).json({
      ok: false,
      error: 'TOKEN_EXCHANGE_FAILED',
      message: error.message || 'No se pudo obtener tokens de Google'
    });
  }
});

export default router;
```

---

## 🔑 VARIABLES DE ENTORNO REQUERIDAS

Agrega esto al `.env` del backend:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=1010443733044-vq1i6rjjc7jk4evr0cfccg8h12v8ipaj.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
```

---

## 📦 DEPENDENCIAS NECESARIAS

```bash
npm install googleapis
```

O en `package.json`:
```json
{
  "dependencies": {
    "googleapis": "^140.0.0"
  }
}
```

---

## ✅ CHECKLIST

- [ ] Instalar `googleapis`
- [ ] Crear archivo `src/api/oauth.ts` con el código de arriba
- [ ] Agregar variables de entorno (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
- [ ] Registrar ruta en el servidor principal (e.g., `app.use(oauthRouter)`)
- [ ] Verificar que tabla `user_integrations` existe en Supabase
- [ ] Reiniciar servidor backend
- [ ] Testear desde AL-EON Console

---

## 🧪 TESTING

Una vez implementado, puedes testear así:

```bash
curl -X POST https://api.al-eon.com/api/auth/google/callback \
  -H "Content-Type: application/json" \
  -d '{
    "code": "TEST_CODE",
    "userId": "aa6e5204-7ff5-47fc-814b-b52e5c6af5d6",
    "integrationType": "gmail",
    "redirect_uri": "https://al-eon.com/integrations/oauth-callback"
  }'
```

Debería responder:
```json
{
  "ok": true,
  "message": "Integración conectada correctamente",
  "integration": {
    "type": "gmail",
    "email": "usuario@example.com",
    "name": "Usuario Test"
  }
}
```

---

## ❓ PREGUNTAS FRECUENTES

**Q: ¿Por qué `TOKEN_EXCHANGE_FAILED`?**
A: Porque el endpoint no existe o no está intercambiando el code correctamente.

**Q: ¿El frontend está enviando bien los datos?**
A: SÍ. El frontend YA está enviando todo correctamente. El problema es solo backend.

**Q: ¿Dónde registro la ruta?**
A: En tu archivo principal (e.g., `server.ts` o `app.ts`):
```typescript
import oauthRouter from './api/oauth';
app.use(oauthRouter);
```

**Q: ¿Qué pasa si el usuario rechaza permisos?**
A: Google redirige con `?error=access_denied`. El frontend ya lo maneja.

---

## 🚀 IMPLEMENTACIÓN ESTIMADA

⏱️ **Tiempo: 15-20 minutos**

1. Instalar googleapis (2 min)
2. Crear archivo oauth.ts (5 min)
3. Agregar variables de entorno (2 min)
4. Registrar ruta (1 min)
5. Testing (5-10 min)

---

## 📞 CONTACTO

Si hay dudas o problemas:
- Frontend YA está listo y enviando datos correctamente
- Solo falta implementar este endpoint en backend
- Credenciales de Google ya están listas para usar

**¡Urge! Los usuarios no pueden conectar Gmail sin esto.**
