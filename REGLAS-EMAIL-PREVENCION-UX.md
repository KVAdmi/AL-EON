# 🔒 REGLAS DE PREVENCIÓN UX - MÓDULO EMAIL

**Fecha:** 5 de enero de 2026  
**Objetivo:** Prevenir errores de autenticación desde el frontend

---

## 📋 SEPARACIÓN DE RESPONSABILIDADES

### **INFRA (Backend/DevOps)**
- ✅ Configura Amazon SES
- ✅ Configura DNS (SPF, DKIM, DMARC) para dominios del sistema
- ✅ Monitorea bounce rate, spam, reputation
- ✅ Decide qué dominio es "dominio del sistema"
- ✅ Decide qué proveedor se usa para enviar
- ✅ Implementa `/api/mail/send` con validaciones de seguridad

### **BACKEND (AL-E Core)**
- ✅ Valida que el remitente coincida con la cuenta conectada
- ✅ Rechaza envíos desde dominios del sistema para correos humanos
- ✅ Valida payload completo (accountId, to, subject, body)
- ✅ Retorna errores claros al frontend

### **FRONTEND (AL-EON)**
- ✅ Validar payload antes de enviar
- ✅ Mostrar **SOLO** cuentas conectadas del usuario
- ✅ **NUNCA** mostrar dominios del sistema como opción
- ✅ UI: impedir envío si no hay cuenta conectada
- ✅ Toast/errores claros (sin crashes)
- ✅ Refresh automático post-envío

---

## 🚫 REGLA DE HIERRO - LO QUE EL FRONTEND NUNCA DEBE PERMITIR

### **PROHIBIDO seleccionar como remitente:**

❌ Dominios del sistema (`@al-eon.com`, `@infinitykode.com` para correos humanos)  
❌ Correos personales internos  
❌ Valores "heredados" o "default"  
❌ Cuentas no conectadas explícitamente  

### **PERMITIDO seleccionar como remitente:**

✅ Cuenta conectada vía Gmail OAuth  
✅ Cuenta conectada vía Outlook OAuth  
✅ Cuenta conectada vía SMTP manual (configurada por el usuario)  

---

## 🎯 IMPLEMENTACIÓN EN FRONTEND

### **1. Validación Pre-Envío (EmailComposer.jsx)**

```javascript
const handleSend = async () => {
  // 🔒 VALIDACIÓN CRÍTICA: Sin cuenta = sin envío
  if (!currentAccount) {
    toast({
      variant: "destructive",
      title: "Error",
      description: "No hay cuenta seleccionada",
    });
    return;
  }

  // ... resto de validaciones
}
```

### **2. UI Preventiva - Botón Deshabilitado**

```jsx
{!currentAccount ? (
  // CTA para conectar cuenta
  <div className="flex flex-col items-center gap-2">
    <p>Conecta tu correo para enviar mensajes</p>
    <button onClick={() => window.location.href = '/email/settings'}>
      Conectar cuenta de correo
    </button>
  </div>
) : (
  // Botón enviar normal
  <button
    onClick={handleSend}
    disabled={sending || !formData.to.length || !currentAccount}
  >
    Enviar
  </button>
)}
```

### **3. Validación en emailService.js**

```javascript
// ✅ VALIDACIÓN FUERTE (antes de pegarle al backend)
if (!mailData.accountId) {
  throw new Error('Selecciona una cuenta de correo antes de enviar.');
}
if (!toList.length) {
  throw new Error('Falta el destinatario (to).');
}
if (!subject) {
  throw new Error('Falta el asunto (subject).');
}
if (!body) {
  throw new Error('Falta el contenido del correo (body/html).');
}
```

---

## 🧱 REGLA DE 3 CAPAS

```
┌─────────────────────────────────────────┐
│  FRONTEND: Previene (UI bloqueada)      │  ← Impide al usuario cometer el error
├─────────────────────────────────────────┤
│  BACKEND: Valida (rechaza si inválido)  │  ← Valida que el payload sea correcto
├─────────────────────────────────────────┤
│  INFRA: Ejecuta (DNS/SES/reputación)    │  ← Entrega el email
└─────────────────────────────────────────┘
```

**Si cualquiera de las 3 capas falla, Google/Outlook bloquea.**

---

## ✅ CHECKLIST DE CUMPLIMIENTO

### Frontend:
- [x] Botón "Enviar" deshabilitado si `!currentAccount`
- [x] CTA visible: "Conecta tu correo para enviar mensajes"
- [x] Validación de payload completo antes de `sendEmail()`
- [x] Toast unificado (sin crashes)
- [x] Refresh automático post-envío
- [x] Solo muestra cuentas conectadas (no dominios del sistema)

### Backend:
- [ ] Endpoint `/api/mail/send` valida `accountId` pertenece al usuario
- [ ] Rechaza envíos desde dominios del sistema para correos humanos
- [ ] Retorna errores claros (no 500 genéricos)

### Infra:
- [ ] SPF configurado solo con proveedores reales
- [ ] DKIM activo (3 CNAME de SES)
- [ ] DMARC en modo monitor (`p=none`)
- [ ] Bounce rate < 5%
- [ ] Monitoreo activo de `spf=fail`, `dkim=fail`

---

## 🚨 CASOS DE ERROR MANEJADOS

### **Error 1: Usuario sin cuenta conectada**
```
Frontend: Botón "Enviar" deshabilitado
UI: CTA "Conecta tu correo para enviar mensajes"
Resultado: Usuario no puede enviar
```

### **Error 2: Payload incompleto**
```
Frontend: Validación pre-envío arroja error
Toast: "Falta el destinatario (to)"
Resultado: No se llama al backend
```

### **Error 3: Backend rechaza envío**
```
Backend: 400 "accountId no válido"
Frontend: Toast "Error al enviar: accountId no válido"
Resultado: Usuario ve mensaje claro, no crash
```

### **Error 4: SPF/DKIM fail (DNS)**
```
Infra: Gmail rechaza con 550-5.7.26
Backend: Registra en logs, alerta a DevOps
Frontend: Toast genérico "Error al enviar"
Resultado: Usuario no ve detalles técnicos, equipo recibe alerta
```

---

## 📊 MONITOREO (Responsabilidad Backend/Infra)

### **Métricas críticas:**
- Bounce rate < 5%
- Complaint rate < 0.1%
- SPF pass rate > 99%
- DKIM pass rate > 99%

### **Alertas automáticas:**
- Email con `spf=fail` → Alerta a DevOps
- Email con `dkim=fail` → Alerta a DevOps
- Bounce rate > 5% → Escalación inmediata
- SES reputation < 95% → Escalación inmediata

---

## ✅ ESTADO ACTUAL

**Frontend:** ✔️ Implementado y pusheado (commit 77deba8)  
**Backend:** ⏳ Pendiente validación de reglas  
**Infra:** ⏳ Pendiente configuración DNS  

**Próximo paso:** Validar que backend rechaza envíos desde dominios del sistema para correos humanos.

---

## 🎓 CAPACITACIÓN

### **Para desarrolladores frontend:**
- Nunca permitir envío sin `currentAccount`
- Siempre validar payload antes de llamar backend
- Toast debe ser claro, nunca crashear

### **Para desarrolladores backend:**
- Validar que `accountId` pertenece al usuario autenticado
- Rechazar envíos desde dominios del sistema
- Retornar errores descriptivos (no genéricos)

### **Para DevOps/Infra:**
- SPF solo con proveedores reales
- DKIM activo para todos los dominios
- Monitoreo de bounce rate y reputation

---

**Última actualización:** 5 de enero de 2026  
**Responsable:** AL-EON Frontend Team  
**Estado:** ✅ Reglas implementadas y documentadas
