/**
 * AL-E Console - Variables de Entorno
 * Valida que todas las variables críticas existan
 */

function getEnvVar(key, required = true) {
  const value = import.meta.env[key];
  
  if (required && !value) {
    throw new Error(
      `❌ Variable de entorno faltante: ${key}\n` +
      `Verifica tu archivo .env`
    );
  }
  
  return value;
}

// Exportar variables validadas
export const ALE_CORE_URL = getEnvVar('VITE_ALE_CORE_URL');
export const WORKSPACE_ID = getEnvVar('VITE_WORKSPACE_ID');
export const APP_NAME = getEnvVar('VITE_APP_NAME');
export const USER_ID = getEnvVar('VITE_USER_ID');

// Log de inicio (solo en dev)
if (import.meta.env.DEV) {
  console.log('🚀 AL-E Console configurado:');
  console.log('   Core URL:', ALE_CORE_URL);
  console.log('   Workspace:', WORKSPACE_ID);
  console.log('   User:', USER_ID);
}
