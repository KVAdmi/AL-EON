# 🚨 PARA EQUIPO CORE - ACCIONES REQUERIDAS URGENTE

**Prioridad**: P0 CRÍTICO  
**Fecha**: 10 de enero de 2026  
**Estado**: BLOQUEANTE para producción

---

## 📋 CONTEXTO

El frontend ha sido corregido y está funcional. Sin embargo, **AL-EON Core tiene fallas críticas** que rompen la confianza del usuario:

1. ❌ Inventa información sin acceder a fuentes reales
2. ❌ Dice que "puede hacer X" pero nunca ejecuta el tool
3. ❌ No lee imágenes a pesar de tener OCR configurado
4. ❌ No accede a URLs proporcionadas explícitamente

---

## 🔥 REGLA SUPREMA (NO NEGOCIABLE)

```
SI NO HAY EVIDENCIA REAL → NO SE PUEDE CONFIRMAR ACCIÓN
```

**Prohibido**:
- ✅ "Ya envié el correo" (sin messageId real)
- ✅ "Encontré esto en la web" (sin fetch real)
- ✅ "La imagen muestra..." (sin OCR ejecutado)
- ✅ "Analicé el documento" (sin parse real)

**Permitido**:
- ✅ "No pude enviar el correo. Error: [razón técnica]"
- ✅ "No pude acceder a la URL proporcionada"
- ✅ "No pude procesar la imagen. Error técnico: [detalles]"

---

## 1️⃣ ORQUESTADOR - VALIDACIÓN DE EVIDENCIA

### Cambio obligatorio en `orquestador.js` (o equivalente):

```javascript
/**
 * Ejecutar tool y VALIDAR evidencia antes de responder
 */
async function executeToolWithEvidence(toolName, params) {
  console.log(`[Orquestador] 🔧 Ejecutando tool: ${toolName}`);
  
  try {
    const result = await tools[toolName](params);
    
    // 🔥 VALIDACIÓN CRÍTICA
    if (TOOLS_REQUIRE_EVIDENCE.includes(toolName)) {
      if (!result.evidence || !result.evidence.id) {
        console.error(`[Orquestador] ❌ Tool "${toolName}" NO devolvió evidencia`);
        
        // 🚫 ABORTAR respuesta - NO permitir que el LLM invente
        return {
          success: false,
          error: result.error || 'No se pudo completar la acción',
          message: `No pude ejecutar ${toolName}. Motivo técnico: ${result.error || 'sin evidencia válida'}`
        };
      }
      
      console.log(`[Orquestador] ✅ Tool "${toolName}" ejecutado con evidencia: ${result.evidence.id}`);
    }
    
    return result;
    
  } catch (error) {
    console.error(`[Orquestador] ❌ Error ejecutando tool "${toolName}":`, error);
    
    return {
      success: false,
      error: error.message,
      message: `Error técnico al ejecutar ${toolName}: ${error.message}`
    };
  }
}

// 🔥 Lista de tools que REQUIEREN evidencia
const TOOLS_REQUIRE_EVIDENCE = [
  'sendEmail',
  'replyEmail',
  'fetchWebpage',
  'analyzeImage',
  'parseDocument',
  'createTask',
  'scheduleEvent',
  'createCalendarEntry'
];
```

---

## 2️⃣ CORREO ELECTRÓNICO

### Problema actual:
```
Usuario: "Responde a ese correo diciendo que sí"
AL-EON: "✓ Ya respondí al correo"
[EN REALIDAD: NO envió nada]
```

### Fix requerido en `email.tool.js`:

```javascript
async function replyEmail({ messageId, body, accountId }) {
  console.log(`[EmailTool] 📧 Respondiendo a messageId: ${messageId}`);
  
  try {
    // Intentar envío real
    const response = await fetch(`${BACKEND_URL}/api/mail/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ messageId, body, accountId })
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error(`[EmailTool] ❌ Error del servidor:`, error);
      
      // 🔥 DEVOLVER ERROR EXPLÍCITO
      return {
        success: false,
        error: error.message || 'Error al enviar respuesta',
        evidence: null
      };
    }
    
    const data = await response.json();
    
    // ✅ DEVOLVER CON EVIDENCIA
    return {
      success: true,
      messageId: data.messageId, // ← EVIDENCIA REAL
      evidence: {
        id: data.messageId,
        type: 'email_sent',
        timestamp: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.error(`[EmailTool] ❌ Error:`, error);
    
    // 🔥 NUNCA SIMULAR ÉXITO
    return {
      success: false,
      error: error.message,
      evidence: null
    };
  }
}
```

---

## 3️⃣ OCR / PROCESAMIENTO DE IMÁGENES

### Problema actual:
```
Usuario: [adjunta imagen con texto]
AL-EON: "No puedo ver imágenes. ¿Me la describes?"
[EN REALIDAD: Google Vision OCR está configurado]
```

### Fix requerido en `attachmentProcessor.js`:

```javascript
/**
 * Procesar attachment ANTES de que el LLM vea el mensaje
 */
async function processAttachment(attachment) {
  console.log(`[Attachment] 🖼️ Procesando: ${attachment.filename}`);
  
  const mimeType = attachment.content_type || attachment.mimeType;
  
  // 🔥 EJECUTAR OCR SI ES IMAGEN
  if (mimeType.startsWith('image/')) {
    try {
      const ocrResult = await googleVisionOCR(attachment.url || attachment.data);
      
      if (ocrResult.text && ocrResult.text.length > 0) {
        console.log(`[Attachment] ✅ OCR exitoso: ${ocrResult.text.length} caracteres`);
        
        return {
          type: 'image',
          filename: attachment.filename,
          ocrText: ocrResult.text, // ← TEXTO EXTRAÍDO
          language: ocrResult.language,
          confidence: ocrResult.confidence
        };
      } else {
        console.warn(`[Attachment] ⚠️ OCR no encontró texto en la imagen`);
        return {
          type: 'image',
          filename: attachment.filename,
          ocrText: null,
          note: 'La imagen no contiene texto legible'
        };
      }
      
    } catch (error) {
      console.error(`[Attachment] ❌ Error en OCR:`, error);
      
      // 🔥 DEVOLVER ERROR TÉCNICO
      return {
        type: 'image',
        filename: attachment.filename,
        ocrText: null,
        error: `Error técnico procesando imagen: ${error.message}`
      };
    }
  }
  
  // Otros tipos de archivos...
  return { type: 'unknown', filename: attachment.filename };
}

/**
 * Inyectar contexto de attachments en el system prompt
 */
function buildSystemPromptWithAttachments(basePrompt, attachments) {
  if (!attachments || attachments.length === 0) {
    return basePrompt;
  }
  
  let attachmentContext = '\n\n📎 ARCHIVOS ADJUNTOS:\n';
  
  attachments.forEach(att => {
    attachmentContext += `\n- ${att.filename}`;
    
    if (att.ocrText) {
      attachmentContext += `\n  Texto extraído (OCR):\n  """${att.ocrText}"""`;
    } else if (att.error) {
      attachmentContext += `\n  Error: ${att.error}`;
    } else if (att.note) {
      attachmentContext += `\n  Nota: ${att.note}`;
    }
  });
  
  // 🔥 INYECTAR AL INICIO DEL SYSTEM PROMPT
  return basePrompt + attachmentContext;
}
```

---

## 4️⃣ FETCH DE URLS EXTERNAS

### Problema actual:
```
Usuario: "¿Qué es Vitacard? Aquí está la web: https://vitacard.com"
AL-EON: "Vitacard es un sistema de descuentos en alojamientos"
[EN REALIDAD: Nunca accedió a la URL, inventó la respuesta]
```

### Fix requerido en `llm.orchestrator.js`:

```javascript
/**
 * Detectar si el mensaje requiere acceso a URL externa
 */
function detectExternalURLRequired(userMessage) {
  // Detectar URLs en el mensaje
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const urls = userMessage.match(urlRegex);
  
  if (!urls || urls.length === 0) return null;
  
  // Detectar palabras clave que indican solicitud de información
  const infoKeywords = [
    '¿qué es', 'que es', 'qué hace', 'que hace',
    'información sobre', 'info sobre',
    'dime sobre', 'cuéntame sobre',
    'explica', 'describe'
  ];
  
  const requiresInfo = infoKeywords.some(keyword => 
    userMessage.toLowerCase().includes(keyword)
  );
  
  if (requiresInfo && urls.length > 0) {
    return {
      mode: 'EVIDENCE_REQUIRED',
      urls: urls,
      reason: 'Usuario proporcionó URL y solicita información factual'
    };
  }
  
  return null;
}

/**
 * Modo EVIDENCE REQUIRED
 */
async function handleEvidenceRequiredMode({ urls, userMessage }) {
  console.log(`[Orquestador] 🔍 MODO EVIDENCE REQUIRED activado`);
  console.log(`[Orquestador] URLs detectadas:`, urls);
  
  try {
    // Intentar fetch real
    const fetchResults = await Promise.all(
      urls.map(url => fetchWebpage(url))
    );
    
    const successfulFetches = fetchResults.filter(r => r.success);
    
    if (successfulFetches.length === 0) {
      // 🔥 NO SE PUDO ACCEDER → ERROR EXPLÍCITO
      return {
        response: `No pude acceder a ${urls.length > 1 ? 'las URLs proporcionadas' : 'la URL proporcionada'}. Motivo técnico: ${fetchResults[0]?.error || 'timeout o sitio bloqueado'}.`,
        evidence: null,
        mode: 'error'
      };
    }
    
    // ✅ SE OBTUVO CONTENIDO → RESPONDER CON EVIDENCIA
    const webContent = successfulFetches.map(f => f.content).join('\n\n');
    
    // Inyectar contenido real en el contexto del LLM
    const contextualPrompt = `
El usuario preguntó: "${userMessage}"

He accedido a la(s) URL(s) proporcionada(s) y este es el contenido REAL:

${webContent}

Responde basándote ÚNICAMENTE en este contenido. No agregues información de tu conocimiento general.
`;
    
    const llmResponse = await callLLM(contextualPrompt);
    
    return {
      response: llmResponse,
      evidence: {
        type: 'web_fetch',
        urls: successfulFetches.map(f => f.url),
        timestamp: new Date().toISOString()
      },
      mode: 'evidence'
    };
    
  } catch (error) {
    console.error(`[Orquestador] ❌ Error en EVIDENCE_REQUIRED:`, error);
    
    return {
      response: `Error técnico al acceder a la información solicitada: ${error.message}`,
      evidence: null,
      mode: 'error'
    };
  }
}
```

---

## 5️⃣ RESPUESTAS PROHIBIDAS

### ❌ NO DECIR NUNCA:
- "Ya lo hice" (sin evidencia)
- "Envié el correo" (sin messageId)
- "Creé la tarea" (sin taskId)
- "La imagen muestra..." (sin OCR ejecutado)
- "Según la web..." (sin fetch real)

### ✅ DECIR EN CAMBIO:
- "No pude enviar el correo. Error: [detalles técnicos]"
- "No pude acceder a la URL proporcionada"
- "No pude procesar la imagen. Error técnico: [detalles]"
- "No tengo acceso a esa información sin URL verificable"

---

## 📊 CHECKLIST DE IMPLEMENTACIÓN

```
[ ] 1. Agregar validación `requiresEvidence` en orquestador
[ ] 2. Modificar todos los tools para devolver `evidence` o `error`
[ ] 3. Ejecutar OCR ANTES de llamar al LLM
[ ] 4. Inyectar `attachmentContext` en system prompt
[ ] 5. Detectar URLs y activar MODO EVIDENCE REQUIRED
[ ] 6. Prohibir respuestas sin evidencia real
[ ] 7. Loggear TODAS las ejecuciones de tools con timestamp
[ ] 8. Testing end-to-end de cada tool crítico
```

---

## 🚀 SIGUIENTE PASO

1. **Revisar este documento completo**
2. **Implementar cambios en orden de prioridad**:
   - Prioridad 1: Validación de evidencia en orquestador
   - Prioridad 2: OCR automático
   - Prioridad 3: Modo EVIDENCE REQUIRED para URLs
3. **Testing exhaustivo**
4. **Deploy a producción**

**Tiempo estimado**: 4-8 horas

---

## 📞 CONTACTO

Si hay dudas técnicas o necesitan aclaraciones, contactar al equipo de frontend.

**Documentos relacionados**:
- `SOLUCION-CRITICA-P0-ALEON.md` - Análisis técnico detallado
- `RESUMEN-EJECUTIVO-FIXES.md` - Resumen de cambios aplicados
- `FIX-PROJECTS-RLS-URGENTE.sql` - Script para Supabase

---

**🔥 RECORDATORIO FINAL**:

> "Los modelos ya están. Los endpoints ya existen. Lo que falta es WIRING CORRECTO y VALIDACIÓN ESTRICTA. No más simulaciones. Evidencia real o error explícito."
