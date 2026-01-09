// 🔥 SCRIPT PARA ARREGLAR FOLDER_ID DE CORREOS
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nksapbzugvvpddlqpikp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rc2FwYnp1Z3Z2cGRkbHFwaWtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMxODU0NTQsImV4cCI6MjA0ODc2MTQ1NH0.bTfHrE86mNXy6kNWF0kLi6Zu3j9m9bJD7RqOjO4Dn8g'
);

async function fixEmailFolders() {
  console.log('🔍 Verificando correos y folders...\n');

  // 1. Obtener todos los correos
  const { data: messages, error: msgError } = await supabase
    .from('email_messages')
    .select(`
      id,
      subject,
      from_address,
      to_addresses,
      account_id,
      folder_id,
      created_at,
      folder:email_folders!folder_id(id, folder_name, folder_type)
    `)
    .order('created_at', { ascending: false })
    .limit(20);

  if (msgError) {
    console.error('❌ Error obteniendo mensajes:', msgError);
    return;
  }

  console.log(`📊 Total correos: ${messages.length}\n`);

  // Agrupar por folder_type
  const byFolder = {};
  messages.forEach(msg => {
    const folderType = msg.folder?.folder_type || 'NULL';
    if (!byFolder[folderType]) byFolder[folderType] = [];
    byFolder[folderType].push(msg);
  });

  console.log('📁 Correos por folder_type:');
  Object.entries(byFolder).forEach(([type, msgs]) => {
    console.log(`  ${type}: ${msgs.length} correos`);
  });

  // 2. Obtener folders disponibles
  const { data: folders, error: folderError } = await supabase
    .from('email_folders')
    .select('*')
    .order('created_at');

  if (folderError) {
    console.error('❌ Error obteniendo folders:', folderError);
    return;
  }

  console.log(`\n📂 Folders disponibles: ${folders.length}`);
  folders.forEach(f => {
    console.log(`  - ${f.folder_type} (${f.folder_name}) [account_id: ${f.account_id.substring(0, 8)}...]`);
  });

  // 3. ARREGLAR: Mover correos con folder_id NULL o incorrecto
  console.log('\n🔧 Corrigiendo folder_id de correos...\n');

  for (const msg of messages) {
    const currentFolderType = msg.folder?.folder_type;
    
    // Determinar folder correcto basado en from/to
    let targetFolderType = 'Inbox'; // Por defecto
    
    // Si el correo fue enviado por la cuenta actual, va a Sent
    const accountFolders = folders.filter(f => f.account_id === msg.account_id);
    const account = accountFolders[0]; // Asumimos que hay un folder de esta cuenta
    
    if (!account) {
      console.log(`⚠️ No hay folders para account_id: ${msg.account_id.substring(0, 8)}...`);
      continue;
    }

    // Buscar folder Inbox para esta cuenta
    const inboxFolder = accountFolders.find(f => f.folder_type === 'Inbox');
    
    if (!inboxFolder) {
      console.log(`⚠️ No hay Inbox para account_id: ${msg.account_id.substring(0, 8)}...`);
      continue;
    }

    // Si ya está en Inbox, skip
    if (msg.folder_id === inboxFolder.id) {
      console.log(`✅ "${msg.subject?.substring(0, 40)}" ya está en Inbox`);
      continue;
    }

    // Mover a Inbox
    console.log(`🔄 Moviendo "${msg.subject?.substring(0, 40)}" a Inbox...`);
    
    const { error: updateError } = await supabase
      .from('email_messages')
      .update({ folder_id: inboxFolder.id })
      .eq('id', msg.id);

    if (updateError) {
      console.error(`❌ Error actualizando ${msg.id}:`, updateError);
    } else {
      console.log(`✅ Movido exitosamente`);
    }
  }

  console.log('\n✅ PROCESO COMPLETADO');
}

fixEmailFolders().catch(console.error);
