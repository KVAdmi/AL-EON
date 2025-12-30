# 🔍 CHECKLIST DE VERIFICACIÓN - CAPABILITIES GATE

## ✅ ARCHIVOS A VERIFICAR

### 1. CapabilitiesContext creado
```bash
cat src/contexts/CapabilitiesContext.jsx
```
- [x] Exporta `CapabilitiesProvider`
- [x] Exporta `useCapabilities()` hook
- [x] Función `loadCapabilities(accessToken)`
- [x] Función `hasCapability(capability)`

---

### 2. CapabilitiesGate creado
```bash
cat src/components/CapabilitiesGate.jsx
```
- [x] Componente `CapabilitiesGate`
- [x] Hook `useCapability(capability)`
- [x] Retorna `null` si capability=false

---

### 3. App.jsx envuelto con provider
```bash
grep -A 5 "CapabilitiesProvider" src/App.jsx
```
Debe aparecer:
```jsx
<CapabilitiesProvider>
  <AuthProvider>
    <App />
  </AuthProvider>
</CapabilitiesProvider>
```

---

### 4. AuthContext carga capabilities
```bash
grep -A 3 "loadCapabilities" src/contexts/AuthContext.jsx
```
Debe aparecer:
```jsx
await loadCapabilities(session.access_token);
```

---

### 5. extractReply NO interpreta
```bash
grep -A 5 "success === false" src/lib/aleCoreClient.js
```
Debe aparecer:
```jsx
if (data.success === false && data.userMessage) {
  return data.userMessage;
}
```

---

### 6. useChat NO interpreta errores
```bash
grep -B 2 "err.message" src/features/chat/hooks/useChat.js
```
Debe aparecer:
```jsx
content: err.message || 'Error desconocido',
```
**SIN** ningún `if` que interprete el error.

---

### 7. ChatPage usa useCapability
```bash
grep "useCapability" src/features/chat/pages/ChatPage.jsx
```
Debe aparecer:
```jsx
const canUseVoice = useCapability('voice');
```

---

### 8. IntegrationsPage usa useCapability
```bash
grep "useCapability" src/pages/IntegrationsPage.jsx
```
Debe aparecer:
```jsx
const canUseIntegrations = useCapability('integrations');
```

---

## 🧪 PRUEBAS FUNCIONALES

### Prueba 1: Capabilities se cargan al login

1. Abrir DevTools Console
2. Hacer login
3. Buscar en logs:
```
[CAPABILITIES] 📡 Cargando desde: ...
[CAPABILITIES] ✅ Cargadas: {...}
```

---

### Prueba 2: Voice deshabilitado

**Modificar el CORE para retornar:**
```json
{
  "voice": false
}
```

**Resultado esperado:**
- ❌ No aparece VoiceControls en ChatPage
- ❌ No aparece botón de micrófono
- ❌ useVoiceMode retorna `null`

---

### Prueba 3: Mensaje del CORE sin interpretación

**Backend responde:**
```json
{
  "success": false,
  "userMessage": "Gmail no conectado"
}
```

**AL-EON debe mostrar EXACTAMENTE:**
```
Gmail no conectado
```

**SIN:**
- ❌ Emojis
- ❌ "Intenta de nuevo"
- ❌ Instrucciones adicionales

---

## 🚨 ERRORES COMUNES

### Error 1: CapabilitiesContext no encontrado
```
Error: useCapabilities debe usarse dentro de CapabilitiesProvider
```

**Solución:**
Verificar que App.jsx está envuelto con `<CapabilitiesProvider>`

---

### Error 2: Capabilities no se cargan
```
[CAPABILITIES] ⚠️ No accessToken, skipping load
```

**Solución:**
Verificar que AuthContext llama a `loadCapabilities(accessToken)` después de login

---

### Error 3: Features aparecen aunque capability=false
**Problema:** Olvidaste aplicar `useCapability()` o `<CapabilitiesGate>`

**Solución:**
```jsx
const canUse = useCapability('feature');
if (!canUse) return null;
```

---

## ✅ CONFIRMACIÓN FINAL

Ejecuta estos comandos para verificar:

```bash
# 1. Verificar que CapabilitiesContext existe
ls -la src/contexts/CapabilitiesContext.jsx

# 2. Verificar que CapabilitiesGate existe
ls -la src/components/CapabilitiesGate.jsx

# 3. Verificar que App.jsx usa el provider
grep "CapabilitiesProvider" src/App.jsx

# 4. Verificar que AuthContext carga capabilities
grep "loadCapabilities" src/contexts/AuthContext.jsx

# 5. Verificar que useChat NO interpreta
grep -c "oauth_not_connected" src/features/chat/hooks/useChat.js
# Debe retornar: 0

# 6. Verificar que extractReply NO interpreta
grep "success === false" src/lib/aleCoreClient.js
```

**Si todos los comandos funcionan → ✅ IMPLEMENTACIÓN CORRECTA**

---

**Desarrollado con ❤️ por Infinity Kode**  
AL-EON Frontend - Diciembre 30, 2025
