# 📋 Actualización Tabla Meetings para Backend Core

## ⚠️ Acción Requerida

El backend (Core) del módulo de **Reuniones con Modo Altavoz** ya está deployado y funcionando en:
- `POST /api/meetings/upload` - Subir grabación de archivo
- `POST /api/meetings/live` - Iniciar grabación en vivo
- `POST /api/meetings/live/:id/chunk` - Enviar chunks de audio
- `GET /api/meetings/:id` - Obtener estado de reunión

**Pero necesitamos actualizar la tabla `meetings` en Supabase** para que tenga todos los campos que el backend espera.

---

## 🔧 SQL a Ejecutar en Supabase

**Ve a:** Supabase Dashboard → SQL Editor → New Query

**Copia y pega esto:**

```sql
-- Agregar campos que necesita backend Core
ALTER TABLE meetings 
ADD COLUMN IF NOT EXISTS mode VARCHAR(20) CHECK (mode IN ('live', 'upload')),
ADD COLUMN IF NOT EXISTS participants JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS auto_send_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS send_email BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS send_telegram BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS duration_sec INTEGER,
ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ;

-- Migrar datos existentes
UPDATE meetings SET mode = meeting_type WHERE mode IS NULL;
UPDATE meetings SET duration_sec = audio_duration_seconds WHERE duration_sec IS NULL;

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_meetings_updated_at ON meetings(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_mode ON meetings(mode);

-- Asegurar trigger para updated_at
CREATE OR REPLACE FUNCTION update_meetings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS meetings_updated_at_trigger ON meetings;
CREATE TRIGGER meetings_updated_at_trigger
    BEFORE UPDATE ON meetings
    FOR EACH ROW
    EXECUTE FUNCTION update_meetings_updated_at();
```

**Ejecuta ▶️ Run** y verifica que todo salga en verde.

---

## 📦 Campos Agregados

| Campo | Tipo | Descripción | Requerido por Core |
|-------|------|-------------|-------------------|
| `mode` | VARCHAR(20) | 'live' o 'upload' | ✅ Sí |
| `participants` | JSONB | `[{name, email}]` | ✅ Sí |
| `auto_send_enabled` | BOOLEAN | Envío automático al terminar | ✅ Sí |
| `send_email` | BOOLEAN | Enviar por email | ✅ Sí |
| `send_telegram` | BOOLEAN | Enviar por Telegram | ✅ Sí |
| `duration_sec` | INTEGER | Duración en segundos | ✅ Sí |
| `finalized_at` | TIMESTAMPTZ | Cuando se finalizó | ✅ Sí |

---

## 🎯 Estados de Reunión (campo `status`)

El backend maneja estos estados:

1. **`recording`** - Grabación en progreso (modo live)
2. **`processing`** - Transcribiendo audio
3. **`done`** - Listo, minuta generada
4. **`error`** - Error en procesamiento

---

## 🔄 Flujo de Trabajo

### Modo Upload (Subir archivo)
```
1. POST /api/meetings/upload
   → Crea reunión con status='processing'
   
2. Backend procesa audio
   → Actualiza status='done' y guarda transcript/minuta
   
3. GET /api/meetings/:id
   → Frontend obtiene resultados
```

### Modo Live (Altavoz presencial)
```
1. POST /api/meetings/live
   → Crea reunión con status='recording'
   
2. POST /api/meetings/live/:id/chunk (cada 15s)
   → Va guardando chunks de audio
   
3. POST /api/meetings/live/:id/stop
   → Finaliza grabación, status='processing'
   
4. Backend procesa todo el audio
   → status='done' con transcript/minuta
```

---

## 🎙️ Ejemplo de Uso en React

```javascript
import { uploadMeeting, startLiveMeeting, sendLiveChunk, stopLiveMeeting } from '@/services/meetingsService';

// Modo Upload
const handleUploadRecording = async (audioFile, title) => {
  const formData = new FormData();
  formData.append('audio', audioFile);
  formData.append('title', title);
  formData.append('participants', JSON.stringify([
    { name: 'Patricia', email: 'pgaribay@infinitykode.com' }
  ]));
  formData.append('auto_send_enabled', 'true');
  formData.append('send_email', 'true');
  
  const meeting = await uploadMeeting(formData);
  console.log('Reunión creada:', meeting.id);
};

// Modo Live
const handleLiveRecording = async () => {
  // 1. Iniciar reunión
  const meeting = await startLiveMeeting({
    title: 'Junta de equipo',
    participants: [{ name: 'Patricia', email: 'pgaribay@infinitykode.com' }]
  });
  
  // 2. Capturar audio con MediaRecorder
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  
  recorder.ondataavailable = async (e) => {
    if (e.data.size > 0) {
      await sendLiveChunk(meeting.id, e.data);
    }
  };
  
  recorder.start(15000); // chunks cada 15s
  
  // 3. Detener cuando termine
  setTimeout(async () => {
    recorder.stop();
    await stopLiveMeeting(meeting.id);
  }, 60000); // ejemplo: 1 minuto
};
```

---

## ✅ Checklist de Implementación

- [ ] Ejecutar SQL de actualización en Supabase
- [ ] Verificar que tabla tiene los nuevos campos
- [ ] Actualizar `meetingsService.js` si usa campos legacy
- [ ] Probar modo Upload con archivo de audio
- [ ] Probar modo Live con MediaRecorder
- [ ] Verificar que chunks llegan al backend
- [ ] Validar que status cambia correctamente
- [ ] Probar envío de minuta por email
- [ ] Probar envío de minuta por Telegram

---

## 📖 Documentación Completa

El backend tiene toda la especificación en:
- `FRONTEND-MEETINGS-SPEC.md` (si Core lo compartió)

Ahí está:
- Todos los endpoints con ejemplos
- Formatos de requests/responses
- Manejo de errores
- Troubleshooting

---

## 🐛 Troubleshooting

### "Column 'mode' does not exist"
➡️ Ejecutar el SQL de actualización arriba

### "Recording stops when screen locks on iOS"
➡️ Esto es una limitación de iOS, necesitamos:
1. Mantener pantalla activa con wake lock
2. O usar chunks pequeños (5-10s) para minimizar pérdida

### "Backend returns 400 MISSING_PARAMS"
➡️ Verificar que envías:
- `title` (requerido)
- `mode` (requerido: 'live' o 'upload')
- `audio` (requerido en upload)

---

## 🚀 Próximos Pasos

1. **Ejecutar el SQL** → 2 minutos
2. **Probar endpoints** → 10 minutos
3. **Implementar recorder** → Ya está en `MeetingsPage.jsx`
4. **Testing end-to-end** → 30 minutos

**El backend está listo y esperando** 🎉

Cualquier duda, revisar:
- `SUPABASE-MEETINGS-UPDATE-CORE.sql` (SQL completo)
- `src/services/meetingsService.js` (servicio frontend)
- `src/pages/MeetingsPage.jsx` (UI completa)
- `src/pages/MeetingDetailPage.jsx` (detalle con tabs)

---

**Última actualización:** 7 de enero de 2026  
**Backend deployado:** ✅ Producción  
**Frontend implementado:** ✅ Completo  
**Falta:** Solo ejecutar SQL de actualización
