# 📋 SCHEMA OFICIAL DE SUPABASE - AL-E CORE

**Versión:** 1.0.0  
**Fecha:** 16 de enero de 2026  
**Status:** 🟢 OFICIAL - Documento de referencia único

---

## 🎯 PROPÓSITO

Este archivo (`SUPABASE-SCHEMA-OFICIAL.sql`) es el **único documento de verdad** sobre la estructura de la base de datos de Supabase para el proyecto AL-E.

### Objetivos:

1. ✅ **Sincronización Backend-Frontend** - Ambos equipos usan la misma referencia
2. ✅ **Documentación viva** - Se actualiza con cada cambio en producción
3. ✅ **Prevención de errores** - Evita desalineación entre código y schema
4. ✅ **Onboarding** - Nuevos desarrolladores entienden la estructura completa

---

## 📦 CONTENIDO DEL SCHEMA

### Módulos principales:

1. **SESSIONS & MESSAGES** - Sistema de mensajes y sesiones de AL-E
2. **MEMORY & ACTIONS** - Sistema de memoria y acciones ejecutadas
3. **FILES & KNOWLEDGE BASE** - Archivos, chunks y embeddings
4. **EMAIL SYSTEM** - Sistema completo de correo (IMAP/SMTP)
5. **MAIL SYSTEM (SES/INBOUND)** - Sistema SES para inbound email
6. **CALENDAR** - Eventos y calendario
7. **TELEGRAM** - Bots y mensajes de Telegram
8. **MEETINGS** - Juntas, transcripciones y minutas
9. **NOTIFICATIONS** - Jobs de notificaciones
10. **USER MANAGEMENT** - Perfiles, settings y sesiones
11. **PROJECTS & CONVERSATIONS** - Proyectos colaborativos
12. **EVENTS & DECISIONS (KUNNA)** - Sistema de eventos
13. **LEGACY TABLES** - Tablas marcadas para deprecación

---

## 🚨 REGLAS DE USO

### Para Backend (AL-E Core):

```bash
✅ ANTES de crear/modificar una tabla:
   1. Verificar si existe en SUPABASE-SCHEMA-OFICIAL.sql
   2. Si no existe, proponer el cambio
   3. Actualizar este archivo DESPUÉS del cambio
   4. Notificar a frontend

❌ NUNCA:
   - Crear tablas sin documentar aquí
   - Cambiar tipos de datos sin avisar
   - Eliminar columnas sin consenso
   - Renombrar campos sin coordinación
```

### Para Frontend (AL-EON):

```bash
✅ ANTES de usar una tabla:
   1. Verificar estructura en SUPABASE-SCHEMA-OFICIAL.sql
   2. Confirmar tipos de datos
   3. Validar constraints y relaciones
   4. Si algo no coincide, reportar a backend

❌ NUNCA:
   - Asumir estructura sin verificar
   - Usar campos deprecated
   - Ignorar foreign keys
   - Hacer queries sin validar columnas
```

---

## 📝 PROCESO DE ACTUALIZACIÓN

### Cuando Backend hace cambios:

1. **Ejecutar cambio en Supabase:**
   ```sql
   ALTER TABLE calendar_events ADD COLUMN new_field TEXT;
   ```

2. **Actualizar este archivo:**
   ```bash
   # Editar SUPABASE-SCHEMA-OFICIAL.sql
   # Agregar el nuevo campo en la sección correcta
   ```

3. **Commit con mensaje claro:**
   ```bash
   git add SUPABASE-SCHEMA-OFICIAL.sql
   git commit -m "schema: agregar campo new_field a calendar_events"
   git push
   ```

4. **Notificar a frontend:**
   ```markdown
   ## 🔔 CAMBIO DE SCHEMA
   
   **Tabla:** calendar_events
   **Cambio:** Nuevo campo `new_field TEXT`
   **Impacto:** Queries que usan SELECT * pueden incluir este campo
   **Acción requerida:** Actualizar tipos TypeScript si es necesario
   ```

### Cuando Frontend detecta inconsistencias:

1. **Reportar en GitHub Issue:**
   ```markdown
   ## 🐛 Schema Inconsistency
   
   **Tabla:** email_messages
   **Campo:** body_preview
   **Esperado:** character varying (según schema)
   **Actual:** text (según Supabase)
   **Impacto:** [describir]
   ```

2. **Backend valida y corrige:**
   - Verificar en Supabase producción
   - Corregir schema oficial
   - Notificar resolución

---

## 🔍 CAMPOS IMPORTANTES

### Campos de usuario (user_id vs owner_user_id):

```sql
-- ✅ USAR SIEMPRE:
owner_user_id uuid  -- Campo estándar para dueño del registro

-- ⚠️ DEPRECATED:
user_id_old text    -- Campo legacy, NO USAR
user_id_uuid uuid   -- Campo legacy, NO USAR
```

### Campos de timestamps:

```sql
-- ✅ ESTÁNDAR:
created_at timestamp with time zone DEFAULT now()
updated_at timestamp with time zone DEFAULT now()

-- ⚠️ Algunas tablas usan:
timestamp with time zone  -- Sin default
timestamp without time zone  -- Sin timezone
```

### Campos JSON:

```sql
-- ✅ USAR:
metadata jsonb DEFAULT '{}'::jsonb
attachments_json jsonb DEFAULT '[]'::jsonb

-- ❌ NO CREAR:
metadata json  -- Siempre usar jsonb
```

---

## 📊 TABLAS POR MÓDULO

### Email System

**Tablas activas:**
- `email_accounts` - Cuentas de correo configuradas
- `email_folders` - Carpetas de correo
- `email_messages` - Mensajes de correo
- `email_attachments` - Adjuntos
- `email_drafts` - Borradores
- `email_threads` - Hilos de conversación
- `email_contacts` - Contactos
- `email_rules` - Reglas de filtrado
- `email_sync_log` - Log de sincronización
- `email_audit_log` - Auditoría de envíos

**Relaciones clave:**
```sql
email_messages.account_id → email_accounts.id
email_messages.folder_id → email_folders.id
email_attachments.message_id → email_messages.id
```

### Calendar

**Tabla principal:**
- `calendar_events` - Eventos del calendario

**Campos importantes:**
```sql
owner_user_id uuid NOT NULL  -- Usuario dueño
start_at timestamp with time zone NOT NULL
end_at timestamp with time zone NOT NULL
status CHECK (status = ANY (ARRAY['scheduled', 'cancelled', 'completed']))
```

### Meetings

**Tablas activas:**
- `meetings` - Junta principal
- `meeting_transcripts` - Transcripciones
- `meeting_minutes` - Minutas
- `meeting_assets` - Archivos S3

**Flujo típico:**
```
1. Crear meeting
2. Subir audio o grabar en vivo
3. Generar transcripts
4. Generar minutes
5. Guardar assets en S3
```

---

## 🧪 VALIDACIÓN DEL SCHEMA

### En Backend:

```typescript
// Verificar que el schema coincide con Supabase
import { supabase } from '@/lib/supabase';

const { data, error } = await supabase
  .from('calendar_events')
  .select('*')
  .limit(1);

console.log('Columnas disponibles:', Object.keys(data[0] || {}));
```

### En Frontend:

```typescript
// Validar tipos TypeScript contra schema
import type { Database } from '@/types/database.types';

type CalendarEvent = Database['public']['Tables']['calendar_events']['Row'];

// Si hay error, schema está desalineado
```

---

## 🚀 MEJORES PRÁCTICAS

### 1. Nombres de columnas

```sql
-- ✅ BUENO:
owner_user_id uuid
created_at timestamp with time zone
attachments_json jsonb

-- ❌ EVITAR:
userId uuid           -- camelCase
user_created timestamp  -- ambiguo
attachments text      -- tipo incorrecto
```

### 2. Foreign Keys

```sql
-- ✅ SIEMPRE incluir:
CONSTRAINT table_column_fkey 
  FOREIGN KEY (column) 
  REFERENCES other_table(id)
```

### 3. Default Values

```sql
-- ✅ Para timestamps:
DEFAULT now()

-- ✅ Para jsonb:
DEFAULT '{}'::jsonb
DEFAULT '[]'::jsonb

-- ✅ Para booleans:
DEFAULT false
DEFAULT true
```

### 4. Check Constraints

```sql
-- ✅ Para enums:
CHECK (status = ANY (ARRAY['pending', 'sent', 'failed']))

-- ✅ Para validaciones:
CHECK (start_at < end_at)
```

---

## 📞 COORDINACIÓN

### Canales de comunicación:

1. **Cambios críticos** (breaking changes):
   - GitHub Issue + Label "schema-change"
   - Notificación directa a ambos equipos
   - Plan de migración incluido

2. **Cambios menores** (campos opcionales):
   - Commit en este archivo
   - Comentario en PR

3. **Deprecación de tablas/campos**:
   - Marcar como DEPRECATED en este archivo
   - Crear GitHub Issue con plan de migración
   - Deadline para eliminación

---

## 🗓️ CHANGELOG

### 16 enero 2026
- ✅ Creación del documento oficial
- ✅ Sincronización con Supabase producción
- ✅ Documentación completa de tablas activas

### Próximas actualizaciones
- ⏳ Migración de campos legacy (user_id_old → owner_user_id)
- ⏳ Deprecación de tablas _old
- ⏳ Normalización de timestamps

---

## ⚠️ WARNING

**Este archivo es SOLO para referencia.**

❌ **NO ejecutar este script directamente** en Supabase  
❌ **NO contiene orden correcto** de creación de tablas  
✅ **USAR como documentación** de estructura existente  
✅ **VERIFICAR en Supabase Studio** antes de cambios

---

## 📚 RECURSOS ADICIONALES

- **Supabase Studio:** https://app.supabase.com/project/YOUR_PROJECT
- **Documentación Backend:** `/docs/backend-api.md`
- **Tipos TypeScript Frontend:** `/src/types/database.types.ts`

---

**Responsables:**
- Backend (AL-E Core): Mantener actualizado después de cambios
- Frontend (AL-EON): Reportar inconsistencias

**Última revisión:** 16 de enero de 2026
