# 🚨 SOLUCIÓN URGENTE - Problema Signup Frontend

## 📌 RESUMEN DEL PROBLEMA

**Error:** "Database error saving new user"  
**Ubicación:** Al intentar crear un usuario nuevo en `/signup`  
**Tu configuración:** ✅ CORRECTA (usando ANON_KEY)

---

## 🎯 SOLUCIÓN EN 3 PASOS

### PASO 1: Verificar CORS en Supabase (2 minutos)

1. **Abrir:** https://supabase.com/dashboard/project/gptwzuqmuvzttajgjrry/settings/api

2. **Buscar sección:** "API Settings" → "Configuration"

3. **Agregar estas URLs permitidas:**
   ```
   http://localhost:5173
   http://localhost:3000
   http://127.0.0.1:5173
   https://chat.al-eon.com
   ```

4. **Guardar y esperar 30 segundos**

---

### PASO 2: Deshabilitar Email Confirmations (1 minuto)

1. **Abrir:** https://supabase.com/dashboard/project/gptwzuqmuvzttajgjrry/auth/settings

2. **Buscar:** "Email Confirmations" o "Confirm email"

3. **Deshabilitar:** Toggle a OFF (solo para testing)

4. **Guardar**

---

### PASO 3: Verificar RLS Policies (2 minutos)

1. **Abrir:** https://supabase.com/dashboard/project/gptwzuqmuvzttajgjrry/editor

2. **Ejecutar este SQL:**

```sql
-- Ver policies actuales
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
WHERE tablename = 'user_profiles'
ORDER BY cmd;
```

3. **Si no aparece una policy para INSERT, ejecuta:**

```sql
-- Permitir INSERT a usuarios autenticados
CREATE POLICY IF NOT EXISTS "Users can insert own profile"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Permitir SELECT a usuarios autenticados
CREATE POLICY IF NOT EXISTS "Users can view own profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Permitir UPDATE a usuarios autenticados
CREATE POLICY IF NOT EXISTS "Users can update own profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

---

## 🧪 TEST RÁPIDO

Después de hacer los 3 pasos, prueba esto:

### Opción A: En la consola del navegador (F12)

```javascript
// Test simple
const email = 'test-' + Date.now() + '@test.com';
const { data, error } = await supabase.auth.signUp({
  email: email,
  password: 'Test123456@'
});

console.log('✅ Data:', data);
console.log('❌ Error:', error);
```

### Opción B: En la interfaz

1. Ve a http://localhost:5173/signup
2. Intenta crear usuario con:
   - Email: `test-${TIMESTAMP}@test.com`
   - Password: `Test123456@`
3. Mira la consola (F12) para ver logs

---

## 🔴 ERRORES ESPECÍFICOS Y SOLUCIONES

### Error: "Failed to fetch"
```
TypeError: Failed to fetch
```

**Causa:** CORS no configurado  
**Solución:** PASO 1 arriba ⬆️

---

### Error: "Email confirmations required"
```
Error: Email confirmations are required
```

**Causa:** Email confirmations habilitado  
**Solución:** PASO 2 arriba ⬆️

---

### Error: "new row violates row-level security policy"
```
Error: new row violates row-level security policy for table "user_profiles"
```

**Causa:** RLS policies faltantes  
**Solución:** PASO 3 arriba ⬆️

---

### Error: "Database error saving new user"

Este es un error genérico del código. Mira la consola del navegador (F12) para ver el error real.

**Solución:**
1. Abre F12 → Console
2. Busca líneas rojas que digan `[AUTH] ❌`
3. Comparte ese error específico

---

## 📊 VERIFICACIÓN FINAL

Ejecuta este checklist:

```bash
# En Supabase Dashboard:
✅ CORS configurado con localhost:5173
✅ Email confirmations deshabilitado
✅ RLS policies creadas en user_profiles

# En tu app:
✅ .env tiene VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
✅ Servidor reiniciado después de cambios en .env
✅ No hay errores en consola al cargar la app
```

---

## 🚀 COMANDO PARA REINICIAR EL SERVIDOR

Si cambiaste algo en `.env`:

```bash
# Detener el servidor (Ctrl+C)
# Luego reiniciar:
cd "/Users/pg/Documents/CHAT AL-E"
npm run dev
```

---

## 📸 SI SIGUE FALLANDO

Necesito que me compartas:

1. **Screenshot de la consola (F12 → Console)** cuando intentas hacer signup
2. **Screenshot del Network tab (F12 → Network)** filtrando por "signup"
3. **Output de este comando:**

```bash
cd "/Users/pg/Documents/CHAT AL-E"
cat .env | grep VITE_SUPABASE
```

4. **Resultado de ejecutar el test en consola:**

```javascript
// Copia y pega esto en consola del navegador
const testEmail = 'diagnostic-' + Date.now() + '@test.com';
console.log('Testing con:', testEmail);

const { data, error } = await supabase.auth.signUp({
  email: testEmail,
  password: 'TestPass123@'
});

if (error) {
  console.error('ERROR COMPLETO:', JSON.stringify(error, null, 2));
} else {
  console.log('SUCCESS:', data.user?.email);
}
```

---

## ⚡ SOLUCIÓN EXTREMA (Si nada funciona)

Si después de todo esto sigue sin funcionar:

```bash
# 1. Limpiar y reinstalar
cd "/Users/pg/Documents/CHAT AL-E"
rm -rf node_modules package-lock.json
npm install

# 2. Limpiar cache del navegador
# Chrome: Cmd+Shift+Delete → Borrar todo
# O usar modo incógnito

# 3. Reiniciar servidor
npm run dev
```

---

## 📞 AYUDA INMEDIATA

Ejecuta estos 3 pasos y dime:
- ¿Cuál paso falló o no pudiste completar?
- ¿Qué error específico ves en la consola?
- ¿El Network tab muestra alguna petición en rojo?

Te daré la solución exacta según lo que encuentres. 💪
