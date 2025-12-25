# 🧪 Prueba Manual: Análisis Estructurado de Documentos Largos

## 📋 Objetivo
Verificar que cuando el usuario pega un documento largo (>3,000 caracteres), el sistema:
1. Lo detecta correctamente en el frontend
2. Muestra badge visual "Análisis Profundo Activado"
3. Envía metadata correcta al backend
4. El backend responde con formato estructurado (evidencias, referencias, contradicciones, plan)

---

## 🔧 Setup

### Requisitos Previos
- ✅ Frontend desplegado en https://al-eon.com
- ✅ Usuario autenticado
- ✅ Backend AL-E Core actualizado con system message especializado
- ✅ Console del navegador abierta (para ver logs)

### Preparación
1. Abrir https://al-eon.com en navegador
2. Login con credenciales válidas
3. Abrir DevTools → Console
4. Crear nueva conversación

---

## 📄 Documento de Prueba

**Copiar y pegar este documento completo:**

```
AUDITORÍA TÉCNICA AL-EON - 2024-12-25

## 🎯 Resumen Ejecutivo
Sistema de chat inteligente con integración a AL-E Core backend. Deploy en Netlify con autenticación Supabase y storage de archivos. Análisis realizado después de fixes críticos en delete/edit conversations.

## 🏗️ Arquitectura

### Backend
- **URL Principal**: https://api.al-eon.com/api/ai/chat
- **Modo**: universal (no interpretativo)
- **WorkspaceId**: FORZADO a "core" (línea 75 en aleCoreClient.js)
- **Autenticación**: Bearer JWT extraído de Supabase auth.users
- **Retry Logic**: 1 reintento automático en errores 502/504/timeout
- **Timeout**: No configurado explícitamente (usar default del navegador)

### Frontend
- **Framework**: React 18.2.0 + Vite 4.5.5
- **Deployment**: Netlify (https://al-eon.com)
- **Bundle Size**: 597.45 kB (175.47 kB gzipped)
- **Build Tool**: Vite con plugin de edición visual
- **Router**: React Router v6
- **State Management**: Context API (AuthContext, ThemeContext, UserProfileContext)

### Storage
- **Provider**: Supabase Storage
- **Bucket Principal**: user-files
- **Upload Handler**: src/lib/fileUpload.js
- **Metadata Format**: {bucket, path, name, type, size, url}
- **Signed URLs**: Generadas on-demand con expiración de 1 hora
- **File Types**: PDF, DOCX, TXT, CSV, imágenes (PNG, JPG, GIF)

### Database Schema
- **Provider**: Supabase PostgreSQL
- **Instance**: gptwzuqmuvzttajgjrry.supabase.co
- **Tablas Principales**:
  * `user_profiles`: Perfiles de usuario con avatar_url
  * `user_settings`: Configuraciones por usuario
  * `sessions`: Sesiones de chat con session_id
  * `messages`: Mensajes (NO persistidos aún, solo en localStorage)
  * `integrations`: Conexiones a servicios externos
- **RLS**: Row Level Security habilitado en todas las tablas
- **Triggers**: updated_at trigger en user_profiles y user_settings

## 🐛 Bugs Resueltos Recientemente

### 1. Delete Conversation No Funcionaba
**Commit**: f667029
**Problema**: Al hacer click en eliminar conversación, esta se borraba del state de React pero:
- No se eliminaba de localStorage (persistía al refresh)
- No se llamaba al backend para borrar la sesión
- Si el array quedaba vacío, el useEffect no guardaba en localStorage

**Root Cause**: 
```javascript
// ❌ ANTES (línea 27 en useConversations.js)
useEffect(() => {
  if (conversations.length > 0) {  // <-- Este condicional causaba el bug
    storage.saveConversations(conversations);
  }
}, [conversations]);

// ❌ ANTES (línea 64 en useConversations.js)
const deleteConversation = (id) => {
  setConversations(prev => prev.filter(conv => conv.id !== id));
  // No llamaba a deleteSession()
};
```

**Solución**:
```javascript
// ✅ DESPUÉS
useEffect(() => {
  storage.saveConversations(conversations);  // Sin condicional
}, [conversations]);

// ✅ DESPUÉS
const deleteConversation = async (id) => {
  try {
    const conversation = conversations.find(conv => conv.id === id);
    if (conversation?.sessionId) {
      await deleteSession(conversation.sessionId);  // ← Llamada al backend
      console.log('✅ Sesión eliminada del backend:', conversation.sessionId);
    }
  } catch (error) {
    console.error('⚠️ Error eliminando sesión del backend:', error);
  }
  
  setConversations(prev => {
    const filtered = prev.filter(conv => conv.id !== id);
    // ... lógica de cambio de conversación actual
    return filtered;
  });
};
```

**Archivos Modificados**:
- src/features/chat/hooks/useConversations.js (import deleteSession, async delete, removed conditional)

### 2. Edit Conversation Title No Funcionaba
**Commit**: f667029
**Problema**: La UI de edición existía (input + botones Save/Cancel) pero el botón Save tenía un TODO comment y no hacía nada.

**Root Cause**:
```javascript
// ❌ ANTES (línea 302 en Sidebar.jsx)
const handleSave = (e) => {
  e.stopPropagation();
  // TODO: Implementar actualización de título  // <-- No implementado
  setIsEditing(false);
};
```

**Solución**:
1. Agregar prop `onUpdateConversation` a toda la cadena:
   - ChatPage → Sidebar → ConversationGroup → ConversationItem
2. Implementar handleSave:

```javascript
// ✅ DESPUÉS (Sidebar.jsx línea 19)
function Sidebar({
  conversations,
  currentConversationId,
  onNewConversation,
  onSelectConversation,
  onUpdateConversation,  // ← NUEVO
  onDeleteConversation,
  isOpen,
  currentUser,
  onLogout
}) { ... }

// ✅ DESPUÉS (ConversationItem línea 302)
const handleSave = (e) => {
  e.stopPropagation();
  if (editedTitle.trim() && editedTitle !== conversation.title) {
    onUpdate(editedTitle.trim());  // ← Llama a updateConversation()
  }
  setIsEditing(false);
};
```

**Archivos Modificados**:
- src/features/chat/pages/ChatPage.jsx (agregado onUpdateConversation={updateConversation})
- src/features/chat/components/Sidebar.jsx (prop drilling completo)

## 📎 Attachments Feature

### Flujo Completo
1. **Upload**: Usuario selecciona archivo → `uploadFiles()` → Supabase Storage
2. **Metadata**: Se guarda {bucket:'user-files', path, name, type, size, url}
3. **Backend**: AL-E Core recibe bucket+path para recuperar archivo
4. **Rendering**: AttachmentChip muestra icono, nombre, tamaño, botón "Abrir"
5. **Open**: Click en "Abrir" → genera signed URL (1h) → abre en nueva pestaña

### Componente AttachmentChip
**Ubicación**: src/features/chat/components/MessageThread.jsx (líneas 223-304)

**Features**:
- Iconos por tipo (FileText, FileSpreadsheet, FileImage, File)
- Formato de tamaño (B, KB, MB)
- Botón "Abrir" con signed URL
- URL caching en useState
- Error handling si signed URL falla

**Código**:
```jsx
function AttachmentChip({ attachment }) {
  const [signedUrl, setSignedUrl] = useState(null);
  
  const getFileIcon = () => {
    if (attachment.type?.includes('pdf')) return <FileText />;
    if (attachment.type?.includes('sheet') || attachment.type?.includes('excel')) return <FileSpreadsheet />;
    if (attachment.type?.includes('image')) return <FileImage />;
    return <File />;
  };
  
  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  const handleOpen = async () => {
    if (attachment.url) {
      window.open(attachment.url, '_blank');
    } else if (attachment.bucket && attachment.path) {
      if (!signedUrl) {
        const { data } = await supabase.storage
          .from(attachment.bucket)
          .createSignedUrl(attachment.path, 3600);
        if (data?.signedUrl) {
          setSignedUrl(data.signedUrl);
          window.open(data.signedUrl, '_blank');
        }
      } else {
        window.open(signedUrl, '_blank');
      }
    }
  };
  
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border">
      {getFileIcon()}
      <span>{attachment.name}</span>
      <span>· {formatSize(attachment.size)}</span>
      <button onClick={handleOpen}>
        <ExternalLink size={14} />
        Abrir
      </button>
    </div>
  );
}
```

## 🎨 UI/UX Improvements

### Logo
**Commit**: Previo a f667029
**Change**: Aumentado de h-5 md:h-6 a h-8 md:h-10 (60-67% más grande)
**File**: src/features/chat/components/Sidebar.jsx
**Code**: `<Logo className="h-8 md:h-10 w-auto" />`

### Sidebar Mobile
**Commit**: Previo a f667029
**Change**: Sidebar cerrada por defecto en mobile (<768px), abierta en desktop
**File**: src/features/chat/pages/ChatPage.jsx
**Code**:
```javascript
const [showSidebar, setShowSidebar] = useState(() => {
  if (typeof window !== 'undefined') {
    return window.innerWidth >= 768;  // Desktop: true, Mobile: false
  }
  return false;
});
```

## ⚠️ Errores Conocidos (Sin Resolver)

### 1. Sentry: "Cannot read property 'bucket' of undefined"
**Frecuencia**: 3 instancias en últimos 7 días
**Ubicación**: Probablemente en AttachmentChip.handleOpen()
**Causa Probable**: Attachments sin campo bucket (legacy data)
**Fix Propuesto**: Agregar null check antes de acceder a bucket:
```javascript
if (attachment?.bucket && attachment?.path) { ... }
```

### 2. Performance: Sidebar Re-renders
**Síntoma**: Sidebar re-renderiza en cada keystroke del input de chat
**Causa**: No hay memoization en Sidebar component
**Fix Propuesto**: Usar React.memo() o useMemo() para conversations list

### 3. Safari Compatibility: "findLast is not a function"
**Versión Afectada**: Safari < 15.4
**Ubicación**: aleCoreClient.js línea 103
**Code**: `const lastUserMessage = cleanedMessages.findLast(msg => msg.role === 'user');`
**Fix Propuesto**: Polyfill o usar reverse().find()

## 📊 Performance Metrics

### Lighthouse Scores (Desktop)
- Performance: 89
- Accessibility: 95
- Best Practices: 92
- SEO: 100

### Lighthouse Scores (Mobile)
- Performance: 76
- Accessibility: 95
- Best Practices: 92
- SEO: 100

### Core Web Vitals
- FCP (First Contentful Paint): 1.2s
- LCP (Largest Contentful Paint): 2.1s
- TTI (Time to Interactive): 3.4s
- CLS (Cumulative Layout Shift): 0.05
- FID (First Input Delay): 45ms

### Bundle Analysis
```
dist/index.html                   4.53 kB │ gzip:   1.80 kB
dist/assets/index-134a7b92.css   40.65 kB │ gzip:   8.11 kB
dist/assets/index-2c2f1afb.js   597.45 kB │ gzip: 175.47 kB
```

**Recommendation**: Bundle es grande. Considerar:
- Code splitting por rutas
- Lazy loading de componentes pesados
- Tree shaking más agresivo
- Dynamic imports para lucide-react icons

## 🔐 Security & Auth

### JWT Flow
1. Usuario hace login → Supabase Auth
2. Supabase retorna JWT (access_token)
3. Frontend extrae userId del payload (base64 decode)
4. Cada request a AL-E Core incluye: `Authorization: Bearer <JWT>`
5. Backend valida JWT con Supabase public key

### Edge Function (Pendiente Documentar)
**Status**: Mencionado en auditoría pero no documentado
**Location**: ¿Supabase Edge Functions? ¿Netlify Edge?
**Purpose**: JWT validation
**Action Item**: Crear EDGE-FUNCTION-AUTH.md con código completo

## 🚀 Deployment

### Production
- **URL**: https://al-eon.com
- **Platform**: Netlify
- **Build Command**: `npm run build`
- **Publish Directory**: dist
- **Environment**: Production (.env.production cargado automáticamente)

### Environment Variables
```bash
VITE_ALE_CORE_BASE=https://api.al-eon.com
VITE_WORKSPACE_ID=core
VITE_SUPABASE_URL=https://gptwzuqmuvzttajgjrry.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

### DNS
- Domain: al-eon.com
- DNS Provider: (No especificado en auditoría)
- SSL: Automático (Let's Encrypt via Netlify)
- CDN: Netlify Edge Network

## 📚 Pendientes / Roadmap

### High Priority
1. ✅ Fix delete conversation (RESUELTO en f667029)
2. ✅ Fix edit conversation title (RESUELTO en f667029)
3. ⏳ Persistir attachments en tabla messages (solo en localStorage ahora)
4. ⏳ Documentar edge function de auth
5. ⏳ Fix Sentry error "bucket undefined"

### Medium Priority
6. ⏳ Reducir bundle size con code splitting
7. ⏳ Agregar monitoring de storage quota
8. ⏳ Implementar lazy loading de conversations
9. ⏳ Memoizar Sidebar component

### Low Priority
10. ⏳ Safari polyfill para findLast()
11. ⏳ Agregar tests unitarios
12. ⏳ Configuración de repository access (GitHub Copilot-like)

## 🔗 Referencias Técnicas

### Archivos Clave
- `src/lib/aleCoreClient.js` → Cliente HTTP con retry logic
- `src/features/chat/hooks/useConversations.js` → CRUD de conversaciones
- `src/features/chat/components/Sidebar.jsx` → UI de conversaciones
- `src/features/chat/components/MessageThread.jsx` → Rendering de mensajes + AttachmentChip
- `src/lib/fileUpload.js` → Upload a Supabase Storage
- `src/lib/storage.js` → LocalStorage wrapper

### Tablas de BD
- `user_profiles` (id, user_id, avatar_url, created_at, updated_at)
- `user_settings` (id, user_id, settings jsonb, created_at, updated_at)
- `sessions` (id, session_id, user_id, workspace_id, created_at, updated_at)
- `messages` (NO IMPLEMENTADA AÚN)
- `integrations` (id, user_id, service, credentials jsonb)

### Buckets de Storage
- `user-files` → Documentos subidos por usuarios
- `avatars` → Fotos de perfil
- (Otros buckets no identificados en auditoría)

### Edge Functions
- `handle-auth` (mencionada pero no documentada)
- `cleanup-sessions` (posible, no confirmada)

### APIs
- `POST /api/ai/chat` → Enviar mensaje a AL-E Core
- `GET /api/sessions` → Listar sesiones del usuario
- `GET /api/sessions/{id}` → Obtener sesión específica
- `DELETE /api/sessions/{id}` → Eliminar sesión
- `POST /api/sessions` → Crear nueva sesión

---

**Total caracteres**: ~11,500
**Fecha**: 2024-12-25
**Autor**: AL-EON QA Team
```

---

## ✅ Pasos de Verificación

### 1. Detección en Frontend
1. Pegar el documento de prueba en el input de chat
2. Enviar mensaje
3. **Verificar en Console**:
   ```
   📄 DOCUMENTO LARGO DETECTADO: 11500 caracteres
   🔍 Modo análisis estructurado: activado
   ```

### 2. Badge Visual
**Verificar en UI**:
- Mensaje del usuario debe mostrar badge azul arriba del contenido
- Badge debe decir: "Análisis Profundo Activado • 11K caracteres"
- Icono de FileSearch visible

**Screenshot esperado**:
```
┌─────────────────────────────────────────┐
│ 🔍 Análisis Profundo Activado • 11K   │
│    caracteres                           │
├─────────────────────────────────────────┤
│ AUDITORÍA TÉCNICA AL-EON - 2024-12-25  │
│                                         │
│ ## 🎯 Resumen Ejecutivo                │
│ Sistema de chat inteligente con...     │
│ [resto del documento]                   │
└─────────────────────────────────────────┘
```

### 3. Payload al Backend
**Verificar en Console**:
```javascript
{
  "requestId": "req_abc123",
  "workspaceId": "core",
  "userId": "user_xyz",
  "mode": "universal",
  "messages": [...],
  "meta": {
    "origin": "Infinity Kode",
    "clientVersion": "1.0.0",
    "timestamp": "2024-12-25T21:00:00Z",
    "isLongDocument": true,           // ← VERIFICAR
    "documentLength": 11500,           // ← VERIFICAR
    "responseFormat": "structured-audit" // ← VERIFICAR
  }
}
```

### 4. Respuesta del Backend
**SI BACKEND YA IMPLEMENTÓ LA REGLA**:
Respuesta debe contener:
- ✅ Sección "📋 Evidencias" con 5+ citas textuales
- ✅ Sección "🔧 Referencias Técnicas" con 5+ menciones (archivos/tablas/buckets)
- ✅ Sección "⚠️ Contradicciones" con 3+ inconsistencias
- ✅ Sección "📅 Plan 2 Semanas" con 5 tareas (DoD + verificación)

**Ejemplo esperado**:
```markdown
## 📋 Evidencias
1. "WorkspaceId: FORZADO a 'core' (línea 75 en aleCoreClient.js)"
2. "Bundle Size: 597.45 kB (175.47 kB gzipped)"
3. "Bucket Principal: user-files"
4. "Delete Conversation No Funcionaba: Al hacer click en eliminar conversación, esta se borraba del state de React pero no se eliminaba de localStorage"
5. "Performance: 89 (Desktop), 76 (Mobile)"

## 🔧 Referencias Técnicas
- src/lib/aleCoreClient.js (línea 75)
- src/features/chat/hooks/useConversations.js
- src/features/chat/components/Sidebar.jsx
- src/features/chat/components/MessageThread.jsx (líneas 223-304)
- src/lib/fileUpload.js
- Bucket: user-files
- Bucket: avatars
- Tabla: user_profiles
- Tabla: sessions
- Tabla: messages (NO IMPLEMENTADA)
- Edge Function: handle-auth
- API: POST /api/ai/chat
- API: DELETE /api/sessions/{id}

## ⚠️ Contradicciones
1. **Attachments Persistence**: El documento menciona "AttachmentChip muestra archivo con metadata completa" pero también dice "messages (NO persistidos aún, solo en localStorage)". Si los mensajes no están en BD, ¿cómo sobreviven los attachments al refresh?

2. **Edge Function Sin Documentar**: Se menciona "handle-auth edge function" en Security & Auth pero luego en Pendientes dice "Documentar edge function de auth". No está claro si existe o es un TODO.

3. **Bundle Size vs Performance**: Lighthouse Score es 89 (Desktop) que es "bueno", pero el bundle de 597KB es grande. El documento recomienda code splitting pero no explica por qué el performance score es bueno con bundle tan grande.

## 📅 Plan 2 Semanas

**Tarea 1**: Persistir attachments en tabla messages
- DoD: Agregar campo `attachments jsonb` a tabla messages, actualizar `saveMessage()` en sessionsService.js para guardar array de attachments, actualizar `loadMessages()` para recuperar attachments
- Verificación: Upload archivo → enviar mensaje → refresh page → verificar que attachment sigue visible con nombre + tamaño + botón "Abrir"

**Tarea 2**: Fix Sentry error "bucket undefined"
- DoD: Agregar null check en AttachmentChip antes de acceder a `attachment.bucket`, agregar error boundary, agregar log específico si bucket === undefined
- Verificación: Sentry dashboard muestra 0 instancias de "Cannot read property 'bucket' of undefined" en próximas 48 horas

**Tarea 3**: Reducir bundle size con code splitting
- DoD: Implementar React.lazy() en rutas principales, dynamic import para lucide-react icons, bundle principal < 350KB (sin gzip)
- Verificación: `npm run build` → verificar que dist/assets/index-*.js < 350KB

**Tarea 4**: Documentar edge function handle-auth
- DoD: Crear EDGE-FUNCTION-AUTH.md con: código completo, variables de entorno necesarias, instrucciones de deploy, ejemplos de curl para testing
- Verificación: Otro developer puede leer el doc y deployar la edge function sin preguntar nada

**Tarea 5**: Safari polyfill para findLast()
- DoD: Agregar polyfill al inicio de aleCoreClient.js o usar `[...array].reverse().find()` como alternativa, test en Safari 14
- Verificación: Abrir https://al-eon.com en Safari 14 → pegar documento largo → no debe aparecer error "findLast is not a function" en Console
```

---

## 🚨 Criterios de Éxito

### Frontend (AL-EON) ✅
- [x] Detección automática de documentos > 3000 chars
- [x] Log en console: "📄 DOCUMENTO LARGO DETECTADO"
- [x] Badge visual "Análisis Profundo Activado" en mensaje del usuario
- [x] Metadata `isLongDocument`, `documentLength`, `responseFormat` en payload

### Backend (AL-E Core) ⏳
- [ ] Leer `meta.isLongDocument` del payload
- [ ] Inyectar system message especializado
- [ ] Responder con formato estructurado (Evidencias, Referencias, Contradicciones, Plan)
- [ ] NO responder con planes genéricos sin evidencia

### Integration ⏳
- [ ] End-to-end: Pegar documento → ver badge → recibir respuesta estructurada
- [ ] Test con 5 documentos diferentes
- [ ] Verificar que documentos cortos (<3000) NO activan el modo

---

## 📸 Screenshots de Referencia

### Antes (Respuesta Genérica)
```
Usuario: [pega documento de 11K caracteres]

AL-E: ¡Gracias por compartir esta auditoría! Puedo ayudarte a:
1. Resolver los bugs de delete/edit
2. Optimizar el performance
3. Implementar las mejoras sugeridas
...
```
❌ **NO ACEPTABLE**: Respuesta genérica sin evidencias específicas

### Después (Respuesta Estructurada)
```
Usuario: [pega documento de 11K caracteres]
         🔍 Análisis Profundo Activado • 11K caracteres

AL-E: ## 📋 Evidencias
1. "WorkspaceId: FORZADO a 'core' (línea 75 en aleCoreClient.js)"
2. "Bundle Size: 597.45 kB (175.47 kB gzipped)"
...

## 🔧 Referencias Técnicas
- src/lib/aleCoreClient.js
- Bucket: user-files
...

## ⚠️ Contradicciones
1. Attachments Persistence: El documento menciona...
...

## 📅 Plan 2 Semanas
**Tarea 1**: Persistir attachments...
```
✅ **ACEPTABLE**: Respuesta estructurada con evidencias específicas del documento

---

## 🔄 Siguientes Pasos

1. **Ejecutar esta prueba manual** con documento de prueba
2. **Documentar resultado** en screenshot
3. **Si backend no responde con formato estructurado**: Pasar doc BACKEND-LONG-DOCUMENT-RULE.md al team de backend
4. **Re-probar** después de que backend implemente la regla
5. **Marcar como ✅** cuando end-to-end funcione

---

**Responsable**: QA Team  
**Fecha**: 2024-12-25  
**Status**: ⏳ Esperando implementación backend
