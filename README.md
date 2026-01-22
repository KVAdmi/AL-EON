# AL-EON - Consola de Chat con AL-E Core

## ✅ Configuración Completada

### 🔧 Variables de Entorno (.env)
```bash
VITE_ALE_CORE_URL=https://api.al-eon.com/api/ai/chat
VITE_WORKSPACE_ID=al-eon
VITE_DEFAULT_MODE=universal
VITE_USER_ID=patty
VITE_VOICE_MODE_ENABLED=true  # 🎤 P0 FIX: Modo voz habilitado
```

### 🎯 Arquitectura
- **Frontend**: React + Vite (AL-EON Console)
- **Backend**: AL-E Core en EC2
- **Comunicación**: POST directo a AL-E Core
- **Persistencia**: localStorage (conversaciones)
- **NO usa**: OpenAI keys en frontend

### 📡 Cliente API (aleCoreClient.js)
- `sendToAleCore()` - Envía mensajes con historial completo
- `extractReply()` - Parsea respuestas: answer, displayText.answer, message
- Solo POST (no GET)
- Manejo de errores robusto

### 💬 Funcionalidades
- ✅ Chat tipo ChatGPT
- ✅ Historial completo en cada request
- ✅ Persistencia en localStorage
- ✅ Sidebar con conversaciones
- ✅ Manejo de errores visible
- ✅ Loading states
- ✅ **Modo claro y oscuro** con logos adaptativos

### 🎨 Sistema de Temas
- **Modo oscuro** (por defecto): Fondo #0B0D10, Logo para oscuro
- **Modo claro**: Fondo #FFFFFF, Logo para claro
- Toggle de tema en el sidebar
- Persistencia en localStorage
- Transiciones suaves

**Logos:**
- `/public/logo-dark.png` - Para modo oscuro
- `/public/logo-light.png` - Para modo claro

**Componentes de tema:**
- `ThemeProvider` - Context provider para el tema
- `useTheme()` - Hook para acceder al tema
- `ThemeToggle` - Botón para cambiar tema
- `Logo` - Componente que muestra el logo correcto según el tema

### 🚀 Comandos
```bash
npm run dev      # Desarrollo (puerto 3000)
npm run build    # Build para producción
npm run preview  # Preview del build
```

### 🌐 URLs
- Local: http://localhost:3000/
- Network: http://192.168.100.23:3000/

### 📦 Deploy (Netlify)
Ya configurado:
- `netlify.toml` ✅
- `public/_redirects` ✅
- Variables en Netlify dashboard

### 🎨 Estilo
- **Dark mode**: Fondo #0B0D10, texto #FFFFFF
- **Light mode**: Fondo #FFFFFF, texto #111827
- Acento AL-E: #2FA4C7 (ambos modos)
- Tipografía: Inter
- Look minimalista tipo ChatGPT

### 🔒 Seguridad
- OpenAI keys SOLO en AL-E Core (EC2)
- Frontend sin datos sensibles
- Comunicación segura con Core

### 📂 Estructura del Proyecto
```
src/
  ├─ components/
  │  ├─ Logo.jsx              # Logo adaptativo al tema
  │  └─ ThemeToggle.jsx       # Botón cambiar tema
  ├─ contexts/
  │  └─ ThemeContext.jsx      # Provider de tema
  ├─ features/chat/
  │  ├─ components/
  │  │  ├─ Sidebar.jsx        # Con logo y theme toggle
  │  │  └─ ...
  │  └─ hooks/
  │     └─ useChat.js         # Conectado a AL-E Core
  ├─ lib/
  │  ├─ aleCoreClient.js      # Cliente API
  │  └─ markdownRenderer.jsx  # Renderizado markdown
  └─ styles/
     ├─ tokens.css            # Variables de tema
     └─ globals.css           # Estilos globales

public/
  ├─ logo-dark.png            # Logo para modo oscuro
  ├─ logo-light.png           # Logo para modo claro
  └─ _redirects               # Config Netlify
```

---
¡AL-EON listo para entrenar a AL-E con temas claro y oscuro! 🤖✨
