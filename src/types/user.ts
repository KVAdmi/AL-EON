/**
 * Tipos TypeScript para user_profiles y settings
 * 
 * Alineación con backend - commit cf155ed (16 enero 2026)
 * Backend usa estos campos de user_profiles para personalización
 */

export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  role: 'USER' | 'ADMIN';
  
  // 👤 PERSONALIZACIÓN (usado por backend para system prompt)
  preferred_name?: string;      // Nickname del usuario ("Pedro", "Pedrito")
  assistant_name?: string;      // Nombre personalizado del asistente (default: "AL-E")
  tone_pref?: string;           // Tono de conversación (default: "barrio")
  
  // 🎨 UI/UX
  display_name?: string;        // Nombre mostrado en UI
  avatar_url?: string;          // Avatar del usuario
  assistant_avatar_url?: string; // Avatar del asistente
  user_avatar_url?: string;     // Avatar del usuario (alternativo)
  
  // ⚙️ PREFERENCIAS
  preferred_language: string;   // Idioma preferido (default: 'es')
  timezone: string;             // Zona horaria (default: 'America/Mexico_City')
  theme: 'light' | 'dark' | 'system'; // Tema visual
  
  // 📅 METADATA
  created_at: string;
  updated_at: string;
}

/**
 * Settings técnicos (AI, TTS, etc)
 * Tabla: user_settings
 */
export interface UserSettings {
  id: string;
  user_id: string;
  
  // 🤖 AI Settings
  ai_model?: string;            // Modelo de AI (gpt-4, etc)
  ai_temperature?: number;      // Temperatura (0-1)
  context_persistent?: boolean; // Contexto persistente
  
  // 🎤 TTS Settings
  voice_enabled?: boolean;      // Habilitar voz
  tts_enabled?: boolean;        // TTS habilitado
  tts_gender?: string;          // Género de voz
  tts_voice_name?: string;      // Nombre de voz
  tts_lang?: string;            // Idioma TTS
  
  // 📅 METADATA
  created_at: string;
  updated_at: string;
}

/**
 * Update payloads (campos opcionales)
 */
export interface UserProfileUpdate {
  preferred_name?: string;
  assistant_name?: string;
  tone_pref?: string;
  display_name?: string;
  avatar_url?: string;
  assistant_avatar_url?: string;
  user_avatar_url?: string;
  preferred_language?: string;
  timezone?: string;
  theme?: 'light' | 'dark' | 'system';
}

export interface UserSettingsUpdate {
  ai_model?: string;
  ai_temperature?: number;
  context_persistent?: boolean;
  voice_enabled?: boolean;
  tts_enabled?: boolean;
  tts_gender?: string;
  tts_voice_name?: string;
  tts_lang?: string;
}
