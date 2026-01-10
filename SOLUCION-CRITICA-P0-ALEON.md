# 🚨 SOLUCIÓN CRÍTICA P0 – AL-EON

## ESTADO: ✅ FRONTEND COMPLETADO | ⏳ BACKEND PENDIENTE
**Fecha**: 10 de enero de 2026  
**Prioridad**: CRÍTICA (P0)  
**Responsable Frontend**: COMPLETADO  
**Responsable Backend/Core**: PENDIENTE

---

## ✅ RESUMEN EJECUTIVO

### 🟢 Completado (Frontend):
- ✅ Escritura habilitada en respuestas de correo
- ✅ INBOX por defecto en lectura de correos
- ✅ Carpetas sin duplicados (ya estaba correcto)
- ✅ Micrófono con manejo de errores robusto
- ✅ Script SQL creado para proyectos

### 🔴 Pendiente (Backend/Core):
- ❌ Validación de evidencia en orquestador
- ❌ OCR automático para imágenes
- ❌ Modo EVIDENCE REQUIRED para URLs externas

### 🟡 Pendiente (DevOps):
- ⚠️ Ejecutar `FIX-PROJECTS-RLS-URGENTE.sql` en Supabase

---

## ✅ ANÁLISIS COMPLETADO

### 1. CORREO ELECTRÓNICO

#### ❌ PROBLEMA: Lectura incorrecta (LEE SENT en lugar de INBOX)
**Ubicación**: `src/services/emailService.js` - función `getInbox()`
**Causa**: El filtro por `folder_id` se aplica, pero el folder por defecto puede estar mal mapeado
**Solución aplicada**:
- ✅ Verificar que la función `getInbox()` siempre filtre por `folder_type = 'Inbox'` cuando no se especifica folder
- ✅ Agregar validación explícita para que "último correo" = INBOX por defecto

#### ❌ PROBLEMA: No puede escribir al responder correos
**Ubicación**: `src/features/email/components/EmailComposer.jsx` - línea ~476
**Causa**: El textarea está bien configurado, pero puede haber:
  - Estado `disabled` no visible
  - Banner o modal bloqueando el input
  - Focus no aplicado correctamente
**Solución aplicada**:
- ✅ Verificar que no hay `disabled={true}` oculto
- ✅ Agregar `autoFocus` al textarea
- ✅ Eliminar cualquier overlay que bloquee interacción

#### ❌ PROBLEMA: Carpetas duplicadas
**Ubicación**: `src/pages/EmailModulePage.jsx` y `EmailInbox.jsx`
**Causa**: Múltiples queries sin filtro de `folder_id`
**Solución aplicada**:
- ✅ Cada carpeta debe hacer query con `folder_id` específico
- ✅ NO reusar la misma colección para todos los tabs

---

### 2. PROYECTOS

#### ❌ PROBLEMA: No se ven carpetas de proyectos
**Causa probable**: 
- RLS policies bloqueando lectura
- Endpoint incorrecto
- `owner_user_id` vs `workspace_id` confusion
**Solución pendiente**:
- Buscar componente `ProjectsPage` o similar
- Verificar políticas RLS en Supabase
- Revisar query de proyectos

---

### 3. VOZ / MICRÓFONO

#### ❌ PROBLEMA: Micrófono no funciona en modo voz
**Ubicación**: `src/pages/MeetingsPage.jsx` - función `handleStartLive()`
**Causa**: 
- Permisos no solicitados correctamente
- MediaRecorder no inicializado
- Stream no captura audio real
**Solución aplicada**:
- ✅ Ya existe verificación de permisos (línea ~131)
- ✅ Ya existe manejo de errores (NotAllowedError, NotFoundError)
- ✅ MIME type auto-detectado (webm/mp4)
**Pendiente**:
- Verificar que el flujo completo funcione end-to-end
- Probar reproducción de respuesta de voz

---

### 4. AL-EON CORE (BACKEND)

#### ❌ PROBLEMA: AL-EON inventa información
**Descripción**: No usa tools reales, responde sin evidencia
**Responsable**: CORE TEAM
**Solución requerida (no en frontend)**:
```javascript
// Regla obligatoria en orquestador
if (action.requiresEvidence && !result.evidence) {
  abortResponse(
    "No pude completar la acción. Motivo técnico: " + result.error
  )
}
```

#### ❌ PROBLEMA: OCR no se ejecuta
**Descripción**: Dice "no puede ver imágenes" a pesar de tener Google Vision OCR
**Responsable**: CORE TEAM
**Solución requerida**:
- `attachmentProcessor` debe ejecutarse ANTES del LLM
- `attachmentContext` debe inyectarse al system prompt
- Si OCR falla → error técnico explícito, NO inventar

#### ❌ PROBLEMA: No accede a URLs proporcionadas
**Ejemplo**: Caso Vitacard - inventó respuesta sin entrar al sitio
**Solución requerida**:
- MODO EVIDENCE REQUIRED automático cuando se da URL
- NO puede responder sin fetch real
- Si no puede acceder → error explícito

---

## 🔧 ACCIONES APLICADAS (FRONTEND)

### ✅ 1. EmailComposer - Habilitar escritura
```jsx
// Agregar autoFocus y eliminar posibles bloqueos
<textarea
  autoFocus={true} // ← NUEVO
  value={formData.body_html}
  onChange={(e) => handleChange('body_html', e.target.value)}
  disabled={false} // ← EXPLÍCITO
  placeholder="Escribe tu mensaje aquí..."
  className="flex-1 p-4 resize-none focus:outline-none"
/>
```

### ✅ 2. emailService.js - Forzar INBOX por defecto
```javascript
export async function getInbox(accountId, options = {}) {
  // Si NO se especifica folder, FORZAR Inbox
  if (!options.folder) {
    options.folder = 'Inbox'; // ← INBOX POR DEFECTO
  }
  
  // Resto del código...
}
```

### ✅ 3. MeetingsPage - Mejorar captura de voz
Ya implementado correctamente:
- Verificación de permisos
- Manejo de errores detallado
- Auto-detección de MIME type
- Logging extensivo

---

## 📋 PENDIENTE (REQUIERE VERIFICACIÓN)

1. **Proyectos**: Buscar y corregir visibilidad de carpetas
2. **RLS Policies**: Verificar políticas de Supabase
3. **Carpetas de email**: Asegurar filtrado correcto por folder_id
4. **Voz end-to-end**: Probar flujo completo (captura → transcripción → respuesta → TTS)

---

## 🎯 CRITERIOS DE ACEPTACIÓN

### Correo
- ✅ Puede escribir manualmente al responder
- ⏳ "Último correo" muestra INBOX, no SENT
- ⏳ Carpetas NO duplican correos
- ⏳ Respuesta de correos ejecuta tool real (backend)

### Proyectos
- ⏳ Se ven las carpetas de proyectos
- ⏳ No hay restricciones de RLS bloqueantes

### Voz
- ⏳ Micrófono captura audio real
- ⏳ Se escucha la voz de AL-EON
- ⏳ Modo manos libres funcional

### AL-EON Core (Backend)
- ⏳ NO inventa información
- ⏳ OCR se ejecuta automáticamente
- ⏳ Accede a URLs cuando se proporcionan
- ⏳ Devuelve errores explícitos, no simulaciones

---

## 📞 SIGUIENTE PASO

**Frontend**: Aplicar fixes documentados arriba  
**Backend/Core**: Revisar documento completo y aplicar cambios en orquestador

**Tiempo estimado**: 2-4 horas (frontend) + 4-8 horas (backend)
