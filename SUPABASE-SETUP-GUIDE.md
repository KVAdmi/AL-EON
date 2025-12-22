# Configuración Rápida de Supabase para AL-EON

## Paso 1: Obtener Credenciales

1. Ve a [supabase.com](https://supabase.com)
2. Crea un proyecto o selecciona uno existente
3. Ve a **Settings** → **API**
4. Copia:
   - **Project URL** (ej: `https://xxxxx.supabase.co`)
   - **anon/public key** (empieza con `eyJhbGc...`)

## Paso 2: Actualizar `.env`

```env
# Supabase Auth
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# AL-E Core API  
VITE_ALE_CORE_URL=https://api.al-entity.com/api/ai/chat
VITE_ALE_CORE_BASE=https://api.al-entity.com

# Workspace
VITE_WORKSPACE_ID=al-eon
VITE_DEFAULT_MODE=universal
```

## Paso 3: Configurar Autenticación en Supabase

### Authentication → Providers

1. **Email** (activado por defecto):
   - ✅ Enable Email provider
   - ✅ Confirm email (opcional, desactiva para testing)
   - Email templates: personaliza si quieres

2. **URL Configuration**:
   - Site URL: `http://localhost:3000` (desarrollo) o `https://tu-dominio.com` (producción)
   - Redirect URLs: 
     - `http://localhost:3000/**`
     - `https://tu-dominio.com/**`

## Paso 4: Ejecutar Migración SQL (BACKEND)

Ve a **SQL Editor** en Supabase y ejecuta `SUPABASE-MIGRATION.sql` paso por paso:

```sql
-- 1. Agregar columnas UUID
ALTER TABLE ae_sessions ADD COLUMN user_id_uuid UUID;
-- ... (resto de PASO 1)

-- 2. Copiar datos
UPDATE ae_sessions SET user_id_uuid = NULLIF(user_id, '')::uuid
WHERE user_id ~ '^[0-9a-f]{8}-...';
-- ... (resto de PASO 2)

-- 3. Crear usuario legacy para datos antiguos
DO $$ BEGIN ... END $$;
-- ... (PASO 3 completo)

-- 4. Renombrar columnas
ALTER TABLE ae_sessions RENAME COLUMN user_id TO user_id_old;
-- ... (resto de pasos)
```

⚠️ **IMPORTANTE**: Ejecuta PASO por PASO y verifica resultados.

## Paso 5: Verificar Tablas

Después de la migración, verifica que existan estas tablas con `user_id UUID`:

```sql
-- Ver estructura
\d ae_sessions
\d ae_messages  
\d ae_user_memory
\d assistant_memories

-- Verificar datos
SELECT COUNT(*), COUNT(DISTINCT user_id) FROM ae_sessions;
```

## Paso 6: Probar Frontend

1. Reinicia el servidor: `npm run dev`
2. Ve a `http://localhost:3000`
3. Verás pantalla de Login
4. Crea una cuenta con tu email
5. Revisa email para confirmar (si está activado)
6. Inicia sesión

## Paso 7: Verificar Token en Requests

Abre DevTools → Network → Busca request a `api.al-entity.com/api/ai/chat`:

```
Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  Content-Type: application/json

Body:
{
  "workspaceId": "al-eon",
  "messages": [...],
  "meta": {...}
}
```

✅ NO debe haber `userId` en el body (se extrae del token en backend)

## Troubleshooting

### Error: "Missing VITE_SUPABASE_URL"
- Verifica que `.env` tenga las variables correctas
- Reinicia el servidor después de cambiar `.env`

### Error: "Invalid login credentials"
- Verifica que el email esté confirmado (o desactiva confirmación)
- Verifica que la contraseña tenga al menos 6 caracteres

### Error: "column user_id does not exist"
- La migración SQL no se ejecutó correctamente
- Ejecuta `SUPABASE-MIGRATION.sql` paso por paso

### Error: "401 Unauthorized" en requests al backend
- El backend aún no tiene el middleware `verifyAuth`
- Implementa `BACKEND-AUTH-IMPLEMENTATION.md`

## Testing Rápido

```javascript
// En la consola del navegador (después de login)
localStorage.getItem('supabase.auth.token')
// Debe mostrar un objeto con access_token

// Ver usuario actual
import { supabase } from '@/lib/supabase';
const { data } = await supabase.auth.getUser();
console.log(data.user);
```

## Crear Usuario de Prueba Manual

```sql
-- En SQL Editor de Supabase
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  uuid_generate_v4(),
  'authenticated',
  'authenticated',
  'test@al-eon.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
);
```

## Producción

1. Actualiza `.env` con URL de producción
2. Configura Redirect URLs en Supabase para tu dominio
3. Activa confirmación de email
4. Configura templates de email personalizados
5. Habilita RLS (Row Level Security) en tablas sensibles:

```sql
-- Ejemplo: Solo leer tus propias sesiones
ALTER TABLE ae_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
ON ae_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
ON ae_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

---

**Estado Actual del Frontend:**
✅ Login/Signup/Forgot Password implementados
✅ AuthContext con Supabase
✅ Rutas protegidas
✅ Token JWT enviado en requests
✅ UI en español

**Pendiente (Backend):**
❌ Middleware `verifyAuth`
❌ Extraer `user_id` del token
❌ Migración de tablas a UUID
