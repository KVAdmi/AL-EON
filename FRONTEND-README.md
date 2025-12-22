# AL-EON Frontend - UI tipo ChatGPT

## ✅ Implementación Completada

### 🎯 Rol del Frontend
- **NO maneja OpenAI keys** - Viven en AL-E Core
- **NO toca Supabase directo** - Todo via API del backend
- **Solo UI/UX** - Interfaz tipo ChatGPT conectada al backend

### 📡 Servicios Implementados

#### 1. Sessions Service (`src/services/sessionsService.js`)
Maneja las conversaciones con el backend:

```javascript
// Crear sesión
createSession({ mode, assistantId })

// Listar sesiones (sidebar)
getSessions() 

// Obtener mensajes de sesión
getSession(sessionId)

// Actualizar sesión (título, pinned, archived)
updateSession(sessionId, updates)

// Eliminar sesión
deleteSession(sessionId)
```

#### 2. AL-E Core Client (`src/lib/aleCoreClient.js`)
Cliente para enviar mensajes:

```javascript
sendToAleCore({
  userId,
  messages,
  mode,
  workspaceId,
  sessionId  // ← NUEVO: vincula con sesión
})
```

**Parseo de respuesta:**
```javascript
extractReply(data)
// Extrae: answer || displayText?.answer || message || ...
```

### 🔧 Variables de Entorno Required

```env
# Backend endpoints
VITE_ALE_CORE_URL=https://api.al-entity.com/api/ai/chat
VITE_ALE_CORE_BASE=https://api.al-entity.com

# Config
VITE_WORKSPACE_ID=al-eon
VITE_DEFAULT_MODE=universal
VITE_USER_ID=patty
```

### 📦 Hooks Disponibles

#### Opción 1: localStorage (actual)
```javascript
import { useConversations } from '@/features/chat/hooks/useConversations';
```

#### Opción 2: Backend API (nuevo)
```javascript
import { useConversationsFromBackend } from '@/features/chat/hooks/useConversationsFromBackend';

const {
  sessions,           // Lista de sesiones
  currentSession,     // Sesión activa
  currentSessionId,   // ID de sesión activa
  createNewSession,   // Crear nueva
  selectSession,      // Cambiar activa
  updateSessionTitle, // Renombrar
  removeSession,      // Eliminar
  refreshSessions     // Recargar lista
} = useConversationsFromBackend();
```

### 🎨 UI Implementada

- ✅ **Sidebar** - Logo, toggle tema, lista conversaciones
- ✅ **Chat Thread** - Mensajes con markdown
- ✅ **Composer** - Textarea (Enter=send, Shift+Enter=newline)
- ✅ **Temas** - Claro/Oscuro con logos adaptativos
- ✅ **Traducciones** - Todo en español

### 🚀 Próximos Pasos

Para activar el backend mode, cambiar en `ChatPage.jsx`:

```javascript
// Cambiar esto:
import { useConversations } from '@/features/chat/hooks/useConversations';

// Por esto:
import { useConversationsFromBackend as useConversations } from '@/features/chat/hooks/useConversationsFromBackend';
```

### 📝 Endpoints que el Backend debe implementar

```
POST /api/sessions
GET  /api/sessions?workspaceId=al-eon
GET  /api/sessions/:id
PATCH /api/sessions/:id
DELETE /api/sessions/:id

POST /api/ai/chat (ya existe, agregar sessionId)
```

### 🔒 Seguridad
- Frontend NO tiene keys sensibles
- Backend maneja CORS allowlist
- Backend implementa rate limiting
- sessionId vincula mensajes a usuario

---

**Frontend listo para conectar con backend completo** 🎉
