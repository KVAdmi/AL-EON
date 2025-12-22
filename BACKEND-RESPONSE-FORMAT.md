# Formato de Respuesta del Backend (AL-E Core)

## Estructura de Respuesta Esperada

El backend **AL-E Core** responde con un objeto JSON con esta estructura:

```json
{
  "answer": "Hola, ¿en qué puedo asistirte hoy?",
  "memories_to_add": [],
  "actions": [],
  "artifacts": []
}
```

## Campos

| Campo | Tipo | Descripción | ¿Se muestra? |
|-------|------|-------------|--------------|
| `answer` | `string` | **Respuesta visible para el usuario** | ✅ SÍ |
| `memories_to_add` | `array` | Memorias para guardar en el backend | ❌ NO |
| `actions` | `array` | Acciones ejecutadas (opcional) | ❌ NO |
| `artifacts` | `array` | Artefactos generados (opcional) | ❌ NO |

## Extracción en el Frontend

### ✅ CORRECTO

```javascript
// useChat.js
const response = await sendToAleCore({...});
const replyText = extractReply(response); // Extrae response.answer

addMessage(currentConversation.id, {
  role: 'assistant',
  content: replyText // ✅ Solo texto, nunca objeto
});
```

### ❌ INCORRECTO

```javascript
// ❌ NO HACER ESTO
addMessage(currentConversation.id, {
  role: 'assistant',
  content: response // ❌ Esto renderizaría JSON crudo
});
```

## Función `extractReply()`

Ubicación: `src/lib/aleCoreClient.js`

```javascript
export function extractReply(data) {
  // Prioridad 1: Campo "answer"
  if (data.answer && typeof data.answer === 'string') {
    return data.answer;
  }
  
  // Prioridad 2: Campos alternativos
  const reply = 
    data.displayText?.answer ||
    data.message ||
    data.content;
  
  if (reply) return reply;
  
  // Fallback: Error
  return 'Error: respuesta inválida del asistente';
}
```

## Validación Triple Capa

### 1. `extractReply()` - Extracción
Extrae `response.answer` del objeto JSON del backend.

### 2. `useChat.js` - Validación
Valida que `replyText` sea string antes de agregarlo a mensajes.

```javascript
if (!replyText || typeof replyText !== 'string') {
  throw new Error('Respuesta inválida del asistente');
}
```

### 3. `MarkdownRenderer` - Protección
Última línea de defensa: si accidentalmente se pasa un objeto, lo detecta y muestra error.

```javascript
if (typeof content === 'object') {
  console.error('ERROR: Se intentó renderizar objeto');
  return <ErrorMessage />;
}
```

## Resultado Visual

### ✅ Correcto
```
Hola, ¿en qué puedo asistirte hoy?
```

### ❌ Incorrecto
```
{ "answer": "Hola, ¿en qué puedo asistirte hoy?", "memories_to_add": [] }
```

## Testing

Para verificar que funciona correctamente:

1. **Abrir consola del navegador** (F12)
2. **Enviar un mensaje** en el chat
3. **Verificar logs:**
   ```
   📥 Respuesta de AL-E Core: {answer: "...", memories_to_add: [...]}
   ✅ Respuesta extraída de data.answer: "..."
   ```
4. **Verificar UI:** Solo debe verse el texto, NO el JSON

## Debugging

Si ves JSON en el chat:

1. **Verificar logs de consola:**
   - ¿Qué muestra `extractReply()`?
   - ¿Hay errores rojos en consola?

2. **Verificar estructura del backend:**
   - ¿El backend está devolviendo `{answer: "..."}`?
   - ¿O está devolviendo otro formato?

3. **Verificar useChat.js:**
   - ¿Se está llamando a `extractReply(response)`?
   - ¿O se está usando `response` directamente?

## Flujo Completo

```
Usuario escribe mensaje
      ↓
useChat.sendMessage()
      ↓
sendToAleCore() → POST /api/ai/chat
      ↓
Backend responde:
{
  answer: "Hola",
  memories_to_add: [...]
}
      ↓
extractReply(response)
      ↓
replyText = "Hola" ✅
      ↓
addMessage({ content: replyText })
      ↓
MessageThread renderiza con MarkdownRenderer
      ↓
Usuario ve: "Hola" ✅
```

---

**Regla de Oro:**  
El chat **SIEMPRE** muestra texto plano (con markdown).  
**NUNCA** objetos JSON.
