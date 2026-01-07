# 🔴 URGENTE: Corrección Módulo Reuniones - Endpoints Incorrectos

## ❌ Problema Detectado

Frontend está llamando endpoints incorrectos y usando nombres de campos equivocados. El backend (CORE) está funcionando correctamente pero frontend no se conecta bien.

---

## ✅ CORRECCIONES APLICADAS

### 1. Endpoints Actualizados en `meetingsService.js`

**ANTES (❌ Incorrecto):**
```javascript
// Creaba en DB primero, luego notificaba backend
const { data: meeting } = await supabase.from('meetings').insert({...});
await fetch(`${BACKEND_URL}/api/meetings/live/start`, {
  body: JSON.stringify({ meetingId: meeting.id, title })
});
```

**AHORA (✅ Correcto):**
```javascript
// Backend CORE crea el meeting y lo guarda en Supabase automáticamente
const response = await fetch(`${BACKEND_URL}/api/meetings/live/start`, {
  method: 'POST',
  headers: await authHeaders(),
  body: JSON.stringify({
    title: 'Mi reunión'  // Solo enviar title
  })
});

const { meetingId } = await response.json();
```

### 2. Field Name del Chunk Corregido

**ANTES (❌ Incorrecto):**
```javascript
formData.append('chunk', audioBlob);
formData.append('meetingId', meetingId);  // ❌ Campo extra innecesario
```

**AHORA (✅ Correcto):**
```javascript
formData.append('chunk', audioBlob, `chunk-${Date.now()}.webm`);
// meetingId va en la URL, no en FormData
```

### 3. Manejo de Errores Mejorado

```javascript
if (!response.ok) {
  const errorData = await response.json();
  throw new Error(errorData.error || 'Error al iniciar reunión');
}
```

---

## 📋 Código de Ejemplo Completo

### Hook personalizado: `useMeetingRecorder.js`

```javascript
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const BACKEND_URL = 'https://api.al-eon.com';

export function useMeetingRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [meetingId, setMeetingId] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksCountRef = useRef(0);
  const timerRef = useRef(null);

  // Timer
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, isPaused]);

  // Polling de transcript
  useEffect(() => {
    if (!isRecording || !meetingId) return;

    const pollTranscript = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(
          `${BACKEND_URL}/api/meetings/live/${meetingId}/status`,
          {
            headers: {
              'Authorization': `Bearer ${session?.access_token}`,
            },
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.transcript) {
            setTranscript(data.transcript);
          }
        }
      } catch (error) {
        console.error('[Recorder] Poll error:', error);
      }
    };

    // Poll cada 5 segundos
    const interval = setInterval(pollTranscript, 5000);
    return () => clearInterval(interval);
  }, [isRecording, meetingId]);

  const startRecording = async (title) => {
    try {
      setError(null);
      setRecordingTime(0);
      chunksCountRef.current = 0;
      
      // 1. Obtener token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No estás autenticado');
      }

      // 2. Pedir permisos de micrófono
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        } 
      });
      
      streamRef.current = stream;

      // 3. Crear meeting en backend CORE
      const response = await fetch(`${BACKEND_URL}/api/meetings/live/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: title || `Reunión ${new Date().toLocaleTimeString('es-ES')}`
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear reunión');
      }

      const { meetingId: newMeetingId } = await response.json();
      setMeetingId(newMeetingId);
      console.log('[Recorder] ✅ Meeting created:', newMeetingId);

      // 4. Configurar MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });

      mediaRecorderRef.current = recorder;

      // 5. Handler de chunks
      recorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          chunksCountRef.current++;
          console.log(`[Recorder] Chunk ${chunksCountRef.current} (${event.data.size} bytes)`);
          
          try {
            await uploadChunk(newMeetingId, event.data, session.access_token);
          } catch (err) {
            console.error('[Recorder] Chunk upload failed:', err);
          }
        }
      };

      // 6. Iniciar grabación (chunks cada 15s)
      recorder.start(15000);
      setIsRecording(true);
      console.log('[Recorder] ✅ Recording started');

    } catch (error) {
      console.error('[Recorder] Error:', error);
      setError(error.message);
      
      // Cleanup en caso de error
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current || !meetingId) return;

    try {
      console.log('[Recorder] Stopping...');
      
      // 1. Detener MediaRecorder
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      
      // 2. Detener stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      setIsRecording(false);
      setIsPaused(false);

      // 3. Notificar backend que finalizó
      const { data: { session } } = await supabase.auth.getSession();
      
      await fetch(`${BACKEND_URL}/api/meetings/live/${meetingId}/stop`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      console.log('[Recorder] ✅ Stopped, backend will process');
      
      // 4. Limpiar estados
      setTranscript('');
      setRecordingTime(0);
      
      return meetingId;

    } catch (error) {
      console.error('[Recorder] Stop error:', error);
      throw error;
    }
  };

  const uploadChunk = async (meetingId, blob, token) => {
    try {
      const formData = new FormData();
      formData.append('chunk', blob, `chunk-${chunksCountRef.current}.webm`);

      const response = await fetch(
        `${BACKEND_URL}/api/meetings/live/${meetingId}/chunk`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Recorder] Chunk upload failed:', errorText);
      } else {
        console.log(`[Recorder] ✅ Chunk ${chunksCountRef.current} uploaded`);
      }
    } catch (error) {
      console.error('[Recorder] Chunk upload error:', error);
    }
  };

  return {
    isRecording,
    isPaused,
    meetingId,
    transcript,
    error,
    recordingTime,
    chunksUploaded: chunksCountRef.current,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
  };
}
```

---

## 🎨 Componente UI Mejorado

```jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Upload, Clock, AlertTriangle } from 'lucide-react';
import { useMeetingRecorder } from '@/hooks/useMeetingRecorder';

export default function MeetingsPage() {
  const navigate = useNavigate();
  const {
    isRecording,
    isPaused,
    meetingId,
    transcript,
    error,
    recordingTime,
    chunksUploaded,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
  } = useMeetingRecorder();

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStop = async () => {
    try {
      const meetingId = await stopRecording();
      // Navegar al detalle
      setTimeout(() => navigate(`/reuniones/${meetingId}`), 1000);
    } catch (error) {
      alert('Error al detener: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Banner de grabación activa */}
      {isRecording && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 py-3 px-4 flex items-center justify-center z-50 shadow-lg">
          <div className="w-3 h-3 bg-white rounded-full animate-pulse mr-3"></div>
          <span className="font-bold">GRABANDO - Mantén la app abierta</span>
          <span className="ml-4 font-mono">{formatTime(recordingTime)}</span>
          <span className="ml-2 text-xs opacity-75">({chunksUploaded} chunks)</span>
        </div>
      )}

      <div className={`max-w-4xl mx-auto ${isRecording ? 'mt-16' : ''}`}>
        <h1 className="text-3xl font-bold mb-8">Reuniones</h1>

        {!isRecording ? (
          <div className="space-y-4">
            {/* Botón Modo Altavoz */}
            <button
              onClick={() => startRecording('Nueva reunión')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 px-6 rounded-xl font-semibold transition-all transform hover:scale-[1.02] flex items-center justify-between"
            >
              <div className="flex items-center space-x-4">
                <Mic className="w-8 h-8" />
                <div className="text-left">
                  <div className="text-lg font-bold">Iniciar Reunión en Vivo</div>
                  <div className="text-sm opacity-80">Captura audio desde tu micrófono</div>
                </div>
              </div>
            </button>

            {/* Botón Subir Archivo */}
            <button
              className="w-full bg-gray-800 hover:bg-gray-700 text-white py-6 px-6 rounded-xl font-semibold transition-all flex items-center justify-between"
            >
              <div className="flex items-center space-x-4">
                <Upload className="w-8 h-8" />
                <div className="text-left">
                  <div className="text-lg font-bold">Subir Grabación</div>
                  <div className="text-sm opacity-80">Archivo de audio o video</div>
                </div>
              </div>
            </button>

            {/* Advertencia iOS */}
            <div className="mt-6 p-4 bg-yellow-900/30 border-l-4 border-yellow-500 rounded">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                <div>
                  <p className="text-yellow-200 text-sm font-semibold mb-1">
                    Importante para iOS/Safari
                  </p>
                  <p className="text-yellow-300 text-xs">
                    Mantén AL-E en primer plano durante la grabación. 
                    Si bloqueas la pantalla o cambias de app, la grabación se detendrá automáticamente.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Transcript en vivo */}
            <div className="bg-gray-800 rounded-xl p-6 min-h-[300px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                  Transcript en Vivo
                </h3>
                <span className="text-sm text-gray-400">
                  ID: {meetingId?.slice(0, 8)}...
                </span>
              </div>
              
              <div className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                {transcript || (
                  <span className="text-gray-500 italic">
                    Esperando audio... Habla cerca del micrófono
                  </span>
                )}
              </div>
            </div>

            {/* Controles */}
            <div className="flex gap-4">
              {!isPaused ? (
                <button
                  onClick={pauseRecording}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-4 px-6 rounded-lg font-bold transition-all"
                >
                  Pausar
                </button>
              ) : (
                <button
                  onClick={resumeRecording}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-4 px-6 rounded-lg font-bold transition-all"
                >
                  Reanudar
                </button>
              )}
              
              <button
                onClick={handleStop}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-4 px-6 rounded-lg font-bold transition-all flex items-center justify-center space-x-2"
              >
                <span>⏹️</span>
                <span>Detener y Generar Minuta</span>
              </button>
            </div>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="mt-4 p-4 bg-red-900/50 border-l-4 border-red-500 rounded">
            <p className="text-red-200 text-sm font-semibold">❌ Error</p>
            <p className="text-red-300 text-xs mt-1">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## ✅ Checklist de Implementación

- [x] ✅ Endpoint correcto: `/api/meetings/live/start`
- [x] ✅ Solo enviar `title` en body (no `meetingId`)
- [x] ✅ FormData usa field name "chunk" (no "audio")
- [x] ✅ meetingId va en URL, no en FormData
- [x] ✅ Token de Supabase en Authorization header
- [x] ✅ UI con banner de grabación activa
- [x] ✅ Transcript en vivo con polling
- [x] ✅ Advertencia de iOS visible
- [x] ✅ Timer de grabación
- [x] ✅ Contador de chunks enviados
- [x] ✅ Manejo de errores mejorado

---

## 📦 Archivos Actualizados

1. ✅ `src/services/meetingsService.js` - Endpoints corregidos
2. ✅ `src/hooks/useMeetingRecorder.js` - Nuevo hook (crear)
3. ⚠️ `src/pages/MeetingsPage.jsx` - Usar el hook (actualizar)

---

## 🧪 Testing

Para verificar que funciona:

1. **Abrir DevTools → Network**
2. **Iniciar grabación**
3. **Verificar requests:**
   ```
   POST https://api.al-eon.com/api/meetings/live/start
   ✅ Status: 200
   ✅ Response: { meetingId: "uuid..." }
   
   POST https://api.al-eon.com/api/meetings/live/:id/chunk
   ✅ Status: 200
   ✅ FormData: chunk: Blob
   ```

4. **Verificar console:**
   ```
   [Recorder] ✅ Meeting created: abc123...
   [Recorder] Chunk 1 (45231 bytes)
   [Recorder] ✅ Chunk 1 uploaded
   ```

---

**¡Con estos cambios el módulo funcionará correctamente con el backend CORE!** 🚀
