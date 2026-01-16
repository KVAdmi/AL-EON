# 🚨 ACCIÓN REQUERIDA: ALINEACIÓN BACKEND-FRONTEND

**Fecha:** 16 de enero de 2026  
**Commit Backend:** cf155ed  
**Status:** 🔴 **CRÍTICO** - Migración SQL ya ejecutada  
**Prioridad:** P0 - Requiere cambios en frontend HOY

---

## 📋 RESUMEN EJECUTIVO

Backend detectó un **bug crítico** donde buscaba campos de personalización en `user_settings` que **NO EXISTÍAN**.

**SOLUCIÓN:** Backend ahora usa `user_profiles` (donde SÍ existen esos campos)

**MIGRACIÓN SQL:** ✅ Ya ejecutada en producción

**ACCIÓN REQUERIDA:** Frontend debe actualizar queries para usar `user_profiles`

---

## 🎯 CAMBIO CRÍTICO

### ❌ ANTES (INCORRECTO):
```typescript
// Backend buscaba en user_settings (NO EXISTÍAN)
const { data } = await supabase
  .from('user_settings')
  .select('assistant_name, user_nickname')
  .eq('user_id', userId);
```

### ✅ AHORA (CORRECTO):
```typescript
// Backend usa user_profiles (SÍ EXISTEN)
const { data } = await supabase
  .from('user_profiles')
  .select('preferred_name, assistant_name, tone_pref')
  .eq('user_id', userId);
```

---

## 📝 CAMPOS ACTUALIZADOS EN `user_profiles`

| Campo | Tipo | Default | Uso Backend |
|-------|------|---------|-------------|
| `preferred_name` | text | null | Nickname del usuario (cómo llamarlo) |
| `assistant_name` | text | 'AL-E' | Nombre del asistente personalizado |
| `tone_pref` | text | 'barrio' | Tono/estilo de conversación |

---

## 🔧 CAMBIOS REQUERIDOS EN FRONTEND

### 1. Actualizar Tipos TypeScript

**Archivo:** `src/types/user.ts` (o donde estén los tipos)

```typescript
export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  role: 'USER' | 'ADMIN';
  
  // 👤 PERSONALIZACIÓN (nuevos campos críticos)
  preferred_name?: string;      // ← Nickname del usuario
  assistant_name?: string;      // ← Nombre del asistente (default: "AL-E")
  tone_pref?: string;           // ← Tono/estilo (default: "barrio")
  
  // 🎨 UI/UX
  display_name?: string;
  avatar_url?: string;
  assistant_avatar_url?: string;
  user_avatar_url?: string;
  
  // ⚙️ PREFERENCIAS
  preferred_language: string;
  timezone: string;
  theme: 'light' | 'dark' | 'system';
  
  // 📅 METADATA
  created_at: string;
  updated_at: string;
}
```

---

### 2. Actualizar Queries

#### A. Cargar Perfil del Usuario

**❌ ANTES:**
```typescript
const { data } = await supabase
  .from('user_settings')
  .select('*')
  .eq('user_id', userId)
  .single();
```

**✅ AHORA:**
```typescript
const { data: profile } = await supabase
  .from('user_profiles')
  .select('preferred_name, assistant_name, tone_pref, display_name, email, timezone, preferred_language, theme')
  .eq('user_id', userId)
  .single();

// Usar con defaults
const assistantName = profile?.assistant_name || 'AL-E';
const userName = profile?.preferred_name || profile?.display_name || 'Usuario';
const tone = profile?.tone_pref || 'barrio';
```

#### B. Guardar Configuración del Usuario

**✅ ACTUALIZAR:**
```typescript
async function saveUserProfile(updates: Partial<UserProfile>) {
  const { error } = await supabase
    .from('user_profiles')
    .update({
      preferred_name: updates.preferred_name,
      assistant_name: updates.assistant_name,
      tone_pref: updates.tone_pref,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);
  
  if (error) throw error;
}
```

---

### 3. Componente de Settings (si existe)

Si tienes un componente de configuración de perfil, actualizar:

```tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export function ProfileSettings() {
  const { user } = useAuth();
  const [preferredName, setPreferredName] = useState('');
  const [assistantName, setAssistantName] = useState('AL-E');
  const [tonePref, setTonePref] = useState('barrio');
  const [loading, setLoading] = useState(false);
  
  // Cargar perfil actual
  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('preferred_name, assistant_name, tone_pref')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error('Error cargando perfil:', error);
        return;
      }
      
      if (data) {
        setPreferredName(data.preferred_name || '');
        setAssistantName(data.assistant_name || 'AL-E');
        setTonePref(data.tone_pref || 'barrio');
      }
    }
    
    loadProfile();
  }, [user]);
  
  // Guardar cambios
  async function handleSave() {
    if (!user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          preferred_name: preferredName || null,
          assistant_name: assistantName,
          tone_pref: tonePref,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      alert('Perfil actualizado correctamente');
    } catch (error) {
      console.error('Error guardando perfil:', error);
      alert('Error al guardar el perfil');
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <div className="space-y-4 p-6">
      <h2 className="text-xl font-semibold">Personalización de AL-E</h2>
      
      <div>
        <label className="block text-sm font-medium mb-1">
          ¿Cómo quieres que te llame?
        </label>
        <input 
          type="text"
          value={preferredName} 
          onChange={(e) => setPreferredName(e.target.value)}
          placeholder="Ej: Pedro, Jefe, Doc"
          className="w-full px-3 py-2 border rounded"
        />
        <p className="text-xs text-gray-500 mt-1">
          Si lo dejas vacío, usará tu nombre de display
        </p>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">
          ¿Cómo quieres llamar al asistente?
        </label>
        <input 
          type="text"
          value={assistantName} 
          onChange={(e) => setAssistantName(e.target.value)}
          placeholder="Ej: AL-E, Luma, Asistente"
          className="w-full px-3 py-2 border rounded"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">
          Tono de conversación
        </label>
        <select 
          value={tonePref} 
          onChange={(e) => setTonePref(e.target.value)}
          className="w-full px-3 py-2 border rounded"
        >
          <option value="barrio">Casual (barrio)</option>
          <option value="profesional">Profesional</option>
          <option value="formal">Formal</option>
        </select>
      </div>
      
      <button 
        onClick={handleSave} 
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </div>
  );
}
```

---

## 🧪 VALIDACIÓN

### TEST 1: Verificar que campos existen

En consola del navegador:
```javascript
const { data, error } = await supabase
  .from('user_profiles')
  .select('preferred_name, assistant_name, tone_pref')
  .limit(1);

console.log('Campos disponibles:', data);
// Debe mostrar los 3 campos sin error
```

### TEST 2: Actualizar perfil

```javascript
const { data: { user } } = await supabase.auth.getUser();

const { error } = await supabase
  .from('user_profiles')
  .update({
    preferred_name: 'Pedro',
    assistant_name: 'Luma',
    tone_pref: 'barrio'
  })
  .eq('user_id', user.id);

console.log('Error:', error); // Debe ser null
```

### TEST 3: Verificar en chat

Después de actualizar perfil, enviar mensaje al chat y verificar logs del backend:
```bash
[SIMPLE ORCH] 👤 Nombre asistente: Luma
[SIMPLE ORCH] 👤 Nickname usuario: Pedro
[SIMPLE ORCH] 👤 Tono preferido: barrio
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

```bash
□ Actualizar tipos TypeScript (UserProfile interface)
□ Cambiar queries de user_settings → user_profiles
□ Actualizar componente de Settings/Perfil
□ Validar con TEST 1 (campos existen)
□ Validar con TEST 2 (actualización funciona)
□ Validar con TEST 3 (backend usa los valores)
□ Deploy a producción
□ Probar en ambiente de producción
```

---

## 📚 DOCUMENTACIÓN DE REFERENCIA

1. **`SUPABASE-SCHEMA-OFICIAL.sql`** - Schema completo actualizado
2. **`migrations/999_fix_user_profiles_backend_alignment.sql`** - Migración ejecutada
3. **`FRONTEND-CAMBIOS-COMPLETADOS.md`** - Cambios de UI (badges, metadata)

---

## 🚀 ORDEN DE DEPLOYMENT

1. ✅ **Database:** Migración SQL ejecutada
2. ✅ **Backend:** Código actualizado (commit cf155ed)
3. ⏳ **Frontend:** Implementar cambios de este documento
4. ⏳ **Deploy Backend:** A EC2
5. ⏳ **Deploy Frontend:** A producción
6. ⏳ **Validación E2E:** Probar personalización completa

---

## 💡 NOTA IMPORTANTE

**Backward Compatibility:** ✅ Mantenida

- Si frontend no envía estos campos, backend usa defaults
- Usuarios existentes siguen funcionando
- No rompe nada existente

**Pero es RECOMENDADO implementar esto para:**
- Permitir personalización de nombres
- Mejor experiencia de usuario
- Alineación completa backend-frontend

---

## 📞 COORDINACIÓN

**Backend está listo y esperando:**
- ✅ Migración SQL ejecutada
- ✅ Código backend actualizado
- ⏳ Frontend implementa queries correctas

**Después podremos:**
- Desplegar backend a producción
- Validar personalización completa
- Continuar con features de badges y metadata

---

**SIGUIENTE PASO:** Implementar cambios de este documento (1 hora estimada)

**DESPUÉS:** Deploy conjunto backend + frontend para validación completa
