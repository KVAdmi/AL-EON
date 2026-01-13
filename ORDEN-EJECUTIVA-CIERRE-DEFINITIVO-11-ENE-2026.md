# 🚨 ORDEN EJECUTIVA DE CIERRE DEFINITIVO

**Fecha:** 11 de enero de 2026  
**Emisor:** Patricia Garibay  
**Destinatarios:** Equipo Core (AL-E) + Equipo Frontend (AL-EON)  
**Prioridad:** P0 CRÍTICA INMEDIATA  
**Carácter:** NO NEGOCIABLE

---

## ⚠️ DECLARACIÓN DE EMERGENCIA

**SE ACABÓ EL TIEMPO DE TESTING.**  
**SE ACABÓ EL "MIENTRAS".**  
**SE ACABÓ EL "SIMULADO".**  
**SE ACABÓ EL "TEMPORAL".**

El sistema debió estar 100% funcional hace días.  
No hay más ventanas de "pruebas".  
No hay más "ya casi".  
No hay más "en mi máquina funciona".

**A partir de este momento, TODO debe funcionar al 100% o NO SE DESPLIEGA.**

---

## 📊 FOTO REAL DEL SISTEMA (AUDITADA HOY)

### ✅ LO QUE SÍ FUNCIONA (y NO se toca)

#### CORE (AL-E)
- ✅ IMAP: lectura real de correos (Hostinger + Gmail OAuth)
- ✅ Sincronización automática background (logs confirman sync cada 5 min)
- ✅ Calendario interno: crear, listar, actualizar eventos
- ✅ Búsqueda web con Tavily (real-time)
- ✅ Memoria explícita (assistant_memories)
- ✅ RAG (retrieval de chunks)
- ✅ Análisis financiero (3 escenarios, ROI, payback)
- ✅ Reuniones: grabar, transcribir, minutas
- ✅ Telegram: enviar mensajes simples
- ✅ Orchestrator: pipeline completo (7 pasos)
- ✅ Action Gateway: Core manda, LLM obedece
- ✅ Guardrail anti-mentira: evidence validation
- ✅ Intent Classification + Mode Selector (VIP Executive)
- ✅ Groq function calling nativo

#### FRONTEND (AL-EON)
- ✅ Signup/Login/Logout (Supabase Auth)
- ✅ Perfil de usuario + avatar
- ✅ Chat principal con historial persistente
- ✅ Markdown rendering + syntax highlighting
- ✅ Voice Mode: STT (Whisper) + TTS (Edge-TTS)
- ✅ Email: leer, enviar, responder, reenviar
- ✅ Proyectos: CRUD básico (para owner)
- ✅ Documentos: subir, descargar, eliminar
- ✅ Reuniones: grabar, transcribir, minutas
- ✅ Deploy automático (Netlify)
- ✅ Build: 0 errores de compilación

**Hasta aquí: producto EXISTE. NO ES HUMO.**

---

## 🔴 LO QUE NO FUNCIONA (Y POR ESO NO EMBONA)

### P0 - BLOQUEANTES CRÍTICOS

#### 1. CORREO: CORE NO PUEDE ENVIAR

**Evidencia:**
```typescript
// actionGateway.ts dice:
CAPABILITIES = { 'mail.send': true }  // ← MENTIRA

// emailTools.ts requiere:
AWS_SES_* variables  // ← NO ESTÁN CONFIGURADAS
```

**Impacto:** AL-EON puede leer correos pero NO enviar.

**ORDEN:**
```bash
# OPCIÓN A (recomendada):
Configurar AWS SES en EC2:
- Variables AWS_SES_REGION, AWS_SES_ACCESS_KEY, AWS_SES_SECRET_KEY
- Verificar dominio en SES
- Test de envío real

# OPCIÓN B (alternativa):
Usar SMTP de Hostinger:
- Ya está configurado para IMAP
- Agregar transport SMTP en emailTools.ts

DEADLINE: 12 de enero 2026, 18:00 hrs
```

---

#### 2. PROYECTOS COMPARTIDOS: FRONTEND RLS ROTO

**Evidencia:**
```sql
-- Usuario 1 (owner) ve proyecto ✅
-- Usuario 2 (miembro) NO ve NADA ❌

-- Causa: Policy actual
USING (user_id = auth.uid())  -- solo owner

-- Necesario:
USING (user_id = auth.uid() OR EXISTS en project_members)
```

**Impacto:** Colaboración multi-usuario completamente rota.

**ORDEN:**
```bash
Ejecutar EN SUPABASE SQL EDITOR (5 minutos):
FIX-PROJECTS-RLS-DEFINITIVO.sql

Verificar:
1. Usuario 1 crea proyecto
2. Usuario 1 invita a Usuario 2
3. Usuario 2 VE el proyecto compartido
4. Usuario 2 puede subir documentos

NO CONTINUAR hasta confirmar que funciona.

DEADLINE: 12 de enero 2026, 12:00 hrs
```

---

#### 3. CALENDARIO: FRONTEND RLS BLOQUEANDO EVENTOS

**Evidencia:**
```sql
-- Usuario aeafa6b7... NO ve su propio evento del 6/ene ❌
-- Causa: Policy calendar_events_owner_policy conflictiva
```

**Impacto:** Usuarios no pueden ver sus propias citas.

**ORDEN:**
```bash
Ejecutar EN SUPABASE SQL EDITOR (5 minutos):
FIX-CALENDAR-RLS-URGENTE.sql

Verificar:
1. Usuario aeafa6b7... ve evento del 6/ene
2. Cualquier usuario puede crear evento
3. Cualquier usuario ve SOLO sus eventos
4. NO hay fuga de datos entre usuarios

DEADLINE: 12 de enero 2026, 12:00 hrs
```

---

#### 4. OAUTH: TOKENS EXPIRAN SIN REFRESH

**Evidencia:**
```javascript
// Frontend: Gmail OAuth funciona ✅
// Después de 1 hora: tokens expiran ❌
// Backend: NO refresca automáticamente ❌
```

**Impacto:** Usuarios deben reconectar Gmail/Outlook cada hora.

**ORDEN:**
```typescript
// Backend (oauth.ts):

async function refreshTokenIfNeeded(integration) {
  const expiresAt = new Date(integration.expires_at);
  const now = new Date();
  const timeLeft = expiresAt - now;
  
  // Si quedan menos de 5 minutos, refrescar
  if (timeLeft < 5 * 60 * 1000) {
    const refreshed = await refreshAccessToken(integration);
    return refreshed.access_token;
  }
  
  return integration.access_token;
}

// Ejecutar ANTES de cada llamada IMAP/SMTP
```

**DEADLINE: 13 de enero 2026, 18:00 hrs**

---

#### 5. WORKER DE NOTIFICACIONES: NO EXISTE

**Evidencia:**
```sql
-- notification_jobs SE CREAN ✅
SELECT * FROM notification_jobs WHERE status='pending';
-- Hay registros pendientes ✅

-- PROBLEMA: Nadie los ejecuta ❌
```

**Impacto:** Notificaciones de eventos NUNCA se envían.

**ORDEN:**
```typescript
// Crear worker (BullMQ o cron):
// src/workers/notificationWorker.ts

import cron from 'node-cron';

// Cada minuto
cron.schedule('* * * * *', async () => {
  const pending = await supabase
    .from('notification_jobs')
    .select('*')
    .eq('status', 'pending')
    .lte('run_at', new Date().toISOString());
  
  for (const job of pending.data) {
    if (job.channel === 'telegram') {
      await sendTelegramMessage(job.payload);
    }
    
    await supabase
      .from('notification_jobs')
      .update({ status: 'sent' })
      .eq('id', job.id);
  }
});
```

**DEADLINE: 14 de enero 2026, 18:00 hrs**

---

### P1 - MENTIRAS DEL SISTEMA

#### 6. MAIL: CORE Y FRONT NO HABLAN EL MISMO IDIOMA

**Problema:**
- Front pide "último correo" → Core muestra SENT ❌
- Front muestra mismos correos en todas las carpetas ❌
- Reply manual: input bloqueado en UI ❌

**ORDEN PARA CORE:**
```markdown
REGLA MAIL – OBLIGATORIA

1. "último correo" = SIEMPRE INBOX.
2. SENT / DRAFT / SPAM / TRASH solo si usuario pide explícito.
3. Cada llamada a mail.list DEBE recibir:
   - accountId
   - label (INBOX | SENT | DRAFT | SPAM | TRASH)
4. NO devolver correos sin label.
5. send_email / reply_email:
   - Si NO hay messageId real → NO decir "enviado"
   - Reply debe mantener threadId y headers RFC
```

**ORDEN PARA FRONTEND:**
```markdown
MAIL – CONTRATO FRONT

1. Cada carpeta llama al Core con su label real.
   NO filtrar en front.
2. Inbox ≠ Sent ≠ Draft ≠ Spam ≠ Trash (queries distintas).
3. Reply:
   - Al hacer click, activar isReplying=true
   - Desbloquear textarea
   - Enviar threadId + messageId al Core
4. Si Core responde error → mostrar error. NO simular éxito.
```

**DEADLINE: 13 de enero 2026, 18:00 hrs**

---

#### 7. ARCHIVOS: CORE PUEDE, FRONT NO CONFÍA

**Problema:**
- Core tiene OCR, PDF, DOCX ✅
- AL-EON a veces dice "no puedo ver archivos" ❌

**ORDEN PARA CORE:**
```markdown
ATTACHMENTS – REGLA ABSOLUTA

1. attachmentProcessor corre ANTES del LLM.
2. El texto extraído SE INYECTA al system/context.
3. Si parsing falla:
   - Responder: "Error técnico leyendo archivo: ___"
4. PROHIBIDO:
   - inventar contenido
   - pedir "descríbeme la imagen"
```

**ORDEN PARA FRONTEND:**
```markdown
ATTACHMENTS – FRONT

1. Si hay archivo:
   - SIEMPRE enviar metadata + fileId al Core.
2. NO interceptar con mensajes tipo:
   "la IA no puede ver archivos".
3. Mostrar error SOLO si el Core lo devuelve.
```

**DEADLINE: 13 de enero 2026, 12:00 hrs**

---

#### 8. VOZ: MODELOS LISTOS, PIPELINE ROTO

**Problema:**
- Whisper y TTS están ✅
- Front no garantiza audio real ❌
- Core recibe buffers vacíos ❌

**ORDEN PARA FRONTEND:**
```markdown
VOZ – FRONT

1. Pedir permisos de micrófono explícitos.
2. Grabar audio con duración > 0.
3. Enviar binario real al backend.
4. Reproducir audio TTS automáticamente.
```

**ORDEN PARA CORE:**
```markdown
VOZ – CORE

1. Si audio.size === 0 → error técnico.
2. Loggear:
   - duración
   - idioma
3. Whisper → texto → TTS → audio.
4. Si no hay audio reproducido → NO marcar como éxito.
```

**NOTA:** Ya se aplicó fix en frontend (commit bc927df): `mediaRecorder.start(1000)`.  
**Pendiente:** Verificar en múltiples navegadores.

**DEADLINE: 13 de enero 2026, 18:00 hrs**

---

#### 9. VERACIDAD: AL-EON MIENTE

**Problema:**
- AL-EON a veces narra acciones NO ejecutadas ❌
- Ejemplo: "He enviado el correo" sin messageId ❌

**ORDEN (CORE + FRONTEND):**
```markdown
REGLA DE VERDAD (NO NEGOCIABLE)

AL-EON solo puede afirmar acciones si:
- tool.status === success
- hay payload real (messageId, eventId, etc.)

Si falla:
- decir que falló
- explicar por qué

PROHIBIDO:
- Inferir
- Asumir
- Completar huecos
- Narrar ejecuciones falsas

Si no sabe → lo dice
Si no pudo → lo dice
Si falló → lo dice

Una IA que miente es un riesgo legal.
```

**DEADLINE: Inmediato. Ya debió estar implementado.**

---

#### 10. AL-EON: PROHIBIDO DECIR "NO" A LA PRIMERA

**Problema:**
- AL-EON dice "No tengo acceso" sin intentar ❌
- AL-EON dice "No puedo hacer eso" sin configurar ❌

**ORDEN:**
```markdown
AL-EON TIENE PROHIBIDO DECIR "NO" EN EL PRIMER INTENTO.

FLUJO OBLIGATORIO:

1️⃣ Buscar
- Revisar herramientas disponibles
- Revisar contexto activo
- Revisar memoria
- Revisar integraciones

2️⃣ Intentar
- Ejecutar tool disponible
- Forzar parámetros mínimos
- Reintentar si falla

3️⃣ Configurar
- Ajustar permisos
- Pedir SOLO el dato mínimo faltante
- NO abandonar la acción

4️⃣ Escalar
- Si falla técnicamente, reportar error REAL
- Explicar QUÉ falló y POR QUÉ

👉 SOLO DESPUÉS DE TODO ESO puede declarar imposibilidad real.

FRASES PROHIBIDAS:
❌ "No tengo acceso"
❌ "No puedo hacer eso"
❌ "No es posible"
❌ "No tengo información sobre eso"

Sin evidencia técnica de fallo.

FORMATO OBLIGATORIO CUANDO FALLA:
"Intenté ejecutar esta acción.
Falló en el paso ___ por ___ (error técnico real).
Siguiente opción viable: ___."
```

**DEADLINE: Inmediato. Ya debió estar implementado.**

---

## 🚫 PROHIBICIONES ABSOLUTAS

Queda ESTRICTAMENTE PROHIBIDO a partir de este momento:

❌ mocks  
❌ datos falsos  
❌ respuestas simuladas  
❌ "while", "temporal", "hardcode"  
❌ feature flags para esconder fallas  
❌ mensajes tipo "ya casi", "en proceso", "pendiente"  
❌ afirmar acciones no ejecutadas  
❌ UI que aparenta funcionar sin backend real  

**Una sola violación = rollback inmediato.**

---

## ✅ CONDICIÓN DE EXISTENCIA DE UNA FUNCIÓN

Una función SOLO EXISTE si cumple TODO esto:

1. Backend ejecuta acción real
2. Devuelve resultado verificable
3. Front refleja el estado REAL
4. Yo puedo usarla sin explicación
5. No requiere que "sepa qué probar"

**Si falla uno → la función NO EXISTE y se elimina del flujo.**

---

## 🎯 DEFINICIÓN DE "LISTO" (ÚNICA VÁLIDA)

**"LISTO" significa:**

- Yo lo uso
- No pregunto nada
- No explican nada
- No fallan nada
- No corrigen nada después

**Si hay que explicar → NO está listo.**

---

## 📋 CHECKLIST DE CIERRE (NO NEGOCIABLE)

### Para ejecutar HOY (11 de enero, antes de las 20:00):

```bash
□ Ejecutar FIX-PROJECTS-RLS-DEFINITIVO.sql en Supabase
□ Ejecutar FIX-CALENDAR-RLS-URGENTE.sql en Supabase
□ Verificar Usuario 2 ve proyecto compartido
□ Verificar Usuario aeafa6b7... ve evento del 6/ene
```

### Para ejecutar MAÑANA (12 de enero, antes de las 18:00):

```bash
□ Configurar AWS SES O SMTP Hostinger
□ Test de envío de correo REAL
□ Actualizar runtime-capabilities.json con estado real
□ Implementar refresh de OAuth tokens
```

### Para ejecutar 13 de enero (antes de las 18:00):

```bash
□ Implementar contrato MAIL (Core + Frontend)
□ Implementar contrato ATTACHMENTS (Core + Frontend)
□ Verificar Voice Mode en Chrome, Safari, Firefox
□ Implementar guardrail VERACIDAD estricto
□ Implementar guardrail ANTI-NO
```

### Para ejecutar 14 de enero (antes de las 18:00):

```bash
□ Implementar worker de notificaciones
□ Verificar notificaciones Telegram funcionan
□ Tests E2E básicos (Cypress/Playwright)
```

---

## 🚨 CONSECUENCIAS DE INCUMPLIMIENTO

Si el 14 de enero 2026 a las 23:59 NO están cumplidos los P0:

1. **Rollback inmediato** a última versión estable
2. **Freeze de features nuevas** hasta resolver P0
3. **Auditoría externa** del código y procesos
4. **Replanteamiento de arquitectura** si es necesario

---

## 📊 MÉTRICAS DE VALIDACIÓN

### CORE (AL-E)

Validar cada uno:

```bash
✅ Leer correo de INBOX → retorna label="INBOX"
✅ Leer correo de SENT → retorna label="SENT"
✅ Enviar correo → retorna messageId real
✅ Reply correo → mantiene threadId
✅ Procesar PDF → extrae texto real
✅ Whisper → transcribe audio real (>0 bytes)
✅ TTS → genera audio real (>0 bytes)
✅ Crear evento calendario → retorna eventId
✅ Listar eventos → filtra por user_id correcto
✅ Enviar mensaje Telegram → confirma sent
✅ Buscar web → retorna resultados reales de Tavily
✅ Guardar memoria → retorna memory_id
✅ RAG retrieve → retorna chunks con score
✅ NO afirmar acción sin evidencia
✅ NO decir "no puedo" sin intentar
```

### FRONTEND (AL-EON)

Validar cada uno:

```bash
✅ Signup → crea user_profile con RLS OK
✅ Login → obtiene JWT válido
✅ Perfil → actualiza display_name y avatar
✅ Chat → envía mensaje y recibe respuesta
✅ Voice → graba audio >0 bytes, reproduce TTS
✅ Email INBOX → llama al Core con label="INBOX"
✅ Email SENT → llama al Core con label="SENT"
✅ Reply → envía threadId + messageId
✅ Proyecto compartido → Usuario 2 VE proyecto
✅ Evento calendario → Usuario ve SOLO sus eventos
✅ Reunión → graba, transcribe, genera minuta
✅ Documento → sube a Storage, Core puede leer
✅ NO mostrar éxito si Core devuelve error
✅ NO decir "no puedo ver archivos" si Core puede
```

---

## 🔒 CERTIFICACIÓN DE AUDITORÍA

Este documento está basado en:

- ✅ Estado Core Al-eon 11 Enero 2026.pdf (auditado hoy)
- ✅ Estado font Al-eon al 11 Enero 2026.pdf (auditado hoy)
- ✅ Inspección de código fuente (139 archivos frontend, 18 archivos core)
- ✅ Logs de producción (EC2 PM2)
- ✅ Verificación de base de datos (Supabase)
- ✅ Sin ocultamiento de problemas
- ✅ Sin exageraciones de capacidades

**ESTE DOCUMENTO NO MIENTE. CADA PROBLEMA ES REAL Y VERIFICABLE.**

---

## 💬 MENSAJE FINAL

**No hay tiempo para excusas.**  
**No hay tiempo para "casi".**  
**No hay tiempo para "temporal".**

El sistema DEBE funcionar como sistema REAL de producción.

Si algo no funciona → SE ARREGLA.  
Si algo tarda → SE ESPERA.  
Si algo cuesta trabajo → SE HACE.

**Pero no se despliega roto.**  
**Pero no se miente al usuario.**  
**Pero no se simula funcionalidad.**

---

**ORDEN EMITIDA:** 11 de enero de 2026, 14:30 hrs  
**FIRMA:** Patricia Garibay  
**CARÁCTER:** EJECUTIVA, INMEDIATA, NO NEGOCIABLE

---

## 📎 ANEXOS

### Archivos de Fix Disponibles

```bash
✅ FIX-PROJECTS-RLS-DEFINITIVO.sql (listo para ejecutar)
✅ FIX-CALENDAR-RLS-URGENTE.sql (listo para ejecutar)
✅ FIX-MEETINGS-RLS-DEFINITIVO.sql (listo para ejecutar)
✅ DEBUG-RLS-POLICIES-NOW.sql (diagnóstico)
```

### Commits Recientes (últimas 24h)

```bash
✅ eb71f15 - FIX AGENDA RLS (11/ene)
✅ bc927df - FIX VOZ chunk capture (10/ene)
✅ 4634d47 - FIX EMAIL z-index (10/ene)
✅ bc014b9 - FIX CRÍTICO P0 (10/ene)
```

### Documentación Técnica

```bash
📄 Estado Core Al-eon 11 Enero 2026.pdf
📄 Estado font Al-eon al 11 Enero 2026.pdf
📄 FRONTEND-README.md
📄 BACKEND-RESPONSE-FORMAT.md
📄 CORE-TASKS-MAIL-ENDPOINTS.md
📄 VOICE-IMPLEMENTATION.md
📄 OAUTH-SETUP-GUIDE.md
```

---

**FIN DE LA ORDEN EJECUTIVA**
