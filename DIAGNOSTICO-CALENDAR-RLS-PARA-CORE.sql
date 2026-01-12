-- ============================================
-- 🔍 DIAGNÓSTICO COMPLETO: CALENDAR RLS
-- ============================================
-- Para ejecutar en Supabase Dashboard > SQL Editor
-- Propósito: Encontrar la CAUSA RAÍZ del problema reportado
-- 
-- PROBLEMA REPORTADO:
-- - Usuario aeafa6b7-... NO ve sus propios eventos
-- - Otros usuarios SÍ ven sus eventos
-- - RLS parece estar bloqueando incorrectamente
-- ============================================

-- ============================================
-- PASO 1: IDENTIFICAR LA TABLA CORRECTA
-- ============================================
-- Verificar qué tabla(s) de calendario existen

SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE (
  table_name LIKE '%calendar%' 
  OR table_name LIKE '%event%'
  OR table_name LIKE '%meeting%'
  OR table_name LIKE '%agenda%'
)
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- ============================================
-- PASO 2: AUDITAR POLICIES EXISTENTES
-- ============================================
-- Ver TODAS las policies de la tabla (incluyendo conflictos)

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive, -- PERMISSIVE vs RESTRICTIVE (importante!)
  roles,
  cmd, -- ALL vs SELECT/INSERT/UPDATE/DELETE
  qual as "USING (para SELECT/UPDATE/DELETE)",
  with_check as "WITH CHECK (para INSERT/UPDATE)"
FROM pg_policies
WHERE tablename IN ('calendar_events', 'events', 'user_events', 'agenda')
ORDER BY tablename, cmd, policyname;

-- 🔴 BUSCAR: 
-- - Múltiples policies con cmd = 'ALL' (pueden crear conflictos)
-- - RESTRICTIVE policies (bloquean incluso si otra permite)
-- - WITH CHECK conditions que fallan silenciosamente

-- ============================================
-- PASO 3: VERIFICAR RLS ESTÁ HABILITADO
-- ============================================

SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE tablename IN ('calendar_events', 'events', 'user_events', 'agenda')
  AND schemaname = 'public';

-- ============================================
-- PASO 4: AUDITAR DATOS DEL USUARIO PROBLEMA
-- ============================================
-- Ejecutar como SERVICE ROLE (ignora RLS) para ver datos reales

-- 4.1 Ver estructura de un evento ejemplo
SELECT 
  id,
  title,
  owner_user_id,
  created_at,
  updated_at,
  start_at,
  end_at,
  description,
  -- Si existe campo participants:
  participants,
  -- Si existe campo user_id adicional:
  user_id,
  -- Ver todos los campos
  *
FROM calendar_events -- Ajustar nombre si es necesario
LIMIT 3;

-- 4.2 Buscar eventos del usuario problema
-- REEMPLAZAR 'aeafa6b7-...' con el UUID completo del usuario
SELECT 
  'Eventos del usuario problema' as diagnostico,
  COUNT(*) as total_eventos,
  COUNT(CASE WHEN owner_user_id IS NULL THEN 1 END) as "owner_user_id NULL",
  COUNT(CASE WHEN owner_user_id = '' THEN 1 END) as "owner_user_id VACÍO",
  MIN(created_at) as primer_evento,
  MAX(created_at) as ultimo_evento
FROM calendar_events
WHERE owner_user_id LIKE 'aeafa6b7%' OR user_id LIKE 'aeafa6b7%';

-- 4.3 Ver eventos específicos del usuario
SELECT 
  id,
  title,
  owner_user_id,
  created_at,
  start_at
FROM calendar_events
WHERE owner_user_id LIKE 'aeafa6b7%' OR user_id LIKE 'aeafa6b7%'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- PASO 5: PROBAR POLICY MANUALMENTE
-- ============================================
-- Simular lo que RLS evalúa

-- 5.1 Ver qué retorna auth.uid() para el usuario problema
-- (Esto solo funciona si ejecutas como ese usuario, no como service_role)
SELECT 
  auth.uid() as mi_user_id,
  auth.role() as mi_rol;

-- 5.2 Simular la policy actual
-- REEMPLAZAR 'aeafa6b7-...' con el UUID completo
SELECT 
  id,
  title,
  owner_user_id,
  'aeafa6b7-...' as usuario_problema,
  -- Esta es la condición de la policy actual:
  (owner_user_id = 'aeafa6b7-...') as "policy_permite_ver"
FROM calendar_events
WHERE owner_user_id LIKE 'aeafa6b7%'
LIMIT 5;

-- 🔴 Si "policy_permite_ver" = false, el problema NO es la policy, es owner_user_id

-- ============================================
-- PASO 6: VERIFICAR TRIGGERS
-- ============================================
-- Ver si hay triggers que modifican owner_user_id

SELECT 
  trigger_name,
  event_manipulation, -- INSERT, UPDATE, DELETE
  event_object_table,
  action_timing, -- BEFORE, AFTER
  action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('calendar_events', 'events', 'user_events', 'agenda')
ORDER BY event_object_table, action_timing;

-- ============================================
-- PASO 7: VERIFICAR PERMISOS DE TABLA
-- ============================================
-- Ver si la tabla tiene grants correctos

SELECT 
  grantee,
  table_schema,
  table_name,
  privilege_type
FROM information_schema.table_privileges
WHERE table_name IN ('calendar_events', 'events', 'user_events', 'agenda')
  AND table_schema = 'public'
ORDER BY table_name, grantee, privilege_type;

-- ============================================
-- PASO 8: BUSCAR CONFLICTOS DE POLICIES
-- ============================================
-- Detectar si hay policies que se anulan entre sí

WITH policy_analysis AS (
  SELECT 
    tablename,
    policyname,
    cmd,
    permissive,
    qual,
    with_check,
    -- Contar cuántas policies afectan cada comando
    COUNT(*) OVER (PARTITION BY tablename, cmd) as policies_para_este_cmd
  FROM pg_policies
  WHERE tablename IN ('calendar_events', 'events', 'user_events', 'agenda')
)
SELECT 
  tablename,
  cmd,
  COUNT(*) as total_policies,
  COUNT(CASE WHEN permissive = 'PERMISSIVE' THEN 1 END) as permissive_count,
  COUNT(CASE WHEN permissive = 'RESTRICTIVE' THEN 1 END) as restrictive_count,
  STRING_AGG(policyname, ', ') as policy_names
FROM policy_analysis
GROUP BY tablename, cmd
HAVING COUNT(*) > 1; -- Solo mostrar si hay múltiples policies

-- 🔴 BUSCAR:
-- - cmd = 'ALL' con múltiples policies (conflicto común)
-- - RESTRICTIVE policies (bloquean todo)

-- ============================================
-- PASO 9: TEST DE INSERCIÓN (BUSCAR WITH CHECK)
-- ============================================
-- Verificar si el problema está en INSERT, no en SELECT

-- Simular inserción de evento
-- NOTA: NO ejecutar esto sin antes ver las policies de INSERT
SELECT 
  'Test de policy INSERT/UPDATE' as diagnostico,
  'aeafa6b7-...' as owner_user_id_propuesto,
  ('aeafa6b7-...' = 'aeafa6b7-...') as "with_check_pasaria";

-- ============================================
-- PASO 10: COMPARAR CON USUARIO QUE SÍ FUNCIONA
-- ============================================
-- Ver eventos de un usuario que SÍ ve sus eventos correctamente

SELECT 
  'Usuario que SÍ funciona' as diagnostico,
  owner_user_id,
  COUNT(*) as total_eventos,
  MIN(created_at) as primer_evento,
  MAX(created_at) as ultimo_evento
FROM calendar_events
WHERE owner_user_id IS NOT NULL
  AND owner_user_id != ''
GROUP BY owner_user_id
ORDER BY total_eventos DESC
LIMIT 5;

-- Comparar estructura de eventos entre usuario OK vs usuario problema
SELECT 
  CASE 
    WHEN owner_user_id LIKE 'aeafa6b7%' THEN 'USUARIO PROBLEMA'
    ELSE 'USUARIO OK'
  END as tipo_usuario,
  COUNT(*) as eventos,
  COUNT(CASE WHEN owner_user_id IS NULL THEN 1 END) as "sin owner_user_id",
  COUNT(CASE WHEN start_at IS NULL THEN 1 END) as "sin start_at",
  COUNT(CASE WHEN title IS NULL OR title = '' THEN 1 END) as "sin title"
FROM calendar_events
GROUP BY 
  CASE 
    WHEN owner_user_id LIKE 'aeafa6b7%' THEN 'USUARIO PROBLEMA'
    ELSE 'USUARIO OK'
  END;

-- ============================================
-- 🎯 INTERPRETACIÓN DE RESULTADOS
-- ============================================
/*
ESCENARIO 1: owner_user_id está NULL o vacío
  → CAUSA: Trigger de INSERT no asigna owner_user_id correctamente
  → SOLUCIÓN: Fix del trigger, no de RLS
  → Script: UPDATE calendar_events SET owner_user_id = user_id WHERE owner_user_id IS NULL

ESCENARIO 2: Múltiples policies con cmd = 'ALL'
  → CAUSA: Conflicto entre policies (Postgres evalúa con AND implícito)
  → SOLUCIÓN: DROP todas las policies con cmd = 'ALL', crear específicas
  → Script: Ver PASO 11 abajo

ESCENARIO 3: Existe policy RESTRICTIVE
  → CAUSA: RESTRICTIVE bloquea incluso si PERMISSIVE permite
  → SOLUCIÓN: DROP la policy RESTRICTIVE o convertirla a PERMISSIVE
  → Script: ALTER POLICY ... USING (nueva_condicion)

ESCENARIO 4: WITH CHECK falla en INSERT
  → CAUSA: Frontend envía owner_user_id != auth.uid() al crear evento
  → SOLUCIÓN: Fix en frontend O cambiar WITH CHECK por trigger
  → Script: Ver código frontend que crea eventos

ESCENARIO 5: La policy es correcta pero auth.uid() retorna NULL
  → CAUSA: JWT token expirado o inválido
  → SOLUCIÓN: Re-autenticar usuario o verificar Supabase Auth config
  → Script: SELECT auth.uid(), auth.role()

ESCENARIO 6: Tabla tiene nombre diferente
  → CAUSA: Estamos auditando la tabla equivocada
  → SOLUCIÓN: Usar resultado de PASO 1 para identificar tabla correcta
*/

-- ============================================
-- PASO 11: FIX GENÉRICO (SOLO SI DIAGNOSTICO CONFIRMA)
-- ============================================
-- NO EJECUTAR HASTA REVISAR RESULTADOS DE PASOS 1-10

/*
-- ⚠️ OPCIÓN A: Si el problema es conflicto de policies cmd=ALL

ALTER TABLE calendar_events DISABLE ROW LEVEL SECURITY;

-- Eliminar TODAS las policies
DO $$ 
DECLARE 
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'calendar_events'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON calendar_events', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Crear policies limpias (una por comando)
CREATE POLICY "calendar_select_own" ON calendar_events
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "calendar_insert_own" ON calendar_events
  FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "calendar_update_own" ON calendar_events
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "calendar_delete_own" ON calendar_events
  FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid());
*/

/*
-- ⚠️ OPCIÓN B: Si owner_user_id está NULL o vacío

-- Verificar cuántos eventos tienen este problema
SELECT COUNT(*) 
FROM calendar_events 
WHERE owner_user_id IS NULL OR owner_user_id = '';

-- Fix: Asignar owner_user_id desde user_id (si existe ese campo)
UPDATE calendar_events
SET owner_user_id = user_id
WHERE (owner_user_id IS NULL OR owner_user_id = '')
  AND user_id IS NOT NULL;

-- O crear trigger para prevenir futuras inserciones sin owner
CREATE OR REPLACE FUNCTION set_owner_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.owner_user_id IS NULL THEN
    NEW.owner_user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER before_calendar_insert
  BEFORE INSERT ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION set_owner_user_id();
*/

-- ============================================
-- PASO 12: VALIDACIÓN POST-FIX
-- ============================================
-- Después de aplicar cualquier fix, ejecutar esto:

-- Ver policies finales
SELECT tablename, policyname, cmd, permissive
FROM pg_policies
WHERE tablename = 'calendar_events'
ORDER BY cmd, policyname;

-- Test de visibilidad (ejecutar como el usuario problema)
SELECT 
  COUNT(*) as eventos_visibles,
  COUNT(CASE WHEN owner_user_id = auth.uid() THEN 1 END) as mis_eventos
FROM calendar_events;

-- Verificar que no haya eventos huérfanos
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN owner_user_id IS NULL THEN 1 END) as sin_owner,
  COUNT(CASE WHEN owner_user_id IS NOT NULL THEN 1 END) as con_owner
FROM calendar_events;

-- ============================================
-- 📋 CHECKLIST PARA CORE TEAM
-- ============================================
/*
1. ✅ Ejecutar PASO 1 (identificar tabla correcta)
2. ✅ Ejecutar PASO 2 (auditar policies) → Buscar cmd='ALL' múltiple
3. ✅ Ejecutar PASO 4.2 (verificar owner_user_id del usuario problema)
4. ✅ Ejecutar PASO 8 (detectar conflictos de policies)
5. ✅ Ejecutar PASO 10 (comparar con usuario OK)
6. ⚠️  Identificar ESCENARIO del problema (ver interpretación arriba)
7. ⚠️  Aplicar FIX correspondiente (PASO 11, opción A o B)
8. ✅ Ejecutar PASO 12 (validación post-fix)
9. ✅ Hacer test manual: Usuario problema debe ver sus eventos
10. ✅ Notificar a Frontend que fix está aplicado

TIEMPO ESTIMADO: 15-20 minutos
RIESGO: BAJO (queries de diagnóstico no modifican datos)
*/

-- ============================================
-- 🚨 NOTAS CRÍTICAS PARA CORE
-- ============================================
/*
1. NO ejecutar DROP POLICY sin antes hacer el diagnóstico completo
2. NO asumir que la tabla se llama 'calendar_events' (verificar PASO 1)
3. SI owner_user_id está NULL, el problema NO es RLS
4. SI hay múltiples policies con cmd='ALL', hay conflicto garantizado
5. SIEMPRE probar con el usuario problema después del fix
6. CONSIDERAR hacer backup de policies antes de DROP:
   
   -- Backup de policies actuales:
   SELECT 
     'CREATE POLICY "' || policyname || '" ON ' || tablename ||
     ' FOR ' || cmd || ' TO ' || array_to_string(roles, ',') ||
     ' USING (' || qual || ')' ||
     CASE WHEN with_check IS NOT NULL 
       THEN ' WITH CHECK (' || with_check || ')' 
       ELSE '' 
     END || ';' as backup_sql
   FROM pg_policies
   WHERE tablename = 'calendar_events';
*/
