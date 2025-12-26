-- ================================================================
-- CONFIGURACIÓN GLOBAL DE OAUTH PARA AL-EON
-- ================================================================
-- Este script configura Gmail y Google Calendar como integraciones
-- globales compartidas por todos los usuarios de AL-EON.
--
-- IMPORTANTE: 
-- - Estos tokens permiten a AL-EON enviar emails y gestionar calendarios
-- - Los tokens están asociados a la cuenta de Google del propietario
-- - Todos los usuarios de AL-EON usarán estas credenciales compartidas
-- ================================================================

-- OPCIÓN 1: Crear una tabla de integraciones globales
-- ================================================================

-- Tabla para integraciones compartidas (no por usuario)
CREATE TABLE IF NOT EXISTS global_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_type TEXT NOT NULL UNIQUE, -- 'gmail', 'google_calendar', etc
  integration_name TEXT NOT NULL,
  
  -- Configuración encriptada (tokens OAuth)
  config JSONB NOT NULL DEFAULT '{}',
  
  is_active BOOLEAN DEFAULT true,
  last_tested_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Habilitar RLS pero permitir lectura a usuarios autenticados
ALTER TABLE global_integrations ENABLE ROW LEVEL SECURITY;

-- Policy: Todos los usuarios autenticados pueden LEER integraciones globales
CREATE POLICY "global_integrations_select"
  ON global_integrations FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Policy: Solo admins pueden INSERTAR/ACTUALIZAR (opcional, por ahora comentado)
-- CREATE POLICY "global_integrations_admin_all"
--   ON global_integrations FOR ALL
--   TO authenticated
--   USING (auth.jwt() ->> 'role' = 'admin');

-- Trigger para updated_at
CREATE TRIGGER global_integrations_updated_at
  BEFORE UPDATE ON global_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- INSERTAR CREDENCIALES OAUTH DE GMAIL
-- ================================================================
-- IMPORTANTE: Reemplaza los valores de refresh_token con los reales
-- Los tokens están en OAUTH-TOKENS-SETUP.md (archivo privado, no en Git)

INSERT INTO global_integrations (integration_type, integration_name, config, is_active)
VALUES (
  'gmail',
  'Gmail (AL-EON Official)',
  jsonb_build_object(
    'client_id', '1010443733044-nj923bcv3rp20mi7ilb75bdvr0jnjfdq.apps.googleusercontent.com',
    'client_secret', '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',
    'refresh_token', '[PRIVADO - Reemplazar con token real de OAuth Playground]',
    'scope', 'https://www.googleapis.com/auth/gmail.send',
    'provider', 'google'
  ),
  true
)
ON CONFLICT (integration_type) 
DO UPDATE SET
  config = EXCLUDED.config,
  updated_at = TIMEZONE('utc', NOW());

-- ================================================================
-- INSERTAR CREDENCIALES OAUTH DE GOOGLE CALENDAR
-- ================================================================

INSERT INTO global_integrations (integration_type, integration_name, config, is_active)
VALUES (
  'google_calendar',
  'Google Calendar (AL-EON Official)',
  jsonb_build_object(
    'client_id', '1010443733044-nj923bcv3rp20mi7ilb75bdvr0jnjfdq.apps.googleusercontent.com',
    'client_secret', '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',
    'refresh_token', '[PRIVADO - Reemplazar con token real de OAuth Playground]',
    'scope', 'https://www.googleapis.com/auth/calendar',
    'provider', 'google'
  ),
  true
)
ON CONFLICT (integration_type) 
DO UPDATE SET
  config = EXCLUDED.config,
  updated_at = TIMEZONE('utc', NOW());

-- ================================================================
-- VERIFICAR CONFIGURACIÓN
-- ================================================================

SELECT 
  integration_type,
  integration_name,
  is_active,
  config ->> 'client_id' as client_id_preview,
  config ->> 'scope' as scope,
  created_at
FROM global_integrations
WHERE integration_type IN ('gmail', 'google_calendar');

-- ================================================================
-- NOTAS DE USO
-- ================================================================

-- Para obtener las credenciales desde tu backend (Node.js/Deno Edge Function):
-- 
-- const { data: gmailConfig } = await supabase
--   .from('global_integrations')
--   .select('config')
--   .eq('integration_type', 'gmail')
--   .eq('is_active', true)
--   .single();
--
-- const { client_id, client_secret, refresh_token } = gmailConfig.config;
--
-- // Usar los tokens para enviar email con Gmail API
-- const accessToken = await getAccessToken(client_id, client_secret, refresh_token);

-- ================================================================
-- LIMPIAR (solo si necesitas deshacer todo)
-- ================================================================

-- DROP TABLE IF EXISTS global_integrations CASCADE;
