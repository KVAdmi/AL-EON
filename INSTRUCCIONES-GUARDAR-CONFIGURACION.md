# 🔧 Instrucciones para Habilitar Guardado de Configuración

## Estado Actual ✅

**El código de frontend YA está listo:**
- ✅ `ProfilePage.jsx` - Guarda nombre, idioma, zona horaria
- ✅ `SettingsPage.jsx` - Guarda configuraciones de IA, voz, tema
- ✅ `UserProfileContext.jsx` - Funciones `updateProfile()` y `updateSettings()`
- ✅ Botón "Guardar cambios" visible en Settings

## Problema 🚨

**Las tablas de Supabase NO tienen los RLS (Row Level Security) policies configurados**, por lo que:
- Los usuarios NO pueden actualizar `user_profiles`
- Los usuarios NO pueden actualizar `user_settings`
- Resultado: Error 403 (Forbidden) al guardar

## Solución 💡

### Paso 1: Ir a Supabase SQL Editor

1. Abre: https://supabase.com/dashboard/project/gptwzuqmuvzttajgjrry
2. Click en **SQL Editor** (menú izquierdo)
3. Click en **New Query**

### Paso 2: Ejecutar el SQL

Copia y pega este SQL completo:

```sql
-- ========================================
-- SUPABASE RLS FIX COMPLETO
-- Arregla 403 en user_profiles, user_settings y storage
-- ========================================

-- ========================================
-- 1. USER_PROFILES - RLS POLICIES
-- ========================================

-- Habilitar RLS si no está habilitado
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- BORRAR policies antiguas si existen (evitar duplicados)
DROP POLICY IF EXISTS "user_profiles_select_own" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_own" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own" ON public.user_profiles;

-- POLICY: SELECT - Usuario puede ver solo su perfil
CREATE POLICY "user_profiles_select_own"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- POLICY: INSERT - Usuario puede crear solo su perfil
CREATE POLICY "user_profiles_insert_own"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- POLICY: UPDATE - Usuario puede actualizar solo su perfil
CREATE POLICY "user_profiles_update_own"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ========================================
-- 2. USER_SETTINGS - RLS POLICIES
-- ========================================

-- Habilitar RLS si no está habilitado
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- BORRAR policies antiguas si existen
DROP POLICY IF EXISTS "user_settings_select_own" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_insert_own" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_update_own" ON public.user_settings;

-- POLICY: SELECT - Usuario puede ver solo su configuración
CREATE POLICY "user_settings_select_own"
ON public.user_settings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- POLICY: INSERT - Usuario puede crear solo su configuración
CREATE POLICY "user_settings_insert_own"
ON public.user_settings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- POLICY: UPDATE - Usuario puede actualizar solo su configuración
CREATE POLICY "user_settings_update_own"
ON public.user_settings
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ========================================
-- 3. STORAGE BUCKET - user-files
-- ========================================

-- Crear bucket si no existe (public = false para seguridad)
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-files', 'user-files', false)
ON CONFLICT (id) DO NOTHING;

-- BORRAR policies antiguas si existen
DROP POLICY IF EXISTS "user_files_upload_own" ON storage.objects;
DROP POLICY IF EXISTS "user_files_read_own" ON storage.objects;
DROP POLICY IF EXISTS "user_files_delete_own" ON storage.objects;

-- POLICY: UPLOAD - Usuario puede subir archivos a su carpeta (userId/*)
CREATE POLICY "user_files_upload_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- POLICY: READ - Usuario puede leer archivos de su carpeta
CREATE POLICY "user_files_read_own"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- POLICY: DELETE - Usuario puede eliminar archivos de su carpeta
CREATE POLICY "user_files_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ========================================
-- 4. VERIFICAR QUE TODO ESTÁ CORRECTO
-- ========================================

-- Verificar policies de user_profiles
SELECT * FROM pg_policies WHERE tablename = 'user_profiles';

-- Verificar policies de user_settings
SELECT * FROM pg_policies WHERE tablename = 'user_settings';

-- Verificar policies de storage.objects
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
```

### Paso 3: Ejecutar el Query

1. Click en **Run** (botón verde) o presiona `Ctrl/Cmd + Enter`
2. Verifica que no haya errores
3. Deberías ver mensajes de éxito

### Paso 4: Verificar en la Aplicación

1. Abre tu app en producción: https://al-eon.netlify.app
2. Ve a **Configuración** o **Perfil**
3. Cambia tu nombre o cualquier configuración
4. Click en **"Guardar cambios"**
5. Refresca la página - los cambios deberían persistir ✅

## Campos que se Guardan 📝

### En `user_profiles`:
- `display_name` - Nombre para mostrar
- `preferred_language` - Idioma preferido (es, en)
- `timezone` - Zona horaria
- `theme` - Tema (dark, light)
- `avatar_url` - URL del avatar (futuro)

### En `user_settings`:
- `ai_model` - Modelo de IA preferido
- `ai_temperature` - Temperatura de respuestas (creatividad)
- `context_persistent` - Mantener contexto entre sesiones
- `voice_enabled` - Habilitar modo voz
- `notifications_enabled` - Notificaciones (futuro)

## Troubleshooting 🔍

Si después de ejecutar el SQL sigues viendo errores:

1. **Verifica que las tablas existen:**
   ```sql
   SELECT * FROM public.user_profiles LIMIT 1;
   SELECT * FROM public.user_settings LIMIT 1;
   ```

2. **Verifica que RLS está habilitado:**
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE tablename IN ('user_profiles', 'user_settings');
   ```
   Debe mostrar `rowsecurity = true`

3. **Crea tu perfil manualmente si no existe:**
   ```sql
   INSERT INTO public.user_profiles (user_id, display_name, preferred_language, timezone)
   VALUES (auth.uid(), 'Tu Nombre', 'es', 'America/Mexico_City')
   ON CONFLICT (user_id) DO NOTHING;
   
   INSERT INTO public.user_settings (user_id, ai_model, ai_temperature, context_persistent, voice_enabled)
   VALUES (auth.uid(), 'gpt-4', 0.7, true, false)
   ON CONFLICT (user_id) DO NOTHING;
   ```

4. **Limpia la caché del navegador:**
   - Chrome/Edge: `Ctrl+Shift+Delete` → Borrar caché
   - Safari: `Cmd+Option+E`
   - Firefox: `Ctrl+Shift+Delete`

## Siguiente Paso 🚀

Una vez ejecutado el SQL, **todo el guardado funcionará automáticamente**. El código de frontend ya está listo y esperando que Supabase permita las actualizaciones.

**¿Necesitas ayuda?** Revisa los logs del navegador (F12 → Console) para ver si hay errores específicos.
