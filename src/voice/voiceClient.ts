/**
 * voiceClient.ts
 * Cliente puro de grabación de audio - SIN React hooks
 * 
 * Arquitectura:
 * - Estado manejado por máquina de estados
 * - No importa ChatPage ni hooks
 * - Solo exports de funciones puras
 */

type VoiceState = 'idle' | 'recording' | 'uploading' | 'waiting' | 'error';

interface VoiceClientConfig {
  onStateChange?: (state: VoiceState) => void;
  onAudioReady?: (blob: Blob) => void;
  onError?: (error: Error) => void;
}

class VoiceClient {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private state: VoiceState = 'idle';
  private config: VoiceClientConfig;

  constructor(config: VoiceClientConfig = {}) {
    this.config = config;
  }

  private setState(newState: VoiceState) {
    console.log(`[VoiceClient] Estado: ${this.state} → ${newState}`);
    this.state = newState;
    this.config.onStateChange?.(newState);
  }

  async startRecording(): Promise<void> {
    if (this.state === 'recording') {
      console.warn('[VoiceClient] Ya está grabando');
      return;
    }

    try {
      this.setState('recording');
      console.log('[VoiceClient] Solicitando micrófono...');

      // Solicitar permisos
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Validar stream
      if (!this.stream || this.stream.getAudioTracks().length === 0) {
        throw new Error('No se pudo acceder al micrófono');
      }

      const audioTrack = this.stream.getAudioTracks()[0];
      console.log('[VoiceClient] Track activo:', {
        label: audioTrack.label,
        enabled: audioTrack.enabled,
        readyState: audioTrack.readyState
      });

      // Determinar formato
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      // Crear MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
      this.audioChunks = [];

      // Handler: acumular chunks
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          console.log(`[VoiceClient] Chunk: ${event.data.size} bytes`);
          this.audioChunks.push(event.data);
        }
      };

      // Handler: al detener
      this.mediaRecorder.onstop = () => {
        console.log('[VoiceClient] Grabación detenida');
        this.processRecording(mimeType);
      };

      // Iniciar grabación
      this.mediaRecorder.start();
      console.log('[VoiceClient] ✅ Grabación iniciada');

    } catch (error) {
      console.error('[VoiceClient] ❌ Error:', error);
      this.setState('error');
      
      let errorMsg = 'Error al acceder al micrófono';
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMsg = 'Debes permitir el acceso al micrófono en tu navegador';
        } else if (error.name === 'NotFoundError') {
          errorMsg = 'No se encontró ningún micrófono conectado';
        }
      }
      
      const finalError = new Error(errorMsg);
      this.config.onError?.(finalError);
      this.cleanup();
    }
  }

  stopRecording(): void {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      console.warn('[VoiceClient] No hay grabación activa');
      return;
    }

    console.log('[VoiceClient] Deteniendo grabación...');
    this.mediaRecorder.stop();
  }

  private processRecording(mimeType: string): void {
    // Detener stream
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    // Validar chunks
    const validChunks = this.audioChunks.filter(chunk => chunk && chunk.size > 0);
    const audioBlob = new Blob(validChunks, { type: mimeType });
    
    console.log(`[VoiceClient] Blob creado: ${audioBlob.size} bytes (${validChunks.length} chunks)`);

    // Validar tamaño mínimo
    if (audioBlob.size < 100) {
      const error = new Error(`Solo se capturaron ${audioBlob.size} bytes. Mantén presionado al menos 3 segundos mientras hablas.`);
      console.error('[VoiceClient] ❌ Audio muy corto');
      this.setState('error');
      this.config.onError?.(error);
      this.cleanup();
      return;
    }

    // Audio válido
    console.log('[VoiceClient] ✅ Audio válido, enviando...');
    this.setState('uploading');
    this.config.onAudioReady?.(audioBlob);
    
    // Resetear para próxima grabación
    this.audioChunks = [];
  }

  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.setState('idle');
  }

  getState(): VoiceState {
    return this.state;
  }

  reset(): void {
    this.stopRecording();
    this.cleanup();
  }

  /**
   * Enviar audio al backend (CORE) para STT
   * Retorna el JSON decodificado del servidor o lanza error
   */
  async sendAudio(blob: Blob, accessToken?: string) {
    const CORE_BASE_URL = (import.meta as any).env?.VITE_CORE_BASE_URL || 'https://api.al-eon.com';
    
    try {
      const requestId = `voice-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const formData = new FormData();
      formData.append('audio', blob, 'voice.webm');
      formData.append('language', 'es');

      const headers: Record<string, string> = {};
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

      console.log(`[${requestId}] POST /api/voice/stt`);

      const response = await fetch(`${CORE_BASE_URL}/api/voice/stt`, {
        method: 'POST',
        headers,
        body: formData,
      });

      console.log(`[${requestId}] Status: ${response.status}`);

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        const msg = errBody?.error || `Error ${response.status}`;
        const err = new Error(msg);
        console.error(`[${requestId}] Error:`, err);
        throw err;
      }

      const data = await response.json();
      return data;
    } catch (err) {
      throw err;
    }
  }
}

// Singleton para uso global
let voiceClientInstance: VoiceClient | null = null;

export function createVoiceClient(config: VoiceClientConfig): VoiceClient {
  if (voiceClientInstance) {
    voiceClientInstance.reset();
  }
  voiceClientInstance = new VoiceClient(config);
  return voiceClientInstance;
}

export function getVoiceClient(): VoiceClient | null {
  return voiceClientInstance;
}

// Helpers de conveniencia (API plana requerida por el equipo)
export async function startRecording(): Promise<void> {
  if (!voiceClientInstance) createVoiceClient({});
  return voiceClientInstance!.startRecording();
}

export function stopRecording(): void {
  if (!voiceClientInstance) return;
  return voiceClientInstance.stopRecording();
}

export async function sendAudio(blob: Blob, accessToken?: string) {
  if (!voiceClientInstance) createVoiceClient({});
  return voiceClientInstance!.sendAudio(blob, accessToken);
}

export type { VoiceState, VoiceClientConfig };
