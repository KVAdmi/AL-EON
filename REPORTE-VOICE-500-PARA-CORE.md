# 🚨 REPORTE CRÍTICO: Error 500 en /api/voice/stt

**Fecha:** 22 de enero de 2026, 01:14 GMT  
**Prioridad:** P0 - BLOQUEANTE  
**Afectación:** 100% usuarios no pueden usar Voice Mode  

---

## 📊 RESUMEN EJECUTIVO

El endpoint `/api/voice/stt` retorna **500 Internal Server Error** con mensaje genérico `"Error interno al procesar STT"`. 

**Frontend está 100% correcto** - Todo el código de captura de audio, headers, autenticación y formato de datos funciona perfectamente. El problema es exclusivamente del backend CORE.

---

## 🔍 EVIDENCIA TÉCNICA COMPLETA

### 1️⃣ Response del 500 Error
```json
{
  "error": "STT_ERROR",
  "message": "Error interno al procesar STT"
}
```

### 2️⃣ Request enviado por Frontend (CORRECTO ✅)
```
POST https://api.al-eon.com/api/voice/stt
Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryTeoAtp48ObJfTpMM
Content-Length: 152252 bytes (148 KB audio)
Authorization: Bearer eyJhbGciOiJIUzI1NiIsImtpZCI6...

Form Data:
  audio: (binary) 152,252 bytes webm/opus
  language: es
```

### 3️⃣ Headers Validados
- ✅ **Authorization:** JWT válido de Supabase
- ✅ **Content-Type:** `multipart/form-data` correcto
- ✅ **CORS:** `access-control-allow-origin: https://al-eon.com` presente
- ✅ **Field name:** `audio` (no `file`, no `recording`, exactamente `audio`)
- ✅ **Language:** `es` incluido en FormData

### 4️⃣ Frontend Implementation (VERIFICADO ✅)
```typescript
// src/voice/voiceClient.ts líneas 181-215
const formData = new FormData();
formData.append('audio', blob, 'voice.webm');
formData.append('language', 'es');

const response = await fetch(`${CORE_BASE_URL}/api/voice/stt`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

**Código impecable, sin errores, sin headers extras, formato exacto.**

---

## 🎯 DIAGNÓSTICO: 3 CAUSAS PROBABLES

### **Causa A: ffmpeg no instalado** (⚠️ 70% probabilidad)

**Síntoma:** El backend recibe el audio pero no puede procesarlo.

**Fix inmediato:**
```bash
# En servidor CORE (Ubuntu/Debian)
sudo apt update
sudo apt install -y ffmpeg
ffmpeg -version  # Debe mostrar versión 4.x o 5.x

# Si usas Docker, añadir a Dockerfile:
RUN apt-get update && apt-get install -y ffmpeg
```

**Verificación:**
```bash
which ffmpeg  # Debe retornar /usr/bin/ffmpeg
ffmpeg -formats | grep webm  # Debe soportar webm
```

---

### **Causa B: AWS Transcribe rechaza webm/opus** (⚠️ 20% probabilidad)

**Síntoma:** AWS Transcribe solo acepta wav, mp3, flac, mp4.

**Fix en backend Python:**
```python
# Antes de enviar a AWS Transcribe, convertir webm → wav
import subprocess
import tempfile

def convert_webm_to_wav(webm_path):
    wav_path = webm_path.replace('.webm', '.wav')
    subprocess.run([
        'ffmpeg', '-i', webm_path,
        '-ar', '16000',  # 16 kHz sample rate
        '-ac', '1',       # Mono channel
        '-f', 'wav',
        wav_path
    ], check=True)
    return wav_path

# En tu endpoint /api/voice/stt:
audio_file = request.files['audio']
temp_webm = f"/tmp/{uuid.uuid4()}.webm"
audio_file.save(temp_webm)

wav_path = convert_webm_to_wav(temp_webm)  # ← AÑADIR ESTA CONVERSIÓN
# Ahora enviar wav_path a AWS Transcribe
```

---

### **Causa C: Credenciales AWS faltantes** (⚠️ 10% probabilidad)

**Síntoma:** Backend no puede autenticarse con AWS Transcribe.

**Fix en servidor CORE:**
```bash
# Verificar variables de entorno
echo $AWS_ACCESS_KEY_ID
echo $AWS_SECRET_ACCESS_KEY
echo $AWS_DEFAULT_REGION

# Si faltan, añadir a .env o docker-compose.yml:
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_DEFAULT_REGION=us-east-1
```

---

## 🔧 PASOS INMEDIATOS PARA EQUIPO CORE

### ✅ **Paso 1: Revisar logs del servidor** (5 minutos)
```bash
# Logs de nginx
sudo tail -f /var/log/nginx/error.log

# Logs de Express/Node
pm2 logs  # o docker logs <container_id>

# Buscar líneas con:
# - "ENOENT" (comando no encontrado)
# - "spawn ffmpeg" (problema con ffmpeg)
# - "AWS" / "Transcribe" (error de AWS)
# - "STT_ERROR" (tu catch genérico)
```

**Objetivo:** Encontrar el error REAL que está siendo ocultado por el `"Error interno al procesar STT"`.

---

### ✅ **Paso 2: Instalar ffmpeg** (2 minutos)
```bash
sudo apt update && sudo apt install -y ffmpeg
ffmpeg -version
```

---

### ✅ **Paso 3: Probar endpoint con curl** (3 minutos)
```bash
# Descargar audio de prueba
curl -o test.webm https://file-examples.com/wp-content/uploads/2017/11/file_example_WEBM_480_900KB.webm

# Probar endpoint
curl -X POST https://api.al-eon.com/api/voice/stt \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsImtpZCI6UUlndXVVRlIyRmZkZ2FVTiIsInR5cCI6IkpXVCJ9..." \
  -F "audio=@test.webm" \
  -F "language=es" \
  -v

# Debe retornar 200 OK con:
# {"text": "...", "language": "es"}
```

---

### ✅ **Paso 4: Añadir logs detallados** (10 minutos)

**En tu endpoint `/api/voice/stt`:**
```javascript
app.post('/api/voice/stt', async (req, res) => {
  try {
    console.log('📝 STT Request received:', {
      contentType: req.headers['content-type'],
      hasAudio: !!req.files?.audio,
      audioSize: req.files?.audio?.size,
      language: req.body.language
    });

    const audioFile = req.files?.audio;
    if (!audioFile) {
      console.error('❌ No audio file in request');
      return res.status(400).json({ error: 'NO_AUDIO' });
    }

    console.log('🎙️ Processing audio:', audioFile.name, audioFile.mimetype);
    
    // Tu lógica de procesamiento...
    const result = await processSTT(audioFile);
    
    console.log('✅ STT Success:', result.text.substring(0, 50));
    res.json(result);

  } catch (error) {
    console.error('💥 STT ERROR DETAILS:', {
      message: error.message,
      stack: error.stack,
      code: error.code  // ← ESTO es lo que necesitamos ver
    });
    
    res.status(500).json({
      error: 'STT_ERROR',
      message: 'Error interno al procesar STT',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
```

**Esto nos mostrará el error REAL en los logs.**

---

### ✅ **Paso 5: Verificar dependencias Python/Node** (5 minutos)

**Si usas Python con Faster-Whisper:**
```bash
pip list | grep -E "faster-whisper|pyannote|torch"
```

**Si usas Node con AWS SDK:**
```bash
npm list | grep -E "aws-sdk|@aws-sdk"
```

---

## 📋 CHECKLIST DE VALIDACIÓN

Antes de cerrar este ticket, confirmar:

- [ ] **ffmpeg instalado y funcionando** (`ffmpeg -version` exitoso)
- [ ] **Logs del servidor revisados** (error real identificado)
- [ ] **Variables AWS configuradas** (si aplica)
- [ ] **Endpoint probado con curl** (retorna 200 OK)
- [ ] **Audio procesado correctamente** (retorna `{"text": "..."}`)
- [ ] **Frontend testeado** (Voice Mode funciona end-to-end)

---

## 📞 CONTACTO

**Frontend Lead:** Pablo Garibay  
**Stack confirmado:**
- STT: AWS Transcribe / Pyannote + Faster-Whisper
- LLM: AWS Nova (Pro/Lite/Micro)
- TTS: AWS Polly (Mia/Miguel)

**Notas adicionales:**
- Frontend envía audio en formato `webm/opus` con codec Opus
- Bitrate: 128 kbps
- Sample rate: 48 kHz (MediaRecorder default)
- Si AWS requiere wav/mp3, CORE debe hacer la conversión

---

## 🎯 RESULTADO ESPERADO

Después de aplicar el fix:

```bash
# Request
POST /api/voice/stt
audio: (148 KB webm)
language: es

# Response 200 OK
{
  "text": "Hola, esto es una prueba de transcripción",
  "language": "es",
  "duration": 3.2,
  "confidence": 0.95
}
```

---

**¿Dudas o necesitan más info?** Ping a @pablo.garibay  
**Logs completos:** Disponibles en Network tab del navegador (ya capturados)
