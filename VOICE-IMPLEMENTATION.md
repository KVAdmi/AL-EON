# 🎙️ Implementación de VOZ en AL-EON

## 📋 Resumen

AL-EON ahora cuenta con un sistema completo de conversación por voz, similar a ChatGPT, con dos modos:
1. **Modo Texto**: Chat tradicional con opción de lectura TTS
2. **Modo Voz Total**: Conversación continua sin escribir (push-to-talk + manos libres)

---

## 🏗️ Arquitectura

### Componentes Principales

#### 1. **Hooks de Voz**

**`useSpeechRecognition.js`** - Speech-to-Text (STT)
- Web Speech API (SpeechRecognition)
- Idioma default: `es-MX`
- Transcripción en tiempo real (interim + final)
- Estados: idle, listening, error
- Manejo de errores con mensajes en español

**`useSpeechSynthesis.js`** - Text-to-Speech (TTS)
- Web SpeechSynthesis API
- Detección automática de idioma (español/inglés)
- Selección inteligente de voz por idioma
- Control completo: speak, pause, resume, cancel
- Estados: idle, speaking, paused

**`useVoiceMode.js`** - Orquestador Maestro
- Integra STT + TTS
- Flujo completo: Escuchar → Enviar → TTS → Loop (manos libres)
- Estados globales: idle, listening, processing, speaking
- Manejo automático del ciclo de voz

#### 2. **Componentes UI**

**`VoiceControls.jsx`**
- Toggle: Modo Texto / Modo Voz Total
- Botón micrófono (push-to-talk)
- Botón detener (stop all)
- Botón silenciar TTS
- Toggle manos libres
- Mensajes de soporte en español

**`VoiceStatusIndicator.jsx`**
- Indicador visual animado del estado
- Muestra transcripción en tiempo real
- Iconos y colores por estado
- Mensajes contextuales en español

---

## 🎯 Flujos de Uso

### Modo Texto (Default)
```
1. Usuario escribe mensaje
2. AL-E responde
3. (Opcional) Usuario puede hacer clic en "Leer respuesta"
```

### Modo Voz Total
```
1. Usuario activa "Modo Voz Total"
2. Presiona botón "🎙️ Hablar"
3. Habla su mensaje
4. Sistema transcribe y envía automáticamente
5. AL-E responde por texto
6. TTS lee la respuesta
7. (Si manos libres activo) Vuelve a paso 2 automáticamente
```

### Modo Manos Libres
```
Loop continuo sin intervención:
Escuchar → Transcribir → Enviar → TTS → Escuchar → ...

Usuario puede detener en cualquier momento con botón "⏹ Detener"
```

---

## 🔧 Configuración Técnica

### Variables de Entorno
No se necesitan variables adicionales. Usa las mismas que ya tiene AL-EON:
```env
VITE_ALE_CORE_URL=https://api.al-entity.com/chat
VITE_USER_ID=patty
VITE_WORKSPACE_ID=al-eon
VITE_DEFAULT_MODE=universal
```

### Metadata Enviada al Backend

Cuando se usa voz, el frontend envía metadata adicional:

```javascript
{
  workspaceId: "al-eon",
  userId: "patty",
  mode: "universal",
  messages: [...],
  meta: {
    // Metadata de identidad (ya existente)
    platform: "AL-EON",
    version: "1.0.0",
    creator: "Infinity Kode",
    year: 2025,
    source: "al-eon-console",
    timestamp: "2025-12-21T...",
    
    // Metadata de voz (NUEVA)
    inputMode: "voice",       // "voice" | "text"
    localeHint: "es-MX",      // idioma de la UI
    handsFree: true           // si está en modo manos libres
  }
}
```

El backend puede usar esta metadata para:
- Ajustar el estilo de respuesta (más conversacional en modo voz)
- Logging diferenciado
- Análisis de uso de features

---

## 🌐 Web Speech API

### Soporte de Navegadores

**SpeechRecognition (STT)**
- ✅ Chrome/Edge (desktop y móvil)
- ✅ Safari (iOS 14.5+, macOS Big Sur+)
- ❌ Firefox (no soportado nativamente)

**SpeechSynthesis (TTS)**
- ✅ Chrome/Edge
- ✅ Safari
- ✅ Firefox

### Fallback para Navegadores Sin Soporte

Si el navegador no soporta Web Speech API:
```
1. VoiceControls muestra mensaje en español:
   "⚠️ Tu navegador no soporta reconocimiento de voz"

2. Modo Voz Total se deshabilita automáticamente

3. Usuario puede seguir usando Modo Texto normalmente
```

---

## 🎨 UX en Español

### Estados Visuales

**Escuchando**
- 🎤 Icono de micrófono pulsante
- Color verde
- Texto: "Escuchando..."
- Muestra transcripción en tiempo real

**Procesando**
- ⏳ Spinner animado
- Color azul
- Texto: "Procesando..."
- Mensaje: "Enviando tu mensaje a AL-E..."

**Hablando**
- 🔊 Icono de volumen pulsante
- Color morado
- Texto: "AL-E hablando..."
- Mensaje: "Escucha la respuesta de AL-E"

### Botones y Labels

- 🎙️ **Hablar** / ⏹ **Detener**
- 🔇 **Silenciar** (cancela TTS)
- ⏹ **Detener Todo** (cancela STT + TTS)
- **Modo Manos Libres** (toggle)

---

## 🚀 Cómo Usar

### Para Usuario Final

1. **Activar Modo Voz**:
   - Hacer clic en "Modo Voz Total"

2. **Hablar con AL-E**:
   - Presionar botón "🎙️ Hablar"
   - Hablar claramente
   - AL-E transcribirá y responderá

3. **Modo Manos Libres** (opcional):
   - Activar toggle "Modo Manos Libres"
   - AL-E escuchará automáticamente después de cada respuesta
   - Para detener: presionar "⏹ Detener"

4. **Silenciar AL-E**:
   - Si AL-E está hablando, presionar "🔇 Silenciar"

### Para Desarrolladores

**Usar el hook `useVoiceMode`**:

```javascript
import { useVoiceMode } from '@/hooks/useVoiceMode';

const voiceMode = useVoiceMode({
  onMessage: async (text, meta) => {
    // Enviar mensaje a backend
    const response = await sendToBackend(text, meta);
    return response; // TTS lo leerá automáticamente
  },
  language: 'es-MX',
  handsFreeEnabled: false
});

// Acceder a estado y controles
const {
  mode,          // 'text' | 'voice'
  status,        // 'idle' | 'listening' | 'processing' | 'speaking'
  isListening,   // boolean
  isSpeaking,    // boolean
  transcript,    // texto transcrito final
  interimTranscript, // texto transcrito temporal
  
  // Acciones
  setMode,
  startListening,
  stopListening,
  stopAll,
  speakText,
  cancelSpeech
} = voiceMode;
```

---

## 🔍 Detección Automática de Idioma

### Cómo Funciona

**Input (STT)**:
- Configurado para `es-MX` por default
- Web Speech API detecta español automáticamente
- Usuario puede hablar en español o inglés

**Output (TTS)**:
- `useSpeechSynthesis` analiza el texto de respuesta
- Detecta palabras comunes y acentos (á, é, í, ó, ú, ñ)
- Selecciona voz apropiada:
  - Español: `es-MX` → `es-ES` → `es-US` → fallback
  - Inglés: `en-US` → `en-GB` → fallback

**Ventaja**: AL-E puede responder en el idioma que prefiera sin configuración manual.

---

## 🐛 Debugging

### Logs en Consola

El sistema imprime logs detallados:

```javascript
// Reconocimiento de voz
🎤 Reconocimiento de voz iniciado
✅ Transcripción final: "Hola AL-E, ¿cómo estás?"
🎤 Reconocimiento de voz detenido

// Síntesis de voz
🔊 Voces disponibles: 74
🎙️ Voz seleccionada: Monica (es-MX)
🔊 Comenzando a hablar...
🔊 Finalizó de hablar

// Flujo general
🔄 Cambiando modo: text → voice
🔄 Modo manos libres: reiniciando escucha...
📤 Enviando mensaje por voz: "Hola AL-E"
🛑 Deteniendo todo...
```

### Errores Comunes

**"Micrófono no disponible"**
- Verificar permisos del navegador
- Chrome: icono 🔒 en barra de direcciones → Permitir micrófono

**"No se detectó voz"**
- Verificar que el micrófono esté conectado
- Hablar más cerca del micrófono
- Verificar que no esté silenciado en el sistema

**"Error de red"**
- Verificar conexión a internet
- Web Speech API requiere conexión (usa servidores de Google/Apple)

---

## 📊 Estados del Sistema

```
┌──────────────────────────────────────────────────┐
│                    MODO TEXTO                    │
│  Usuario escribe → AL-E responde → (TTS opcional)│
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│                  MODO VOZ TOTAL                  │
│                                                  │
│  ┌──────────┐   ┌────────────┐   ┌──────────┐  │
│  │  IDLE    │──▶│ LISTENING  │──▶│PROCESSING│  │
│  │ esperando│   │escuchando  │   │ enviando │  │
│  └──────────┘   └────────────┘   └──────────┘  │
│       ▲                                 │        │
│       │         ┌──────────┐            │        │
│       └─────────│ SPEAKING │◀───────────┘        │
│                 │AL-E habla│                     │
│                 └──────────┘                     │
│                      │                           │
│                      │ (si handsFree)            │
│                      └──▶ vuelve a LISTENING     │
└──────────────────────────────────────────────────┘
```

---

## 🎯 Mejoras Futuras

### Corto Plazo
- [ ] Soporte para más idiomas (inglés, francés, etc.)
- [ ] Velocidad de lectura ajustable (rate)
- [ ] Pitch y volumen configurables
- [ ] Historial de comandos de voz

### Mediano Plazo
- [ ] Wake word ("Hey AL-E")
- [ ] Cancelación de ruido
- [ ] Transcripción con timestamps
- [ ] Exportar conversaciones de voz

### Largo Plazo
- [ ] Voces personalizadas (custom TTS)
- [ ] Reconocimiento offline (WebAssembly)
- [ ] Análisis de emociones en voz
- [ ] Modo multilingüe (cambio automático)

---

## 🔒 Seguridad y Privacidad

### Procesamiento Local
- **STT**: Web Speech API procesa en servidores de Google/Apple (no en AL-E Core)
- **TTS**: 100% local en el navegador

### Metadata Enviada
- No se envía audio al backend
- Solo se envía texto transcrito + metadata
- Metadata incluye: `inputMode`, `localeHint`, `handsFree` (no datos sensibles)

### Permisos
- El navegador pide permiso explícito para acceder al micrófono
- Usuario puede revocar permisos en cualquier momento
- AL-EON no almacena grabaciones de audio

---

## ✅ Checklist de Implementación

- ✅ Hook `useSpeechRecognition` (STT)
- ✅ Hook `useSpeechSynthesis` (TTS)
- ✅ Hook `useVoiceMode` (orquestador)
- ✅ Componente `VoiceControls` (UI)
- ✅ Componente `VoiceStatusIndicator` (estados)
- ✅ Integración en `ChatPage`
- ✅ Metadata de voz en `aleCoreClient`
- ✅ Actualización de `useChat` para retornar texto
- ✅ Todo en español (labels, errores, tooltips)
- ✅ Fallbacks para navegadores sin soporte
- ✅ Modo manos libres funcional
- ✅ Detección automática de idioma

---

## 📞 Soporte

Si tienes problemas con el sistema de voz:

1. **Verifica soporte del navegador**: Chrome/Safari recomendados
2. **Revisa permisos**: Micrófono debe estar permitido
3. **Checa consola**: Busca logs con emoji 🎤 🔊
4. **Fallback**: Siempre puedes usar Modo Texto

---

**Desarrollado con ❤️ por Infinity Kode**  
AL-EON v1.0.0 - Sistema de Voz Implementado el 21 de diciembre de 2025
