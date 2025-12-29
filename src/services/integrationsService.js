/**
 * integrationsService.js
 * 
 * Servicio para gestionar integraciones por usuario (sin Google OAuth)
 * Lee las credenciales de la tabla user_integrations en Supabase
 */

import { supabase } from '../lib/supabase';

/**
 * Obtiene la configuración de una integración del usuario actual
 * @param {string} userId - ID del usuario
 * @param {string} integrationType - Tipo de integración
 * @returns {Promise<Object>} Configuración de la integración
 */
export async function getUserIntegration(userId, integrationType) {
  try {
    const { data, error } = await supabase
      .from('user_integrations')
      .select('config, is_active')
      .eq('user_id', userId)
      .eq('integration_type', integrationType)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error(`[IntegrationsService] Error obteniendo ${integrationType}:`, error);
      throw new Error(`No se pudo obtener la configuración de ${integrationType}`);
    }

    if (!data) {
      throw new Error(`Integración ${integrationType} no encontrada o inactiva.`);
    }

    return data.config;
  } catch (error) {
    console.error(`[IntegrationsService] Error:`, error);
    throw error;
  }
}

/**
 * Verifica si el usuario tiene integraciones configuradas
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object>} Estado de las integraciones
 */
export async function checkUserIntegrationsStatus(userId) {
  try {
    const { data, error } = await supabase
      .from('user_integrations')
      .select('integration_type, integration_name, is_active')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      console.error('[IntegrationsService] Error verificando estado:', error);
      return { available: false, integrations: [] };
    }

    return {
      available: data && data.length > 0,
      integrations: data || [],
    };
  } catch (error) {
    console.error('[IntegrationsService] Error en checkUserIntegrationsStatus:', error);
    return { available: false, integrations: [] };
  }
}
