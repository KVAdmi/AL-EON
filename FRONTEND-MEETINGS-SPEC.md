# 📋 Especificación: Módulo Reuniones - Frontend + Backend

## ⚠️ ACTUALIZACIÓN URGENTE DE BASE DE DATOS

La tabla `meetings` ya existe pero **necesita actualizarse** para funcionar con el backend del módulo de Reuniones.

### 🔧 Ejecutar en Supabase SQL Editor:

**Opción 1: Solo actualizar tabla existente** (recomendado)
```sql
-- Ejecutar archivo: SUPABASE-MEETINGS-UPDATE-ONLY.sql
```

**Opción 2: Setup completo desde cero**
```sql
-- Ejecutar archivo: SUPABASE-MEETINGS-SETUP.sql
```

---

## 📦 Cambios en la Tabla `meetings`

### Columnas nuevas que necesita CORE:

| Columna | Tipo | Default | Descripción |
|---------|------|---------|-------------|
| `mode` | VARCHAR(20) | - | 'live' o 'upload' |
| `participants` | JSONB | [] | [{name, email}] |
| `auto_send_enabled` | BOOLEAN | false | Envío automático |
| `send_email` | BOOLEAN | false | Enviar por email |
| `send_telegram` | BOOLEAN | false | Enviar por telegram |
| `duration_sec` | INTEGER | - | Duración en segundos |
| `finalized_at` | TIMESTAMPTZ | - | Cuando se finaliza |

### Migración de datos:
- `meeting_type` → `mode`
- `audio_duration_seconds` → `duration_sec`

---

## 🎯 Estados del Backend

### Status Flow:
```
recording → processing → done
                ↓
              error
```

**Estados:**
- `recording`: Grabando en vivo (chunks llegando)
- `processing`: Transcribiendo y generando minuta
- `done`: Todo listo, minuta disponible
- `error`: Algo falló (ver `error_message`)

---

## 🔌 Endpoints del Backend

Base URL: `https://api.al-eon.com`

### 1. Crear Reunión (Live Mode)

```http
POST /api/meetings/live
Authorization: Bearer <supabase_jwt>
Content-Type: application/json

{
  "title": "Reunión con Cliente XYZ",
  "participants": [
    {"name": "Juan Pérez", "email": "juan@example.com"},
    {"name": "María García", "email": "maria@example.com"}
  ],
  "auto_send_enabled": true,
  "send_email": true,
  "send_telegram": false
}
```

**Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "recording",
  "created_at": "2026-01-07T13:57:00Z"
}
```

---

### 2. Enviar Chunk de Audio

```http
POST /api/meetings/live/:id/chunk
Authorization: Bearer <supabase_jwt>
Content-Type: multipart/form-data

FormData:
  - audio: <Blob> (audio/webm;codecs=opus)
  - sequence: <number>
```

**Response:**
```json
{
  "success": true,
  "chunk_number": 5,
  "s3_key": "user-uuid/meeting-uuid/chunk-5.webm"
}
```

---

### 3. Finalizar Reunión

```http
POST /api/meetings/live/:id/finalize
Authorization: Bearer <supabase_jwt>
Content-Type: application/json

{}
```

**Response:**
```json
{
  "success": true,
  "status": "processing",
  "estimated_time_sec": 120
}
```

---

### 4. Obtener Estado (Polling)

```http
GET /api/meetings/:id
Authorization: Bearer <supabase_jwt>
```

**Response (processing):**
```json
{
  "id": "123e4567...",
  "status": "processing",
  "title": "Reunión con Cliente XYZ",
  "duration_sec": 1847,
  "created_at": "2026-01-07T13:57:00Z"
}
```

**Response (done):**
```json
{
  "id": "123e4567...",
  "status": "done",
  "title": "Reunión con Cliente XYZ",
  "duration_sec": 1847,
  "transcript_text": "Transcripción completa...",
  "transcript_json": [
    {"start": 0, "end": 5.2, "text": "Hola a todos..."},
    {"start": 5.2, "end": 10.8, "text": "Bienvenidos..."}
  ],
  "minutes_summary": "Se discutió el proyecto...",
  "minutes_agreements": [
    {
      "text": "Entregar prototipo el viernes",
      "assignee": "Juan Pérez",
      "date": "2026-01-10"
    }
  ],
  "minutes_pending": [
    {"text": "Definir arquitectura de BD", "priority": "alta"}
  ],
  "minutes_decisions": [
    {"text": "Usar React para frontend", "impact": "medio"}
  ],
  "minutes_risks": [
    {"text": "Posible retraso por feriado", "severity": "baja"}
  ],
  "created_at": "2026-01-07T13:57:00Z",
  "processed_at": "2026-01-07T14:12:00Z"
}
```

---

### 5. Subir Grabación (Upload Mode)

```http
POST /api/meetings/upload
Authorization: Bearer <supabase_jwt>
Content-Type: multipart/form-data

FormData:
  - audio: <File> (audio/*)
  - title: "Reunión grabada"
  - participants: '[{"name":"Juan","email":"juan@example.com"}]'
  - send_email: true
  - send_telegram: false
```

**Response:**
```json
{
  "id": "123e4567...",
  "status": "processing",
  "mode": "upload"
}
```

---

### 6. Enviar Minuta

```http
POST /api/meetings/:id/send
Authorization: Bearer <supabase_jwt>
Content-Type: application/json

{
  "channels": ["email", "telegram"],
  "recipients": ["juan@example.com", "maria@example.com"]
}
```

**Response:**
```json
{
  "success": true,
  "sent": {
    "email": ["juan@example.com", "maria@example.com"],
    "telegram": []
  }
}
```

---

### 7. Crear Eventos de Calendario

```http
POST /api/meetings/:id/calendar-events
Authorization: Bearer <supabase_jwt>
Content-Type: application/json

{}
```

**Response:**
```json
{
  "success": true,
  "events_created": 3,
  "events": [
    {
      "title": "Entregar prototipo",
      "date": "2026-01-10T17:00:00Z",
      "assignee": "Juan Pérez"
    }
  ]
}
```

---

## 🎤 Implementación del Recorder (Frontend)

### MediaRecorder Configuration:

```javascript
const stream = await navigator.mediaDevices.getUserMedia({ 
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  } 
});

const recorder = new MediaRecorder(stream, {
  mimeType: 'audio/webm;codecs=opus',
  audioBitsPerSecond: 128000
});

let chunkSequence = 0;

recorder.ondataavailable = async (e) => {
  if (!e.data || e.data.size === 0) return;
  
  chunkSequence++;
  const formData = new FormData();
  formData.append('audio', e.data, `chunk-${chunkSequence}.webm`);
  formData.append('sequence', chunkSequence.toString());
  
  await sendChunk(meetingId, formData);
};

// Enviar chunk cada 15 segundos
recorder.start(15000);
```

---

## ⚠️ Realidad de iOS

**Problema:** Safari/iOS **pausa MediaRecorder** si bloqueas la pantalla o cambias de app.

**Soluciones implementadas en backend:**
1. ✅ Acepta chunks desordenados
2. ✅ Reordena por `sequence` al finalizar
3. ✅ Detecta gaps y los marca
4. ✅ Procesa audio incompleto (mejor que nada)

**Mitigación en frontend:**
- Mostrar warning: "⚠️ Mantén la pantalla activa durante la grabación"
- Wake Lock API (si disponible)
- Indicador visual claro cuando se pausa

---

## 📱 Ejemplo Completo (React)

```javascript
import { useState, useRef } from 'react';
import { startLiveMeeting, sendLiveChunk, stopLiveMeeting, pollMeetingStatus } from '@/services/meetingsService';

const MeetingRecorder = () => {
  const [meeting, setMeeting] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('idle');
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunkSequenceRef = useRef(0);

  const startRecording = async () => {
    try {
      // 1. Pedir permiso de micrófono
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 2. Crear reunión en backend
      const newMeeting = await startLiveMeeting({
        title: 'Mi reunión',
        participants: [{ name: 'Juan', email: 'juan@example.com' }],
        auto_send_enabled: true,
        send_email: true
      });
      
      setMeeting(newMeeting);
      setStatus('recording');

      // 3. Configurar MediaRecorder
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      recorder.ondataavailable = async (e) => {
        if (!e.data || e.data.size === 0) return;
        
        chunkSequenceRef.current++;
        const formData = new FormData();
        formData.append('audio', e.data);
        formData.append('sequence', chunkSequenceRef.current.toString());
        
        await sendLiveChunk(newMeeting.id, formData);
      };

      recorder.start(15000); // Chunk cada 15s
      recorderRef.current = recorder;
      setIsRecording(true);

    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Error al iniciar grabación');
    }
  };

  const stopRecording = async () => {
    try {
      // 1. Detener MediaRecorder
      if (recorderRef.current) {
        recorderRef.current.stop();
      }

      // 2. Detener stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      setIsRecording(false);
      setStatus('processing');

      // 3. Finalizar en backend
      await stopLiveMeeting(meeting.id);

      // 4. Polling hasta que esté listo
      const finalMeeting = await pollMeetingStatus(meeting.id);
      setMeeting(finalMeeting);
      setStatus('done');

    } catch (error) {
      console.error('Error stopping recording:', error);
      setStatus('error');
    }
  };

  return (
    <div>
      {!isRecording ? (
        <button onClick={startRecording}>
          🎤 Iniciar Grabación
        </button>
      ) : (
        <button onClick={stopRecording}>
          ⏹️ Detener Grabación
        </button>
      )}

      {status === 'recording' && (
        <p>⚠️ Mantén la pantalla activa</p>
      )}

      {status === 'processing' && (
        <p>⏳ Procesando tu reunión...</p>
      )}

      {status === 'done' && meeting && (
        <div>
          <h3>✅ Minuta lista</h3>
          <p>{meeting.minutes_summary}</p>
        </div>
      )}
    </div>
  );
};
```

---

## 🐛 Troubleshooting

### Error: "MISSING_PARAMS"
**Causa:** Faltan campos en el request  
**Solución:** Verificar que todos los campos requeridos estén presentes

### Error: "Meeting not found"
**Causa:** El meeting_id no existe o no es tuyo  
**Solución:** Verificar que el ID sea correcto y que tengas permisos

### Error: "Invalid audio format"
**Causa:** Formato de audio no soportado  
**Solución:** Usar `audio/webm;codecs=opus`

### Status se queda en "processing"
**Causa:** Worker de transcripción aún no está listo  
**Solución:** Esperar, el backend encola el job correctamente

### Chunks no llegan
**Causa:** RLS policies bloquean  
**Solución:** Verificar que el Bearer token sea válido

---

## ✅ Checklist de Implementación

- [ ] Ejecutar SQL de actualización en Supabase
- [ ] Implementar MediaRecorder con chunks de 15s
- [ ] Crear UI para iniciar/detener grabación
- [ ] Implementar polling para status
- [ ] Mostrar warning de iOS
- [ ] Probar upload de archivo grabado
- [ ] Probar envío de minuta por email
- [ ] Probar creación de eventos

---

## 📞 Soporte

Cualquier duda sobre la implementación, revisar:
- **Backend logs**: En producción para debugging
- **Supabase logs**: Para verificar RLS policies
- **Console del navegador**: Para errores de MediaRecorder

**Backend está LISTO y funcionando** ✅  
Solo falta implementar el recorder en frontend siguiendo esta spec.
