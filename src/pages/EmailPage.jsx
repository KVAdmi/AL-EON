import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Ban } from 'lucide-react';
import { useCapability } from '@/components/CapabilitiesGate';

export default function EmailPage() {
  const navigate = useNavigate();
  
  // 🔒 VERIFICAR SI ENVÍO DE CORREO ESTÁ HABILITADO
  const canSendEmail = useCapability('mail.send');

  // 🚫 SI mail.send=false, BLOQUEAR COMPLETAMENTE
  if (!canSendEmail) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        <div 
          className="max-w-md w-full p-8 rounded-2xl text-center space-y-6"
          style={{ 
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)'
          }}
        >
          <Ban size={64} className="mx-auto" style={{ color: 'var(--color-text-tertiary)' }} />
          
          <h2 
            className="text-2xl font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            El envío de correos aún no está configurado.
          </h2>
          
          <button
            onClick={() => navigate('/chat')}
            className="w-full px-4 py-3 rounded-lg font-medium transition-all hover:opacity-80"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: '#FFFFFF'
            }}
          >
            Volver al Chat
          </button>
        </div>
      </div>
    );
  }

  // Si mail.send=true, mostrar mensaje de desarrollo
  return (
    <div 
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      <div style={{ color: 'var(--color-text-secondary)' }}>
        Funcionalidad de correo en desarrollo...
      </div>
    </div>
  );
}
