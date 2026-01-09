# FIX FINAL - EmailPageOutlook.jsx

## PROBLEMA IDENTIFICADO

Estaba editando `EmailModulePage.jsx` pero la app usa `EmailPageOutlook.jsx` en la ruta `/correo`.

## ARCHIVO CORRECTO

- **Ruta:** `/correo`
- **Componente:** `EmailPageOutlook.jsx` (1163 líneas)
- **Estado:** ESTE es el que se ve en el browser

## PROBLEMAS A ARREGLAR

1. ❌ NO hay botones Reply/ReplyAll/Forward
2. ❌ Las carpetas muestran los mismos correos
3. ❌ Composer muestra "Conecta tu correo" aunque hay cuentas

## SOLUCIÓN

Arreglar EmailPageOutlook.jsx:
- Agregar handlers handleReply, handleReplyAll, handleForward
- Pasar callbacks a EmailComposer
- Verificar filtro de carpetas en getInbox()
