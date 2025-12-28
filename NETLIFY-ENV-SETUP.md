# 🚨 CONFIGURAR VARIABLES DE ENTORNO EN NETLIFY

## Problema Detectado:
AL-EON está llamando a `api.luisatristain.com` en lugar de `api.al-eon.com` porque **Netlify no tiene las variables de entorno configuradas**.

---

## ✅ SOLUCIÓN: Configurar en Netlify

### Paso 1: Ir a Netlify Dashboard
1. Abre: https://app.netlify.com
2. Selecciona el sitio: **AL-EON** (o como se llame)
3. Click en **Site settings** (Configuración del sitio)
4. Click en **Environment variables** (Variables de entorno)

### Paso 2: Agregar Variables
Click en **Add a variable** y agrega estas:

```
VITE_SUPABASE_URL = https://gptwzuqmuvzttajgjrry.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdHd6dXFtdXZ6dHRhamdqcnJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MDU1NzAsImV4cCI6MjA2ODA4MTU3MH0.AAbVhdrI7LmSPKKRX0JhSkYxVg7VOw-ccizKTOh7pV8

VITE_ALE_CORE_BASE = https://api.al-eon.com
VITE_ALE_CORE_URL = https://api.al-eon.com

VITE_WORKSPACE_ID = core
VITE_DEFAULT_MODE = universal
```

### Paso 3: Redesplegar
1. Después de agregar las variables, click en **Save**
2. Ve a **Deploys**
3. Click en **Trigger deploy** → **Clear cache and deploy site**

---

## 🔍 VERIFICAR EN LOCAL

Para verificar que no haya hardcoded URLs, ejecuta:

```bash
cd "/Users/pg/Documents/CHAT AL-E"
grep -r "luisatristain" --include="*.js" --include="*.jsx" src/
```

Si no encuentra nada, entonces el problema está 100% en Netlify.

---

## 🎯 DESPUÉS DEL REDESPLOY

El sitio debería llamar a `https://api.al-eon.com/api/auth/google/callback` en lugar de `api.luisatristain.com`.

---

## 📝 NOTA IMPORTANTE

Las variables que empiezan con `VITE_` **deben estar configuradas en tiempo de BUILD**, no en runtime. Por eso necesitas redesplegar después de agregarlas.
