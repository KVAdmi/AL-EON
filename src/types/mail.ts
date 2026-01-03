/**
 * Tipos para el módulo de correo
 */

export interface MailMessage {
  id: string;
  user_id: string;
  account_id: string;
  source: string;
  message_id: string;
  
  from_email: string;
  from_name?: string;
  to_email: string;
  to_name?: string;
  cc_emails?: string[];
  bcc_emails?: string[];
  reply_to?: string;
  
  subject: string;
  body_text?: string;
  body_html?: string;
  snippet?: string;
  
  received_at: string;
  sent_at?: string;
  
  s3_bucket?: string;
  s3_key?: string;
  s3_url?: string;
  
  raw_headers?: Record<string, any>;
  
  status: 'new' | 'read' | 'archived' | 'deleted' | 'spam';
  folder: string;
  
  is_starred?: boolean;
  is_important?: boolean;
  flag?: 'urgent' | 'important' | 'pending' | 'follow_up' | 'low_priority';
  labels?: string[];
  
  spam_score?: number;
  is_spam?: boolean;
  spam_reason?: string;
  
  has_attachments?: boolean;
  attachments_json?: any[];
  
  thread_id?: string;
  in_reply_to?: string;
  references_text?: string;
  
  size_bytes?: number;
  
  created_at: string;
  updated_at: string;
}

export interface MailDraft {
  id: string;
  user_id: string;
  message_id?: string;
  account_id?: string;
  
  to_emails: string[];
  cc_emails?: string[];
  bcc_emails?: string[];
  
  subject?: string;
  draft_text?: string;
  draft_html?: string;
  
  attachments_json?: any[];
  
  status: 'draft' | 'pending_send' | 'sent' | 'failed';
  scheduled_send_at?: string;
  
  created_at: string;
  updated_at: string;
}

export interface MailAccount {
  id: string;
  user_id: string;
  provider: 'ses_inbound' | 'ses' | 'gmail' | 'outlook' | 'imap';
  domain: string;
  
  aws_region?: string;
  aws_access_key_id?: string;
  aws_secret_access_key_enc?: string;
  s3_bucket?: string;
  
  config?: Record<string, any>;
  
  status: 'active' | 'paused' | 'error';
  last_sync_at?: string;
  error_message?: string;
  
  created_at: string;
  updated_at: string;
}

export interface MailFilter {
  id: string;
  user_id: string;
  account_id?: string;
  
  name: string;
  description?: string;
  
  conditions: Record<string, any>;
  actions: Record<string, any>;
  
  priority: number;
  is_active: boolean;
  
  created_at: string;
  updated_at: string;
}
