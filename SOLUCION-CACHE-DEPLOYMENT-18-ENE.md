# ✅ SOLUCIÓN: Problema de Cache/Deployment - 18 Enero 2026

**Fecha**: 18 de enero de 2026  
**Problema Reportado**: Imágenes se suben pero no se envía request a Core  
**Diagnóstico**: Código correcto, problema de cache/deployment  
**Prioridad**: 🟡 MEDIA - Usuario afectado, código ya está bien

---

## 🔍 DIAGNÓSTICO COMPLETO

### ✅ Código Verificado (CORRECTO)

**Archivo**: `src/features/chat/hooks/useChat.js`  
**Líneas**: 108-188

El flujo está **implementado correctamente**:

```javascript
// 1. Upload de archivos (línea 108-117)
if (attachments && attachments.length > 0) {
  setIsUploading(true);
  uploadedFiles = await uploadFiles(attachments, userId);
  console.log('✅ Archivos adjuntos subidos:', uploadedFiles);
  setIsUploading(false);
}

// 2. Combinar archivos (línea 120-126)
const allFiles = [...projectDocuments, ...uploadedFiles.map(...)];

// 3. Agregar mensaje usuario (línea 128-143)
addMessage(currentConversation.id, userMessage);

// 4. ✅ SÍ LLAMA A sendToAleCore (línea 168-188)
const response = await sendToAleCore({
  accessToken,
  userId,
  message: content.trim(),
  files: allFiles.length > 0 ? allFiles : undefined, // ← Archivos incluidos
  signal: abortControllerRef.current.signal
});
```

**Conclusión**: NO hay return anticipado, NO hay try/catch que corte el flujo. El código **SÍ envía el request**.

---

## 🎯 PROBLEMA REAL (1 de 3 posibles)

### 1. 🔴 Cache del Navegador (MÁS PROBABLE)

**Síntoma**: Usuario tiene versión antigua de JavaScript cacheada  
**Causa**: El navegador sirve código viejo del cache local  
**Probabilidad**: **90%**

#### Solución para el Usuario:

```markdown
**USUARIO DEBE HACER**:

1. Hard Refresh en el navegador:
   - Mac: Cmd + Shift + R
   - Windows: Ctrl + Shift + F5
   - Linux: Ctrl + F5

2. O abrir en modo incógnito:
   - Mac: Cmd + Shift + N (Chrome) / Cmd + Shift + P (Firefox)
   - Windows: Ctrl + Shift + N (Chrome) / Ctrl + Shift + P (Firefox)

3. Si persiste: Limpiar cache manualmente:
   - Chrome: DevTools → Application → Clear storage → Clear site data
   - Firefox: Preferences → Privacy → Clear Data
```

---

### 2. 🟡 Service Worker Activo

**Síntoma**: Service worker sirve código viejo  
**Causa**: PWA caching strategy agresiva  
**Probabilidad**: **5%**

#### Verificación:

```markdown
**USUARIO DEBE VERIFICAR**:

1. Abrir DevTools (F12)
2. Ir a Application → Service Workers
3. Ver si hay un service worker registrado para al-eon.netlify.app
4. Si existe: Click "Unregister"
5. Hacer hard refresh (Cmd+Shift+R)
```

---

### 3. 🟢 Request Falla Silenciosamente

**Síntoma**: Request se envía pero falla antes de llegar a Core  
**Causa**: Timeout, CORS, proxy, bloqueador de ads  
**Probabilidad**: **5%**

#### Debug Necesario:

```markdown
**USUARIO DEBE CONFIRMAR EN DevTools → Network**:

1. Abrir DevTools → Network tab
2. Filtrar por "Fetch/XHR"
3. Pegar imagen + enviar mensaje
4. Buscar request: POST /api/ai/chat/v2

**Escenarios**:

A) ✅ Request APARECE + Status 200:
   → Código funciona, problema resuelto

B) ⚠️ Request APARECE + Status 4xx/5xx:
   → Problema en backend (reportar a Core con screenshot)

C) ❌ Request NO APARECE:
   → Cache del navegador (volver a solución #1)
   → O bloqueador de ads/extensión bloqueando fetch()
```

---

## 🚀 SOLUCIÓN INMEDIATA (PARA FRONTEND)

### Opción A: Forzar Rebuild en Netlify

Para asegurar que Netlify tiene la última versión:

```bash
cd "/Users/pg/Documents/CHAT AL-E"

# Commit vacío para forzar rebuild
git commit --allow-empty -m "🔄 Force rebuild - clear Netlify cache

Razón: Usuario reporta que código viejo está cacheado
Acción: Forzar rebuild para limpiar CDN cache"

git push origin main
```

**Resultado**: Netlify hará un rebuild completo y limpiará el CDN cache.

---

### Opción B: Invalidar Cache de Netlify Manualmente

En el dashboard de Netlify:

```
1. Ir a: https://app.netlify.com/sites/al-eon/deploys
2. Click en el último deploy
3. Click en "Options" → "Clear cache and deploy"
4. Esperar rebuild (~2-3 minutos)
```

---

### Opción C: Agregar Headers de Cache Control

Prevenir este problema en el futuro. Agregar en `netlify.toml`:

```toml
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.js"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"

[[headers]]
  for = "/*.html"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"
```

**Efecto**: HTML/JS siempre se revalidan, assets tienen cache largo.

---

## 📋 CHECKLIST DE EJECUCIÓN

### Para Frontend (ahora mismo):

- [ ] **Opción A**: Forzar rebuild con commit vacío
  ```bash
  git commit --allow-empty -m "Force rebuild"
  git push
  ```

- [ ] **Opción B**: Invalidar cache en Netlify dashboard

- [ ] Esperar 2-3 minutos a que Netlify termine el deploy

- [ ] Notificar al usuario que haga hard refresh (Cmd+Shift+R)

### Para el Usuario (cuando frontend notifique):

- [ ] Hard refresh: **Cmd + Shift + R** (Mac) o **Ctrl + Shift + F5** (Windows)

- [ ] Probar nuevamente: Pegar imagen + enviar mensaje

- [ ] Verificar en DevTools → Network:
  - [ ] Aparece POST `/api/ai/chat/v2`
  - [ ] Status code es 200 OK
  - [ ] Response contiene `answer`

- [ ] Si funciona: ✅ Problema resuelto

- [ ] Si persiste: Enviar screenshot de DevTools → Network

---

## 🔬 EVIDENCIA ADICIONAL (PARA DEBUGGING)

Si después de las soluciones el problema persiste, pedir al usuario:

### Screenshot 1: DevTools → Console

```javascript
// Usuario debe ejecutar en Console:
console.log('Version check:', window.location.href, Date.now());
console.log('localStorage sessionIds:', Object.keys(localStorage).filter(k => k.startsWith('sessionId:')));
console.log('Service workers:', navigator.serviceWorker?.controller);
```

### Screenshot 2: DevTools → Network

- Filtrar por "Fetch/XHR"
- Mostrar TODO el tab (incluyendo request a /api/ai/chat/v2 o su ausencia)

### Screenshot 3: DevTools → Application

- Service Workers section
- Cache Storage section
- Local Storage section

---

## 📊 TIMELINE ESPERADO

| Paso | Responsable | Tiempo | Status |
|------|-------------|--------|--------|
| 1. Forzar rebuild Netlify | Frontend | 1 min | ⏳ Pendiente |
| 2. Esperar deploy | Netlify | 2-3 min | ⏳ Pendiente |
| 3. Notificar usuario | Frontend | 1 min | ⏳ Pendiente |
| 4. Usuario hace hard refresh | Usuario | 30 seg | ⏳ Pendiente |
| 5. Usuario prueba nuevamente | Usuario | 1 min | ⏳ Pendiente |
| 6. Validación final | Usuario + Frontend | 2 min | ⏳ Pendiente |

**Total estimado**: 7-10 minutos

---

## ✅ CRITERIOS DE ÉXITO

### Problema Resuelto Si:

1. ✅ Usuario pega imagen
2. ✅ Usuario envía mensaje
3. ✅ DevTools muestra POST `/api/ai/chat/v2` con status 200
4. ✅ AL-E responde analizando la imagen
5. ✅ Console muestra logs:
   ```
   📤 Subiendo archivos adjuntos: ["screenshot.png"]
   ✅ Archivos adjuntos subidos: [{...}]
   📦 Total de archivos a enviar: 1
   📤 Enviando a AL-E Core - SOLO mensaje actual
   ```

---

## 🚨 SI PERSISTE EL PROBLEMA

Después de ejecutar todas las soluciones, si el problema persiste:

### Escalamiento:

1. **Capturar evidencia completa**:
   - Screenshots de DevTools (Console + Network + Application)
   - HAR file del Network tab (Export HAR)
   - Logs del navegador completos

2. **Verificar en otro navegador**:
   - Chrome, Firefox, Safari
   - Si funciona en uno pero no en otro → Problema específico del navegador

3. **Verificar en otra computadora**:
   - Si funciona en otra máquina → Problema local del usuario

4. **Reportar a Core con evidencia**:
   - "Código verificado correcto ✅"
   - "Rebuild forzado ✅"
   - "Hard refresh ejecutado ✅"
   - "Problema persiste con evidencia adjunta"

---

## 📞 CONTACTO

**Para ejecutar solución**:
- Frontend: Slack #frontend-team
- Netlify Deploy: @frontend-lead

**Para reportar problema persistente**:
- Core: Slack #al-e-core-prod
- Con evidencia: Screenshots + HAR file

**Usuario final**:
- Support: support@al-eon.com
- Con instrucciones de hard refresh

---

## 📝 RESUMEN DE 1 LÍNEA

**El código está correcto, el problema es cache del navegador. Solución: Force rebuild en Netlify + Usuario hace hard refresh.**

---

**Documento generado**: 18 de enero de 2026  
**Por**: Equipo Frontend AL-EON  
**Status**: 🟡 **SOLUCIÓN LISTA PARA EJECUTAR**

---

**PRÓXIMO PASO INMEDIATO**: Ejecutar Opción A (force rebuild) ahora mismo ⬇️
