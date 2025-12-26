# IMPLEMENTACIÓN CORE: Sistema de Personalización de Identidad

## OBJETIVO
Permitir que cada usuario defina:
- `preferred_name`: Cómo quiere que AL-E le diga (ej. "Patto")
- `assistant_name`: Nombre de su IA (ej. "Luma")
- `tone_pref`: Tono de conversación (barrio/pro/neutral)

Esto debe inyectarse SIEMPRE en el prompt, incluso sin memoria conversacional.

---

## 1. ENDPOINT: GET /api/profile/me

**Propósito:** Obtener preferencias de personalización del usuario autenticado.

**Requisitos:**
- JWT obligatorio (middleware `optionalAuth` pero exigir `req.user.id`, si no → 401)
- Buscar en `user_profiles` por `user_id = req.user.id`

**Respuesta:**
```json
{
  "user_uuid": "abc-123",
  "display_name": "Patricia Garibay",
  "preferred_name": "Patto",
  "assistant_name": "Luma",
  "tone_pref": "barrio"
}
```

**SQL Query:**
```sql
SELECT 
  user_id as user_uuid,
  display_name,
  preferred_name,
  assistant_name,
  tone_pref
FROM user_profiles
WHERE user_id = $1
LIMIT 1;
```

**Código ejemplo (Node.js/Express):**
```javascript
router.get('/api/profile/me', optionalAuth, async (req, res) => {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id, display_name, preferred_name, assistant_name, tone_pref')
      .eq('user_id', req.user.id)
      .single();

    if (error) throw error;

    res.json({
      user_uuid: profile.user_id,
      display_name: profile.display_name,
      preferred_name: profile.preferred_name || profile.display_name,
      assistant_name: profile.assistant_name || 'Luma',
      tone_pref: profile.tone_pref || 'barrio'
    });
  } catch (error) {
    console.error('Error loading profile:', error);
    res.status(500).json({ error: 'Error al cargar perfil' });
  }
});
```

---

## 2. ENDPOINT: PATCH /api/profile/me

**Propósito:** Actualizar preferencias de personalización.

**Requisitos:**
- JWT obligatorio (401 si no hay `req.user.id`)
- Body permitido:
  ```json
  {
    "preferred_name": "Patto",
    "assistant_name": "Luma",
    "tone_pref": "barrio"
  }
  ```

**Validación:**
- Trim strings
- `preferred_name`: 2-30 caracteres, solo letras/números/espacios
- `assistant_name`: 2-30 caracteres, solo letras/números/espacios
- `tone_pref`: enum ['barrio', 'pro', 'neutral']

**SQL Update:**
```sql
UPDATE user_profiles
SET 
  preferred_name = $1,
  assistant_name = $2,
  tone_pref = $3,
  updated_at = NOW()
WHERE user_id = $4
RETURNING user_id, display_name, preferred_name, assistant_name, tone_pref;
```

**Código ejemplo:**
```javascript
router.patch('/api/profile/me', optionalAuth, async (req, res) => {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const { preferred_name, assistant_name, tone_pref } = req.body;

  // Validación
  const validTones = ['barrio', 'pro', 'neutral'];
  if (tone_pref && !validTones.includes(tone_pref)) {
    return res.status(400).json({ error: 'Tono inválido' });
  }

  const sanitize = (str) => str?.trim().replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s]/g, '');

  try {
    const updates = {};
    if (preferred_name) updates.preferred_name = sanitize(preferred_name).substring(0, 30);
    if (assistant_name) updates.assistant_name = sanitize(assistant_name).substring(0, 30);
    if (tone_pref) updates.tone_pref = tone_pref;

    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .update(updates)
      .eq('user_id', req.user.id)
      .select('user_id, display_name, preferred_name, assistant_name, tone_pref')
      .single();

    if (error) throw error;

    res.json({
      user_uuid: profile.user_id,
      display_name: profile.display_name,
      preferred_name: profile.preferred_name,
      assistant_name: profile.assistant_name,
      tone_pref: profile.tone_pref
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
});
```

---

## 3. INYECCIÓN AL PROMPT (CRÍTICO)

**En `/api/ai/chat`**, ANTES de llamar al modelo:

### Paso 1: Cargar preferencias del usuario
```javascript
// Dentro del handler de /api/ai/chat
let userPreferences = {
  preferred_name: null,
  assistant_name: 'Luma',
  tone_pref: 'barrio'
};

if (req.user?.id) {
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('display_name, preferred_name, assistant_name, tone_pref')
    .eq('user_id', req.user.id)
    .single();

  if (profile) {
    userPreferences = {
      preferred_name: profile.preferred_name || profile.display_name || 'Usuario',
      assistant_name: profile.assistant_name || 'Luma',
      tone_pref: profile.tone_pref || 'barrio'
    };
  }
}
```

### Paso 2: Construir bloque de identidad
```javascript
const identityBlock = `
═══════════════════════════════════════════════════════════════
IDENTIDAD Y PREFERENCIAS (VERDAD DEL SISTEMA - NO NEGOCIABLE)
═══════════════════════════════════════════════════════════════

NOMBRE DEL USUARIO: "${userPreferences.preferred_name}"
NOMBRE DEL ASISTENTE: "${userPreferences.assistant_name}"
TONO DE CONVERSACIÓN: ${userPreferences.tone_pref}

INSTRUCCIONES OBLIGATORIAS:
1. SIEMPRE llama al usuario como "${userPreferences.preferred_name}"
2. SIEMPRE refiérete a ti misma como "${userPreferences.assistant_name}"
3. Usa tono: ${getToneDescription(userPreferences.tone_pref)}
4. NO preguntes "¿cómo quieres que te llame?" - YA LO SABES
5. NO digas "no sé mi nombre" - TU NOMBRE ES ${userPreferences.assistant_name}

Estas preferencias se aplican SIEMPRE, en CADA mensaje, sin excepciones.
═══════════════════════════════════════════════════════════════
`.trim();

function getToneDescription(tone) {
  const tones = {
    'barrio': 'directo, barrio funcional, business, sin rodeos',
    'pro': 'profesional, corporativo, formal pero amigable',
    'neutral': 'equilibrado, natural, conversacional'
  };
  return tones[tone] || tones['barrio'];
}
```

### Paso 3: Inyectar en system prompt
```javascript
// Construir el system prompt final
const systemPrompt = `
${identityBlock}

${baseSystemPrompt}

${memoryContext || ''}
`.trim();

// Llamar al modelo con este system prompt
const response = await callAIModel({
  model: selectedModel,
  messages: [
    { role: 'system', content: systemPrompt },
    ...conversationMessages
  ]
});
```

---

## 4. CACHÉ (OPTIMIZACIÓN FUTURA)

Para no golpear DB en cada mensaje:

```javascript
// Cache simple en memoria (5 minutos)
const userPrefsCache = new Map();

async function getUserPreferences(userId) {
  const cacheKey = `prefs:${userId}`;
  const cached = userPrefsCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < 300000) { // 5 min
    return cached.data;
  }

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('display_name, preferred_name, assistant_name, tone_pref')
    .eq('user_id', userId)
    .single();

  const prefs = {
    preferred_name: profile?.preferred_name || profile?.display_name || 'Usuario',
    assistant_name: profile?.assistant_name || 'Luma',
    tone_pref: profile?.tone_pref || 'barrio'
  };

  userPrefsCache.set(cacheKey, { data: prefs, timestamp: Date.now() });
  return prefs;
}

// Invalidar cache al hacer PATCH
router.patch('/api/profile/me', async (req, res) => {
  // ... update logic ...
  userPrefsCache.delete(`prefs:${req.user.id}`); // Invalidar
  // ...
});
```

---

## CRITERIOS DE ACEPTACIÓN

✅ Chat nuevo → Asistente se presenta como "Luma" (o nombre personalizado)
✅ Siempre llama al usuario "Patto" si `preferred_name` está guardado
✅ Nunca dice "no sé cómo me llamo" ni "¿cómo quieres que te llame?"
✅ Funciona aunque no haya memoria conversacional
✅ Cambiar nombre en Config → Aplica inmediatamente en siguiente mensaje

---

## TESTING

1. **Test sin personalización:**
   - Usuario nuevo sin `preferred_name` → debe usar `display_name` o "Usuario"
   - Asistente se presenta como "Luma"

2. **Test con personalización:**
   - PATCH `/api/profile/me` con `preferred_name: "Patto"`, `assistant_name: "Luna"`
   - Siguiente chat → Asistente dice "Hola Patto, soy Luna"

3. **Test de tono:**
   - `tone_pref: "barrio"` → Respuestas directas, sin rodeos
   - `tone_pref: "pro"` → Respuestas más formales

---

## NOTAS IMPORTANTES

⚠️ **NO confiar en el frontend:**
- AL-EON NO manda `assistant_name` ni `preferred_name` en el body del chat
- Esos valores SIEMPRE se cargan en Core desde DB

⚠️ **Seguridad:**
- Validar y sanitizar TODOS los inputs
- Bloquear caracteres especiales/SQL injection

⚠️ **Performance:**
- Cache recomendado después (5-15 min)
- Por ahora está bien cargar en cada request
