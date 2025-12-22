# Implementación de Autenticación JWT en AL-E Core

## Objetivo
Implementar autenticación real usando Supabase JWT para identificar usuarios por UUID en lugar de texto.

## Requisitos Técnicos

### 1. Middleware `verifyAuth`

Crear middleware para validar el JWT en cada request:

```javascript
// middleware/verifyAuth.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Service key para backend
);

async function verifyAuth(req, res, next) {
  try {
    // Extraer token del header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const token = authHeader.substring(7); // Remover "Bearer "

    // Validar token con Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    // Adjuntar usuario al request
    req.user = {
      id: user.id,        // UUID del usuario
      email: user.email
    };

    next();
  } catch (error) {
    console.error('Error en verifyAuth:', error);
    return res.status(401).json({ error: 'Error de autenticación' });
  }
}

module.exports = verifyAuth;
```

### 2. Actualizar endpoint `/api/ai/chat`

```javascript
// routes/chat.js
const express = require('express');
const router = express.Router();
const verifyAuth = require('../middleware/verifyAuth');

router.post('/chat', verifyAuth, async (req, res) => {
  try {
    // El user_id REAL viene del token (NO confiar en body)
    const userId = req.user.id; // UUID de Supabase auth.users
    const { workspaceId = 'al-eon', messages, sessionId } = req.body;

    // 1. Buscar o crear sesión para este usuario
    let session = await getOrCreateSession({
      userId,
      workspaceId,
      sessionId
    });

    // 2. Guardar mensaje del usuario en ae_messages
    await saveMessage({
      sessionId: session.id,
      role: 'user',
      content: messages[messages.length - 1].content,
      userId
    });

    // 3. Obtener contexto y memoria del usuario
    const userMemory = await getUserMemory(userId, workspaceId);
    
    // 4. Llamar a OpenAI/Claude con el contexto
    const aiResponse = await callAI({
      messages,
      userMemory,
      systemPrompt: getSystemPrompt(workspaceId)
    });

    // 5. Guardar respuesta en ae_messages
    await saveMessage({
      sessionId: session.id,
      role: 'assistant',
      content: aiResponse.answer,
      userId
    });

    // 6. Actualizar memoria si hay memories_to_add
    if (aiResponse.memories_to_add?.length > 0) {
      await saveMemories(userId, workspaceId, aiResponse.memories_to_add);
    }

    // 7. Devolver respuesta
    res.json({
      answer: aiResponse.answer,
      memories_to_add: aiResponse.memories_to_add || [],
      actions: aiResponse.actions || [],
      artifacts: aiResponse.artifacts || []
    });

  } catch (error) {
    console.error('Error en /api/ai/chat:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
```

### 3. Funciones auxiliares

```javascript
// Buscar o crear sesión
async function getOrCreateSession({ userId, workspaceId, sessionId }) {
  if (sessionId) {
    // Verificar que la sesión pertenezca al usuario
    const session = await db.query(
      'SELECT * FROM ae_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, userId]
    );
    
    if (session.rows[0]) {
      return session.rows[0];
    }
  }

  // Crear nueva sesión
  const result = await db.query(
    `INSERT INTO ae_sessions (user_id, workspace_id, title, created_at, last_message_at)
     VALUES ($1, $2, $3, NOW(), NOW())
     RETURNING *`,
    [userId, workspaceId, 'Nueva conversación']
  );

  return result.rows[0];
}

// Guardar mensaje
async function saveMessage({ sessionId, role, content, userId }) {
  await db.query(
    `INSERT INTO ae_messages (session_id, role, content, user_id, created_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [sessionId, role, content, userId]
  );

  // Actualizar last_message_at en sesión
  await db.query(
    'UPDATE ae_sessions SET last_message_at = NOW() WHERE id = $1',
    [sessionId]
  );
}

// Obtener memoria del usuario
async function getUserMemory(userId, workspaceId) {
  const result = await db.query(
    `SELECT memory_key, memory_value, importance, last_accessed 
     FROM ae_user_memory 
     WHERE user_id = $1 AND workspace_id = $2 
     ORDER BY importance DESC, last_accessed DESC 
     LIMIT 50`,
    [userId, workspaceId]
  );

  return result.rows;
}

// Guardar memorias
async function saveMemories(userId, workspaceId, memories) {
  for (const memory of memories) {
    await db.query(
      `INSERT INTO ae_user_memory (user_id, workspace_id, memory_key, memory_value, importance, created_at, last_accessed)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (user_id, workspace_id, memory_key) 
       DO UPDATE SET 
         memory_value = EXCLUDED.memory_value,
         importance = EXCLUDED.importance,
         last_accessed = NOW()`,
      [userId, workspaceId, memory.key, memory.value, memory.importance || 5]
    );
  }
}
```

### 4. Seguridad

#### Rate Limiting por usuario
```javascript
const rateLimit = require('express-rate-limit');

const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 20, // 20 requests por minuto
  keyGenerator: (req) => req.user.id, // Rate limit por UUID
  message: 'Demasiadas peticiones, intenta de nuevo más tarde'
});

router.post('/chat', verifyAuth, chatLimiter, async (req, res) => {
  // ...
});
```

#### Validación de datos
```javascript
const { body, validationResult } = require('express-validator');

router.post('/chat', 
  verifyAuth,
  [
    body('messages').isArray().notEmpty(),
    body('messages.*.role').isIn(['user', 'assistant', 'system']),
    body('messages.*.content').isString().notEmpty(),
    body('workspaceId').optional().isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Procesar request...
  }
);
```

## Variables de Entorno

```env
# Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_KEY=tu_service_key_aqui

# PostgreSQL (Supabase)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.tu-proyecto.supabase.co:5432/postgres

# OpenAI/Anthropic
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

## Estructura de Base de Datos

```sql
-- Las tablas ya existen, pero asegúrate de que user_id sea UUID y tenga FK

-- ae_sessions
CREATE TABLE IF NOT EXISTS ae_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL DEFAULT 'al-eon',
  title TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_message_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_workspace ON ae_sessions(user_id, workspace_id);
CREATE INDEX idx_sessions_last_message ON ae_sessions(last_message_at DESC);

-- ae_messages
CREATE TABLE IF NOT EXISTS ae_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES ae_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_session ON ae_messages(session_id, created_at);

-- ae_user_memory
CREATE TABLE IF NOT EXISTS ae_user_memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL DEFAULT 'al-eon',
  memory_key TEXT NOT NULL,
  memory_value TEXT NOT NULL,
  importance INTEGER DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),
  created_at TIMESTAMP DEFAULT NOW(),
  last_accessed TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, workspace_id, memory_key)
);

CREATE INDEX idx_memory_user_workspace ON ae_user_memory(user_id, workspace_id);
CREATE INDEX idx_memory_importance ON ae_user_memory(importance DESC);
```

## Testing

```bash
# Test con curl
curl -X POST https://api.al-entity.com/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "workspaceId": "al-eon",
    "messages": [
      {"role": "user", "content": "Hola, ¿cómo estás?"}
    ]
  }'

# Respuesta esperada:
# {
#   "answer": "¡Hola! Estoy bien, gracias por preguntar...",
#   "memories_to_add": [],
#   "actions": [],
#   "artifacts": []
# }
```

## Checklist de Implementación

- [ ] Instalar dependencias: `npm install @supabase/supabase-js express-rate-limit express-validator`
- [ ] Crear middleware `verifyAuth`
- [ ] Actualizar endpoint `/api/ai/chat` para usar `req.user.id`
- [ ] Migrar tablas a UUID (ver SUPABASE-MIGRATION.sql)
- [ ] Implementar rate limiting por usuario
- [ ] Probar con token real de Supabase
- [ ] Agregar logs de auditoría (quién hizo qué y cuándo)
- [ ] Documentar API en Swagger/OpenAPI

---

**Importante:** NUNCA confiar en `userId` del body. Siempre usar `req.user.id` del JWT validado.
