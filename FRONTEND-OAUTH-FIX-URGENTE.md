# 🚨 FRONTEND: Fix OAuth Callback - URGENTE

## 📋 PROBLEMA DETECTADO

El `OAuthCallbackPage.jsx` actual espera:
- Recibir `code` de Google
- Hacer POST a `${BACKEND_URL}/api/auth/google/callback`
- Recibir respuesta JSON del backend

**Pero el backend ahora hace:**
- Redirige automáticamente con query params: `?success=true&type=gmail&email=...`
- NO devuelve JSON

---

## ✅ SOLUCIÓN RECOMENDADA: Opción 1 (Backend devuelve JSON)

**Esta es la solución más simple y NO requiere cambios en el frontend.**

### Backend debe devolver JSON en lugar de redirect:

```typescript
// En src/api/oauth.ts del backend
return res.json({
  ok: true,
  message: 'Integración conectada correctamente',
  integration: {
    type: integrationType,
    email: userInfo.email,
    name: userInfo.name
  }
});
```

**NO hacer:**
```typescript
return res.redirect(`https://al-eon.com/integrations/oauth-callback?success=true&...`);
```

**Beneficios:**
- ✅ Frontend ya está configurado para esto
- ✅ No requiere cambios
- ✅ Funciona inmediatamente

---

## 🔄 OPCIÓN 2: Actualizar Frontend (si el backend NO puede cambiar)

Si el backend **debe** hacer redirect, entonces el frontend necesita cambios:

### Cambios en `OAuthCallbackPage.jsx`:

```jsx
export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Procesando autorización...');

  useEffect(() => {
    // 🔥 NUEVO: Verificar si viene del backend (con query params)
    const success = searchParams.get('success');
    const type = searchParams.get('type');
    const email = searchParams.get('email');
    const error = searchParams.get('error');

    if (success !== null) {
      // Flujo nuevo: Backend redirigió con query params
      handleBackendRedirect(success, type, email, error);
    } else if (user && accessToken) {
      // Flujo viejo: Tenemos code de Google, hacer POST
      handleOAuthCallback();
    }
  }, [searchParams, user, accessToken]);

  // 🆕 NUEVO: Manejar redirect del backend
  function handleBackendRedirect(success, type, email, errorMsg) {
    if (success === 'true') {
      setStatus('success');
      setMessage(`✅ ${getIntegrationName(type)} conectado correctamente!`);
      
      setTimeout(() => {
        navigate('/settings/integrations', { replace: true });
      }, 2000);
    } else {
      setStatus('error');
      setMessage(errorMsg || 'Error al conectar la integración');
      
      setTimeout(() => {
        navigate('/settings/integrations', { replace: true });
      }, 3000);
    }
  }

  // ... resto del código sin cambios
}
```

---

## 🎯 DECISIÓN: ¿Cuál elegir?

| Criterio | Opción 1 (Backend JSON) | Opción 2 (Frontend Query Params) |
|----------|------------------------|----------------------------------|
| Cambios requeridos | Backend solamente | Frontend solamente |
| Tiempo estimado | 2 minutos | 10 minutos |
| Riesgo de bugs | Muy bajo | Bajo |
| Funciona ahora | ✅ Sí | ❌ No |
| Recomendación | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## 🚀 IMPLEMENTACIÓN RÁPIDA (Opción 1)

### Paso 1: Verificar que backend devuelva JSON

En AL-E Core, el endpoint debe ser:

```typescript
// src/api/oauth.ts
router.get('/api/oauth/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    // ... procesamiento ...
    
    // ✅ DEVOLVER JSON (NO redirect)
    return res.json({
      ok: true,
      message: 'Integración conectada correctamente',
      integration: {
        type: integrationType,
        email: userInfo.email,
        name: userInfo.name
      }
    });
    
    // ❌ NO HACER ESTO:
    // return res.redirect(`https://al-eon.com/...`);
    
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: 'TOKEN_EXCHANGE_FAILED',
      message: error.message
    });
  }
});
```

### Paso 2: Testear

1. Usuario hace clic en "Conectar Gmail"
2. Google redirige a backend con code
3. Backend devuelve JSON
4. Frontend recibe JSON y muestra éxito/error

---

## 🔍 VERIFICACIÓN ACTUAL

### Frontend está enviando:

```javascript
// UserIntegrationsPage.jsx línea 89-100
const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.set('redirect_uri', 'https://al-eon.com/integrations/oauth-callback');
```

### Frontend espera recibir:

```javascript
// OAuthCallbackPage.jsx línea 88-109
const response = await fetch(`${BACKEND_URL}/api/auth/google/callback`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify(payload)
});

const result = await response.json(); // ⬅️ ESPERA JSON
```

---

## ⚠️ PROBLEMA DETECTADO EN EL FLUJO

**El `redirect_uri` en el frontend NO COINCIDE con lo esperado.**

### Frontend actual:

```javascript
// UserIntegrationsPage.jsx
const REDIRECT_URI = 'https://al-eon.com/integrations/oauth-callback';
```

Esto significa que Google redirige a **`https://al-eon.com/integrations/oauth-callback`** (frontend), NO al backend.

### Pero necesitamos:

1. **Opción A**: Google → Frontend → POST al Backend
2. **Opción B**: Google → Backend → Redirect al Frontend

---

## 🎯 SOLUCIÓN DEFINITIVA

### MANTENER FLUJO ACTUAL (Opción A - RECOMENDADO)

**No cambiar nada.** El flujo actual es:

1. Usuario → Google OAuth
2. Google → `https://al-eon.com/integrations/oauth-callback?code=...`
3. Frontend (`OAuthCallbackPage`) → POST `https://api.al-eon.com/api/auth/google/callback`
4. Backend → Procesa y devuelve JSON
5. Frontend → Muestra resultado

**Este flujo YA ESTÁ IMPLEMENTADO** ✅

**Problema:** Backend está devolviendo `redirect` en lugar de JSON.

**Solución:** Backend debe devolver JSON.

---

## 📝 INSTRUCCIÓN FINAL PARA BACKEND

**En `src/api/oauth.ts` del backend (AL-E Core):**

Cambiar de:
```typescript
return res.redirect(`https://al-eon.com/integrations/oauth-callback?success=true&...`);
```

A:
```typescript
return res.json({
  ok: true,
  message: 'Integración conectada correctamente',
  integration: {
    type: integrationType,
    email: userInfo.email,
    name: userInfo.name
  }
});
```

**Eso es todo.** ✅

---

## 🧪 TESTING

```bash
# Test desde curl
curl -X POST https://api.al-eon.com/api/auth/google/callback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "code": "GOOGLE_CODE",
    "userId": "USER_UUID",
    "integrationType": "gmail",
    "redirect_uri": "https://al-eon.com/integrations/oauth-callback"
  }'

# Debe devolver JSON:
{
  "ok": true,
  "message": "Integración conectada correctamente",
  "integration": {
    "type": "gmail",
    "email": "user@gmail.com",
    "name": "User Name"
  }
}
```

---

## 🚨 URGENCIA

**Estado actual:**
- ❌ Backend devuelve redirect (incorrecto)
- ✅ Frontend espera JSON (correcto)
- ❌ Integración no funciona

**Solución:**
- ✅ Backend debe devolver JSON
- ✅ Frontend no necesita cambios

**Tiempo estimado:** 2 minutos de cambio en backend

---

## 📞 CONTACTO

Si necesitan ayuda para implementar:
1. Backend debe devolver JSON en lugar de redirect
2. Frontend ya está configurado correctamente
3. El flujo actual es el correcto

**No cambiar el frontend. Solo ajustar el backend.**
