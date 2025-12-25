# 📄 Backend: Regla de Análisis Estructurado para Documentos Largos

## 🎯 Objetivo
Cuando el usuario pega un documento/auditoría/reporte largo (> 3,000 caracteres), el asistente **NO debe responder con planes genéricos**. Debe analizar el documento con evidencias específicas, referencias técnicas, y contradicciones detectadas.

---

## 🔍 Detección

### Frontend (AL-EON)
El frontend detecta automáticamente documentos largos:

```javascript
// src/lib/aleCoreClient.js
const lastUserMessage = cleanedMessages.findLast(msg => msg.role === 'user');
const isLongDocument = lastUserMessage && lastUserMessage.content.length > 3000;
```

Si detecta documento largo, agrega metadata al payload:

```javascript
meta: {
  isLongDocument: true,
  documentLength: 3542, // número de caracteres
  responseFormat: 'structured-audit' // señal para el backend
}
```

---

## ⚙️ Implementación Backend (AL-E Core)

### 1. Validación Previa
En el handler de `/api/ai/chat`, antes de construir el prompt:

```python
# Extraer metadata del request
meta = payload.get('meta', {})
is_long_document = meta.get('isLongDocument', False)
document_length = meta.get('documentLength', 0)
response_format = meta.get('responseFormat')

if is_long_document and response_format == 'structured-audit':
    # Activar modo de análisis estructurado
    system_message = build_structured_audit_prompt()
else:
    # System message normal
    system_message = build_default_prompt()
```

### 2. System Message Especializado

```python
def build_structured_audit_prompt():
    return """Eres un asistente técnico que analiza documentos con EVIDENCIA ESPECÍFICA.

REGLAS OBLIGATORIAS:

1. **Evidencias** (5 citas textuales):
   - Cita EXACTA del documento (máximo 25 palabras)
   - Entre comillas
   - Ejemplo: "El bucket user-files almacena 127 archivos con total de 2.3GB"

2. **Referencias Técnicas** (mínimo 5):
   - Rutas de archivos: src/components/Sidebar.jsx
   - Tablas de BD: user_profiles, sessions
   - Buckets de storage: user-files, avatars
   - Edge Functions: handle-auth, cleanup-sessions
   - APIs: /api/ai/chat, /api/sessions/{id}

3. **Contradicciones** (mínimo 3):
   - Inconsistencias detectadas en el documento
   - Ejemplo: "La auditoría dice 'sin errores' pero menciona 12 logs de error en Sentry"

4. **Plan 2 Semanas** (máximo 5 tareas):
   - Título de tarea
   - DoD (Definition of Done) específica
   - Prueba de verificación concreta
   - Ejemplo:
     * Tarea: Migrar attachments a tabla de BD
     * DoD: Campo jsonb en messages table + saveMessage() actualizado
     * Verificación: Upload archivo → refresh page → archivo visible

5. **Si NO encuentras evidencias**:
   Responde ÚNICAMENTE: "No pude leer el documento pegado o llegó incompleto. Por favor, pégalo en partes más pequeñas (máximo 2,000 caracteres por mensaje)."

NO RESPONDAS con:
- Planes genéricos sin evidencia
- "Puedo ayudarte con..." sin citas específicas
- Sugerencias sin referencias técnicas del documento

FORMATO DE RESPUESTA:

## 📋 Evidencias
1. "cita textual corta"
2. "cita textual corta"
...

## 🔧 Referencias Técnicas
- src/path/file.js
- tabla: table_name
...

## ⚠️ Contradicciones
1. Descripción específica
2. Descripción específica
...

## 📅 Plan 2 Semanas
**Tarea 1**: Título
- DoD: definición concreta
- Verificación: comando/prueba específica

**Tarea 2**: Título
- DoD: definición concreta
- Verificación: comando/prueba específica
"""
```

### 3. Validación Post-Generación (Opcional pero Recomendado)

```python
def validate_structured_response(response_text: str) -> dict:
    """
    Valida que la respuesta cumpla con el formato estructurado.
    Retorna dict con warnings si falta algo.
    """
    warnings = []
    
    # Verificar secciones obligatorias
    required_sections = [
        "📋 Evidencias",
        "🔧 Referencias Técnicas",
        "⚠️ Contradicciones",
        "📅 Plan 2 Semanas"
    ]
    
    for section in required_sections:
        if section not in response_text:
            warnings.append(f"Missing section: {section}")
    
    # Contar citas entre comillas
    import re
    quotes = re.findall(r'"([^"]{1,150})"', response_text)
    if len(quotes) < 5:
        warnings.append(f"Only {len(quotes)} quotes found, need at least 5")
    
    # Verificar referencias técnicas (patrones comunes)
    tech_refs = re.findall(r'(src/[\w/]+\.\w+|[a-z_]+\.[a-z_]+|[a-z\-_]+ bucket)', response_text, re.IGNORECASE)
    if len(tech_refs) < 5:
        warnings.append(f"Only {len(tech_refs)} technical references found, need at least 5")
    
    return {
        "valid": len(warnings) == 0,
        "warnings": warnings,
        "quotes_count": len(quotes),
        "tech_refs_count": len(tech_refs)
    }
```

---

## 📊 Ejemplo de Flujo Completo

### Input del Usuario (3,500 chars):
```
[DOCUMENTO LARGO PEGADO]
Auditoría AL-EON 2024-12-25:
- Backend: api.al-eon.com responde en modo universal
- Frontend: React con Vite, deployado en Netlify
- Storage: Supabase bucket "user-files" con 127 archivos
- Sessions: tabla sessions con campo updated_at
- Auth: JWT desde Supabase, validated en edge function
- Errores detectados: 12 logs en Sentry sobre attachments undefined
- Performance: 596KB bundle (175KB gzipped)
- ... [resto del documento]
```

### Payload al Backend:
```json
{
  "requestId": "req_abc123",
  "workspaceId": "core",
  "userId": "user_xyz",
  "mode": "universal",
  "messages": [
    {
      "role": "user",
      "content": "[DOCUMENTO LARGO DE 3500 CHARS]"
    }
  ],
  "meta": {
    "origin": "Infinity Kode",
    "clientVersion": "1.0.0",
    "timestamp": "2024-12-25T20:30:00Z",
    "isLongDocument": true,
    "documentLength": 3500,
    "responseFormat": "structured-audit"
  }
}
```

### Respuesta Esperada del Backend:

```markdown
## 📋 Evidencias
1. "Backend: api.al-eon.com responde en modo universal"
2. "Storage: Supabase bucket 'user-files' con 127 archivos"
3. "Errores detectados: 12 logs en Sentry sobre attachments undefined"
4. "Performance: 596KB bundle (175KB gzipped)"
5. "Auth: JWT desde Supabase, validated en edge function"

## 🔧 Referencias Técnicas
- api.al-eon.com/api/ai/chat
- Bucket: user-files
- Tabla: sessions
- Campo: updated_at
- Edge Function: handle-auth
- src/features/chat/components/MessageThread.jsx
- Sentry logs (12 errores)

## ⚠️ Contradicciones
1. **Attachments undefined**: El documento menciona "127 archivos en storage" pero Sentry reporta "attachments undefined" en 12 logs. Esto indica que el frontend no está recuperando los attachments correctamente tras refresh.

2. **Bundle size vs performance**: 596KB es relativamente grande para una app React. El documento no menciona lazy loading o code splitting.

3. **JWT validation**: Se menciona "validated en edge function" pero no especifica qué edge function ni dónde está desplegada (¿Supabase Edge Functions? ¿Netlify Edge?).

## 📅 Plan 2 Semanas

**Tarea 1**: Persistir attachments en base de datos
- DoD: Campo `attachments jsonb` en tabla `messages`, función `saveMessage()` actualizada para guardar array de attachments
- Verificación: Upload archivo → refresh page → archivo visible con nombre+tamaño+icono

**Tarea 2**: Reducir bundle size con lazy loading
- DoD: Code splitting en rutas con React.lazy(), bundle principal < 300KB
- Verificación: `npm run build` → verificar dist/assets/index-*.js < 300KB

**Tarea 3**: Documentar edge function de auth
- DoD: Archivo EDGE-FUNCTION-AUTH.md con código completo, variables de entorno, y pruebas curl
- Verificación: Otro developer puede deployar la edge function siguiendo el doc

**Tarea 4**: Fix attachments undefined en Sentry
- DoD: Agregar null checks en MessageThread.jsx, error handling con try-catch, log específico si attachment.url === undefined
- Verificación: Sentry muestra 0 errores de "attachments undefined" en 48 horas

**Tarea 5**: Setup monitoring de storage quota
- DoD: Script que consulta bucket size cada 6 horas, alerta si > 80% del límite
- Verificación: `node scripts/check-storage.js` → imprime "user-files: 1.8GB / 5GB (36%)"
```

---

## 🚨 Casos Edge

### Caso 1: Documento Incompleto
Si el LLM no puede extraer evidencias suficientes:

```markdown
No pude leer el documento pegado o llegó incompleto. Por favor, pégalo en partes más pequeñas (máximo 2,000 caracteres por mensaje).
```

### Caso 2: Documento Sin Referencias Técnicas
Si el documento es genérico (ej: "Necesito ayuda con mi proyecto"):

```markdown
## 📋 Análisis
Este mensaje no contiene un documento técnico para auditar. Parece ser una consulta general.

Para activar el análisis estructurado con evidencias, pega un documento que incluya:
- Código fuente
- Logs de errores
- Configuraciones (YAML, JSON, ENV)
- Reportes de auditoría
- Diagramas de arquitectura

¿Qué documento específico quieres que analice?
```

### Caso 3: Múltiples Documentos en Conversación
Si el usuario pega varios documentos en mensajes consecutivos:

```markdown
## 📋 Evidencias del Documento Más Reciente
[Solo analizar el ÚLTIMO documento largo pegado]
```

---

## 🧪 Prueba Manual

### Setup
1. Abrir https://al-eon.com
2. Login con usuario válido
3. Preparar documento de prueba (>3000 chars)

### Documento de Prueba
```
AUDITORÍA TÉCNICA AL-EON - 2024-12-25

## Backend
- URL: https://api.al-eon.com/api/ai/chat
- Modo: universal (no interpretativo)
- WorkspaceId: FORZADO a "core"
- Authorization: Bearer <JWT_SUPABASE>
- Retry logic: 1 reintento en 502/504

## Frontend
- Framework: React 18 + Vite 4.5.5
- Deploy: Netlify (https://al-eon.com)
- Bundle: 597.45 kB (175.47 kB gzipped)
- Logo: h-8 md:h-10 (2x más grande que antes)
- Sidebar: Cerrada por defecto en mobile (<768px)

## Storage
- Provider: Supabase Storage
- Bucket: user-files
- Upload: src/lib/fileUpload.js
- Metadata: {bucket, path, name, type, size, url}

## Database
- Provider: Supabase (gptwzuqmuvzttajgjrry.supabase.co)
- Tablas: user_profiles, user_settings, sessions, messages
- Auth: JWT desde auth.users
- RLS: Habilitado en todas las tablas

## Bugs Recientes (RESUELTOS)
1. Delete conversation no funcionaba
   - Problema: Solo eliminaba de state, no de localStorage ni backend
   - Fix: Agregado deleteSession() + removed conditional save
   
2. Edit conversation title no funcionaba
   - Problema: handleSave tenía TODO sin implementación
   - Fix: Agregado onUpdateConversation prop chain completo

## Attachments
- Rendering: AttachmentChip con icono + tamaño + botón "Abrir"
- Signed URLs: Generadas on-demand (1 hora de expiración)
- Backend: Envío de bucket+path (no solo URL)

## Errores Conocidos
- Sentry reporta 3 instancias de "Cannot read property 'bucket' of undefined"
- Performance warning: Sidebar re-renderiza en cada keystroke
- Console warning: "findLast is not a function" en Safari < 15

## Performance
- Lighthouse Score: 89 (Desktop), 76 (Mobile)
- FCP: 1.2s
- LCP: 2.1s
- TTI: 3.4s

## Infraestructura
- DNS: al-eon.com → Netlify
- SSL: Automático (Let's Encrypt)
- CDN: Netlify Edge Network
- Environment: Production (.env.production)

[Este documento tiene más de 3000 caracteres]
```

### Prompt para Pegar
Copiar el documento de prueba completo y pegarlo en AL-EON.

### Respuesta Esperada
El asistente debe responder con el formato estructurado:
- ✅ 5+ citas textuales del documento
- ✅ 5+ referencias técnicas (archivos, tablas, buckets)
- ✅ 3+ contradicciones detectadas
- ✅ Plan de 5 tareas con DoD + verificación

### Respuesta NO Aceptable
- ❌ "Puedo ayudarte a resolver estos problemas..."
- ❌ "Aquí tienes un plan genérico..."
- ❌ Respuesta sin citas textuales
- ❌ Respuesta sin referencias específicas
- ❌ Plan sin DoD ni verificaciones

---

## 📝 Checklist de Implementación

### Frontend (AL-EON) ✅ COMPLETADO
- [x] Detectar documentos > 3000 chars
- [x] Agregar `isLongDocument` a meta
- [x] Agregar `documentLength` a meta
- [x] Agregar `responseFormat: 'structured-audit'` a meta
- [x] Log en consola cuando se detecta documento largo

### Backend (AL-E Core) ⏳ PENDIENTE
- [ ] Leer `meta.isLongDocument` del payload
- [ ] Leer `meta.responseFormat` del payload
- [ ] Crear función `build_structured_audit_prompt()`
- [ ] Inyectar system message especializado cuando `responseFormat == 'structured-audit'`
- [ ] (Opcional) Validar respuesta con `validate_structured_response()`
- [ ] Agregar test unitario para detección de documentos largos
- [ ] Agregar test de integración con documento de prueba

### Documentación ✅ COMPLETADO
- [x] BACKEND-LONG-DOCUMENT-RULE.md con specs completas
- [x] Ejemplo de payload completo
- [x] Ejemplo de respuesta esperada
- [x] Documento de prueba manual
- [x] Casos edge documentados

---

## 🔗 Referencias
- Frontend implementation: `src/lib/aleCoreClient.js` (líneas 103-117, 131-141)
- Metadata enviada: `meta.isLongDocument`, `meta.documentLength`, `meta.responseFormat`
- Threshold: 3,000 caracteres
- Response format: Markdown estructurado con secciones obligatorias

---

## ✅ Próximos Pasos

1. **Backend Team**: Implementar `build_structured_audit_prompt()` en AL-E Core
2. **QA**: Probar con documento de prueba real
3. **Monitoring**: Agregar métrica para % de requests con `isLongDocument=true`
4. **Iteración**: Ajustar threshold (3000 chars) basado en feedback real

---

**Commit Hash Frontend**: [pendiente después de merge]  
**Fecha**: 2024-12-25  
**Autor**: AL-EON Frontend Team
