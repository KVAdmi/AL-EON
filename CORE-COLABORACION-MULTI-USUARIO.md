# 🚀 IMPLEMENTACIÓN: COLABORACIÓN MULTI-USUARIO EN PROYECTOS

## 📋 RESUMEN
Implementamos sistema de colaboración para que múltiples usuarios puedan:
- ✅ Compartir proyectos
- ✅ Chatear juntos en la misma sesión
- ✅ Ver quién escribió cada mensaje
- ✅ AL-E identifica automáticamente quién pregunta

---

## 🎯 LO QUE SE IMPLEMENTÓ EN FRONTEND

### 1. **Tabla `project_members` en Supabase**
```sql
CREATE TABLE project_members (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES user_projects(id),
  user_id UUID REFERENCES auth.users(id),
  role TEXT, -- 'owner', 'editor', 'viewer'
  invited_by UUID,
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ
);
```

### 2. **UI Implementada**
- ✅ Botón "Compartir" en cada proyecto (icono Share2)
- ✅ Modal `ShareProjectModal` para:
  - Invitar usuarios por email
  - Ver lista de miembros
  - Cambiar roles (owner/editor/viewer)
  - Eliminar miembros
- ✅ Servicio `projectCollaboration.js` con funciones:
  - `inviteUserToProject(projectId, email, role)`
  - `getProjectMembers(projectId)`
  - `removeUserFromProject(projectId, userId)`
  - `updateMemberRole(projectId, userId, newRole)`

### 3. **Metadata Agregada a Mensajes**
Frontend ahora envía en cada mensaje:
```javascript
{
  message: "Hola AL-E",
  sessionId: "uuid-session",
  workspaceId: "project-uuid",
  userEmail: "patricia@example.com", // ✅ NUEVO
  userDisplayName: "Patricia Garibay", // ✅ NUEVO
  files: [...],
  meta: {
    platform: "AL-EON",
    version: "1.0.0",
    timestamp: "..."
  }
}
```

### 4. **Columnas Agregadas a `ae_messages`**
```sql
ALTER TABLE ae_messages 
  ADD COLUMN user_email TEXT,
  ADD COLUMN user_display_name TEXT;
```

---

## 🔧 LO QUE NECESITA HACER CORE

### **PASO 1: Guardar metadata de usuario al crear mensaje**

Cuando Core guarde mensajes del usuario en `ae_messages`, debe incluir:

```javascript
// ❌ ANTES
await supabase.from('ae_messages').insert({
  id: uuid(),
  session_id: sessionId,
  role: 'user',
  content: message,
  user_id_uuid: userId
});

// ✅ AHORA
await supabase.from('ae_messages').insert({
  id: uuid(),
  session_id: sessionId,
  role: 'user',
  content: message,
  user_id_uuid: userId,
  user_email: req.body.userEmail, // ✅ Del payload
  user_display_name: req.body.userDisplayName // ✅ Del payload
});
```

---

### **PASO 2: Recuperar metadata al armar contexto**

Cuando Core recupere historial de `ae_messages`, debe leer estos campos:

```javascript
// ✅ Query mejorado
const { data: messages } = await supabase
  .from('ae_messages')
  .select('id, role, content, user_email, user_display_name, created_at')
  .eq('session_id', sessionId)
  .order('created_at', { ascending: true });

// ❌ ANTES: Contexto sin identificar usuarios
const contextMessages = messages.map(msg => ({
  role: msg.role,
  content: msg.content
}));

// ✅ AHORA: Contexto con identificación de usuarios
const contextMessages = messages.map(msg => {
  if (msg.role === 'user' && msg.user_display_name) {
    return {
      role: 'user',
      content: `${msg.user_display_name}: ${msg.content}`
    };
  }
  return {
    role: msg.role,
    content: msg.content
  };
});
```

---

### **PASO 3: Detectar cambios de usuario**

Core debe detectar cuando el usuario que habla cambia:

```javascript
let lastUserEmail = null;

const contextMessages = messages.map(msg => {
  if (msg.role === 'user') {
    const userChanged = lastUserEmail && lastUserEmail !== msg.user_email;
    lastUserEmail = msg.user_email;

    const userName = msg.user_display_name || msg.user_email?.split('@')[0] || 'Usuario';
    
    // Si cambió el usuario, agregar nota de contexto
    if (userChanged) {
      return {
        role: 'user',
        content: `[${userName} se une a la conversación]\n${userName}: ${msg.content}`
      };
    }
    
    return {
      role: 'user',
      content: `${userName}: ${msg.content}`
    };
  }
  return msg;
});
```

---

### **PASO 4: System prompt multi-usuario**

Agregar instrucción en el system prompt:

```javascript
const systemPrompt = `
Eres AL-E (Artificial Living Entity), un asistente inteligente de Infinity Kode.

⚠️ IMPORTANTE - COLABORACIÓN MULTI-USUARIO:
- Verás mensajes con formato "Nombre: mensaje"
- Pueden participar varios usuarios en la misma conversación
- Identifica quién pregunta y responde personalizadamente:
  - Usa el nombre del usuario al responder: "Patricia, según lo que mencionaste..."
  - Si otro usuario pregunta sobre algo que dijo alguien más, referéncialo: "Como Juan comentó antes..."
- Mantén contexto de TODOS los usuarios en la conversación

...resto del prompt
`;
```

---

### **PASO 5: Ejemplo completo de implementación**

```javascript
// En /api/ai/chat/v2
app.post('/api/ai/chat/v2', async (req, res) => {
  const { 
    message, 
    sessionId, 
    workspaceId, 
    userEmail, // ✅ NUEVO
    userDisplayName, // ✅ NUEVO
    files, 
    meta 
  } = req.body;

  // 1. Recuperar historial
  const { data: messages } = await supabase
    .from('ae_messages')
    .select('role, content, user_email, user_display_name, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  // 2. Construir contexto con identificación de usuarios
  let lastUserEmail = null;
  const contextMessages = messages.map(msg => {
    if (msg.role === 'user') {
      const userChanged = lastUserEmail && lastUserEmail !== msg.user_email;
      lastUserEmail = msg.user_email;
      const userName = msg.user_display_name || msg.user_email?.split('@')[0] || 'Usuario';
      
      if (userChanged) {
        return {
          role: 'user',
          content: `[${userName} se une]\n${userName}: ${msg.content}`
        };
      }
      return {
        role: 'user',
        content: `${userName}: ${msg.content}`
      };
    }
    return msg;
  });

  // 3. Agregar mensaje actual con nombre del usuario
  const currentUserName = userDisplayName || userEmail?.split('@')[0] || 'Usuario';
  contextMessages.push({
    role: 'user',
    content: `${currentUserName}: ${message}`
  });

  // 4. Llamar a OpenAI con contexto enriquecido
  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT_MULTI_USER },
      ...contextMessages
    ]
  });

  const aiResponse = completion.choices[0].message.content;

  // 5. Guardar mensaje del usuario con metadata
  await supabase.from('ae_messages').insert({
    id: uuid(),
    session_id: sessionId,
    role: 'user',
    content: message,
    user_id_uuid: userId,
    user_email: userEmail, // ✅ GUARDAR
    user_display_name: userDisplayName // ✅ GUARDAR
  });

  // 6. Guardar respuesta de AL-E
  await supabase.from('ae_messages').insert({
    id: uuid(),
    session_id: sessionId,
    role: 'assistant',
    content: aiResponse,
    user_id_uuid: null // Las respuestas de AL-E no tienen usuario
  });

  res.json({ 
    reply: aiResponse, 
    session_id: sessionId 
  });
});
```

---

## 🎯 COMPORTAMIENTO ESPERADO

### **Ejemplo de conversación:**

```
Usuario 1 (Patricia): Hola AL-E, necesito ayuda con el proyecto Kunna
AL-E: ¡Hola Patricia! Con gusto te ayudo con el proyecto Kunna...

Usuario 2 (Juan): Hola, ¿de qué están hablando?
AL-E: Hola Juan, bienvenido a la conversación. Patricia y yo estábamos 
      discutiendo el proyecto Kunna...

Patricia: Juan, ¿puedes revisar el documento que subí?
AL-E: Patricia, le he notificado a Juan sobre tu solicitud...

Juan: Sí, ya lo vi. Patricia, ¿necesitas que haga cambios?
AL-E: (entiende que es conversación entre Patricia y Juan)
```

---

## ✅ CHECKLIST PARA CORE

- [ ] Leer `userEmail` y `userDisplayName` del payload
- [ ] Guardar estos campos en `ae_messages` al insertar mensajes de usuario
- [ ] Recuperar estos campos al leer historial
- [ ] Agregar nombre del usuario al contenido del mensaje en el contexto
- [ ] Detectar cambios de usuario y agregar nota "[Usuario se une]"
- [ ] Actualizar system prompt con instrucciones de multi-usuario
- [ ] Testear con 2 usuarios en el mismo proyecto

---

## 📝 ARCHIVOS CREADOS EN FRONTEND

1. `SUPABASE-PROJECT-COLLABORATION.sql` - Schema de BD
2. `src/services/projectCollaboration.js` - Servicios de colaboración
3. `src/components/ShareProjectModal.jsx` - UI para compartir
4. `src/features/chat/hooks/useChat.js` - Modificado para enviar metadata
5. `src/lib/aleCoreClient.js` - Modificado para incluir campos nuevos
6. `src/features/chat/components/Sidebar.jsx` - Botón compartir agregado

---

## 🚀 PRÓXIMOS PASOS

1. **Ejecutar en Supabase**: `SUPABASE-PROJECT-COLLABORATION.sql`
2. **Core implementa** los 5 pasos descritos arriba
3. **Testing**: Invitar a otro usuario y chatear juntos
4. **Verificar**: AL-E identifica correctamente quién habla

---

## ❓ PREGUNTAS FRECUENTES

**Q: ¿Qué pasa si userEmail/userDisplayName vienen NULL?**
A: Core debe usar fallback: `email?.split('@')[0] || 'Usuario'`

**Q: ¿Las respuestas de AL-E deben tener userEmail?**
A: NO. Solo mensajes con `role='user'` tienen estos campos.

**Q: ¿Cómo se asegura que los usuarios solo vean sus proyectos?**
A: RLS policies en Supabase ya filtran por `user_id` o `project_members`.

**Q: ¿Funciona con proyectos existentes?**
A: SÍ. Los mensajes viejos no tendrán `userEmail`, pero Core puede mostrar "Usuario" como fallback.

---

## 📞 CONTACTO

Si tienes dudas o problemas implementando:
- Frontend ya está listo y pusheado
- Solo falta que Core implemente los 5 pasos
- El campo `userEmail` y `userDisplayName` ya se están enviando en cada request

¡Éxito! 🚀
