# 🔍 DIAGNÓSTICO COMPLETO - Problema Signup Frontend

## ✅ Configuración Detectada

Tu configuración actual en `.env`:
```bash
VITE_SUPABASE_URL=https://gptwzuqmuvzttajgjrry.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**✅ CORRECTO** - Estás usando la `ANON_KEY` (no la service_role)

---

## 🔬 PASO 1: Test de Diagnóstico en Consola

Abre tu aplicación en el navegador (http://localhost:5173), presiona **F12** para abrir la consola, y ejecuta este script:

```javascript
// ====================================
// 🔬 DIAGNÓSTICO COMPLETO SIGNUP
// ====================================

console.log('🔍 Iniciando diagnóstico...\n');

// 1. Verificar configuración Supabase
console.log('1️⃣ CONFIGURACIÓN:');
console.log('URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Key presente:', import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Sí' : '❌ No');
console.log('\n');

// 2. Verificar cliente Supabase
console.log('2️⃣ CLIENTE SUPABASE:');
const { supabase } = await import('./src/lib/supabase.js');
console.log('Cliente:', supabase ? '✅ Inicializado' : '❌ Error');
console.log('\n');

// 3. Test de conexión
console.log('3️⃣ TEST DE CONEXIÓN:');
try {
  const { data: healthCheck, error: healthError } = await supabase
    .from('user_profiles')
    .select('count')
    .limit(1);
  
  if (healthError) {
    console.error('❌ Error de conexión:', healthError.message);
    console.error('Detalles:', healthError);
  } else {
    console.log('✅ Conexión exitosa a Supabase');
  }
} catch (err) {
  console.error('❌ Error crítico:', err.message);
}
console.log('\n');

// 4. Test de signup con email temporal
console.log('4️⃣ TEST DE SIGNUP:');
const testEmail = 'test-' + Date.now() + '@test.com';
const testPassword = 'Test123456@';

console.log('Email de prueba:', testEmail);
console.log('Intentando crear usuario...\n');

try {
  const { data, error } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
  });
  
  if (error) {
    console.error('❌ ERROR EN SIGNUP:');
    console.error('Mensaje:', error.message);
    console.error('Código:', error.status);
    console.error('Detalles completos:', error);
  } else {
    console.log('✅ SIGNUP EXITOSO:');
    console.log('Usuario ID:', data.user?.id);
    console.log('Email:', data.user?.email);
    console.log('Session:', data.session ? '✅ Activa' : '❌ No creada');
  }
} catch (err) {
  console.error('❌ EXCEPCIÓN EN SIGNUP:', err.message);
  console.error('Detalles:', err);
}
console.log('\n');

// 5. Revisar errores de red
console.log('5️⃣ REVISAR TAB "NETWORK":');
console.log('Ve a la pestaña Network (F12 → Network)');
console.log('Filtra por "signup" o "auth"');
console.log('Busca peticiones fallidas (en rojo)');
console.log('Click en la petición → pestaña "Response" para ver el error');

console.log('\n🔍 Diagnóstico completado. Revisa los resultados arriba ⬆️');
```

---

## 🔴 ERRORES COMUNES Y SOLUCIONES

### Error 1: "Failed to fetch" / CORS Error

**Síntomas:**
```
Access to fetch at 'https://gptwzuqmuvzttajgjrry.supabase.co/auth/v1/signup'
from origin 'http://localhost:5173' has been blocked by CORS policy
```

**Solución:**
1. Ve a: https://supabase.com/dashboard/project/gptwzuqmuvzttajgjrry/settings/api
2. Busca sección **"CORS Configuration"** o **"Allowed Origins"**
3. Agrega:
   ```
   http://localhost:5173
   http://localhost:3000
   https://chat.al-eon.com
   ```
4. Guarda y espera 1 minuto

---

### Error 2: "Email confirmation required"

**Síntomas:**
```
Error: Email confirmations are required
```

**Solución:**
1. Ve a: https://supabase.com/dashboard/project/gptwzuqmuvzttajgjrry/auth/settings
2. Busca **"Email Confirmations"**
3. **Deshabilita** "Enable email confirmations" (temporal para testing)
4. Guarda

---

### Error 3: "Database error saving new user"

**Síntomas:**
- El usuario se crea en Supabase Auth
- Pero falla al crear el perfil en `user_profiles`

**Solución:**
Ejecuta este SQL en Supabase (https://supabase.com/dashboard/project/gptwzuqmuvzttajgjrry/editor):

```sql
-- Verificar RLS en user_profiles
SELECT tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'user_profiles';

-- Si no hay política de INSERT, agregar:
CREATE POLICY "Users can insert their own profile"
ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
```

---

### Error 4: "Invalid API key"

**Síntomas:**
```
Error: Invalid API key
```

**Solución:**
1. Ve a: https://supabase.com/dashboard/project/gptwzuqmuvzttajgjrry/settings/api
2. Copia la key **"anon public"** (NO la service_role)
3. Actualiza tu `.env`:
   ```bash
   VITE_SUPABASE_ANON_KEY=<la-nueva-key>
   ```
4. Reinicia el servidor:
   ```bash
   npm run dev
   ```

---

## 📋 CHECKLIST DE VERIFICACIÓN

Marca lo que ya verificaste:

```
[ ] ✅ Configuración en .env correcta (URL y ANON_KEY)
[ ] 🌐 CORS configurado en Supabase
[ ] 📧 Email confirmations deshabilitado (temporal)
[ ] 🔐 RLS policies configuradas en user_profiles
[ ] 🧪 Test de diagnóstico ejecutado en consola
[ ] 📸 Screenshot del error en consola guardado
[ ] 🌐 Screenshot del Network tab guardado
```

---

## 🚀 TEST RÁPIDO (Copiar y Pegar)

Copia esto en la consola del navegador (F12):

```javascript
// Test rápido
const testEmail = 'quick-test-' + Date.now() + '@test.com';
const { data, error } = await supabase.auth.signUp({
  email: testEmail,
  password: 'TestPass123@'
});

if (error) {
  console.error('❌ ERROR:', error.message);
  console.error('Código:', error.status);
  console.log('\n📋 Comparte este error completo:');
  console.log(JSON.stringify(error, null, 2));
} else {
  console.log('✅ SIGNUP OK - Usuario:', data.user?.email);
}
```

---

## 📞 SI NECESITAS AYUDA

Comparte:
1. **Output del test de diagnóstico** (todo lo que aparece en consola)
2. **Screenshot del Network tab** (F12 → Network → filtra "signup")
3. **Screenshot del error** que ves en la interfaz

---

## 🎯 PRÓXIMO PASO

Después de ejecutar el diagnóstico, dime:
- ¿Qué error específico ves?
- ¿En qué paso falla?
- ¿Hay algún mensaje en Network tab?

Y te daré la solución exacta. 💪
