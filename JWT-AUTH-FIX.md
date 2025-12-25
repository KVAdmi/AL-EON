# 🔒 JWT AUTH FIX - REGLA DE ORO APLICADA

**Fecha:** 25 diciembre 2025  
**Problema:** Frontend extraía `userId` del JWT con `atob()` (inseguro, inválido)  
**Solución:** Frontend solo manda JWT → Core valida y define `user_uuid`

---

## ❌ LO QUE ESTABA MAL (antes)

### Frontend (`aleCoreClient.js`) líneas 89-99:
```javascript
// ❌ PELIGRO: Decodificar JWT en frontend NO valida nada
const tokenParts = accessToken.split('.');
const payload = JSON.parse(atob(tokenParts[1]));
userId = payload.sub || payload.email; // ❌❌❌

// ❌ Mandaba userId en el body
const payloadData = {
  userId: userId,  // ❌ Frontend no debe mandar identidad
  workspaceId,
  messages
};
```

### Por qué era peligroso:
1. **`atob()` no valida firma JWT** - Atacante puede inventar token con `sub` falso
2. **`email` como fallback** - Cambios de email rompen memoria y seguridad
3. **`atob()` falla con base64url** - JWT usa `-` y `_`, no `+` y `/`
4. **Frontend decide identidad** - Memoria fragmentada, sesiones duplicadas

---

## ✅ LO QUE ESTÁ BIEN (ahora)

### Frontend (`aleCoreClient.js`) - SIMPLIFICADO:
```javascript
// ✅ Frontend SOLO manda el JWT en Authorization header
const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${accessToken}`,
};

// ✅ Payload SIN userId
const payloadData = {
  requestId,        // Solo trazabilidad, NO identidad
  workspaceId,
  mode: "universal",
  messages,
  meta              // Opcional
};

await fetch(`${VITE_ALE_CORE_URL}/api/ai/chat`, {
  method: "POST",
  headers,
  body: JSON.stringify(payloadData),
});
```

### Frontend NO:
- ❌ Extrae `userId` del JWT
- ❌ Manda `userId` en el body
- ❌ Decide identidad del usuario

### Frontend SÍ:
- ✅ Manda JWT en `Authorization: Bearer <token>`
- ✅ Manda `requestId` (solo para logs/trazabilidad)
- ✅ Manda `workspaceId` y `messages`

---

## 🔧 LO QUE DEBE HACER CORE (backend)

### Middleware de autenticación (Node.js + Supabase):

```javascript
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // ⚠️ No usar anon key aquí
);

export async function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) {
    // ✅ Guest explícito (sin promesa de sync)
    req.user_uuid = null;
    return next();
  }

  // ✅ VALIDAR token con Supabase (verifica firma JWT)
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data?.user?.id) {
    return res.status(401).json({ error: "Invalid token" });
  }

  // ✅ ESTE es el UUID real del usuario
  req.user_uuid = data.user.id;
  
  console.log("🔐 AUTH:", {
    hasAuthHeader: Boolean(req.headers.authorization),
    user_uuid: req.user_uuid,
    workspaceId: req.body?.workspaceId,
  });
  
  next();
}
```

### Llave de memoria (Redis/Postgres):

```javascript
// ✅ CORRECTO: user_uuid viene del token validado
const memoryKey = `${workspaceId}:${req.user_uuid}`;

// Si req.user_uuid es null → guest (sin sync garantizado)
// Si req.user_uuid existe → usuario autenticado (sync entre dispositivos)
```

---

## 🧪 CHECK DEFINITIVO

### Logs que DEBES ver en Core:

```javascript
console.log("AUTH", {
  hasAuthHeader: Boolean(req.headers.authorization),
  user_uuid: req.user_uuid,
  workspaceId: req.body?.workspaceId,
});
```

### Resultado esperado (mismo usuario en 2 dispositivos):

**Request 1 (Desktop):**
```json
{
  "hasAuthHeader": true,
  "user_uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "workspaceId": "core"
}
```

**Request 2 (Mobile):**
```json
{
  "hasAuthHeader": true,
  "user_uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",  // ✅ MISMO UUID
  "workspaceId": "core"
}
```

✅ Si `user_uuid` es idéntico en ambos dispositivos → **SYNC RESUELTO**

❌ Si `user_uuid` es diferente o `null` → Token no validado correctamente

---

## 📋 CHECKLIST PARA CORE

- [ ] **Instalar Supabase SDK** en Core:
  ```bash
  npm install @supabase/supabase-js
  ```

- [ ] **Crear middleware** `authMiddleware` que:
  - Lee `Authorization: Bearer <token>`
  - Valida token con `supabaseAdmin.auth.getUser(token)`
  - Define `req.user_uuid = data.user.id`
  - Retorna 401 si token inválido

- [ ] **Aplicar middleware** a todas las rutas que necesitan auth:
  ```javascript
  app.post('/api/ai/chat', authMiddleware, chatHandler);
  app.get('/api/sessions', authMiddleware, sessionsHandler);
  ```

- [ ] **Usar `req.user_uuid`** para memoria:
  ```javascript
  const memoryKey = `${workspaceId}:${req.user_uuid || 'guest'}`;
  ```

- [ ] **Agregar logs** para verificar:
  ```javascript
  console.log("🔐 AUTH:", { hasAuthHeader, user_uuid, workspaceId });
  ```

- [ ] **Probar con 2 dispositivos** (desktop + mobile):
  - Verificar que `user_uuid` sea idéntico
  - Verificar que memoria persista entre dispositivos

---

## 🚀 RESULTADO FINAL

### Frontend (AL-EON):
- ✅ Solo manda JWT en header
- ✅ NO extrae `userId`
- ✅ NO manda `userId` en body
- ✅ Deploy exitoso (commit `b030792`)

### Backend (AL-E Core):
- ⏳ **PENDIENTE:** Implementar `authMiddleware`
- ⏳ **PENDIENTE:** Validar JWT con Supabase
- ⏳ **PENDIENTE:** Usar `req.user_uuid` para memoria
- ⏳ **PENDIENTE:** Logs de verificación

---

## 📞 PRÓXIMO PASO

**Necesitamos logs de Core** con este formato:

```javascript
console.log("AUTH", {
  hasAuthHeader: Boolean(req.headers.authorization),
  user_uuid: req.user_uuid,
  workspaceId: req.body?.workspaceId,
});
```

Pégame **3 líneas reales** de logs de Core para verificar que el fix está completo.

---

## 🎯 REGLA DE ORO (sin debate)

✅ **Frontend:** Solo manda JWT  
✅ **Core:** Valida JWT y define `user_uuid = payload.sub`  
❌ **Frontend NO decide identidad**  

Cero vueltas. Cero fantasmas. 🔒
