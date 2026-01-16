/**
 * Tipos TypeScript para mensajes de chat con AL-E
 * Actualizado: 16 enero 2026
 * 
 * Nueva estructura de respuesta del backend incluye:
 * - metadata (request_id, timestamp, model, etc)
 * - debug (tools_detail para debugging)
 */

export interface AIMessageMetadata {
  request_id: string
  timestamp: string
  model: string
  tools_executed: number
  source: string
}

export interface ToolDetail {
  name: string
  status: 'executed' | 'failed'
  timestamp: string
}

export interface AIMessageDebug {
  tools_detail: ToolDetail[]
}

export interface AIMessage {
  answer: string
  toolsUsed: string[]
  executionTime: number
  metadata?: AIMessageMetadata
  debug?: AIMessageDebug
}

export interface ChatError {
  error: string
  message: string
  details?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  isError?: boolean
  attachments?: any[]
  // Nuevos campos de metadata
  toolsUsed?: string[]
  executionTime?: number
  metadata?: AIMessageMetadata
  debug?: AIMessageDebug
}
