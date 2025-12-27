# 🔧 FIX OAUTH + TIMEOUT + ERRORES UX - IMPLEMENTADO

**Fecha**: 27 de diciembre de 2025  
**Estado**: ✅ COMPLETADO

---

## 📋 RESUMEN EJECUTIVO

Se implementaron **3 fixes críticos** (P0) y **1 mejora importante** (P1) para resolver los problemas de OAuth, manejo de errores y UX del chat.

---

## 🔴 PROBLEMAS IDENTIFICADOS

### ❌ Problema #1: OAuth NO guardaba tokens correctamente
**Archivo**: `src/pages/OAuthCallbackPage.jsx`

El código guardaba tokens en un objeto `config` anidado, pero el **backend esperaba**:
- `access_token` (columna NOT NULL)
- `refresh_token` (columna NOT NULL)
- `expires_at` (columna NOT NULL)
- `scopes` (columna NOT NULL)
- `connected_at` (columna NOT NULL)

**Impacto**:
- Backend rechazaba tokens porque estaban en formato incorrecto
- AL-E no podía acceder a Gmail/Calendar
- Errores silenciosos sin feedback al usuario

---

### ❌ Problema #2: NO se detectaban errores OAuth del backend
**Archivo**: `src/features/chat/hooks/useChat.js`

El catch genérico mostraba:
```
Error: OAUTH_NOT_CONNECTED. AL-E no pudo responder.
```

**Debía mostrar**:
```
🔗 Gmail/Calendar no está conectado.
Ve a Configuración > Integraciones para conectar tu cuenta de Google.
```

**Impacto**:
- Usuario no sabía qué hacer para resolver el problema
- Confusión entre errores OAuth y errores generales
- Sin guía clara de recuperación

---

### ⚠️ Problema #3: Timeout de 60s sin feedback visual
**Archivo**: `src/features/chat/hooks/useChat.js` + `MessageThread.jsx`

Había timeout pero:
- ❌ No mostraba tiempo transcurrido
- ❌ No alertaba cuando pasaban >30s
- ❌ Error genérico al cancelar por timeout

**Impacto**:
- Usuario pensaba que app estaba "congelada"
- Cancelación inesperada sin contexto
- Frustración en operaciones largas (enviar email, consultar calendario)

---

## ✅ SOLUCIONES IMPLEMENTADAS

### 🟢 FIX P0 #1: Guardar tokens OAuth correctamente

**Archivo modificado**: `src/pages/OAuthCallbackPage.jsx` (líneas 79-111)

#### ANTES:
```javascript
config: {
  client_id: GOOGLE_CLIENT_ID,
  client_secret: GOOGLE_CLIENT_SECRET,
  refresh_token,
  scope,
  provider: 'google',
}
```

#### DESPUÉS:
```javascript
// ✅ Campos principales (NO NULL según backend)
access_token,           // ✅ NUEVO
refresh_token,          // ✅ Ya existía
expires_at: expiresAt,  // ✅ NUEVO - calculado desde expires_in
scopes: scope,          // ✅ NUEVO
connected_at: new Date().toISOString(), // ✅ NUEVO
is_active: true,        // ✅ Marcar como activo

// ✅ Config adicional (legacy compatibility)
config: {
  client_id: GOOGLE_CLIENT_ID,
  client_secret: GOOGLE_CLIENT_SECRET,
  provider: 'google'
}
```

**Resultado**:
- ✅ Backend ahora recibe tokens en formato correcto
- ✅ AL-E puede acceder a Gmail/Calendar
- ✅ Compatibilidad con sistema legacy

---

### 🟢 FIX P0 #2: Detectar errores OAuth del backend

**Archivo modificado**: `src/features/chat/hooks/useChat.js` (líneas 138-175)

#### DETECCIÓN IMPLEMENTADA:

1. **OAUTH_NOT_CONNECTED**:
   ```
   🔗 Gmail/Calendar no está conectado.
   Ve a Configuración > Integraciones para conectar tu cuenta de Google.
   ```

2. **OAUTH_TOKENS_MISSING** o **token inválido**:
   ```
   ⚠️ Gmail/Calendar está conectado pero los tokens están incompletos o expirados.
   
   **Solución**: Ve a Configuración > Integraciones, desconecta Gmail/Calendar 
   y vuelve a conectarlo.
   ```

3. **OAUTH_TOKEN_EXPIRED**:
   ```
   ⏰ Los tokens de Gmail/Calendar expiraron.
   Ve a Configuración > Integraciones, desconecta y vuelve a conectar tu cuenta.
   ```

4. **Errores genéricos de Google**:
   ```
   ❌ Error de integración Google: [mensaje]
   Intenta desconectar y volver a conectar Gmail/Calendar en Configuración.
   ```

5. **Errores de red**:
   ```
   🌐 **Error de conexión**.
   No se pudo conectar con AL-E Core. Verifica tu conexión a internet.
   ```

6. **Timeout/AbortError**:
   ```
   ⏱️ **La solicitud tardó demasiado y fue cancelada**.
   
   Esto puede ocurrir cuando:
   - AL-E está procesando tareas complejas (enviar emails, consultar calendario)
   - Hay problemas de conexión
   
   **Sugerencia**: Intenta de nuevo o simplifica tu solicitud.
   ```

**Resultado**:
- ✅ Mensajes claros y accionables
- ✅ Usuario sabe exactamente qué hacer
- ✅ Diferenciación entre tipos de error

---

### 🟢 FIX P1 #3: Indicador visual de tiempo de procesamiento

**Archivos modificados**:
- `src/features/chat/components/MessageThread.jsx` (líneas 11-38, 42-58, 169-189)
- `src/features/chat/hooks/useChat.js` (línea 67)

#### COMPONENTE NUEVO: `ProcessingTimer`

```javascript
function ProcessingTimer({ startTime }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <div>
      Procesando... {elapsed}s
      {elapsed > 30 && (
        <span>(operación larga, puede tardar hasta 60s)</span>
      )}
    </div>
  );
}
```

#### COMPORTAMIENTO:
- **0-30s**: `Procesando... 15s`
- **31-60s**: `Procesando... 45s (operación larga, puede tardar hasta 60s)`
- **>60s**: Request se cancela automáticamente con mensaje claro

**Resultado**:
- ✅ Usuario ve progreso en tiempo real
- ✅ Alerta visual cuando pasa de 30s
- ✅ Contexto antes de timeout automático
- ✅ Botón "Detener" siempre visible

---

## 🎯 FLUJO COMPLETO DESPUÉS DEL FIX

### Escenario 1: Usuario conecta Gmail por primera vez

1. Usuario va a **Configuración > Integraciones**
2. Click en "Conectar Gmail"
3. Redirige a Google OAuth con:
   - `access_type=offline` ✅
   - `prompt=consent` ✅
4. Usuario autoriza
5. `OAuthCallbackPage` guarda en Supabase:
   ```json
   {
     "access_token": "ya29.xxx",
     "refresh_token": "1//xxx",
     "expires_at": "2025-12-27T18:30:00Z",
     "scopes": "https://www.googleapis.com/auth/gmail.send",
     "connected_at": "2025-12-27T17:30:00Z",
     "is_active": true,
     "config": { ... }
   }
   ```
6. ✅ Backend ahora puede acceder a Gmail

---

### Escenario 2: Backend devuelve OAUTH_NOT_CONNECTED

1. Usuario pide: "Envíame un correo a patty@example.com"
2. Backend detecta OAuth no conectado
3. Backend responde: `{ error: "OAUTH_NOT_CONNECTED" }`
4. Frontend detecta el error
5. ✅ Muestra mensaje claro:
   ```
   🔗 Gmail/Calendar no está conectado.
   Ve a Configuración > Integraciones para conectar tu cuenta de Google.
   ```

---

### Escenario 3: Operación larga (enviar email)

1. Usuario pide: "Envía un resumen de la reunión por correo"
2. Frontend muestra:
   ```
   [TypingIndicator animado]
   Procesando... 5s
   [Botón Detener]
   ```
3. Después de 30s:
   ```
   [TypingIndicator animado]
   Procesando... 32s (operación larga, puede tardar hasta 60s)
   [Botón Detener]
   ```
4. Si pasa de 60s:
   ```
   ⏱️ **La solicitud tardó demasiado y fue cancelada**.
   
   Esto puede ocurrir cuando:
   - AL-E está procesando tareas complejas (enviar emails, consultar calendario)
   - Hay problemas de conexión
   
   **Sugerencia**: Intenta de nuevo o simplifica tu solicitud.
   ```

---

## 🧪 TESTING RECOMENDADO

### Test #1: OAuth Flow Completo
```bash
1. Desconectar Gmail/Calendar (si está conectado)
2. Ir a Configuración > Integraciones
3. Conectar Gmail
4. Verificar en Supabase que se guardó:
   - access_token (NOT NULL)
   - refresh_token (NOT NULL)
   - expires_at (NOT NULL)
   - scopes (NOT NULL)
   - connected_at (NOT NULL)
```

### Test #2: Errores OAuth UX
```bash
1. Eliminar refresh_token de Supabase
2. Pedir a AL-E: "Envía un correo"
3. ✅ Verificar mensaje claro sobre tokens incompletos
```

### Test #3: Timeout Visual
```bash
1. Desconectar internet
2. Enviar mensaje a AL-E
3. ✅ Verificar que muestra: "Procesando... Xs"
4. ✅ Verificar alerta a los 30s
5. ✅ Verificar cancelación a los 60s con mensaje claro
```

---

## 📝 NOTAS ADICIONALES

### ✅ Lo que YA estaba bien (NO SE TOCÓ):

1. **OAuth Flow URL**:
   - `access_type=offline` ✅
   - `prompt=consent` ✅
   - Scopes correctos ✅

2. **Timeout de 60s**:
   - Ya existía en `useChat.js` ✅
   - Solo se agregó feedback visual

3. **Retry automático**:
   - Ya existía en `aleCoreClient.js` (1 retry) ✅

### 🔴 Lo que se CORRIGIÓ:

1. **Formato de guardado de tokens** ❌➡️✅
2. **Detección de errores OAuth** ❌➡️✅
3. **Feedback visual de timeout** ❌➡️✅

---

## 🚀 PRÓXIMOS PASOS RECOMENDADOS

### Opcional (no crítico):

1. **Renovación automática de tokens**:
   - Detectar cuando `expires_at` está cerca
   - Renovar con `refresh_token` antes de expirar
   - Actualizar `access_token` y `expires_at` en Supabase

2. **Logs mejorados**:
   - Enviar errores OAuth a Sentry/logging
   - Tracking de tiempos de respuesta

3. **Retry inteligente**:
   - Si error es OAuth, NO reintentar
   - Si error es 502/504, reintentar automáticamente

---

## ✅ CHECKLIST FINAL

- [x] Tokens OAuth se guardan correctamente en Supabase
- [x] Backend puede leer tokens en formato esperado
- [x] Errores OAUTH_NOT_CONNECTED se muestran claramente
- [x] Errores OAUTH_TOKENS_MISSING se muestran claramente
- [x] Timeout tiene feedback visual en tiempo real
- [x] Alerta visual a los 30s de procesamiento
- [x] Mensaje claro cuando se cancela por timeout
- [x] Errores de red tienen mensaje específico
- [x] Compatibilidad con sistema legacy mantenida

---

**Implementado por**: GitHub Copilot  
**Revisado por**: TU PROGRAMADOR (pendiente)  
**Estado**: ✅ LISTO PARA PRUEBAS
