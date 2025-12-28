import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/ui/use-toast';

function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Error",
        description: "Por favor ingresa tu correo electrónico",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      await resetPassword(email);
      setSent(true);
      toast({
        title: "Correo enviado",
        description: "Revisa tu bandeja de entrada para restablecer tu contraseña",
      });
    } catch (error) {
      console.error('Error al enviar correo:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar el correo",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="w-full max-w-md p-8">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <img 
              src="/Logo AL-E sobre fondo negro.png" 
              alt="AL-EON" 
              className="w-80 h-auto"
            />
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Recuperar Contraseña
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            {sent 
              ? 'Revisa tu correo para continuar'
              : 'Te enviaremos un enlace para restablecer tu contraseña'
            }
          </p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label 
                htmlFor="email" 
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                disabled={loading}
                className="w-full px-4 py-3 rounded-xl outline-none transition-all"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-medium transition-all disabled:opacity-50"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: 'var(--color-text-primary)'
              }}
            >
              {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
            </button>
          </form>
        ) : (
          <div 
            className="p-4 rounded-xl text-center"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)'
            }}
          >
            <p style={{ color: 'var(--color-text-primary)' }}>
              📧 Correo enviado a <strong>{email}</strong>
            </p>
            <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Sigue las instrucciones en el correo para restablecer tu contraseña.
            </p>
          </div>
        )}

        {/* Volver a login */}
        <div className="mt-6 text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          <Link 
            to="/login" 
            className="font-medium hover:underline"
            style={{ color: 'var(--color-accent)' }}
          >
            ← Volver al inicio de sesión
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          Creado por <span style={{ color: 'var(--color-accent)' }}>Infinity Kode</span> • 2025
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
