-- ==========================================
-- LIMPIEZA TOTAL - EJECUTAR PRIMERO
-- ==========================================

-- Borrar triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS set_root_role ON user_profiles;

-- Borrar funciones
DROP FUNCTION IF EXISTS create_user_profile();
DROP FUNCTION IF EXISTS assign_root_role();

-- Borrar policies
DROP POLICY IF EXISTS "user_profiles_select" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete" ON user_profiles;

DROP POLICY IF EXISTS "user_settings_select" ON user_settings;
DROP POLICY IF EXISTS "user_settings_insert" ON user_settings;
DROP POLICY IF EXISTS "user_settings_update" ON user_settings;
DROP POLICY IF EXISTS "user_settings_delete" ON user_settings;

DROP POLICY IF EXISTS "user_integrations_select" ON user_integrations;
DROP POLICY IF EXISTS "user_integrations_insert" ON user_integrations;
DROP POLICY IF EXISTS "user_integrations_update" ON user_integrations;
DROP POLICY IF EXISTS "user_integrations_delete" ON user_integrations;

DROP POLICY IF EXISTS "user_sessions_select" ON user_sessions;
DROP POLICY IF EXISTS "user_sessions_insert" ON user_sessions;

-- Borrar tablas
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS user_integrations CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
