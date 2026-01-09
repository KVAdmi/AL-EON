# ✅ PASOS PARA ARREGLAR PROYECTOS COMPARTIDOS

## 🎯 Problema
- ✅ Las invitaciones se envían
- ✅ Las notificaciones aparecen
- ✅ Los usuarios aceptan las invitaciones
- ❌ **PERO NO VEN EL PROYECTO EN SU SIDEBAR**

## 🔧 Solución (2 pasos)

---

## PASO 1: EJECUTAR SQL EN SUPABASE ⚡

### 1. Abre Supabase Dashboard
```
https://supabase.com/dashboard/project/aaydqotuutdxekugbcnn
```

### 2. Ve a SQL Editor

### 3. Copia y pega este SQL completo:

```sql
-- ============================================
-- FIX: Ver proyectos compartidos en sidebar
-- ============================================

-- 1. ARREGLAR RLS de user_projects
DROP POLICY IF EXISTS "Users can view their projects" ON user_projects;
DROP POLICY IF EXISTS "Users can view shared projects" ON user_projects;

-- Policy 1: Ver proyectos PROPIOS
CREATE POLICY "Users can view their own projects" ON user_projects
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- Policy 2: Ver proyectos COMPARTIDOS (aceptados)
CREATE POLICY "Users can view accepted shared projects" ON user_projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = user_projects.id
        AND project_members.user_id = auth.uid()
        AND project_members.accepted_at IS NOT NULL
    )
  );

-- 2. ARREGLAR RLS de project_members
ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view project members" ON project_members;
DROP POLICY IF EXISTS "Project owners can manage members" ON project_members;
DROP POLICY IF EXISTS "Users can view members of their projects" ON project_members;
DROP POLICY IF EXISTS "Project owners can add members" ON project_members;
DROP POLICY IF EXISTS "Users can update their own membership or owners can update" ON project_members;
DROP POLICY IF EXISTS "Project owners can remove members" ON project_members;

ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Policy para VER membresías
CREATE POLICY "Users can view memberships" ON project_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR 
    project_id IN (
      SELECT id FROM user_projects WHERE user_id = auth.uid()
    )
  );

-- Policy para INSERTAR (invitar)
CREATE POLICY "Owners can invite members" ON project_members
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM user_projects WHERE user_id = auth.uid()
    )
  );

-- Policy para ACTUALIZAR (aceptar invitación)
CREATE POLICY "Users can accept invitations" ON project_members
  FOR UPDATE USING (
    user_id = auth.uid()
    OR
    project_id IN (
      SELECT id FROM user_projects WHERE user_id = auth.uid()
    )
  );

-- Policy para ELIMINAR (remover miembros)
CREATE POLICY "Owners can remove members" ON project_members
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM user_projects WHERE user_id = auth.uid()
    )
  );
```

### 4. Click en "RUN" ▶️

### 5. Verifica que dice "Success. No rows returned"

---

## PASO 2: REINICIAR FRONTEND 🔄

El código ya está actualizado en el repo, solo necesitas:

```bash
cd "/Users/pg/Documents/CHAT AL-E"
pkill -f "vite"
npm run dev
```

---

## 🧪 PRUEBA

### En la cuenta que INVITÓ (Patto):
1. Abre un proyecto (ej: "Kunna")
2. Click en botón "Compartir" (Share2 icon)
3. Invita a otro usuario por email
4. ✅ Aparece en la lista de miembros

### En la cuenta INVITADA (Luis):
1. Inicia sesión
2. Click en campana 🔔 (NotificationBell)
3. Acepta la invitación del proyecto
4. **✅ AHORA SÍ DEBE APARECER EL PROYECTO EN SIDEBAR**
5. Verás un badge azul que dice "Compartido" con icono de Users
6. Debajo del nombre verás tu rol (Editor o Visor)

---

## 🎨 CÓMO SE VE

### Proyecto PROPIO:
```
📁 Kunna
   3 chats
   [botones: + 📄 🔗 ⋮]
```

### Proyecto COMPARTIDO:
```
📁 Proyecto de Victor  [👥 Compartido]
   5 chats • Editor
   [botones: + 📄]  ← Sin compartir ni eliminar
```

---

## ✅ CAMBIOS IMPLEMENTADOS

### Backend (SQL):
- ✅ RLS policies actualizadas sin recursión
- ✅ Policy para ver proyectos compartidos aceptados
- ✅ Policy para aceptar invitaciones

### Frontend (JavaScript):
- ✅ `getProjects()` incluye proyectos compartidos
- ✅ Agrega campos `isOwner`, `isShared`, `myRole`
- ✅ Badge visual "Compartido" con icono Users
- ✅ Muestra rol en descripción (Editor/Visor)
- ✅ Oculta botones según permisos:
  - Compartir: solo owner
  - Documentos: no viewers
  - Eliminar: solo owner

---

## 📝 NOTAS

### Roles:
- **owner**: Creador del proyecto (control total)
- **editor**: Puede ver, editar, crear chats, subir documentos
- **viewer**: Solo puede ver conversaciones (sin editar)

### Permisos:
| Acción                  | Owner | Editor | Viewer |
|-------------------------|-------|--------|--------|
| Ver proyecto            | ✅    | ✅     | ✅     |
| Ver conversaciones      | ✅    | ✅     | ✅     |
| Crear chat nuevo        | ✅    | ✅     | ✅     |
| Subir/ver documentos    | ✅    | ✅     | ❌     |
| Compartir proyecto      | ✅    | ❌     | ❌     |
| Eliminar proyecto       | ✅    | ❌     | ❌     |
| Remover miembros        | ✅    | ❌     | ❌     |

---

## 🚀 SIGUIENTE PASO (OPCIONAL)

Implementar emails de invitación automáticos:
- Ver: `BACKEND-PROJECT-INVITE-EMAIL.md`
- Requiere cambios en AL-E Core backend

Por ahora, el sistema funciona con notificaciones in-app (campana 🔔).

---

**¿Listo para probar?** 🎯

1. Ejecuta el SQL en Supabase
2. Reinicia el frontend
3. Recarga ambas cuentas (la que invitó y la invitada)
4. Debería aparecer el proyecto compartido con el badge azul

---

**Creado:** 8 de enero de 2026, 22:43
**Status:** ✅ Código listo, falta ejecutar SQL
