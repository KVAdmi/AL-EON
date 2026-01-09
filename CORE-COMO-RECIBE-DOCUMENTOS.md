# 📚 AL-E CORE: Cómo Recibe y Procesa Documentos

## 🎯 Flujo Completo: Frontend → Backend

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USUARIO ENVÍA MENSAJE                                    │
│    - Escribe en chat                                         │
│    - Puede adjuntar archivos (drag & drop)                   │
│    - Proyecto puede tener documentos pre-cargados            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. FRONTEND BUSCA DOCUMENTOS DEL PROYECTO                   │
│    - Si conversation.project_id existe                       │
│    - Lee carpeta: user-files/{userId}/projects/{projectId}/ │
│    - Obtiene URLs públicas de Supabase Storage               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. FRONTEND SUBE ARCHIVOS ADJUNTOS (si existen)             │
│    - Archivos que el usuario arrastró al chat                │
│    - Se suben a: user-files/{userId}/conversations/{convId}/│
│    - También obtiene URLs públicas                           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. FRONTEND COMBINA TODO                                     │
│    allFiles = [                                              │
│      ...documentosDelProyecto,  // Pre-cargados              │
│      ...archivosAdjuntos        // Recién subidos            │
│    ]                                                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. FRONTEND ENVÍA A CORE                                     │
│    POST http://100.27.201.233:3000/api/ai/chat/v2           │
│    {                                                         │
│      message: "analiza estos documentos",                    │
│      sessionId: "sess_123...",                               │
│      workspaceId: "core",                                    │
│      projectId: "proj_456...",                               │
│      attachments: [/* ARRAY DE ARCHIVOS */]                 │
│    }                                                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. CORE RECIBE Y PROCESA                                     │
│    - Descarga archivos desde URLs                            │
│    - Extrae texto/contenido                                  │
│    - Genera embeddings (si aplica)                           │
│    - Consulta con contexto                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 FORMATO DEL PAYLOAD QUE RECIBE CORE

### Endpoint
```
POST http://100.27.201.233:3000/api/ai/chat/v2
```

### Headers
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Body (JSON)
```json
{
  "message": "analiza el documento Kunna_Info.pdf y dime qué contiene",
  "sessionId": "sess_1234567890_abcdef",
  "workspaceId": "core",
  "projectId": "01939ed9-f56d-70ac-8e81-2ce10a6e94df",
  "userId": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userEmail": "patto@infinitykode.com",
  "userDisplayName": "Patricia Garibay",
  "mode": "universal",
  "meta": {
    "platform": "AL-EON",
    "version": "1.0.0",
    "source": "al-eon-console",
    "timestamp": "2026-01-08T10:30:00.000Z"
  },
  "attachments": [
    {
      "name": "Kunna_Info.pdf",
      "url": "https://aaydqotuutdxekugbcnn.supabase.co/storage/v1/object/public/user-files/12345/projects/01939ed9-f56d-70ac-8e81-2ce10a6e94df/Kunna_Info.pdf",
      "type": "application/pdf",
      "size": 245678
    },
    {
      "name": "Propuesta.docx",
      "url": "https://aaydqotuutdxekugbcnn.supabase.co/storage/v1/object/public/user-files/12345/projects/01939ed9-f56d-70ac-8e81-2ce10a6e94df/Propuesta.docx",
      "type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "size": 128456
    }
  ]
}
```

---

## 🔑 CAMPOS CLAVE

### `attachments[]` - ARRAY DE OBJETOS

Cada objeto en el array tiene:

| Campo  | Tipo   | Descripción                                     | Ejemplo                                      |
|--------|--------|-------------------------------------------------|----------------------------------------------|
| `name` | string | Nombre ORIGINAL del archivo (ya no se renombra) | `"Kunna_Info.pdf"`                           |
| `url`  | string | URL pública de Supabase Storage                 | `"https://...supabase.co/storage/.../file"`  |
| `type` | string | MIME type del archivo                           | `"application/pdf"`                          |
| `size` | number | Tamaño en bytes                                 | `245678`                                     |

### ✅ IMPORTANTE: URLs SON PÚBLICAS

Las URLs de Supabase Storage son **públicas** y **accesibles sin autenticación** porque el bucket `user-files` tiene la política:

```sql
CREATE POLICY "Files are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'user-files');
```

**Core puede descargar los archivos directamente** haciendo:
```javascript
const response = await fetch(attachment.url);
const buffer = await response.arrayBuffer();
```

---

## 📂 ESTRUCTURA DE CARPETAS EN STORAGE

```
user-files/
├── {userId}/
│   ├── projects/
│   │   ├── {projectId}/
│   │   │   ├── Kunna_Info.pdf          ← Documentos del proyecto
│   │   │   ├── Propuesta.docx
│   │   │   └── Plan_2026.xlsx
│   │   └── {anotherProjectId}/
│   │       └── ...
│   └── conversations/
│       ├── {conversationId}/
│       │   ├── imagen.jpg              ← Adjuntos específicos del chat
│       │   └── screenshot.png
│       └── {anotherConvId}/
│           └── ...
```

### 🎯 Lógica de Archivos

| Tipo                       | Ubicación                                     | Cuándo se envía                          |
|----------------------------|-----------------------------------------------|------------------------------------------|
| **Documentos del Proyecto** | `user-files/{userId}/projects/{projectId}/`   | **SIEMPRE** que el chat tenga projectId  |
| **Archivos Adjuntos**       | `user-files/{userId}/conversations/{convId}/` | Solo cuando el usuario los adjunta       |

---

## 💻 CÓDIGO FRONTEND: useChat.js

### 1. Buscar Documentos del Proyecto

```javascript
// 0. Obtener documentos del proyecto si existe
let projectDocuments = [];
if (currentConversation.project_id) {
  console.log('📁 Buscando documentos del proyecto:', currentConversation.project_id);
  
  const projectPath = `${userId}/projects/${currentConversation.project_id}/`;
  const { data, error: docsError } = await supabase.storage
    .from('user-files')
    .list(projectPath, {
      limit: 100,
      offset: 0
    });

  if (!docsError && data && data.length > 0) {
    console.log(`✅ Encontrados ${data.length} documentos del proyecto`);
    
    // Obtener URLs públicas de los documentos
    projectDocuments = data.map(doc => {
      const { data: { publicUrl } } = supabase.storage
        .from('user-files')
        .getPublicUrl(`${projectPath}${doc.name}`);
      
      return {
        name: doc.name,
        url: publicUrl,
        size: doc.metadata?.size || 0,
        type: doc.metadata?.mimetype || 'application/octet-stream'
      };
    });

    console.log('📄 Documentos del proyecto:', projectDocuments.map(d => d.name));
  }
}
```

### 2. Subir Archivos Adjuntos

```javascript
// 1. Subir archivos adjuntos si existen
let uploadedFiles = [];
if (attachments && attachments.length > 0) {
  console.log('📤 Subiendo archivos adjuntos:', attachments.map(f => f.name));
  uploadedFiles = await uploadFiles(attachments, userId);
  console.log('✅ Archivos adjuntos subidos:', uploadedFiles);
}
```

### 3. Combinar Todo

```javascript
// Combinar documentos del proyecto + archivos adjuntos
const allFiles = [
  ...projectDocuments,  // Pre-cargados del proyecto
  ...uploadedFiles.map(f => ({
    name: f.name,
    url: f.url,
    type: f.type,
    size: f.size
  }))
];

console.log(`📦 Total de archivos: ${allFiles.length} (${projectDocuments.length} del proyecto + ${uploadedFiles.length} adjuntos)`);
```

### 4. Enviar a Core

```javascript
const response = await sendToAleCore({
  accessToken,
  message: content.trim(),
  sessionId: finalSessionId,
  workspaceId,
  projectId: currentConversation.project_id || null,
  userEmail,
  userDisplayName,
  meta: {
    platform: "AL-EON",
    version: "1.0.0",
    source: "al-eon-console",
    timestamp: new Date().toISOString()
  },
  files: allFiles.length > 0 ? allFiles : undefined // ← AQUÍ VAN TODOS
});
```

---

## 💻 CÓDIGO FRONTEND: aleCoreClient.js

### Función sendToAleCore()

```javascript
export async function sendToAleCore({ 
  accessToken, 
  message, 
  sessionId, 
  workspaceId, 
  projectId, 
  userEmail, 
  userDisplayName, 
  meta, 
  files,      // ← Recibe array de archivos
  signal 
}) {
  const BASE_URL = import.meta.env.VITE_ALE_CORE_BASE;
  const url = `${BASE_URL}/api/ai/chat/v2`;

  const payloadData = {
    message: message.trim(),
    sessionId: sessionId || undefined,
    workspaceId: workspaceId || 'core',
    projectId: projectId || undefined,
    userId: accessToken,
    userEmail: userEmail || undefined,
    userDisplayName: userDisplayName || undefined,
    mode: 'universal',
    meta: meta || {
      platform: "AL-EON",
      version: "1.0.0",
      source: "al-eon-console",
      timestamp: new Date().toISOString()
    }
  };

  // ✅ Agregar archivos si existen
  if (files && files.length > 0) {
    payloadData.attachments = files;  // ← Core espera "attachments"
    console.log('📎 Archivos adjuntos:', files.length, files);
  }

  console.log('📤 PAYLOAD (v2):', JSON.stringify(payloadData, null, 2));

  const fetchOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`
    },
    body: JSON.stringify(payloadData),
    signal
  };

  const res = await fetch(url, fetchOptions);
  const text = await res.text();
  
  if (!res.ok) {
    throw new Error(`AL-E Core respondió ${res.status}: ${text}`);
  }

  return JSON.parse(text);
}
```

---

## 🧪 EJEMPLO DE LOGS EN FRONTEND

### Cuando se envía un mensaje con proyecto:

```
📁 Buscando documentos del proyecto: 01939ed9-f56d-70ac-8e81-2ce10a6e94df
✅ Encontrados 3 documentos del proyecto
📄 Documentos del proyecto: ["Kunna_Info.pdf", "Propuesta.docx", "Plan_2026.xlsx"]
📦 Total de archivos: 3 (3 del proyecto + 0 adjuntos)
📤 PAYLOAD (v2): {
  "message": "analiza el documento Kunna_Info.pdf",
  "sessionId": "sess_1234567890_abcdef",
  "workspaceId": "core",
  "projectId": "01939ed9-f56d-70ac-8e81-2ce10a6e94df",
  "attachments": [
    {
      "name": "Kunna_Info.pdf",
      "url": "https://aaydqotuutdxekugbcnn.supabase.co/storage/v1/object/public/user-files/12345/projects/01939ed9-f56d-70ac-8e81-2ce10a6e94df/Kunna_Info.pdf",
      "type": "application/pdf",
      "size": 245678
    },
    // ... otros 2 archivos
  ]
}
```

### Cuando se adjuntan archivos en el chat:

```
📤 Subiendo archivos adjuntos: ["screenshot.png"]
✅ Archivos adjuntos subidos: [{ name: "screenshot.png", url: "...", ... }]
📦 Total de archivos: 4 (3 del proyecto + 1 adjuntos)
📎 Archivos adjuntos: 4 [...]
```

---

## 🎯 LO QUE CORE DEBE HACER

### 1. Recibir el array `attachments`

```javascript
// En el endpoint /api/ai/chat/v2
app.post('/api/ai/chat/v2', async (req, res) => {
  const { message, attachments, sessionId, projectId, ... } = req.body;
  
  console.log(`[ATTACHMENTS] Recibidos ${attachments?.length || 0} archivos`);
  
  if (attachments && attachments.length > 0) {
    console.log('[ATTACHMENTS] Archivos:', attachments.map(a => a.name));
  }
});
```

### 2. Descargar y procesar cada archivo

```javascript
async function processAttachments(attachments) {
  const processedFiles = [];
  
  for (const file of attachments) {
    console.log(`[ATTACHMENTS] Procesando: ${file.name} (${file.type})`);
    
    try {
      // Descargar archivo
      const response = await fetch(file.url);
      const buffer = await response.arrayBuffer();
      
      // Extraer texto según el tipo
      let content = '';
      
      if (file.type === 'application/pdf') {
        content = await extractTextFromPDF(buffer);
      } else if (file.type.includes('word')) {
        content = await extractTextFromDOCX(buffer);
      } else if (file.type.includes('text')) {
        content = new TextDecoder().decode(buffer);
      }
      // ... más tipos
      
      processedFiles.push({
        name: file.name,
        content: content,
        type: file.type
      });
      
      console.log(`[ATTACHMENTS] ✅ ${file.name} procesado (${content.length} caracteres)`);
      
    } catch (error) {
      console.error(`[ATTACHMENTS] ❌ Error procesando ${file.name}:`, error);
    }
  }
  
  return processedFiles;
}
```

### 3. Incluir contenido en el prompt

```javascript
// Construir contexto con documentos
let contextFromDocs = '';

if (processedFiles.length > 0) {
  contextFromDocs = '\n\n=== DOCUMENTOS DISPONIBLES ===\n\n';
  
  for (const file of processedFiles) {
    contextFromDocs += `--- ${file.name} ---\n`;
    contextFromDocs += file.content + '\n\n';
  }
}

// Agregar al prompt
const fullPrompt = `
${systemPrompt}

${contextFromDocs}

Usuario: ${message}
`;

// Enviar a OpenAI o el LLM que usen
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: fullPrompt }
  ]
});
```

---

## ✅ CHECKLIST PARA CORE

### Backend debe:
- [ ] Recibir array `attachments` en `/api/ai/chat/v2`
- [ ] Loggear cantidad de archivos recibidos
- [ ] Descargar cada archivo desde su URL pública
- [ ] Extraer texto/contenido según el tipo (PDF, DOCX, TXT, etc.)
- [ ] Incluir contenido en el contexto del prompt
- [ ] Responder normalmente con `{ answer: "...", success: true }`
- [ ] Loggear errores si falla el procesamiento de algún archivo

### Formatos a soportar (mínimo):
- [ ] `.pdf` - application/pdf
- [ ] `.docx` - application/vnd.openxmlformats-officedocument.wordprocessingml.document
- [ ] `.txt` - text/plain
- [ ] `.md` - text/markdown
- [ ] `.csv` - text/csv
- [ ] `.json` - application/json

### Librerías recomendadas:
- `pdf-parse` o `pdfjs-dist` para PDFs
- `mammoth` para DOCX
- `xlsx` para Excel
- `csv-parse` para CSVs

---

## 🚀 EJEMPLO DE RESPUESTA DE CORE

```json
{
  "success": true,
  "answer": "He revisado el documento **Kunna_Info.pdf** que contiene:\n\n1. Información corporativa de Kunna\n2. Descripción de servicios\n3. Lista de clientes actuales\n\nSegún el documento, Kunna es una empresa de...",
  "session_id": "sess_1234567890_abcdef",
  "meta": {
    "filesProcessed": 3,
    "filesNames": ["Kunna_Info.pdf", "Propuesta.docx", "Plan_2026.xlsx"],
    "totalCharacters": 15678
  }
}
```

---

## 📝 NOTAS IMPORTANTES

### ✅ Nombres Originales
Desde ahora, los archivos **mantienen su nombre original**. Ya no se renombran con timestamp + random.

Antes: `1767929183648-abuqul.docx` 😡  
Ahora: `Propuesta.docx` 😊

### ✅ URLs Públicas
Las URLs son **públicas** y **accesibles sin autenticación**. Core puede descargarlas directamente.

### ✅ Documentos del Proyecto
Si el chat tiene `projectId`, **SIEMPRE** se envían todos los documentos del proyecto en cada mensaje.

Esto permite que AL-E tenga contexto completo del proyecto en todo momento.

### ✅ Archivos Adjuntos
Los archivos que el usuario arrastra al chat se suben a `conversations/{convId}/` y también se incluyen en `attachments`.

---

## 🎯 RESUMEN EJECUTIVO

**Frontend (AL-EON):**
1. ✅ Busca documentos del proyecto automáticamente
2. ✅ Sube archivos adjuntos del usuario
3. ✅ Combina ambos en un solo array
4. ✅ Envía a Core en campo `attachments`
5. ✅ Mantiene nombres originales (sin renombrar)

**Backend (AL-E Core):**
1. ❓ Recibe array `attachments`
2. ❓ Descarga archivos desde URLs
3. ❓ Extrae contenido/texto
4. ❓ Incluye en prompt a LLM
5. ❓ Responde normalmente

---

**¿Preguntas?** Cualquier duda sobre el formato, envíame un mensaje. 🚀

---

**Creado:** 8 de enero de 2026  
**Para:** Equipo AL-E Core  
**Por:** Patricia Garibay (Patto) con ayuda de GitHub Copilot
