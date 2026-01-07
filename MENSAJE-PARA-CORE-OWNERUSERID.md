# 🚨 URGENTE: Fix ownerUserId requerido en todas las APIs

## PROBLEMA ACTUAL

**TODOS los endpoints están rechazando requests con error:**
```
"ownerUserId es requerido"
```

**Endpoints afectados:**
- ❌ `/api/telegram/bots/connect` - No se pueden conectar bots de Telegram
- ❌ `/api/email-hub/accounts` - No se pueden crear cuentas de email
- ❌ `/api/mail/send` - No se pueden enviar correos
- ❌ `/api/mail/messages` - No se pueden leer mensajes
- ❌ Todos los endpoints que requieren autenticación

## LO QUE ESTÁ PASANDO

1. ✅ **Frontend SÍ está enviando el token JWT** en el header: `Authorization: Bearer <token>`
2. ✅ **Frontend SÍ está enviando `ownerUserId` en el body**
3. ❌ **Backend está IGNORANDO ambos** y devolviendo error

**Evidencia:**
- El bot de Telegram **SÍ se creó en Supabase** (tabla `telegram_bots` tiene el registro)
- Pero el endpoint devuelve error 400 y el frontend no se actualiza
- Lo mismo pasa con emails y todas las secciones

## LO QUE CORE DEBE HACER **AHORA**

### OPCIÓN 1: Extraer ownerUserId del Token JWT (RECOMENDADO)

```typescript
// src/middleware/requireAuth.ts

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ 
        ok: false, 
        message: 'Autenticación requerida' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Validar token con Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ 
        ok: false, 
        message: 'Token inválido o expirado' 
      });
    }
    
    // ✅ CRÍTICO: Agregar user.id a req para que esté disponible en todos los endpoints
    req.user = user;
    req.userId = user.id; // ← ESTO FALTA
    
    next();
  } catch (error) {
    return res.status(401).json({ 
      ok: false, 
      message: 'Error de autenticación' 
    });
  }
}
```

### Luego en CADA endpoint:

```typescript
// src/api/telegram.ts

router.post('/bots/connect', requireAuth, async (req, res) => {
  try {
    // ✅ OPCIÓN 1: Usar el userId del token (RECOMENDADO)
    const ownerUserId = req.userId || req.user?.id;
    
    // ✅ OPCIÓN 2: Fallback al body si no está en req
    // const ownerUserId = req.userId || req.body.ownerUserId;
    
    if (!ownerUserId) {
      return res.status(400).json({
        ok: false,
        message: 'No se pudo identificar al usuario'
      });
    }
    
    const { botUsername, botToken } = req.body;
    
    // Crear bot con el userId extraído del token
    const bot = await createTelegramBot({
      owner_user_id: ownerUserId, // ← Usar el del token
      bot_username: botUsername,
      bot_token: botToken
    });
    
    res.json({ ok: true, bot });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});
```

### OPCIÓN 2: Aceptar ownerUserId del body PERO sin rechazar (RÁPIDO)

```typescript
router.post('/bots/connect', requireAuth, async (req, res) => {
  try {
    // Intentar obtener de múltiples fuentes
    const ownerUserId = req.userId || req.user?.id || req.body.ownerUserId;
    
    if (!ownerUserId) {
      return res.status(400).json({
        ok: false,
        message: 'No se pudo identificar al usuario. Token: ' + !!req.user
      });
    }
    
    // Resto del código...
  }
});
```

## ARCHIVOS QUE CORE DEBE MODIFICAR

### 1. `src/middleware/requireAuth.ts`
```typescript
// Agregar esto después de validar el token:
req.userId = user.id;
req.user = user;
```

### 2. `src/api/telegram.ts`
```typescript
// En POST /bots/connect
const ownerUserId = req.userId || req.user?.id;
```

### 3. `src/api/mail.ts`
```typescript
// En TODOS los endpoints:
const ownerUserId = req.userId || req.user?.id;
```

### 4. `src/api/email-hub.ts`
```typescript
// En POST /accounts y todos los endpoints:
const ownerUserId = req.userId || req.user?.id;
```

### 5. `src/api/contacts.ts`
```typescript
// En todos los endpoints:
const ownerUserId = req.userId || req.user?.id;
```

## TESTING RÁPIDO

```bash
# 1. Test con curl
curl -X POST https://api.al-eon.com/api/telegram/bots/connect \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "botUsername": "test_bot",
    "botToken": "123456:ABC..."
  }'

# Debe devolver 200 OK y crear el bot
# NO debe pedir ownerUserId en el body
```

## POR QUÉ ES CRÍTICO

1. **TODAS las funcionalidades del frontend están rotas**
   - No se puede configurar email
   - No se puede configurar Telegram
   - No se pueden enviar mensajes
   - No se puede leer correo

2. **Los datos SÍ se están guardando en Supabase**
   - El bot de Telegram existe en la tabla
   - Pero el frontend muestra error y no se actualiza

3. **El token JWT ya tiene toda la info necesaria**
   - No necesitas que el frontend envíe `ownerUserId`
   - Solo extráelo del token que YA estás recibiendo

## RESUMEN EJECUTIVO

**LO QUE HAY QUE HACER:**

1. En `requireAuth`, después de validar el token:
   ```typescript
   req.userId = user.id;
   ```

2. En CADA endpoint, usar:
   ```typescript
   const ownerUserId = req.userId;
   ```

3. **NO rechazar** si `ownerUserId` no viene en el body - ya lo tienes en el token

**TIEMPO ESTIMADO:** 15 minutos

**IMPACTO:** Desbloquea TODO el frontend

---

## LOGS DEL FRONTEND (EVIDENCIA)

```javascript
[TelegramService] 🔍 Iniciando conexión de bot...
[TelegramService] ✅ Token JWT obtenido: eyJhbGciOiJIUzI1NiI...
[TelegramService] 📤 Enviando request a: https://api.al-eon.com/api/telegram/bots/connect
[TelegramService] 📥 Response status: 400 Bad Request
[TelegramService] ❌ Error response: {"ok":false,"message":"ownerUserId es requerido"}
```

**El frontend ESTÁ enviando el token. El backend NO lo está usando.**
