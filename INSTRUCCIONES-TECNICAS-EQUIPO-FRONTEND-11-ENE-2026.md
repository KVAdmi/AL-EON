# 🔧 INSTRUCCIONES TÉCNICAS - EQUIPO FRONTEND

**Fecha:** 11 de enero de 2026  
**Destinatario:** Desarrolladores AL-EON Frontend  
**Deploy:** Netlify (https://al-eon.com)  
**Estado actual:** 75% completitud funcional, P0 bugs críticos

---

## 🚨 P0 - CRÍTICOS (DEADLINE: 11-12 ENE)

### P0-1: EJECUTAR FIXES SQL EN SUPABASE (HOY 11 ENE, 20:00)

**Problema:** RLS policies bloqueando proyectos compartidos y eventos de calendario.

**ACCIÓN INMEDIATA:**

1. Ir a Supabase SQL Editor:
```
https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql
```

2. Copiar y ejecutar:

**FIX-PROJECTS-RLS-DEFINITIVO.sql:**

```sql
-- ================================================
-- FIX DEFINITIVO: Proyectos Compartidos
-- ================================================

-- 1. Eliminar policies conflictivas
DROP POLICY IF EXISTS "Users can view own projects" ON user_projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON user_projects;
DROP POLICY IF EXISTS "Users can update own projects" ON user_projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON user_projects;
DROP POLICY IF EXISTS "project_members_select_policy" ON project_members;

-- 2. Crear policies correctas para user_projects
CREATE POLICY "Users can view own and shared projects"
  ON user_projects FOR SELECT
  USING (
    owner_user_id = auth.uid()
    OR id IN (
      SELECT project_id FROM project_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own projects"
  ON user_projects FOR INSERT
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Owners can update own projects"
  ON user_projects FOR UPDATE
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Owners can delete own projects"
  ON user_projects FOR DELETE
  USING (owner_user_id = auth.uid());

-- 3. Crear policies correctas para project_members
CREATE POLICY "Users can view members of accessible projects"
  ON project_members FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM user_projects 
      WHERE owner_user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Owners can insert members"
  ON project_members FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM user_projects 
      WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update members"
  ON project_members FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM user_projects 
      WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can delete members"
  ON project_members FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM user_projects 
      WHERE owner_user_id = auth.uid()
    )
  );

-- 4. Verificar
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd 
FROM pg_policies 
WHERE tablename IN ('user_projects', 'project_members');
```

**FIX-CALENDAR-RLS-URGENTE.sql:**

```sql
-- ================================================
-- FIX URGENTE: Eventos de Calendario
-- ================================================

-- 1. Eliminar policy conflictiva
DROP POLICY IF EXISTS "calendar_events_owner_policy" ON calendar_events;

-- 2. Crear policies específicas por operación
CREATE POLICY "Users can view own events"
  ON calendar_events FOR SELECT
  USING (owner_user_id = auth.uid());

CREATE POLICY "Users can insert own events"
  ON calendar_events FOR INSERT
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Users can update own events"
  ON calendar_events FOR UPDATE
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Users can delete own events"
  ON calendar_events FOR DELETE
  USING (owner_user_id = auth.uid());

-- 3. Verificar
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd 
FROM pg_policies 
WHERE tablename = 'calendar_events';
```

3. Después de ejecutar, verificar:

```bash
# Test Proyectos Compartidos:
1. Usuario 1: Crear proyecto "Test Compartido"
2. Usuario 1: Invitar a Usuario 2
3. Logout Usuario 1
4. Login Usuario 2
5. Ir a Proyectos → DEBE ver "Test Compartido" ✅

# Test Calendario:
1. Usuario aeafa6b7...: Login
2. Ir a Calendario
3. DEBE ver evento del 6/ene ✅
```

**SI NO FUNCIONA:**
```bash
# Revisar logs de Supabase
# Verificar que auth.uid() retorna el UUID correcto
SELECT auth.uid();

# Verificar que project_members tiene registros
SELECT * FROM project_members WHERE user_id = auth.uid();
```

---

### P0-2: ACTUALIZAR emailService.js - CONTRATO CON CORE (12 ENE, 18:00)

**Problema:** Frontend no especifica `label` al llamar Core, causando confusión de carpetas.

**SOLUCIÓN:**

```javascript
// src/services/emailService.js

export async function getEmails(accountId, folderType = 'INBOX', options = {}) {
  // VALIDAR que folderType es válido
  const validFolders = ['INBOX', 'SENT', 'DRAFT', 'SPAM', 'TRASH'];
  if (!validFolders.includes(folderType)) {
    throw new Error(`Invalid folder type: ${folderType}`);
  }
  
  console.log(`📬 Fetching emails for folder: ${folderType}`);
  
  const { data, error } = await supabase
    .rpc('list_emails', {
      p_account_id: accountId,
      p_label: folderType,  // ← CRÍTICO: especificar label
      p_limit: options.limit || 20,
      p_unread_only: options.unreadOnly || false
    });
  
  if (error) {
    console.error(`❌ Error fetching ${folderType}:`, error);
    throw error;
  }
  
  console.log(`✅ Fetched ${data.length} emails from ${folderType}`);
  
  // VALIDAR que todos tienen el label correcto
  const wrongLabels = data.filter(email => email.label !== folderType);
  if (wrongLabels.length > 0) {
    console.warn(`⚠️ Found ${wrongLabels.length} emails with wrong label`);
  }
  
  return data;
}

export async function replyToEmail(emailId, body, accountId) {
  // OBTENER mensaje original para extraer threadId
  const { data: original, error: fetchError } = await supabase
    .from('email_messages')
    .select('message_id, thread_id, from_email, subject')
    .eq('id', emailId)
    .single();
  
  if (fetchError || !original) {
    throw new Error(`Email ${emailId} not found`);
  }
  
  console.log(`↩️ Replying to thread: ${original.thread_id}`);
  
  // LLAMAR a Core con threadId y messageId
  const { data, error } = await supabase
    .rpc('reply_email', {
      p_account_id: accountId,
      p_message_id: emailId,
      p_thread_id: original.thread_id,  // ← CRÍTICO
      p_body: body
    });
  
  if (error) {
    console.error('❌ Error replying:', error);
    throw error;
  }
  
  // VALIDAR que Core retornó messageId
  if (!data.messageId) {
    throw new Error('Reply failed: no messageId returned');
  }
  
  console.log(`✅ Reply sent: ${data.messageId}`);
  
  return data;
}
```

**ACTUALIZAR EmailModulePage.jsx:**

```javascript
// src/pages/EmailModulePage.jsx

function EmailModulePage() {
  const [currentFolder, setCurrentFolder] = useState('INBOX');
  const [emails, setEmails] = useState([]);
  
  useEffect(() => {
    loadEmails(currentFolder);
  }, [currentFolder]);
  
  async function loadEmails(folderType) {
    try {
      console.log(`📂 Loading folder: ${folderType}`);
      
      // LLAMAR con folderType explícito
      const data = await emailService.getEmails(
        accountId, 
        folderType,  // ← NO filtrar en frontend
        { limit: 50 }
      );
      
      setEmails(data);
      
    } catch (err) {
      console.error(`❌ Error loading ${folderType}:`, err);
      toast.error(`No se pudieron cargar correos de ${folderType}`);
    }
  }
  
  // ELIMINAR cualquier filtro local tipo:
  // const filteredEmails = emails.filter(e => e.folder === currentFolder); ❌
  
  return (
    <div>
      <Sidebar>
        <button onClick={() => setCurrentFolder('INBOX')}>
          📥 Inbox
        </button>
        <button onClick={() => setCurrentFolder('SENT')}>
          📤 Enviados
        </button>
        <button onClick={() => setCurrentFolder('DRAFT')}>
          ✏️ Borradores
        </button>
        <button onClick={() => setCurrentFolder('SPAM')}>
          🚫 Spam
        </button>
        <button onClick={() => setCurrentFolder('TRASH')}>
          🗑️ Papelera
        </button>
      </Sidebar>
      
      <EmailList emails={emails} folder={currentFolder} />
    </div>
  );
}
```

**ACTUALIZAR EmailComposer.jsx (Reply):**

```javascript
// src/features/email/components/EmailComposer.jsx

function EmailComposer({ mode, originalEmail, onClose }) {
  const [isReplying, setIsReplying] = useState(mode === 'reply');
  const [body, setBody] = useState('');
  
  async function handleSend() {
    if (isReplying && originalEmail) {
      try {
        console.log(`↩️ Replying to: ${originalEmail.id}`);
        
        // ENVIAR threadId al Core
        const result = await emailService.replyToEmail(
          originalEmail.id,
          body,
          accountId
        );
        
        // VALIDAR que Core retornó messageId
        if (!result.messageId) {
          throw new Error('Reply failed: no messageId returned');
        }
        
        console.log(`✅ Reply sent: ${result.messageId}`);
        toast.success('Respuesta enviada');
        onClose();
        
      } catch (err) {
        console.error('❌ Error sending reply:', err);
        
        // MOSTRAR error REAL (no simular éxito)
        toast.error(`No se pudo enviar: ${err.message}`);
      }
    }
  }
  
  // DESBLOQUEAR textarea cuando isReplying=true
  return (
    <div style={{ zIndex: 9999 }}>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        disabled={!isReplying}  // ← SOLO deshabilitar si NO es reply
        placeholder={isReplying ? 'Escribe tu respuesta...' : 'Nuevo mensaje...'}
      />
      <button onClick={handleSend}>Enviar</button>
    </div>
  );
}
```

---

### P0-3: ATTACHMENTS - NO INTERCEPTAR (12 ENE, 12:00)

**Problema:** Frontend a veces dice "la IA no puede ver archivos" cuando Core SÍ puede.

**SOLUCIÓN:**

```javascript
// src/hooks/useChat.js

export function useChat() {
  async function sendMessage(text, attachments = []) {
    if (attachments.length > 0) {
      console.log(`📎 Sending ${attachments.length} attachments...`);
      
      // SIEMPRE enviar metadata al Core
      const fileMetadata = attachments.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
        fileId: file.id || file.url
      }));
      
      // NO INTERCEPTAR con mensajes tipo:
      // ❌ if (file.type === 'application/pdf') {
      // ❌   toast.error('La IA no puede ver archivos PDF');
      // ❌   return;
      // ❌ }
      
      const response = await fetch('https://api.al-eon.com/api/ai/chat/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          message: text,
          userId: user.id,
          attachments: fileMetadata  // ← ENVIAR SIEMPRE
        })
      });
      
      const data = await response.json();
      
      // MOSTRAR error SOLO si el Core lo devuelve
      if (data.error) {
        console.error('❌ Core error:', data.error);
        toast.error(data.error);
        return;
      }
      
      // Core procesó exitosamente
      console.log('✅ Message with attachments sent');
      return data;
    }
  }
}
```

**ELIMINAR mensajes hardcodeados:**

```javascript
// BUSCAR Y ELIMINAR en todo el proyecto:

// ❌ ELIMINAR:
toast.error('La IA no puede ver archivos');
alert('No se pueden procesar archivos PDF');
console.log('Archivos no soportados');

// ✅ REEMPLAZAR con:
// Dejar que el Core responda con error si no puede
```

---

## 🟡 P1 - VOICE MODE (12 ENE, 18:00)

**Problema:** Parcialmente fixed (commit bc927df), requiere testing multi-navegador.

**VERIFICAR que fix está aplicado:**

```javascript
// src/hooks/useVoiceMode.js líneas 100-150

export function useVoiceMode() {
  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    mediaRecorderRef.current = new MediaRecorder(stream);
    const chunks = [];
    
    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
        console.log(`🎙️ Chunk received: ${e.data.size} bytes`);
      }
    };
    
    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(chunks, { type: 'audio/webm' });
      
      // VALIDAR que audio tiene contenido
      if (audioBlob.size === 0) {
        console.error('❌ Audio blob is empty');
        toast.error('No se pudo grabar audio');
        return;
      }
      
      console.log(`✅ Audio recorded: ${audioBlob.size} bytes`);
      
      await sendToSTT(audioBlob);
    };
    
    // ✅ FIX APLICADO: timeslice de 1000ms
    mediaRecorderRef.current.start(1000);  // ← CRÍTICO
    
    console.log('🎙️ Recording started');
  }
  
  async function sendToSTT(audioBlob) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    
    console.log(`📤 Sending audio to STT: ${audioBlob.size} bytes`);
    
    const response = await fetch('https://api.al-eon.com/api/voice/stt', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: formData
    });
    
    const data = await response.json();
    
    // VALIDAR que Core retornó texto
    if (!data.text) {
      console.error('❌ STT returned empty text');
      toast.error('No se pudo transcribir audio');
      return;
    }
    
    console.log(`✅ Transcribed: "${data.text}"`);
    
    // Enviar texto al chat
    await sendMessage(data.text);
  }
  
  async function playTTS(text) {
    console.log(`🔊 Playing TTS: "${text.substring(0, 50)}..."`);
    
    const response = await fetch('https://api.al-eon.com/api/voice/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ text })
    });
    
    const audioBlob = await response.blob();
    
    // VALIDAR que audio tiene contenido
    if (audioBlob.size === 0) {
      console.error('❌ TTS returned empty audio');
      toast.error('No se pudo generar audio');
      return;
    }
    
    console.log(`✅ TTS audio received: ${audioBlob.size} bytes`);
    
    // Reproducir automáticamente
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.play();
    
    console.log('🔊 Audio playing');
  }
}
```

**TESTING MULTI-NAVEGADOR:**

```bash
# Probar en:
1. Chrome (Desktop + Mobile)
2. Safari (Desktop + iOS)
3. Firefox (Desktop)
4. Edge (Desktop)

# Verificar:
□ Permisos de micrófono se solicitan
□ Audio se graba (>0 bytes)
□ STT retorna texto
□ TTS reproduce audio
□ Logs muestran tamaños correctos
```

---

## 🟢 P2 - MEJORAS (13-14 ENE)

### P2-1: CAMBIO DE CONTRASEÑA (13 ENE)

**IMPLEMENTAR en SecurityPage.jsx:**

```javascript
// src/pages/SecurityPage.jsx

import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

function SecurityPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChanging, setIsChanging] = useState(false);
  
  async function handleChangePassword(e) {
    e.preventDefault();
    
    // Validaciones
    if (newPassword.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    
    setIsChanging(true);
    
    try {
      // Supabase Auth API
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      toast.success('Contraseña actualizada correctamente');
      
      // Limpiar campos
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
    } catch (err) {
      console.error('Error changing password:', err);
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsChanging(false);
    }
  }
  
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Seguridad</h1>
      
      <form onSubmit={handleChangePassword} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Contraseña actual
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">
            Nueva contraseña
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            required
            minLength={8}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">
            Confirmar nueva contraseña
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            required
            minLength={8}
          />
        </div>
        
        <button
          type="submit"
          disabled={isChanging}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isChanging ? 'Actualizando...' : 'Cambiar contraseña'}
        </button>
      </form>
    </div>
  );
}

export default SecurityPage;
```

---

### P2-2: HISTORIAL DE CONVERSACIONES REAL (13 ENE)

**IMPLEMENTAR en HistoryPage.jsx:**

```javascript
// src/pages/HistoryPage.jsx

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

function HistoryPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    loadConversations();
  }, []);
  
  async function loadConversations() {
    try {
      console.log('📚 Loading conversation history...');
      
      const { data, error } = await supabase
        .from('user_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      console.log(`✅ Loaded ${data.length} conversations`);
      setConversations(data);
      
    } catch (err) {
      console.error('❌ Error loading history:', err);
    } finally {
      setIsLoading(false);
    }
  }
  
  if (isLoading) {
    return <div>Cargando historial...</div>;
  }
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Historial de Conversaciones</h1>
      
      {conversations.length === 0 ? (
        <p className="text-gray-500">No hay conversaciones aún.</p>
      ) : (
        <div className="space-y-4">
          {conversations.map(conv => (
            <div 
              key={conv.id}
              className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
              onClick={() => window.location.href = `/chat?session=${conv.id}`}
            >
              <h3 className="font-medium">{conv.title || 'Sin título'}</h3>
              <p className="text-sm text-gray-500">
                {new Date(conv.updated_at).toLocaleDateString('es-MX')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default HistoryPage;
```

---

## 📋 CHECKLIST DE ENTREGA

### Para P0 (11-12 ENE):

```bash
□ FIX-PROJECTS-RLS-DEFINITIVO.sql ejecutado en Supabase
□ FIX-CALENDAR-RLS-URGENTE.sql ejecutado en Supabase
□ Test: Usuario 2 ve proyecto compartido ✅
□ Test: Usuario aeafa6b7... ve evento del 6/ene ✅
□ emailService.js especifica label en cada llamada
□ EmailComposer.jsx envía threadId en reply
□ useChat.js SIEMPRE envía attachments metadata
□ ELIMINADOS mensajes "la IA no puede ver archivos"
```

### Para P1 (12-13 ENE):

```bash
□ useVoiceMode.js tiene mediaRecorder.start(1000)
□ Test Voice Mode en Chrome ✅
□ Test Voice Mode en Safari ✅
□ Test Voice Mode en Firefox ✅
□ Logs muestran tamaños de audio correctos
□ SecurityPage.jsx cambio de contraseña implementado
□ HistoryPage.jsx carga conversaciones reales
```

### Para P2 (13-14 ENE):

```bash
□ Tests E2E básicos (Cypress/Playwright)
□ Signup → Login → Chat → Send message ✅
□ Email: Leer INBOX → Responder ✅
□ Proyecto: Crear → Invitar → Compartir ✅
□ Calendario: Crear evento → Listar ✅
□ Voice: Grabar → Transcribir → TTS ✅
```

---

## 🚀 COMANDOS DE DESPLIEGUE

```bash
# 1. Commit cambios
git add .
git commit -m "FIX P0: RLS policies + email contracts + attachments"

# 2. Push a GitHub
git push origin main

# 3. Netlify despliega automáticamente (esperar 2-3 min)

# 4. Verificar deploy
https://app.netlify.com/sites/YOUR_SITE/deploys

# 5. Verificar en producción
https://al-eon.com
```

---

## 📊 VALIDACIÓN FINAL

Ejecutar cada test en producción:

```bash
✅ Signup nuevo usuario → crea perfil con RLS OK
✅ Login → obtiene JWT válido
✅ Perfil → actualiza nombre y avatar
✅ Chat → envía mensaje, recibe respuesta
✅ Voice → graba audio >0 bytes, reproduce TTS
✅ Email INBOX → llama Core con label="INBOX"
✅ Email SENT → llama Core con label="SENT"
✅ Reply → envía threadId + messageId
✅ Adjuntar PDF → Core recibe metadata, NO se intercepta
✅ Proyecto compartido → Usuario 2 VE proyecto ✅
✅ Evento calendario → Usuario aeafa6b7... ve evento del 6/ene ✅
✅ Reunión → graba, transcribe, genera minuta
✅ Cambiar contraseña → actualiza en Supabase Auth
✅ Historial → carga conversaciones reales de user_conversations
```

---

## 🚨 SI ALGO FALLA

### Error: "Row level security policy violation"

```sql
-- Verificar policies en Supabase SQL Editor:
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('user_projects', 'project_members', 'calendar_events')
ORDER BY tablename, policyname;
```

### Error: "Invalid token" en llamadas al Core

```javascript
// Verificar que JWT es válido:
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);

// Si no hay session, hacer login nuevamente
```

### Error: Voice Mode no graba audio

```javascript
// Verificar permisos de micrófono:
navigator.permissions.query({ name: 'microphone' })
  .then(result => {
    console.log('Microphone permission:', result.state);
    // "granted" | "denied" | "prompt"
  });
```

---

**DOCUMENTO TÉCNICO COMPLETADO**  
**Generado:** 11 de enero de 2026  
**Versión:** 1.0  
**Estado:** LISTO PARA IMPLEMENTAR
