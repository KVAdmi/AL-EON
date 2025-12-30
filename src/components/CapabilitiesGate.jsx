/**
 * CapabilitiesGate - Componente de Control de Features
 * 
 * AL-EON NO INTERPRETA. OBEDECE AL CORE.
 * 
 * Si una capability es false:
 * - NO renderiza el feature
 * - NO muestra botones
 * - NO sugiere acciones
 * 
 * USO:
 * <CapabilitiesGate capability="voice">
 *   <VoiceButton />
 * </CapabilitiesGate>
 * 
 * Si voice=false, el botón no se renderiza.
 */

import React from 'react';
import { useCapabilities } from '@/contexts/CapabilitiesContext';

/**
 * Gate que controla renderizado según capabilities
 */
export function CapabilitiesGate({ capability, children, fallback = null }) {
  const { hasCapability, isLoading, capabilities } = useCapabilities();

  // Mientras carga capabilities, no renderizar nada (o mostrar fallback)
  if (isLoading) {
    return fallback;
  }

  // Si no hay capabilities cargadas, no renderizar
  if (!capabilities) {
    return fallback;
  }

  // Si la capability no está habilitada, no renderizar
  if (!hasCapability(capability)) {
    console.log(`[GATE] ⛔ Feature bloqueado: "${capability}" = false`);
    return fallback;
  }

  // Capability habilitada, renderizar children
  return <>{children}</>;
}

/**
 * Hook simplificado para verificar una capability
 * 
 * USO:
 * const canUseVoice = useCapability('voice');
 * if (!canUseVoice) return null;
 */
export function useCapability(capability) {
  const { hasCapability } = useCapabilities();
  return hasCapability(capability);
}
