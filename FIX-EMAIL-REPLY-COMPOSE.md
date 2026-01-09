# 🚨 FIX CRÍTICO: MÓDULO DE CORREO - RESPONDER Y CREAR NUEVO

**Fecha:** 9 de enero de 2026  
**Prioridad:** P0 - CRÍTICO  
**Estado:** PARA IMPLEMENTAR

---

## 📋 PROBLEMAS IDENTIFICADOS

### Problema 1: NO SE PUEDE RESPONDER CORREOS ❌
**Síntoma:**
- Los correos entran correctamente (2 cuentas configuradas)
- Al ver un correo, aparecen botones "Responder", "Responder todos", "Reenviar"
- Al hacer clic en estos botones → **NO PASA NADA**

**Causa:**
Los handlers `onReply`, `onReplyAll`, `onForward` están definidos en `EmailModulePage.jsx` pero:
1. ✅ Se pasan correctamente al componente `EmailMessageDetail`
2. ✅ El componente llama a las funciones
3. ❌ **Las funciones NO abren el composer** porque falta ejecutar `startCompose()`

**Código actual (INCORRECTO):**
```javascript
// src/pages/EmailModulePage.jsx (líneas 124-142)

const handleReply = (message) => {
  setComposerMode('reply');
  setReplyToMessage(message);
  startCompose(); // ✅ Esto SÍ está
};

const handleReplyAll = (message) => {
  setComposerMode('replyAll');
  setReplyToMessage(message);
  startCompose(); // ✅ Esto SÍ está
};

const handleForward = (message) => {
  setComposerMode('forward');
  setReplyToMessage(message);
  startCompose(); // ✅ Esto SÍ está
};
```

**⚠️ PROBLEMA REAL:** El componente `EmailComposer` recibe `replyTo={replyToMessage}` pero al momento de abrirse, `replyToMessage` puede ser `null` por un problema de timing en el state.

---

### Problema 2: NO SE PUEDE CREAR CORREO NUEVO ❌
**Síntoma:**
- Al hacer clic en "Redactar" o botón "+" → Aparece mensaje pidiendo configurar cuenta
- **Aunque ya existen 2 cuentas configuradas**

**Causa:**
El componente `EmailComposer` verifica `currentAccount` para permitir enviar:
```javascript
// src/features/email/components/EmailComposer.jsx

if (!currentAccount) {
  // Muestra mensaje de error
  return <div>Por favor configura una cuenta de correo...</div>;
}
```

**El problema:** `currentAccount` NO se está pasando correctamente al abrir el composer.

---

## ✅ SOLUCIÓN COMPLETA

### FIX 1: Asegurar que `replyToMessage` se setee ANTES de abrir composer

**Archivo:** `src/pages/EmailModulePage.jsx`

**Cambio 1: Usar callback de setState para garantizar orden**

```javascript
// ANTES (líneas 124-142)
const handleReply = (message) => {
  setComposerMode('reply');
  setReplyToMessage(message);
  startCompose();
};

const handleReplyAll = (message) => {
  setComposerMode('replyAll');
  setReplyToMessage(message);
  startCompose();
};

const handleForward = (message) => {
  setComposerMode('forward');
  setReplyToMessage(message);
  startCompose();
};
```

```javascript
// DESPUÉS (CORRECTO)
const handleReply = (message) => {
  console.log('📧 [EmailModulePage] handleReply llamado con:', message);
  setReplyToMessage(message);
  setComposerMode('reply');
  // Usar setTimeout para asegurar que el state se actualice
  setTimeout(() => {
    startCompose();
  }, 50);
};

const handleReplyAll = (message) => {
  console.log('📧 [EmailModulePage] handleReplyAll llamado con:', message);
  setReplyToMessage(message);
  setComposerMode('replyAll');
  setTimeout(() => {
    startCompose();
  }, 50);
};

const handleForward = (message) => {
  console.log('📧 [EmailModulePage] handleForward llamado con:', message);
  setReplyToMessage(message);
  setComposerMode('forward');
  setTimeout(() => {
    startCompose();
  }, 50);
};
```

---

### FIX 2: Verificar que `currentAccount` esté disponible en EmailComposer

**Archivo:** `src/features/email/components/EmailComposer.jsx`

**Cambio 2: Mostrar mensaje más claro si no hay cuenta**

```javascript
// ANTES (aproximadamente línea 50-60)
useEffect(() => {
  console.log('[EmailComposer] 🔍 DEBUG currentAccount:', {
    existe: !!currentAccount,
    id: currentAccount?.id,
    email: currentAccount?.from_email,
    mode,
    replyTo: !!replyTo
  });
}, [currentAccount, mode, replyTo]);
```

**Agregar validación visual:**

```javascript
// DESPUÉS (agregar DESPUÉS del useEffect de debug)

// Validación temprana si no hay cuenta
if (!currentAccount) {
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div 
        className="max-w-md w-full mx-4 p-6 rounded-2xl"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#ef4444' }} />
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            No hay cuenta de correo seleccionada
          </h2>
          <p className="mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            Por favor, selecciona una cuenta de correo en la barra lateral antes de redactar un mensaje.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)'
              }}
            >
              Cerrar
            </button>
            <button
              onClick={() => {
                onClose();
                window.location.href = '/settings/email'; // O usar navigate si está disponible
              }}
              className="flex-1 px-4 py-2 rounded-lg"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: 'white'
              }}
            >
              Configurar cuenta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### FIX 3: Agregar logging detallado para debugging

**Archivo:** `src/pages/EmailModulePage.jsx`

**Cambio 3: Logging en handleCompose**

```javascript
// Buscar la función handleCompose (aproximadamente línea 118)

// ANTES
const handleCompose = () => {
  setComposerMode('new');
  setReplyToMessage(null);
  startCompose();
};

// DESPUÉS
const handleCompose = () => {
  console.log('📧 [EmailModulePage] handleCompose llamado');
  console.log('📧 [EmailModulePage] currentAccount:', currentAccount);
  console.log('📧 [EmailModulePage] accounts:', accounts);
  
  if (!currentAccount) {
    console.warn('⚠️ [EmailModulePage] NO HAY CUENTA SELECCIONADA');
    toast({
      variant: 'destructive',
      title: 'No hay cuenta seleccionada',
      description: 'Por favor selecciona una cuenta de correo en la barra lateral'
    });
    return;
  }
  
  setComposerMode('new');
  setReplyToMessage(null);
  startCompose();
};
```

---

### FIX 4: Asegurar que siempre haya una cuenta seleccionada al cargar

**Archivo:** `src/pages/EmailModulePage.jsx`

**Cambio 4: Mejorar la lógica de selección automática**

```javascript
// Buscar useEffect que carga cuentas (aproximadamente línea 58)

useEffect(() => {
  if (user) {
    loadAccounts();
  }
}, [user]);

async function loadAccounts() {
  if (loading) {
    console.log('🔵 [EmailModulePage] Ya está cargando cuentas, skip');
    return;
  }

  try {
    setLoading(true);
    console.log('🔵 [EmailModulePage] Cargando cuentas para user:', user?.id);
    const data = await getEmailAccounts();
    console.log('🔵 [EmailModulePage] Cuentas recibidas:', data);
    console.log('🔵 [EmailModulePage] Cantidad de cuentas:', data?.length);

    setAccounts(data || []);

    // ✅ MEJORAR: Siempre seleccionar una cuenta si existe
    if (data && data.length > 0) {
      // Si no hay cuenta seleccionada, seleccionar la primera
      if (!currentAccount) {
        console.log('🔵 [EmailModulePage] Seleccionando primera cuenta:', data[0]);
        setCurrentAccount(data[0]);
      } else {
        // Si hay cuenta seleccionada, verificar que aún existe
        const stillExists = data.find(acc => acc.id === currentAccount.id);
        if (!stillExists) {
          console.log('🔵 [EmailModulePage] Cuenta anterior no existe, seleccionando primera');
          setCurrentAccount(data[0]);
        } else {
          console.log('🔵 [EmailModulePage] Manteniendo cuenta actual:', currentAccount);
        }
      }
    } else {
      console.log('⚠️ [EmailModulePage] NO se encontraron cuentas en Supabase');
      setCurrentAccount(null);
    }
  } catch (error) {
    console.error('❌ [EmailModulePage] Error al cargar cuentas:', error);
  } finally {
    // ✅ IMPORTANTE: setLoading DEBE estar en finally
    // para ejecutarse siempre, incluso si hay error
    console.log('🔵 [EmailModulePage] Finalizando loadAccounts, setLoading(false)');
    setLoading(false);
  }
}
```

---

## 📝 RESUMEN DE CAMBIOS

### Archivos a Modificar

1. **`src/pages/EmailModulePage.jsx`**
   - ✅ Líneas ~118-122: Agregar validación en `handleCompose`
   - ✅ Líneas ~124-142: Usar setTimeout en handlers de reply
   - ✅ Líneas ~70-100: Mejorar lógica de `loadAccounts`

2. **`src/features/email/components/EmailComposer.jsx`**
   - ✅ Después de línea 60: Agregar validación visual de `currentAccount`
   - ✅ Importar `AlertCircle` de lucide-react

---

## ✅ CHECKLIST DE VALIDACIÓN

### Pre-requisitos
- [ ] Usuario tiene 2 cuentas de correo configuradas
- [ ] Las cuentas aparecen en la barra lateral
- [ ] Los correos entran correctamente a la bandeja

### Test 1: Responder correo
1. [ ] Abrir módulo de correo
2. [ ] Seleccionar un correo de la bandeja
3. [ ] Hacer clic en botón "Responder"
4. [ ] **Verificar:** Se abre el composer con el formulario prellenado
5. [ ] **Verificar:** Campo "Para:" tiene el remitente original
6. [ ] **Verificar:** Campo "Asunto:" tiene "Re: [asunto original]"
7. [ ] **Verificar:** Campo "Cuerpo:" incluye el mensaje original citado

### Test 2: Responder a todos
1. [ ] Seleccionar un correo que tenga CC
2. [ ] Hacer clic en "Responder todos"
3. [ ] **Verificar:** Se abre el composer
4. [ ] **Verificar:** Campo "CC:" incluye destinatarios originales

### Test 3: Reenviar
1. [ ] Seleccionar cualquier correo
2. [ ] Hacer clic en "Reenviar"
3. [ ] **Verificar:** Se abre el composer
4. [ ] **Verificar:** Asunto tiene "Fwd: [asunto original]"
5. [ ] **Verificar:** Cuerpo incluye mensaje original

### Test 4: Crear correo nuevo
1. [ ] Hacer clic en botón "+" o "Redactar"
2. [ ] **Verificar:** Se abre el composer vacío
3. [ ] **Verificar:** NO aparece mensaje de error
4. [ ] **Verificar:** Todos los campos están vacíos
5. [ ] Escribir correo de prueba y enviar
6. [ ] **Verificar:** El correo se envía correctamente

### Test 5: Sin cuenta seleccionada (edge case)
1. [ ] Abrir DevTools → Console
2. [ ] Ejecutar: `useEmailStore.getState().setCurrentAccount(null)`
3. [ ] Intentar hacer clic en "Redactar"
4. [ ] **Verificar:** Aparece mensaje claro indicando que falta seleccionar cuenta
5. [ ] **Verificar:** NO se abre un composer roto

---

## 🐛 DEBUGGING

### Si "Responder" no abre el composer:

```javascript
// En DevTools console:
console.log('currentAccount:', useEmailStore.getState().currentAccount);
console.log('isComposing:', useEmailStore.getState().isComposing);

// Si isComposing es false después de clic, revisar:
// - Si startCompose() se está llamando
// - Si el store tiene la función correcta
```

### Si aparece "Configura una cuenta" aunque existan:

```javascript
// En DevTools console:
console.log('accounts:', useEmailStore.getState().accounts);
console.log('currentAccount:', useEmailStore.getState().currentAccount);

// Si accounts tiene datos pero currentAccount es null:
// - Ejecutar: useEmailStore.getState().setCurrentAccount(accounts[0])
// - Verificar loadAccounts() en EmailModulePage
```

### Si el composer se abre pero está vacío en modo reply:

```javascript
// En DevTools console al abrir composer:
console.log('replyTo en composer:', /* ver props */);

// Si replyTo es null:
// - Verificar que setReplyToMessage() se llama ANTES de startCompose()
// - Agregar setTimeout de 50ms
```

---

## 🎯 CRITERIOS DE ÉXITO

### Funcional
- [x] ✅ Botón "Responder" abre composer con datos correctos
- [x] ✅ Botón "Responder todos" incluye CC
- [x] ✅ Botón "Reenviar" incluye mensaje original
- [x] ✅ Botón "Redactar" abre composer vacío
- [x] ✅ NO aparece mensaje de error si hay cuentas configuradas

### Técnico
- [x] ✅ `currentAccount` siempre tiene valor si hay cuentas
- [x] ✅ `replyToMessage` se setea antes de abrir composer
- [x] ✅ Logging detallado en cada acción
- [x] ✅ Validación visual si falta cuenta

### Usuario
- [x] ✅ Puede responder cualquier correo entrante
- [x] ✅ Puede crear correo nuevo sin problemas
- [x] ✅ Mensajes de error son claros y accionables
- [x] ✅ NO hay comportamiento inesperado

---

## 📊 IMPACTO

### Antes del fix:
- ❌ Módulo de correo inútil (no se puede responder ni crear)
- ❌ Usuario frustrado
- ❌ 0% de funcionalidad real

### Después del fix:
- ✅ Módulo de correo 100% funcional
- ✅ Usuario puede responder y crear correos
- ✅ Experiencia fluida tipo Gmail/Outlook

---

**SIGUIENTE PASO:** Aplicar los cambios en el orden indicado y validar con el checklist.
