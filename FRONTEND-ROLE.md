# 🎯 AL-EON FRONTEND - ROL Y RESPONSABILIDADES

## ❌ LO QUE NO HACE EL FRONTEND

- **NO guarda memoria**: El backend decide qué recordar
- **NO toca Supabase**: Solo consume API REST del backend
- **NO usa OpenAI keys**: Eso vive en AL-E Core
- **NO decide qué recordar**: Esa lógica está en el backend
- **NO asume que "el modelo recuerda"**: Confía en la respuesta del backend

---

## ✅ LO QUE SÍ HACE EL FRONTEND

### 1. UI Tipo ChatGPT
- Sidebar con lista de conversaciones
- Thread central con mensajes
- Composer con Enter/Shift+Enter
- Tema oscuro minimalista
- Todo en español (labels, botones, errores)

### 2. Envío de Mensajes
Cada mensaje se envía a AL-E Core con:
```javascript
POST https://api.al-entity.com/api/ai/chat
{
  userId: "patty garibay",
  workspaceId: "al-eon",
  sessionId: "abc-123",
  messages: [
    { role: "user", content: "Hola" },
    { role: "assistant", content: "¡Hola! ¿Cómo estás?" },
    { role: "user", content: "¿Qué tiempo hace?" }
  ],
  meta: {
    source: "al-eon",
    inputMode: "text" | "voice",
    localeHint: "es-MX",
    handsFree: true|false
  }
}
```

### 3. Renderizado
- Renderiza **exactamente** lo que devuelve el backend
- No interpreta ni modifica la respuesta
- Confía 100% en `data.answer` o `data.message`

### 4. Gestión de Sesiones
- Carga sesiones desde `GET /api/sessions?workspaceId=al-eon`
- Crea nueva sesión: `POST /api/sessions`
- Carga mensajes: `GET /api/sessions/:id`
- **NO decide qué recordar entre sesiones**: El backend lo maneja

### 5. Voz Total
- **STT (Speech-to-Text)**: Web Speech API captura y transcribe
- **TTS (Text-to-Speech)**: Lee respuesta del backend
- **Envío**: Solo envía el texto final transcrito
- **El backend decide si guarda o no el transcript**

---

## 🧠 FILOSOFÍA

### "Si algo se olvida, NO es culpa del frontend"

El frontend es **tonto e intencional**:
- No sabe qué es importante
- No decide qué contexto enviar
- No manipula memoria
- Solo muestra y envía

### Cambiar de Chat ≠ Perder Memoria

- Usuario cambia de sesión A → B
- Frontend carga mensajes de B desde backend
- Backend decide si B tiene contexto de A
- Frontend solo renderiza lo que recibe

### El Backend es el Cerebro

```
Frontend: "Aquí está el historial completo, ¿qué respondes?"
Backend: "Respondo X porque recuerdo Y y sé que debes Z"
Frontend: "Perfecto, muestro X al usuario"
```

---

## 📋 CHECKLIST DE RESPONSABILIDADES

### Implementado ✅
- [x] Layout ChatGPT-like (Sidebar + Thread + Composer)
- [x] Envío de historial completo al backend
- [x] Sistema de voz (STT + TTS + manos libres)
- [x] UI 100% en español
- [x] Renderizado de respuestas del backend
- [x] Variables de entorno correctas

### Servicios Creados (para backend) ✅
- [x] `filesService.js` - Upload de archivos
- [x] `imagesService.js` - Generación de imágenes
- [x] `webService.js` - Búsqueda web
- [x] `actionsService.js` - Ejecución de acciones
- [x] `sessionsService.js` - CRUD de sesiones

### Por Integrar (cuando backend esté listo)
- [ ] Cambiar a `useConversationsFromBackend` (sesiones reales)
- [ ] Activar componentes de archivos, imágenes, web, acciones
- [ ] Probar flujo completo con backend real

---

## 🔄 FLUJO DE MENSAJE TÍPICO

```
1. Usuario escribe: "Hola, ¿recuerdas mi nombre?"

2. Frontend recopila:
   - Historial completo de la sesión actual
   - Metadata (inputMode, locale, etc.)

3. Frontend envía a backend:
   POST /api/ai/chat
   {
     userId: "patty garibay",
     sessionId: "sesion-123",
     messages: [...historial completo...],
     meta: {...}
   }

4. Backend procesa:
   - Consulta memoria
   - Decide qué contexto usar
   - Genera respuesta con AL-E

5. Backend responde:
   {
     answer: "Sí, tu nombre es Patty",
     memories_to_add: [...],
     actions: [...],
     sources: [...]
   }

6. Frontend renderiza:
   - Muestra: "Sí, tu nombre es Patty"
   - Renderiza actions si existen
   - Muestra sources si existen
   - NO guarda memories_to_add (eso es backend)
```

---

## 🚫 ANTI-PATRONES A EVITAR

### ❌ MAL: Frontend decide qué enviar
```javascript
// NO HACER ESTO
const contextMessages = messages.slice(-5); // Solo últimos 5
sendToBackend(contextMessages);
```

### ✅ BIEN: Frontend envía todo
```javascript
// HACER ESTO
const allMessages = conversation.messages; // Todos
sendToBackend(allMessages);
```

### ❌ MAL: Frontend asume memoria
```javascript
// NO HACER ESTO
if (userChangedSession) {
  // Asumir que se perdió contexto
  showWarning("AL-E olvidó la conversación anterior");
}
```

### ✅ BIEN: Frontend confía en backend
```javascript
// HACER ESTO
// El backend decide si mantiene contexto
// Frontend solo renderiza lo que recibe
```

### ❌ MAL: Frontend manipula respuesta
```javascript
// NO HACER ESTO
const response = await backend.chat(messages);
if (response.needsContext) {
  // Agregar contexto extra
  response.answer = addContext(response.answer);
}
```

### ✅ BIEN: Frontend renderiza tal cual
```javascript
// HACER ESTO
const response = await backend.chat(messages);
displayMessage(response.answer); // Exactamente como viene
```

---

## 📊 DIVISIÓN DE RESPONSABILIDADES

### FRONTEND (AL-EON Console)
```
┌─────────────────────────────────┐
│  SOLO UI/UX + ENVÍO             │
│                                 │
│  • Sidebar                      │
│  • Thread                       │
│  • Composer                     │
│  • Voz (STT/TTS)               │
│  • Enviar historial completo    │
│  • Renderizar respuesta         │
└─────────────────────────────────┘
```

### BACKEND (AL-E Core)
```
┌─────────────────────────────────┐
│  TODO EL CEREBRO                │
│                                 │
│  • Memoria y contexto           │
│  • Decisiones de IA             │
│  • OpenAI API                   │
│  • Supabase                     │
│  • Qué recordar y cuándo        │
│  • Búsqueda en docs             │
│  • Generación de respuestas     │
└─────────────────────────────────┘
```

---

## 🎯 MANTRA DEL FRONTEND

> **"Soy tonto por diseño. El backend es inteligente."**

- No asumo
- No decido
- No manipulo
- Solo muestro y envío

---

## ✅ ESTADO ACTUAL

### Variables de Entorno
```env
VITE_ALE_CORE_URL=https://api.al-entity.com/api/ai/chat
VITE_ALE_CORE_BASE=https://api.al-entity.com
VITE_WORKSPACE_ID=al-eon
VITE_DEFAULT_MODE=universal
VITE_USER_ID=patty garibay
```

### Servidor
- ✅ Corriendo en `http://localhost:3000`
- ✅ Sin errores de compilación
- ✅ Layout ChatGPT-like funcional
- ✅ Sistema de voz implementado

### Pendiente
- Backend debe implementar endpoints:
  - `GET /api/sessions?workspaceId=al-eon`
  - `POST /api/sessions`
  - `GET /api/sessions/:id`
  - `PATCH /api/sessions/:id`
  - `DELETE /api/sessions/:id`

---

**Desarrollado con ❤️ por Infinity Kode**  
AL-EON Frontend v1.0 - Diciembre 21, 2025
