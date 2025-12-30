# 🔒 CAPABILITIES GATE - AL-EON OBEDECE AL CORE

**Fecha**: 30 de diciembre de 2025  
**Estado**: ✅ IMPLEMENTADO

---

## 📋 RESUMEN EJECUTIVO

AL-EON ya NO interpreta ni decide qué mostrar. **OBEDECE AL CORE**.

### ✅ LO QUE SE HA IMPLEMENTADO

1. **CapabilitiesContext** - Store global que carga `runtime-capabilities` desde el CORE
2. **CapabilitiesGate** - Componente que controla renderizado según capabilities
3. **useCapability()** - Hook para verificar si una feature está disponible
4. **NO INTERPRETACIÓN** - El asistente muestra TEXTUALMENTE el mensaje del CORE
5. **Integración en Auth** - Capabilities se cargan automáticamente al iniciar sesión

---

## 🏗️ ARQUITECTURA

```
CORE (/api/runtime-capabilities)
  ↓
CapabilitiesContext (Store Global)
  ↓
CapabilitiesGate / useCapability()
  ↓
Features (Voice, Integrations, Actions, etc.)
```

---

## 📡 ENDPOINT DEL CORE

### GET `/api/runtime-capabilities`

**Headers:**
```
Authorization: Bearer {JWT_TOKEN}
```

**Respuesta Esperada:**
```json
{
  "chat": true,
  "voice": false,
  "integrations": true,
  "collaboration": false,
  "actions": false,
  "memory": true
}
```

**SI capability = false:**
- ❌ NO se renderiza el feature
- ❌ NO se muestran botones
- ❌ NO se sugieren acciones

---

## 🔧 USO

### 1. Proteger un componente completo

```jsx
import { CapabilitiesGate } from '@/components/CapabilitiesGate';

<CapabilitiesGate capability="voice">
  <VoiceControls />
</CapabilitiesGate>
```

Si `voice=false`, el componente NO se renderiza.

---

### 2. Verificar una capability antes de renderizar

```jsx
import { useCapability } from '@/components/CapabilitiesGate';

function MyComponent() {
  const canUseVoice = useCapability('voice');
  
  if (!canUseVoice) {
    return null; // No renderizar
  }
  
  return <VoiceButton />;
}
```

---

### 3. Deshabilitar funcionalidad dinámicamente

```jsx
import { useCapability } from '@/components/CapabilitiesGate';

function ChatPage() {
  const canUseVoice = useCapability('voice');
  
  const voiceMode = canUseVoice ? useVoiceMode({...}) : null;
  
  return (
    <div>
      {voiceMode && <VoiceControls {...voiceMode} />}
    </div>
  );
}
```

---

## 🚫 AL-EON NO INTERPRETA MENSAJES

### ❌ ANTES (Frontend decidía)

```js
// ❌ MAL: Frontend interpretaba errores
if (err.message.includes('oauth_not_connected')) {
  errorContent = '🔗 Gmail/Calendar no está conectado...';
}
```

### ✅ AHORA (Core decide)

```js
// ✅ BIEN: Mostrar textualmente el mensaje del error
const errorMessage = {
  role: 'assistant',
  content: err.message, // TAL CUAL viene del CORE
  isError: true
};
```

---

## 📦 ARCHIVOS CREADOS

| Archivo | Descripción |
|---------|-------------|
| `src/contexts/CapabilitiesContext.jsx` | Store global de capabilities |
| `src/components/CapabilitiesGate.jsx` | Componente + hook para verificar |
| `src/App.jsx` | Wrapper con CapabilitiesProvider |
| `src/contexts/AuthContext.jsx` | Carga capabilities al login |
| `src/lib/aleCoreClient.js` | Extrae `answer` o `userMessage` sin interpretar |
| `src/features/chat/hooks/useChat.js` | NO interpreta errores |

---

## 🔍 CAPABILITIES DISPONIBLES

| Capability | Descripción |
|------------|-------------|
| `chat` | Chat básico con el asistente |
| `voice` | Modo de voz (STT + TTS) |
| `integrations` | Conectar servicios externos (Gmail, Calendar, etc.) |
| `collaboration` | Multi-usuario en proyectos |
| `actions` | Ejecutar acciones sugeridas |
| `memory` | Sistema de memoria a largo plazo |

---

## 🧪 TESTING

### Verificar que capabilities se cargan

```js
// En DevTools Console
localStorage.getItem('capabilities')
```

### Simular capability deshabilitada

En el CORE, modificar `/api/runtime-capabilities` para retornar:

```json
{
  "voice": false
}
```

**Resultado esperado:**
- ❌ VoiceControls NO se renderiza
- ❌ Botón de micrófono NO aparece
- ❌ useVoiceMode retorna `null`

---

## ⚠️ FALLBACKS

Si el CORE no responde o hay error al cargar capabilities:

```js
// Fallback seguro (solo chat)
{
  "chat": true,
  "voice": false,
  "integrations": false,
  "collaboration": false,
  "actions": false,
  "memory": false
}
```

---

## 📝 EJEMPLOS DE APLICACIÓN

### Voice Mode

```jsx
// src/features/chat/pages/ChatPage.jsx
const canUseVoice = useCapability('voice');

const voiceMode = canUseVoice ? useVoiceMode({...}) : null;
```

### Integrations Page

```jsx
// src/pages/IntegrationsPage.jsx
const canUseIntegrations = useCapability('integrations');

if (!canUseIntegrations) {
  return <div>Integraciones No Disponibles</div>;
}
```

### Actions

```jsx
// src/features/actions/components/ActionCard.jsx
import { CapabilitiesGate } from '@/components/CapabilitiesGate';

<CapabilitiesGate capability="actions">
  <ActionCard action={action} />
</CapabilitiesGate>
```

---

## 🎯 RESULTADO FINAL

**AL-EON YA NO "PIENSA".**

1. ✅ Carga capabilities del CORE al iniciar sesión
2. ✅ Guarda en store global (CapabilitiesContext)
3. ✅ Si capability = false → NO renderiza
4. ✅ Muestra TEXTUALMENTE mensajes del CORE
5. ✅ Si success=false → muestra userMessage del CORE sin adornar

---

## 🚀 PRÓXIMOS PASOS

Para el desarrollador del CORE:

1. Implementar endpoint `GET /api/runtime-capabilities`
2. Retornar JSON con capabilities habilitadas/deshabilitadas
3. Si hay error → retornar `{ success: false, userMessage: "..." }`
4. AL-EON mostrará el userMessage textualmente

---

**Desarrollado con ❤️ por Infinity Kode**  
AL-EON Frontend - Diciembre 30, 2025
