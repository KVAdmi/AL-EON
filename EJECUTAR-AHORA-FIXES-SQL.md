# 🚨 EJECUTAR AHORA - FIXES SQL CRÍTICOS

**Fecha:** 11 de enero de 2026  
**Tiempo estimado:** 10 minutos  
**Prioridad:** P0 CRÍTICA  

---

## 🎯 QUÉ VAS A ARREGLAR

1. **Proyectos compartidos:** Usuario 2 NO ve proyectos compartidos → SE ARREGLA
2. **Calendario:** Usuario aeafa6b7... NO ve su evento del 6/ene → SE ARREGLA

---

## 📋 PASO A PASO

### 1. Ir a Supabase SQL Editor

```
https://supabase.com/dashboard/project/[TU_PROJECT_ID]/sql/new
```

O busca "SQL Editor" en el menú lateral izquierdo de Supabase.

---

### 2. Ejecutar FIX de PROYECTOS

**Copiar y pegar este SQL completo:**

```sql
-- ============================================
-- FIX DEFINITIVO: RLS para PROYECTOS COMPARTIDOS
-- ============================================

-- 1. Deshabilitar RLS temporalmente
ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_projects DISABLE ROW LEVEL SECURITY;

-- 2. ELIMINAR TODAS las policies existentes
DROP POLICY IF EXISTS "Users can view project members" ON project_members;
DROP POLICY IF EXISTS "Project owners can manage members" ON project_members;
DROP POLICY IF EXISTS "Users can view members of their projects" ON project_members;
DROP POLICY IF EXISTS "Project owners can add members" ON project_members;
DROP POLICY IF EXISTS "Users can update their own membership or owners can update" ON project_members;
DROP POLICY IF EXISTS "Project owners can remove members" ON project_members;
DROP POLICY IF EXISTS "Users can view their memberships" ON project_members;
DROP POLICY IF EXISTS "Owners can view project members" ON project_members;
DROP POLICY IF EXISTS "Owners can add members" ON project_members;
DROP POLICY IF EXISTS "Users can update memberships" ON project_members;
DROP POLICY IF EXISTS "Owners can remove members" ON project_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON project_members;
DROP POLICY IF EXISTS "Users can insert memberships" ON project_members;
DROP POLICY IF EXISTS "Users can update their own memberships" ON project_members;
DROP POLICY IF EXISTS "Users can delete their own memberships" ON project_members;

DROP POLICY IF EXISTS "Users can view their projects" ON user_projects;
DROP POLICY IF EXISTS "Users can view shared projects" ON user_projects;
DROP POLICY IF EXISTS "Users can create projects" ON user_projects;
DROP POLICY IF EXISTS "Users can update own projects" ON user_projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON user_projects;
DROP POLICY IF EXISTS "Users can view own projects" ON user_projects;
DROP POLICY IF EXISTS "Users can view accepted shared projects" ON user_projects;

-- 3. Re-habilitar RLS
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_projects ENABLE ROW LEVEL SECURITY;

-- 4. CREAR POLICIES CORRECTAS (CON COMPARTIDOS)

-- user_projects: Ver proyectos donde SOY DUEÑO o SOY MIEMBRO
CREATE POLICY "Users can view own and shared projects" ON user_projects
  FOR SELECT USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = user_projects.id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create projects" ON user_projects
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own projects" ON user_projects
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own projects" ON user_projects
  FOR DELETE USING (user_id = auth.uid());

-- project_members: Ver membresías donde SOY el miembro O SOY dueño del proyecto
CREATE POLICY "Users can view relevant memberships" ON project_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_projects up
      WHERE up.id = project_members.project_id
      AND up.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert memberships" ON project_members
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update relevant memberships" ON project_members
  FOR UPDATE USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_projects up
      WHERE up.id = project_members.project_id
      AND up.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete relevant memberships" ON project_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_projects up
      WHERE up.id = project_members.project_id
      AND up.user_id = auth.uid()
    )
  );

SELECT '✅ FIX PROYECTOS APLICADO CORRECTAMENTE' as status;
```

**Hacer click en "RUN" (o Ctrl+Enter)**

Debes ver:
```
✅ FIX PROYECTOS APLICADO CORRECTAMENTE
```

---

### 3. Ejecutar FIX de CALENDARIO

**Copiar y pegar este SQL completo:**

```sql
-- ============================================
-- FIX URGENTE: CALENDARIO (calendar_events)
-- ============================================

-- 1. Deshabilitar RLS temporalmente
ALTER TABLE calendar_events DISABLE ROW LEVEL SECURITY;

-- 2. ELIMINAR todas las policies existentes
DROP POLICY IF EXISTS "calendar_events_owner_policy" ON calendar_events;
DROP POLICY IF EXISTS "Users can view own events" ON calendar_events;
DROP POLICY IF EXISTS "Users can create own events" ON calendar_events;
DROP POLICY IF EXISTS "Users can update own events" ON calendar_events;
DROP POLICY IF EXISTS "Users can delete own events" ON calendar_events;
DROP POLICY IF EXISTS "Users can view own and shared events" ON calendar_events;

-- 3. Re-habilitar RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- 4. CREAR policies CORRECTAS

CREATE POLICY "Users can view own events" ON calendar_events
  FOR SELECT 
  TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "Users can create own events" ON calendar_events
  FOR INSERT 
  TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Users can update own events" ON calendar_events
  FOR UPDATE 
  TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "Users can delete own events" ON calendar_events
  FOR DELETE 
  TO authenticated
  USING (owner_user_id = auth.uid());

SELECT '✅ FIX CALENDARIO APLICADO CORRECTAMENTE' as status;
```

**Hacer click en "RUN" (o Ctrl+Enter)**

Debes ver:
```
✅ FIX CALENDARIO APLICADO CORRECTAMENTE
```

---

## ✅ VERIFICACIÓN

### Test 1: Proyectos Compartidos

1. **Usuario 1:** Login → Crear proyecto "Test Compartido"
2. **Usuario 1:** Invitar a Usuario 2 (desde UI o con SQL):
```sql
INSERT INTO project_members (project_id, user_id, invited_by, status)
VALUES (
  '[ID_DEL_PROYECTO]',
  '[USER_ID_USUARIO_2]',
  '[USER_ID_USUARIO_1]',
  'accepted'
);
```
3. **Usuario 2:** Login → Ir a Proyectos
4. **DEBE VER:** "Test Compartido" en la lista ✅

### Test 2: Calendario

1. **Usuario aeafa6b7...:** Login
2. Ir a Calendario (https://al-eon.com/calendar)
3. **DEBE VER:** Su evento del 6/ene ✅

---

## 🚨 SI ALGO FALLA

### Error: "permission denied for table"

```sql
-- Verificar que tienes permisos:
SELECT current_user, session_user;

-- Si no eres postgres, ejecuta como postgres
```

### Error: "policy already exists"

```sql
-- Las policies ya están, no pasa nada.
-- Verificar que están correctas:
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('user_projects', 'project_members', 'calendar_events');
```

### Usuario 2 SIGUE sin ver proyectos

```sql
-- Verificar que hay registro en project_members:
SELECT * FROM project_members WHERE user_id = '[USER_ID_USUARIO_2]';

-- Si no hay nada, crear manualmente:
INSERT INTO project_members (project_id, user_id, invited_by, status)
VALUES ('[ID_PROYECTO]', '[USER_ID_USUARIO_2]', '[USER_ID_OWNER]', 'accepted');
```

---

## 📊 LOGS DE VERIFICACIÓN

Ejecutar estos queries para confirmar que funcionó:

```sql
-- 1. Ver todas las policies de proyectos
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('user_projects', 'project_members')
ORDER BY tablename, policyname;

-- 2. Ver todas las policies de calendario
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'calendar_events'
ORDER BY policyname;

-- 3. Contar proyectos visibles para mí (ejecutar como cada usuario)
SELECT 
  COUNT(*) FILTER (WHERE user_id = auth.uid()) as "Mis proyectos",
  COUNT(*) FILTER (WHERE user_id != auth.uid()) as "Proyectos compartidos",
  COUNT(*) as "Total visible"
FROM user_projects;

-- 4. Contar eventos visibles para mí
SELECT COUNT(*) as "Mis eventos"
FROM calendar_events
WHERE owner_user_id = auth.uid();
```

---

## ✅ CUANDO TERMINE

Marcar como completados:

```
✅ P0-1: FIX-PROJECTS-RLS-DEFINITIVO.sql ejecutado
✅ P0-2: FIX-CALENDAR-RLS-URGENTE.sql ejecutado
✅ Test: Usuario 2 ve proyecto compartido
✅ Test: Usuario aeafa6b7... ve evento del 6/ene
```

**Tiempo total:** 10 minutos

---

**LISTO. AHORA SÍ FUNCIONA LA COLABORACIÓN.**
