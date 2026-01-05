/**
 * 🔬 Test de Diagnóstico Signup
 * 
 * CÓMO USAR:
 * 1. Abre tu app en el navegador (http://localhost:5173)
 * 2. Abre la consola (F12)
 * 3. Copia y pega todo este archivo en la consola
 * 4. Presiona Enter
 * 5. Comparte el output completo
 */

(async function testSignup() {
  console.clear();
  console.log('🔍 ========================================');
  console.log('   DIAGNÓSTICO SIGNUP - AL-EON');
  console.log('========================================\n');

  // Test 1: Verificar variables de entorno
  console.log('1️⃣ VARIABLES DE ENTORNO:');
  console.log('-------------------');
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  console.log('URL:', url || '❌ NO DEFINIDA');
  console.log('ANON_KEY:', key ? '✅ Presente (' + key.substring(0, 20) + '...)' : '❌ NO DEFINIDA');
  
  if (!url || !key) {
    console.error('\n❌ PROBLEMA: Faltan variables de entorno');
    console.log('Solución: Verifica tu archivo .env y reinicia el servidor\n');
    return;
  }
  console.log('✅ Variables configuradas correctamente\n');

  // Test 2: Verificar cliente Supabase
  console.log('2️⃣ CLIENTE SUPABASE:');
  console.log('-------------------');
  try {
    const { supabase } = await import('./src/lib/supabase.js');
    console.log('✅ Cliente importado correctamente');
    console.log('Cliente:', supabase);
    
    // Test 3: Probar conexión
    console.log('\n3️⃣ TEST DE CONEXIÓN:');
    console.log('-------------------');
    const { data: testConnection, error: connectionError } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1);
    
    if (connectionError) {
      console.error('❌ Error de conexión:', connectionError.message);
      console.log('Código:', connectionError.code);
      console.log('Detalles:', connectionError);
      console.log('\n💡 Posible causa: CORS no configurado');
      return;
    }
    console.log('✅ Conexión exitosa a Supabase\n');

    // Test 4: Intentar signup
    console.log('4️⃣ TEST DE SIGNUP:');
    console.log('-------------------');
    const testEmail = 'test-' + Date.now() + '@aleon.test';
    const testPassword = 'TestSecure123@';
    
    console.log('Email de prueba:', testEmail);
    console.log('Intentando signup...\n');

    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });

    if (error) {
      console.error('❌ ERROR EN SIGNUP:');
      console.error('-------------------');
      console.error('Mensaje:', error.message);
      console.error('Código HTTP:', error.status);
      console.error('Código de error:', error.code || 'N/A');
      console.error('\n📋 OBJETO ERROR COMPLETO:');
      console.error(JSON.stringify(error, null, 2));
      
      console.log('\n💡 POSIBLES CAUSAS:');
      if (error.message.includes('Email')) {
        console.log('- Email confirmations habilitado en Supabase');
        console.log('  Solución: Deshabilitar en Auth Settings');
      }
      if (error.message.includes('rate limit')) {
        console.log('- Rate limit alcanzado');
        console.log('  Solución: Esperar 1 minuto y reintentar');
      }
      if (error.message.includes('duplicate') || error.message.includes('already exists')) {
        console.log('- Email ya registrado');
        console.log('  Solución: Usar otro email');
      }
      if (error.status === 0 || error.message.includes('fetch')) {
        console.log('- Problema de CORS o red');
        console.log('  Solución: Verificar CORS en Supabase dashboard');
      }
      
    } else {
      console.log('✅ SIGNUP EXITOSO:');
      console.log('-------------------');
      console.log('User ID:', data.user?.id);
      console.log('Email:', data.user?.email);
      console.log('Email confirmado:', data.user?.email_confirmed_at ? '✅ Sí' : '⏳ Pendiente');
      console.log('Session creada:', data.session ? '✅ Sí' : '❌ No');
      
      // Test 5: Verificar perfil
      console.log('\n5️⃣ VERIFICAR PERFIL:');
      console.log('-------------------');
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', data.user.id)
        .single();
      
      if (profileError) {
        console.error('❌ Error verificando perfil:', profileError.message);
        console.log('💡 El perfil puede crearse después por el trigger');
      } else {
        console.log('✅ Perfil encontrado:', profileData);
      }
    }

  } catch (err) {
    console.error('\n❌ ERROR CRÍTICO:');
    console.error('-------------------');
    console.error('Mensaje:', err.message);
    console.error('Stack:', err.stack);
  }

  console.log('\n========================================');
  console.log('🔍 DIAGNÓSTICO COMPLETADO');
  console.log('========================================\n');
  console.log('📋 SIGUIENTE PASO:');
  console.log('1. Copia TODO el output de arriba');
  console.log('2. Ve a Network tab (F12 → Network)');
  console.log('3. Busca peticiones a "signup" o "auth"');
  console.log('4. Si hay errores rojos, haz click y copia el Response');
  console.log('5. Comparte ambos outputs para ayudarte\n');
})();
