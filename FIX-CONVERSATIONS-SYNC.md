# 🔄 FIX: SINCRONIZACIÓN DE CONVERSACIONES ENTRE DISPOSITIVOS

**Fecha:** 25 diciembre 2025  
**Problema:** Conversaciones NO se sincronizan entre mobile y desktop  
**Causa:** Solo se guardaban en localStorage (aislado por dispositivo)  
**Solución:** Persistencia en Supabase + sincronización automática

---

## 🎯 OBJETIVO

Permitir que el usuario:
- ✅ Inicie conversación en desktop
- ✅ Continue en mobile (mismos mensajes)
- ✅ Borre conversación en cualquier dispositivo (se sincroniza)
- ✅ Trabaje offline (localStorage como cache)

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### 1️⃣ **BACKEND (Supabase)**

#### Paso 1: Ejecutar SQL
```bash
# URL: https://supabase.com/dashboard/project/gptwzuqmuvzttajgjrry/sql/new
# Archivo: SUPABASE-FIX-CONVERSATIONS-SYNC.sql
```

**Resultado esperado:**
- ✅ Tabla `user_conversations` creada
- ✅ RLS habilitado (cada usuario ve solo sus datos)
- ✅ Trigger `updated_at` automático
- ✅ Índices para performance

#### Verificación:
```sql
-- Ver tabla
SELECT * FROM user_conversations LIMIT 5;

-- Ver políticas
SELECT policyname FROM pg_policies WHERE tablename = 'user_conversations';
```

---

### 2️⃣ **FRONTEND (Código)**

#### Archivos creados:
1. **`src/services/conversationsService.js`** ✅
   - `loadConversationsFromSupabase()` - Lee conversaciones del usuario
   - `saveConversationToSupabase()` - Guarda conversación (upsert)
   - `deleteConversationFromSupabase()` - Borra conversación
   - `migrateLocalStorageToSupabase()` - Migra localStorage → Supabase
   - `mergeConversations()` - Estrategia Last Write Wins

#### Archivos modificados:
2. **`src/features/chat/hooks/useConversations.js`** ✅
   - **On mount:** Carga de Supabase + localStorage → merge
   - **On change:** Guarda en localStorage + Supabase
   - **On delete:** Borra de localStorage + Supabase + backend
   - **Migración automática:** Si hay conversaciones locales que no están en Supabase

---

### 3️⃣ **BUILD Y DEPLOY**

```bash
# 1. Build
npm run build

# 2. Commit
git add .
git commit -m "feat: sync conversations across devices via Supabase"

# 3. Deploy
git push
# Netlify auto-deploys
```

---

## 🔧 CÓMO FUNCIONA

### Arquitectura:
```
┌─────────────┐     Sync      ┌──────────────┐
│  DESKTOP    │ ◄──────────► │   SUPABASE   │
│ localStorage│               │ user_convers │
└─────────────┘               └──────────────┘
                                      ▲
                                      │ Sync
                                      ▼
                              ┌──────────────┐
                              │    MOBILE    │
                              │ localStorage │
                              └──────────────┘
```

### Flujo:

1. **Carga inicial (mount):**
   ```javascript
   localStorage → [conv1, conv2]
   Supabase    → [conv2, conv3]
   Merge       → [conv1, conv2, conv3]  // Last Write Wins
   ```

2. **Guardar mensaje (cambio):**
   ```javascript
   User types → localStorage (instant)
                ↓
                Supabase (async)
   ```

3. **Borrar conversación:**
   ```javascript
   User deletes → localStorage
                  ↓
                  Supabase
                  ↓
                  Backend (si tiene sessionId)
   ```

4. **Offline mode:**
   ```javascript
   No Supabase connection → localStorage only
   When online again → auto-sync
   ```

---

## 🧪 PRUEBA MANUAL

### Test 1: Desktop → Mobile
1. Abre https://al-eon.com en **Chrome desktop**
2. Inicia conversación: "Hola AL-EON"
3. Abre https://al-eon.com en **móvil**
4. ✅ Debe ver la misma conversación "Hola AL-EON"

### Test 2: Mobile → Desktop
1. En móvil, crea nueva conversación: "Test desde móvil"
2. Refresca desktop
3. ✅ Debe aparecer "Test desde móvil"

### Test 3: Borrar
1. Borra conversación en móvil
2. Refresca desktop
3. ✅ Conversación desaparecida en ambos

### Test 4: Offline
1. Desconecta WiFi en móvil
2. Escribe mensajes
3. Reconecta WiFi
4. ✅ Mensajes se sincronizan automáticamente

---

## 📊 LOGS ESPERADOS

```javascript
// On mount
📱 localStorage: 2 conversaciones
☁️ Supabase: 3 conversaciones
✅ Merged: 3 conversaciones
🔄 Migrando conversaciones locales a Supabase...
✅ Conversación abc123 guardada en Supabase

// On save
✅ Conversación xyz789 guardada en Supabase

// On delete
✅ Sesión eliminada del backend: session_123
✅ Conversación xyz789 borrada de Supabase
```

---

## ⚠️ CONSIDERACIONES

### RLS (Row Level Security)
- ✅ Cada usuario ve **SOLO sus conversaciones**
- ✅ No puede leer/editar conversaciones de otros
- ✅ `auth.uid()` verifica identidad en cada query

### Performance
- ✅ Índices en `user_id` y `updated_at`
- ✅ localStorage como cache (respuesta inmediata)
- ✅ Supabase async (no bloquea UI)

### Conflictos
- ✅ **Last Write Wins:** Si dos dispositivos editan la misma conversación, gana el más reciente
- ⚠️ **Limitación:** No hay merge granular por mensaje (se sobrescribe toda la conversación)
- 🔮 **Futuro:** Implementar CRDT o operational transforms para merge real-time

---

## 🚀 PRÓXIMOS PASOS

1. ✅ **Ejecutar SQL en Supabase** (SUPABASE-FIX-CONVERSATIONS-SYNC.sql)
2. ✅ **Build y deploy** (npm run build + git push)
3. ✅ **Probar en mobile + desktop**
4. ✅ **Verificar logs en consola**
5. ❌ **PENDIENTE:** Real-time sync con Supabase Realtime (suscripciones)

---

## 🐛 TROUBLESHOOTING

### Error: "No hay usuario autenticado"
- **Causa:** Usuario no hizo login
- **Fix:** Modo offline automático (localStorage only)

### Error: "Row Level Security"
- **Causa:** Usuario intentando acceder a conversaciones de otro
- **Fix:** Verificar que `user_id` en query coincida con `auth.uid()`

### Conversaciones no sincronizan
- **Check 1:** Ver logs en consola (deben aparecer "☁️ Supabase: X conversaciones")
- **Check 2:** Verificar que tabla `user_conversations` existe
- **Check 3:** Verificar que RLS está habilitado pero permite SELECT/INSERT/UPDATE/DELETE

---

## 📝 NOTAS

- ✅ **Signup ya funciona** (CEO pudo registrarse)
- ✅ **Long document detection revertido** (frontend no impone backend)
- ⏳ **Sync de conversaciones implementado** (pendiente deploy)
- ❌ **AL-EON demasiado genérico** (problema de backend, no frontend)

---

## 🎉 BENEFICIOS

- ✅ **UX fluida:** Usuario trabaja en cualquier dispositivo sin perder contexto
- ✅ **Backup automático:** Conversaciones persistidas en Supabase
- ✅ **Offline-first:** Funciona sin conexión, sincroniza después
- ✅ **Seguro:** RLS garantiza que cada usuario solo ve sus datos
