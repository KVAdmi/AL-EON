# 📧 Backend: Enviar Email de Invitación a Proyecto

## 🎯 Objetivo

Cuando un usuario invita a otro a un proyecto, **enviar un email automático** con:
- Notificación de la invitación
- Nombre del proyecto
- Quien invitó
- Link para aceptar

---

## 🔧 Implementación en AL-E Core

### 1. **Endpoint: POST `/api/projects/invite`**

```typescript
// src/api/projects.ts

router.post('/invite', authMiddleware, async (req, res) => {
  const { projectId, userEmail, role, projectName } = req.body;
  const inviterUserId = req.user.id; // Del JWT

  try {
    // 1. Obtener info del invitador
    const inviter = await supabase
      .from('user_profiles')
      .select('display_name, email')
      .eq('user_id', inviterUserId)
      .single();

    const inviterName = inviter.data?.display_name || inviter.data?.email || 'Un colaborador';

    // 2. Verificar que el usuario invitado existe
    const { data: invitedUser } = await supabase.auth.admin.getUserByEmail(userEmail);
    
    if (!invitedUser) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // 3. Crear invitación en BD (ya lo hace el frontend vía RPC)
    // ...

    // 4. ENVIAR EMAIL
    const emailSubject = `${inviterName} te invitó a colaborar en "${projectName}"`;
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Invitación a proyecto en AL-EON</h2>
        
        <p>Hola,</p>
        
        <p><strong>${inviterName}</strong> te ha invitado a colaborar en el proyecto:</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0; color: #0066cc;">${projectName}</h3>
          <p style="margin: 10px 0 0 0; color: #666;">Rol: ${role === 'editor' ? 'Editor' : 'Visor'}</p>
        </div>
        
        <p>Para aceptar la invitación:</p>
        <ol>
          <li>Inicia sesión en <a href="https://al-eon.com">AL-EON</a></li>
          <li>Revisa tus notificaciones (icono de campana 🔔)</li>
          <li>Acepta la invitación</li>
        </ol>
        
        <p style="margin-top: 30px;">
          <a href="https://al-eon.com" 
             style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Ir a AL-EON
          </a>
        </p>
        
        <p style="margin-top: 30px; color: #999; font-size: 12px;">
          Si no esperabas este email, puedes ignorarlo.
        </p>
      </div>
    `;

    // Enviar email usando el sistema existente
    await sendEmail({
      to: userEmail,
      subject: emailSubject,
      html: emailBody
    });

    res.json({
      success: true,
      message: 'Invitación enviada por email'
    });

  } catch (error) {
    console.error('[Projects] Error enviando invitación:', error);
    res.status(500).json({
      success: false,
      error: 'Error al enviar invitación'
    });
  }
});
```

---

## 🎨 Frontend: Llamar al endpoint

### Modificar `projectCollaboration.js`:

```javascript
// src/services/projectCollaboration.js

export async function inviteUserToProject(projectId, userEmail, role = 'member') {
  // 1. Llamar a la función RPC de Supabase (crea registro en BD)
  const { data, error } = await supabase.rpc('invite_user_to_project', {
    p_project_id: projectId,
    p_user_email: userEmail,
    p_role: role
  });

  if (error) throw error;

  // 2. Obtener nombre del proyecto
  const { data: project } = await supabase
    .from('user_projects')
    .select('name')
    .eq('id', projectId)
    .single();

  // 3. ✅ NUEVO: Enviar email vía backend
  try {
    const token = await getAuthToken();
    
    await fetch(`${import.meta.env.VITE_ALE_CORE_URL}/api/projects/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        projectId,
        userEmail,
        role,
        projectName: project?.name || 'Proyecto'
      })
    });

    console.log('✅ Email de invitación enviado a:', userEmail);
  } catch (emailError) {
    console.warn('⚠️ No se pudo enviar email, pero la invitación se creó:', emailError);
    // No fallar si el email falla, la invitación ya está en BD
  }

  return data;
}

async function getAuthToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
}
```

---

## 📱 Cómo ve el proyecto el usuario invitado

### **ANTES** de aceptar:
- ❌ NO aparece en su sidebar
- ✅ Ve notificación en campana 🔔
- ✅ Recibe email (con esta implementación)

### **DESPUÉS** de aceptar:
- ✅ Aparece en sidebar bajo "PROYECTOS"
- ✅ Puede abrir conversaciones del proyecto
- ✅ Puede ver documentos (si es Editor)
- ✅ Solo puede ver conversaciones (si es Visor)

---

## 🔑 RLS (Row Level Security)

Ya implementado en `SUPABASE-NOTIFICATIONS.sql`:

```sql
-- Solo muestra proyectos donde:
-- 1. Es el owner (user_id = auth.uid())
-- 2. Es miembro Y aceptó (accepted_at IS NOT NULL)

CREATE POLICY "Users can view their projects" ON user_projects
  FOR SELECT USING (
    user_id = auth.uid() OR
    id IN (
      SELECT project_id FROM project_members 
      WHERE user_id = auth.uid() 
        AND accepted_at IS NOT NULL -- ✅ Clave: solo si aceptó
    )
  );
```

---

## ✅ Checklist de implementación

### Backend (AL-E Core):
- [ ] Crear endpoint `/api/projects/invite`
- [ ] Integrar con sistema de email existente
- [ ] Agregar authMiddleware
- [ ] Probar envío de email

### Frontend (AL-EON):
- [ ] Modificar `projectCollaboration.js`
- [ ] Agregar llamada al endpoint de email
- [ ] Manejar errores gracefully
- [ ] Mostrar mensaje de éxito

### Base de Datos:
- [x] Tabla `project_members` ✅ (ya existe)
- [x] Tabla `user_notifications` ✅ (ya existe)
- [x] RLS policies ✅ (ya implementadas)

---

## 🧪 Prueba

1. Usuario A invita a `luis@example.com`
2. Backend envía email a Luis
3. Luis recibe email con botón "Ir a AL-EON"
4. Luis inicia sesión
5. Ve notificación 🔔 "Patricia te invitó a colaborar..."
6. Acepta la invitación
7. **AHORA SÍ** ve el proyecto en su sidebar

---

## 📝 Nota importante

**Sin email:** El usuario invitado DEBE saber que fue invitado y revisar sus notificaciones manualmente.

**Con email:** El usuario recibe aviso inmediato y puede actuar.

Es mucho mejor implementar el email. ¿Quieres que te ayude a implementarlo en el backend?
