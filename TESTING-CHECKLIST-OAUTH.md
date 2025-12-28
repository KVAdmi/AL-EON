# 🧪 CHECKLIST TESTING OAuth - AL-EON

## 📋 TESTING OBLIGATORIO

Después del fix, verificar cada uno de estos puntos:

---

## ✅ FASE 1: Backend (AL-E Core)

### 1.1 Verificar que el servidor está corriendo
```bash
ssh -i ~/Downloads/mercado-pago.pem ubuntu@100.27.201.233
pm2 status
```

**Resultado esperado:**
```
┌─────┬──────────┬─────────┬─────────┬─────────┬──────────┐
│ id  │ name     │ mode    │ status  │ restart │ uptime   │
├─────┼──────────┼─────────┼─────────┼─────────┼──────────┤
│ 0   │ ale-core │ fork    │ online  │ 0       │ 2m       │
└─────┴──────────┴─────────┴─────────┴─────────┴──────────┘
```
- [ ] Status: `online` ✅
- [ ] Restart: `0` (sin crashes) ✅

### 1.2 Verificar logs del backend
```bash
pm2 logs ale-core --lines 50
```

**Buscar:**
- [ ] `[OAuth] Ruta POST /api/auth/google/callback registrada` ✅
- [ ] Sin errores de compilación ✅
- [ ] Sin errores 500 ✅

### 1.3 Test endpoint (sin code válido, solo verificar que responde)
```bash
curl -X POST https://api.al-eon.com/api/auth/google/callback \
  -H "Content-Type: application/json" \
  -d '{
    "code": "TEST",
    "userId": "aa6e5204-7ff5-47fc-814b-b52e5c6af5d6",
    "integrationType": "gmail",
    "redirect_uri": "https://al-eon.com/integrations/oauth-callback"
  }'
```

**Resultado esperado:**
```json
{
  "ok": false,
  "error": "INVALID_CODE",
  "message": "El código de autorización expiró o es inválido..."
}
```

- [ ] Responde con JSON (no HTML) ✅
- [ ] Código 400 (no 500) ✅
- [ ] Mensaje de error claro ✅

---

## ✅ FASE 2: Frontend (AL-EON)

### 2.1 Verificar que la app carga
- [ ] Ir a: https://al-eon.com
- [ ] Login funciona ✅
- [ ] No hay errores en consola ✅

### 2.2 Verificar página de integraciones
- [ ] Ir a: https://al-eon.com/settings/integrations
- [ ] Página carga correctamente ✅
- [ ] Botones "Conectar Gmail", "Conectar Calendar", "Conectar Meet" visibles ✅

### 2.3 Verificar ruta de callback existe
- [ ] Ir manualmente a: https://al-eon.com/integrations/oauth-callback
- [ ] Debería mostrar página de "Procesando..." o similar ✅
- [ ] No debería mostrar 404 ✅

---

## ✅ FASE 3: Flujo OAuth Completo (GMAIL)

### 3.1 Iniciar conexión
- [ ] Ir a: https://al-eon.com/settings/integrations
- [ ] Click "Conectar Gmail"
- [ ] Redirige a Google OAuth ✅
- [ ] URL de Google incluye `client_id`, `redirect_uri`, `scope` ✅

### 3.2 Autorizar en Google
- [ ] Google muestra pantalla de consentimiento ✅
- [ ] Nombre del proyecto: "AL-EON" o similar ✅
- [ ] Permisos solicitados:
  - [ ] "Ver y enviar emails" ✅
  - [ ] "Leer emails" ✅
- [ ] Click "Permitir"

### 3.3 Callback y procesamiento
- [ ] Google redirige a: https://al-eon.com/integrations/oauth-callback?code=...&state=... ✅
- [ ] Frontend muestra "Procesando..." o loading ✅
- [ ] Frontend envía POST al backend ✅

**Verificar en DevTools → Network:**
- [ ] Request a: `https://api.al-eon.com/api/auth/google/callback` ✅
- [ ] Method: POST ✅
- [ ] Body incluye: `code`, `userId`, `integrationType`, `redirect_uri` ✅
- [ ] Response: JSON con `ok: true` ✅

### 3.4 Éxito y redirección
- [ ] Frontend muestra: "✅ Gmail conectado correctamente" ✅
- [ ] Redirige a: `/settings/integrations` ✅
- [ ] Gmail aparece en lista de integraciones conectadas ✅
- [ ] Muestra email del usuario ✅

---

## ✅ FASE 4: Verificar en Supabase

### 4.1 Conectar a Supabase
- [ ] Ir a: https://supabase.com
- [ ] Login
- [ ] Seleccionar proyecto AL-EON

### 4.2 Verificar tabla `user_integrations`
```sql
SELECT 
  user_id,
  integration_type,
  integration_name,
  is_active,
  access_token IS NOT NULL as has_access_token,
  refresh_token IS NOT NULL as has_refresh_token,
  token_expires_at,
  LENGTH(access_token) as access_token_length,
  LENGTH(refresh_token) as refresh_token_length,
  scopes,
  metadata,
  connected_at,
  updated_at
FROM user_integrations
WHERE user_id = 'TU_USER_ID'  -- Reemplazar con tu user_id
  AND integration_type = 'gmail'
ORDER BY connected_at DESC
LIMIT 1;
```

**Verificar:**
- [ ] Registro existe ✅
- [ ] `is_active = true` ✅
- [ ] `has_access_token = true` ✅
- [ ] `has_refresh_token = true` ✅
- [ ] `access_token_length > 100` ✅
- [ ] `refresh_token_length > 100` ✅
- [ ] `token_expires_at` es fecha futura ✅
- [ ] `scopes` incluye Gmail scopes ✅
- [ ] `metadata` tiene `email`, `name`, `picture` ✅

---

## ✅ FASE 5: Flujo OAuth Completo (GOOGLE CALENDAR)

Repetir FASE 3 pero para Google Calendar:
- [ ] Click "Conectar Google Calendar"
- [ ] Autorizar en Google
- [ ] Verificar permisos: "Ver y editar eventos de calendario"
- [ ] Verificar éxito y redirección
- [ ] Verificar en Supabase: `integration_type = 'google_calendar'`

---

## ✅ FASE 6: Flujo OAuth Completo (GOOGLE MEET)

Repetir FASE 3 pero para Google Meet:
- [ ] Click "Conectar Google Meet"
- [ ] Autorizar en Google
- [ ] Verificar permisos: "Ver y editar calendario" (Meet usa Calendar API)
- [ ] Verificar éxito y redirección
- [ ] Verificar en Supabase: `integration_type = 'google_meet'`

---

## ✅ FASE 7: Error Handling

### 7.1 Usuario cancela autorización
- [ ] Iniciar flujo OAuth
- [ ] En pantalla de Google, click "Cancelar" o cerrar ventana
- [ ] Google redirige con `?error=access_denied`
- [ ] Frontend muestra mensaje de error apropiado ✅
- [ ] No se guarda nada en Supabase ✅

### 7.2 Code expirado
Esto es difícil de testear manualmente, pero verificar en logs:
- [ ] Backend detecta `invalid_grant`
- [ ] Backend devuelve error claro
- [ ] Frontend muestra: "Código expiró. Intenta de nuevo."

### 7.3 Usuario no autenticado
- [ ] Cerrar sesión en AL-EON
- [ ] Intentar ir a `/integrations/oauth-callback`
- [ ] Debería redirigir a login o mostrar error ✅

---

## ✅ FASE 8: Reconexión

### 8.1 Desconectar integración
- [ ] Ir a: `/settings/integrations`
- [ ] Gmail debería estar conectado
- [ ] Click "Desconectar" o botón similar
- [ ] Gmail desaparece de la lista ✅

**Verificar en Supabase:**
```sql
SELECT is_active 
FROM user_integrations 
WHERE user_id = 'TU_USER_ID' 
  AND integration_type = 'gmail';
```
- [ ] `is_active = false` ✅

### 8.2 Volver a conectar
- [ ] Repetir FASE 3 completa
- [ ] Gmail se conecta de nuevo ✅
- [ ] En Supabase, mismo registro actualizado (no duplicado) ✅
- [ ] `is_active = true` de nuevo ✅

---

## ✅ FASE 9: Testing Funcional

### 9.1 Gmail: Enviar email (si tienes tool de envío)
```javascript
// Ejemplo: En chat de AL-EON
"Envía un email a test@example.com con asunto 'Test'"
```
- [ ] Backend usa tokens de `user_integrations` ✅
- [ ] Email se envía correctamente ✅
- [ ] No hay error de autenticación ✅

### 9.2 Calendar: Crear evento (si tienes tool de calendario)
```javascript
// Ejemplo: En chat de AL-EON
"Crea un evento 'Reunión' mañana a las 10am"
```
- [ ] Backend usa tokens de `user_integrations` ✅
- [ ] Evento se crea correctamente ✅
- [ ] Aparece en Google Calendar del usuario ✅

---

## ✅ FASE 10: Refresh Token

### 10.1 Esperar a que expire access_token
Esto toma ~1 hora. Alternativamente:

**Simular expiración en Supabase:**
```sql
UPDATE user_integrations
SET token_expires_at = NOW() - INTERVAL '1 hour'
WHERE user_id = 'TU_USER_ID'
  AND integration_type = 'gmail';
```

### 10.2 Intentar usar la integración
- [ ] Usar tool de Gmail o Calendar
- [ ] Backend detecta token expirado ✅
- [ ] Backend usa `refresh_token` para obtener nuevo `access_token` ✅
- [ ] Backend actualiza `user_integrations` con nuevo token ✅
- [ ] Operación se completa exitosamente ✅

**Verificar en Supabase:**
```sql
SELECT 
  access_token,
  token_expires_at,
  updated_at
FROM user_integrations
WHERE user_id = 'TU_USER_ID'
  AND integration_type = 'gmail';
```
- [ ] `access_token` es diferente (renovado) ✅
- [ ] `token_expires_at` es fecha futura nueva ✅
- [ ] `updated_at` es reciente ✅

---

## 📊 RESUMEN DE TESTING

### Crítico (DEBE pasar):
- [ ] Usuario puede conectar Gmail
- [ ] Tokens se guardan en Supabase
- [ ] Tokens tienen `access_token` y `refresh_token`
- [ ] Frontend muestra éxito después de conectar

### Importante (DEBERÍA pasar):
- [ ] Usuario puede conectar Calendar y Meet
- [ ] Error handling funciona (usuario cancela)
- [ ] Desconectar y reconectar funciona
- [ ] Tokens funcionan (enviar email, crear evento)

### Opcional (nice to have):
- [ ] Refresh token funciona
- [ ] Múltiples usuarios pueden conectar simultáneamente
- [ ] Logs son claros y útiles

---

## 🚨 SI ALGO FALLA

### 1. Verificar logs del backend
```bash
ssh -i ~/Downloads/mercado-pago.pem ubuntu@100.27.201.233
pm2 logs ale-core --lines 200 | grep OAuth
```

### 2. Verificar logs del frontend
- Abrir DevTools → Console
- Buscar errores relacionados con OAuth

### 3. Verificar Google Cloud Console
- Ir a: https://console.cloud.google.com/
- APIs & Services → Credentials
- Verificar URIs autorizadas

### 4. Verificar variables de entorno del backend
```bash
ssh -i ~/Downloads/mercado-pago.pem ubuntu@100.27.201.233
cd /home/ubuntu/AL-E-Core
cat .env | grep GOOGLE
```

Debe incluir:
```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

---

## ✅ TESTING COMPLETADO

Cuando todos los checks estén marcados:
- [ ] Documentar resultados
- [ ] Avisar al equipo que OAuth está listo
- [ ] Cerrar issue/ticket relacionado

---

**Fecha de testing:** __________
**Testeado por:** __________
**Estado:** [ ] ✅ Todo OK  [ ] ⚠️ Algunos fallos  [ ] ❌ No funciona

**Notas adicionales:**
_______________________________________________________________________
_______________________________________________________________________
_______________________________________________________________________
