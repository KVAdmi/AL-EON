-- =====================================================
-- ADD DISPLAY_NAME TO USER_PROFILES
-- Permite a los usuarios mostrar un nombre personalizado
-- en lugar de su email
-- =====================================================

-- 1. Agregar columna display_name a user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 2. Actualizar el trigger para incluir display_name en nuevos usuarios
-- (toma el nombre del email por defecto)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_name TEXT;
BEGIN
  -- Extraer nombre del email (antes del @)
  default_name := SPLIT_PART(NEW.email, '@', 1);
  
  -- Crear perfil
  INSERT INTO user_profiles (user_id, email, role, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    CASE 
      WHEN NEW.email = 'kvadmixx@gmail.com' THEN 'ROOT'
      ELSE 'USER'
    END,
    default_name
  );

  -- Crear settings
  INSERT INTO user_settings (user_id)
  VALUES (NEW.id);

  -- Crear proyecto "General" por defecto
  INSERT INTO user_projects (user_id, name, description, icon, color, sort_order)
  VALUES (NEW.id, 'General', 'Proyecto general para organizar conversaciones', '📁', '#3B82F6', 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Actualizar registros existentes (poner nombre del email)
UPDATE user_profiles
SET display_name = SPLIT_PART(email, '@', 1)
WHERE display_name IS NULL;

-- =====================================================
-- LISTO! Ahora los usuarios pueden:
-- 1. Ver su nombre (tomado del email) en el sidebar
-- 2. Cambiarlo en la configuración
-- 3. El nombre se mostrará en lugar del email
-- =====================================================
