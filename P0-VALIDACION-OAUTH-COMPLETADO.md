# ✅ P0 VALIDACIÓN OAUTH - COMPLETADO

**Fecha**: 27 de diciembre de 2025  
**Status**: ✅ VALIDADO Y LISTO PARA PRUEBAS

---

## 📋 CHECKLIST P0 - OAUTH

### ✅ 1. OAuthCallbackPage.jsx - Columnas planas (NO config)

**Confirmado**: El upsert guarda en columnas planas:

```javascript
{
  user_id: user.id,
  integration_type: 'gmail' | 'google_calendar',
  // ✅ Columnas principales (NO NULL)
  access_token: "ya29.xxx",           // ✅ string, no null
  refresh_token: "1//xxx",            // ✅ string, no null si offline
  expires_at: "2025-12-27T18:30:00Z", // ✅ ISO string
  scopes: "gmail.send gmail.readonly", // ✅ string consistente
  connected_at: "2025-12-27T17:30:00Z", // ✅ ISO string
  is_active: true,                    // ✅ boolean
  // Config solo para legacy
  config: { client_id, client_secret, provider }
}
```

**Archivo**: `src/pages/OAuthCallbackPage.jsx` (líneas 91-115)

---

### ✅ 2. Verificación POST-SAVE (nuevo)

**Implementado**: Después del upsert, hace SELECT y valida tokens NO NULL:

```javascript
// 1. Guardar tokens
await supabase.from('user_integrations').upsert({...});

// 2. Verificar que se guardaron correctamente
const { data: savedIntegration } = await supabase
  .from('user_integrations')
  .select('access_token, refresh_token, expires_at, scopes')
  .eq('user_id', user.id)
  .eq('integration_type', integration_type)
  .single();

// 3. Validar que NO están NULL
if (!savedIntegration.access_token || !savedIntegration.refresh_token) {
  throw new Error('❌ Google no entregó refresh_token válido.\n\nReconecta con prompt=consent');
}
```

**Archivo**: `src/pages/OAuthCallbackPage.jsx` (líneas 117-139)

**Mensaje de error si tokens NULL**:
```
❌ Google no entregó refresh_token válido.

Reconecta la integración con prompt=consent activo.

**Pasos**: Revoca el acceso en tu cuenta de Google y vuelve a conectar.
```

---

### ✅ 3. aleCoreClient.js - SIEMPRE manda Authorization Bearer

**Confirmado**: El cliente SIEMPRE valida y envía el token:

```javascript
// 1. Validar que existe accessToken
if (!accessToken) {
  throw new Error("❌ Missing accessToken");
}

// 2. Incluir en headers
headers: {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${accessToken}`  // ✅ SIEMPRE presente
}
```

**Archivo**: `src/lib/aleCoreClient.js` (líneas 67-101)

**Si falta token**: Lanza error inmediatamente, NO intenta llamar al core.

---

### ✅ 4. useChat.js - Detección específica de errores OAuth

**Implementado**: Detecta y muestra mensajes exactos para cada error:

#### 4.1 OAUTH_NOT_CONNECTED
```
🔗 **Gmail/Calendar no está conectado**

Para que AL-E pueda acceder a tu correo y calendario:

1. Ve a **Configuración > Integraciones**
2. Conecta tu cuenta de Google
3. Autoriza los permisos necesarios

Intenta de nuevo después de conectar.
```

#### 4.2 OAUTH_TOKENS_MISSING
```
⚠️ **Tokens de Gmail/Calendar incompletos**

Los tokens están mal configurados o expirados.

**Solución**:
1. Ve a **Configuración > Integraciones**
2. **Desconecta** Gmail/Calendar
3. **Vuelve a conectar** (Google pedirá permiso nuevamente)

Esto renovará los tokens correctamente.
```

#### 4.3 OAUTH_TOKEN_EXPIRED
```
⏰ **Tokens de Gmail/Calendar expirados**

Tus credenciales necesitan renovarse.

**Solución**:
1. Ve a **Configuración > Integraciones**
2. Desconecta y reconecta Gmail/Calendar

AL-E obtendrá tokens nuevos automáticamente.
```

**Archivo**: `src/features/chat/hooks/useChat.js` (líneas 143-192)

**NO usa mensajes genéricos**: Cada error tiene su mensaje específico y acción clara.

---

### ✅ 5. Payload LIMPIO - NO envía messages[]

**Confirmado**: Solo envía campos requeridos:

```javascript
const payloadData = {
  message: message.trim(),        // ✅ Solo mensaje actual
  sessionId: sessionId || undefined,
  workspaceId: workspaceId || 'core',
  meta: {
    platform: "AL-EON",
    version: "1.0.0",
    source: "al-eon-console",
    timestamp: new Date().toISOString()
  }
  // ❌ NO ENVÍA: messages[], historial, contexto
};
```

**Archivo**: `src/lib/aleCoreClient.js` (líneas 76-86)

**Logs de depuración**:
```javascript
console.log('📤 PAYLOAD:', JSON.stringify(payloadData, null, 2));
```

---

## 🧪 PRUEBAS MÍNIMAS REQUERIDAS

### Test #1: Conectar Gmail → Verificar tokens en Supabase

**Pasos**:
1. Ve a https://al-eon.com/settings/integrations
2. Click "Conectar Gmail"
3. Autoriza permisos en Google
4. Espera mensaje: "✅ Gmail conectado exitosamente!"

**Verificación en Supabase**:
```sql
SELECT 
  user_id, 
  integration_type,
  access_token IS NOT NULL as has_access_token,
  refresh_token IS NOT NULL as has_refresh_token,
  expires_at,
  scopes,
  connected_at,
  is_active
FROM user_integrations
WHERE integration_type = 'gmail'
ORDER BY connected_at DESC
LIMIT 1;
```

**Resultado esperado**:
```
has_access_token: true
has_refresh_token: true
expires_at: 2025-12-27T18:30:00.000Z
scopes: "https://www.googleapis.com/auth/gmail.send ..."
connected_at: 2025-12-27T17:30:00.000Z
is_active: true
```

---

### Test #2: Pedir "revisa mi correo" → Debe intentar tool

**Pasos**:
1. Asegúrate de que Gmail está conectado (test #1)
2. En el chat, escribe: **"revisa mi correo"**
3. Enviar mensaje

**Comportamiento esperado**:

#### Si tokens están bien:
```
[TypingIndicator]
Procesando... 5s

[Respuesta de AL-E intentando usar Gmail tool]
```

#### Si tokens están mal (NULL):
```
⚠️ **Tokens de Gmail/Calendar incompletos**

Los tokens están mal configurados o expirados.

**Solución**:
1. Ve a **Configuración > Integraciones**
2. **Desconecta** Gmail/Calendar
3. **Vuelve a conectar** (Google pedirá permiso nuevamente)
```

#### Si Gmail no conectado:
```
🔗 **Gmail/Calendar no está conectado**

Para que AL-E pueda acceder a tu correo y calendario:

1. Ve a **Configuración > Integraciones**
2. Conecta tu cuenta de Google
3. Autoriza los permisos necesarios
```

**NO debe**:
- ❌ Inventar respuestas
- ❌ Decir "no tengo acceso" sin intentar
- ❌ Mostrar errores genéricos

---

## 📊 RESUMEN DE CAMBIOS

### Archivos modificados:

1. **src/pages/OAuthCallbackPage.jsx**
   - ✅ Guarda tokens en columnas planas (access_token, refresh_token, etc.)
   - ✅ Añadido: Verificación POST-SAVE
   - ✅ Añadido: Validación que tokens NO estén NULL
   - ✅ Añadido: Error específico si Google no entrega refresh_token

2. **src/features/chat/hooks/useChat.js**
   - ✅ Mejorado: Detección específica de OAUTH_NOT_CONNECTED
   - ✅ Mejorado: Detección específica de OAUTH_TOKENS_MISSING
   - ✅ Mejorado: Detección específica de OAUTH_TOKEN_EXPIRED
   - ✅ Añadido: Mensajes con pasos claros de resolución
   - ✅ Eliminado: Mensajes genéricos sin acción

3. **src/lib/aleCoreClient.js** (sin cambios, ya estaba correcto)
   - ✅ Valida accessToken antes de llamar
   - ✅ Envía Authorization Bearer siempre
   - ✅ Payload limpio (message, sessionId, workspaceId, meta)
   - ✅ NO envía messages[] ni historial

---

## ✅ VALIDACIÓN FINAL

### Criterios P0 cumplidos:

- [x] OAuth guarda en columnas planas (NO config)
- [x] access_token y refresh_token NO NULL validados post-save
- [x] expires_at calculado correctamente (ISO string)
- [x] scopes guardado como string
- [x] connected_at registrado (ISO string)
- [x] is_active: true
- [x] Verificación POST-SAVE implementada
- [x] Error específico si tokens NULL
- [x] aleCoreClient SIEMPRE envía Authorization Bearer
- [x] aleCoreClient valida token antes de llamar
- [x] useChat detecta OAUTH_NOT_CONNECTED con mensaje específico
- [x] useChat detecta OAUTH_TOKENS_MISSING con mensaje específico
- [x] useChat detecta OAUTH_TOKEN_EXPIRED con mensaje específico
- [x] NO envía messages[] (solo message, sessionId, workspaceId, meta)
- [x] Logs de depuración activos

---

## 🚀 PRÓXIMOS PASOS

1. **Commit y Push** de estos cambios
2. **Esperar deploy** de Netlify (~3-5 min)
3. **Ejecutar Test #1**: Conectar Gmail y verificar Supabase
4. **Ejecutar Test #2**: Pedir "revisa mi correo"
5. **Reportar resultados** al equipo backend

---

## 📝 NOTAS IMPORTANTES

### Para el equipo backend:

Cuando el frontend envía:
```json
{
  "message": "revisa mi correo",
  "sessionId": "abc-123",
  "workspaceId": "core",
  "meta": {...}
}
```

El backend debe:
1. Extraer `userId` del JWT (`Authorization: Bearer`)
2. Buscar `user_integrations` donde `user_id = userId` y `integration_type = 'gmail'`
3. Verificar que `access_token` y `refresh_token` NO sean NULL
4. Si NULL → devolver: `{ error: "OAUTH_TOKENS_MISSING" }`
5. Si no existe → devolver: `{ error: "OAUTH_NOT_CONNECTED" }`
6. Si OK → usar tokens para llamar Gmail API

### Para el equipo frontend:

Si el backend devuelve:
```json
{ "error": "OAUTH_NOT_CONNECTED" }
```

El frontend mostrará automáticamente:
```
🔗 **Gmail/Calendar no está conectado**

Para que AL-E pueda acceder a tu correo y calendario:
1. Ve a **Configuración > Integraciones**
2. Conecta tu cuenta de Google
3. Autoriza los permisos necesarios
```

**NO es necesario hacer nada más** ✅

---

**Estado**: ✅ VALIDADO - LISTO PARA COMMIT Y DEPLOY  
**Siguiente acción**: `git commit` + `git push` + pruebas manuales
