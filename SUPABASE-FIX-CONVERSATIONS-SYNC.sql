-- ============================================
-- 🚨 FIX URGENTE: SINCRONIZACIÓN DE CONVERSACIONES
-- ============================================
-- Problema: Las conversaciones están solo en localStorage
-- Causa: No hay tabla en Supabase para persistir conversations
-- Resultado: Mobile ≠ Desktop (mundos separados)
-- 
-- EJECUTAR ESTO EN SUPABASE SQL EDITOR:
-- https://supabase.com/dashboard/project/gptwzuqmuvzttajgjrry/sql/new
-- ============================================

-- 1. TABLA: Conversaciones persistentes por usuario
CREATE TABLE IF NOT EXISTS user_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- ID de la conversación (mismo formato que localStorage)
  conversation_id TEXT NOT NULL,
  
  -- Título de la conversación
  title TEXT NOT NULL DEFAULT 'Nueva conversación',
  
  -- Mensajes completos (JSON)
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Metadatos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Un usuario puede tener múltiples conversaciones, pero cada ID es único por usuario
  UNIQUE(user_id, conversation_id)
);

-- 2. ÍNDICES para performance
CREATE INDEX IF NOT EXISTS idx_user_conversations_user_id 
  ON user_conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_user_conversations_updated_at 
  ON user_conversations(updated_at DESC);

-- 3. ROW LEVEL SECURITY
ALTER TABLE user_conversations ENABLE ROW LEVEL SECURITY;

-- Borrar políticas existentes si existen
DROP POLICY IF EXISTS "Usuarios ven solo sus conversaciones" ON user_conversations;
DROP POLICY IF EXISTS "Usuarios insertan solo sus conversaciones" ON user_conversations;
DROP POLICY IF EXISTS "Usuarios actualizan solo sus conversaciones" ON user_conversations;
DROP POLICY IF EXISTS "Usuarios borran solo sus conversaciones" ON user_conversations;

-- Políticas: Cada usuario solo ve sus conversaciones
CREATE POLICY "Usuarios ven solo sus conversaciones"
  ON user_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios insertan solo sus conversaciones"
  ON user_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios actualizan solo sus conversaciones"
  ON user_conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios borran solo sus conversaciones"
  ON user_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- 4. TRIGGER: Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_user_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_conversations_updated_at ON user_conversations;
CREATE TRIGGER trigger_update_user_conversations_updated_at
  BEFORE UPDATE ON user_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_user_conversations_updated_at();

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Ver tabla creada:
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'user_conversations'
ORDER BY ordinal_position;

-- Ver políticas:
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE tablename = 'user_conversations';

-- ============================================
-- RESULTADO ESPERADO:
-- ============================================
-- ✅ Tabla user_conversations creada
-- ✅ RLS habilitado (cada usuario ve solo sus datos)
-- ✅ Trigger de updated_at funcionando
-- ✅ Índices para búsqueda rápida

-- ============================================
-- PRÓXIMO PASO (FRONTEND):
-- ============================================
-- Crear src/services/conversationsService.js que:
-- 1. loadConversations() - Lee de Supabase
-- 2. saveConversation() - Escribe a Supabase
-- 3. deleteConversation() - Borra de Supabase
-- 4. Modificar useConversations.js para usar este servicio
