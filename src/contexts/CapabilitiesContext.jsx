/**
 * CapabilitiesContext - Store Global de Capacidades del CORE
 * 
 * AL-EON NO PIENSA. OBEDECE.
 * 
 * RESPONSABILIDADES:
 * - Cargar runtime-capabilities desde /api/runtime-capabilities al iniciar sesión
 * - Guardar en store global
 * - Proveer hook useCapabilities() para verificar features
 * 
 * USO:
 * const { capabilities, hasCapability, isLoading } = useCapabilities();
 * if (!hasCapability('collaboration')) return null; // No renderizar
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

const CapabilitiesContext = createContext(null);

/**
 * Provider de Capacidades
 * Se inicializa después del login
 */
export function CapabilitiesProvider({ children }) {
  const [capabilities, setCapabilities] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Cargar capacidades desde AL-E CORE
   * @param {string} accessToken - JWT token de Supabase
   */
  const loadCapabilities = async (accessToken) => {
    if (!accessToken) {
      console.warn('[CAPABILITIES] No accessToken, skipping load');
      setCapabilities(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const BASE_URL = import.meta.env.VITE_ALE_CORE_BASE;
      if (!BASE_URL) {
        throw new Error('VITE_ALE_CORE_BASE no configurado');
      }

      const url = `${BASE_URL}/api/runtime-capabilities`;
      console.log('[CAPABILITIES] 📡 Cargando desde:', url);

      // ⚡ TIMEOUT DE 3 SEGUNDOS - No bloquear UI
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[CAPABILITIES] ✅ Cargadas:', data);
      
      setCapabilities(data);
    } catch (err) {
      console.error('[CAPABILITIES] ❌ Error cargando:', err);
      setError(err.message);
      
      // ⚠️ Si hay error, asumir capabilities básicas habilitadas
      setCapabilities({
        chat: true,
        voice: true,  // ✅ VOZ HABILITADA POR DEFAULT
        integrations: false,
        collaboration: false,
        actions: false,
        memory: true,  // ✅ MEMORIA HABILITADA
        'mail.send': false,
        'calendar.create': false,
        'calendar.list': false
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Resetear capabilities (al hacer logout)
   */
  const resetCapabilities = () => {
    console.log('[CAPABILITIES] 🔄 Reset');
    setCapabilities(null);
    setError(null);
  };

  /**
   * Verificar si una capability está habilitada
   * @param {string} capability - Nombre de la capability
   * @returns {boolean}
   */
  const hasCapability = (capability) => {
    if (!capabilities) return false;
    return capabilities[capability] === true;
  };

  const value = {
    capabilities,
    isLoading,
    error,
    loadCapabilities,
    resetCapabilities,
    hasCapability
  };

  return (
    <CapabilitiesContext.Provider value={value}>
      {children}
    </CapabilitiesContext.Provider>
  );
}

/**
 * Hook para acceder a las capacidades
 */
export function useCapabilities() {
  const context = useContext(CapabilitiesContext);
  if (!context) {
    throw new Error('useCapabilities debe usarse dentro de CapabilitiesProvider');
  }
  return context;
}
