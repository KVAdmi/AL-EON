# 🔗 Guía de Configuración OAuth para Integraciones

Este documento explica cómo configurar OAuth para cada integración en AL-EON.

## 📋 Flujo OAuth Completo

```
1. Usuario click "Conectar" → Frontend
2. Frontend → Backend: POST /api/oauth/authorize/{provider}
3. Backend → Proveedor: Redirige a URL de autorización
4. Usuario autoriza en sitio del proveedor
5. Proveedor → Backend: Redirige con código de autorización
6. Backend → Proveedor: Intercambia código por access token
7. Backend → Supabase: Guarda token en user_integrations
8. Backend → Frontend: Redirige con éxito/error
```

---

## 🔧 Configuración por Proveedor

### 1. GitHub OAuth

**Crear OAuth App:**
1. Ir a: https://github.com/settings/developers
2. Click "New OAuth App"
3. Configurar:
   - **Application name**: AL-EON
   - **Homepage URL**: `https://al-eon.app`
   - **Authorization callback URL**: `https://api.al-entity.com/api/oauth/callback/github`
4. Copiar:
   - `Client ID`
   - `Client Secret`

**Variables de entorno (Backend):**
```bash
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_REDIRECT_URI=https://api.al-entity.com/api/oauth/callback/github
```

**Scopes necesarios:**
- `repo` - Acceso a repositorios privados
- `read:user` - Leer perfil de usuario
- `read:org` - Leer organizaciones

---

### 2. AWS (No usa OAuth, usa Access Keys)

**Crear IAM User:**
1. AWS Console → IAM → Users → Create User
2. Asignar permisos:
   - `AmazonEC2ReadOnlyAccess`
   - `AmazonS3ReadOnlyAccess`
   - `AWSLambdaReadOnlyAccess`
3. Crear Access Key
4. Copiar:
   - `Access Key ID`
   - `Secret Access Key`

**Guardar en user_integrations:**
```json
{
  "access_key_id": "AKIAIOSFODNN7EXAMPLE",
  "secret_access_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  "region": "us-east-1"
}
```

---

### 3. OpenAI (API Key)

**Obtener API Key:**
1. Ir a: https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copiar key (empieza con `sk-`)

**Guardar en user_integrations:**
```json
{
  "api_key": "sk-...your-key-here"
}
```

---

### 4. Netlify OAuth

**Crear OAuth App:**
1. Ir a: https://app.netlify.com/user/applications
2. Click "New OAuth application"
3. Configurar:
   - **Name**: AL-EON
   - **Redirect URI**: `https://api.al-entity.com/api/oauth/callback/netlify`
4. Copiar:
   - `Client ID`
   - `Client Secret`

**Variables de entorno (Backend):**
```bash
NETLIFY_CLIENT_ID=your_client_id
NETLIFY_CLIENT_SECRET=your_client_secret
NETLIFY_REDIRECT_URI=https://api.al-entity.com/api/oauth/callback/netlify
```

---

### 5. Supabase (API Keys)

**Obtener Keys:**
1. Proyecto Supabase → Settings → API
2. Copiar:
   - `Project URL`: `https://xxxxx.supabase.co`
   - `anon public key`: Para cliente
   - `service_role key`: Para backend (admin)

**Guardar en user_integrations:**
```json
{
  "project_url": "https://xxxxx.supabase.co",
  "anon_key": "eyJhbGciOi...",
  "service_role_key": "eyJhbGciOi..." // Solo si es ROOT
}
```

---

### 6. Google Cloud OAuth

**Crear OAuth 2.0 Client:**
1. Google Cloud Console → APIs & Services → Credentials
2. Click "Create Credentials" → "OAuth 2.0 Client ID"
3. Configurar:
   - **Application type**: Web application
   - **Authorized redirect URIs**: `https://api.al-entity.com/api/oauth/callback/google`
4. Copiar:
   - `Client ID`
   - `Client Secret`

**Variables de entorno (Backend):**
```bash
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://api.al-entity.com/api/oauth/callback/google
```

**Scopes necesarios:**
- `https://www.googleapis.com/auth/cloud-platform.read-only`

---

## 🔐 Seguridad

### Encriptación de Tokens

**Backend DEBE encriptar los tokens antes de guardarlos:**

```typescript
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY; // 32 bytes
const IV_LENGTH = 16;

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
```

### Variables de Entorno Requeridas

```bash
# Backend .env
TOKEN_ENCRYPTION_KEY=your-32-byte-secret-key-here
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
NETLIFY_CLIENT_ID=...
NETLIFY_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

---

## 📡 Endpoints del Backend (A implementar)

### 1. Iniciar OAuth Flow
```typescript
POST /api/oauth/authorize/:provider
Body: { redirect_uri: string, scopes?: string[] }
Response: { authorization_url: string }
```

### 2. Callback OAuth
```typescript
GET /api/oauth/callback/:provider?code=xxx&state=xxx
Response: Redirige al frontend con token o error
```

### 3. Listar Integraciones
```typescript
GET /api/integrations
Headers: Authorization: Bearer {jwt}
Response: { integrations: Array<Integration> }
```

### 4. Desconectar Integración
```typescript
DELETE /api/integrations/:type
Headers: Authorization: Bearer {jwt}
Response: { success: boolean }
```

---

## ✅ Checklist de Implementación

### Frontend (AL-EON) ✅
- [x] UI de integraciones lista
- [x] Tabla `user_integrations` SQL creada
- [x] Botones "Conectar" preparados
- [ ] Implementar redirect a OAuth URLs

### Backend (AL-E Core) ⏳
- [ ] Crear endpoints OAuth (`/api/oauth/*`)
- [ ] Implementar encriptación de tokens
- [ ] Guardar tokens en `user_integrations`
- [ ] Implementar refresh de tokens expirados
- [ ] Rate limiting para OAuth endpoints

### Producción 🚀
- [ ] Configurar variables de entorno
- [ ] Crear OAuth apps en cada proveedor
- [ ] Configurar redirect URLs
- [ ] Probar flujo completo por integración
- [ ] Monitoreo de tokens expirados

---

## 🔄 Refresh de Tokens

Los tokens OAuth expiran. El backend debe:

1. Verificar `expires_at` antes de usar token
2. Si está expirado, usar `refresh_token` para obtener nuevo access token
3. Actualizar `access_token` y `expires_at` en la tabla

```typescript
async function refreshTokenIfNeeded(integration: Integration) {
  if (integration.expires_at && new Date(integration.expires_at) < new Date()) {
    const newToken = await refreshOAuthToken(
      integration.integration_type,
      integration.refresh_token
    );
    
    await supabase
      .from('user_integrations')
      .update({
        access_token: encrypt(newToken.access_token),
        expires_at: newToken.expires_at
      })
      .eq('id', integration.id);
  }
}
```

---

## 📚 Referencias

- [GitHub OAuth Docs](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
- [Netlify OAuth Docs](https://docs.netlify.com/api/get-started/#oauth-applications)
- [Google OAuth Docs](https://developers.google.com/identity/protocols/oauth2)
- [AWS Security Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
