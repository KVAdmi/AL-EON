import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/ui/use-toast';

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  // Cargar credenciales guardadas al montar
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    const savedPassword = localStorage.getItem('rememberedPassword');
    
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      await login(email, password);
      
      // Guardar o limpiar credenciales según "Recordarme"
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
        localStorage.setItem('rememberedPassword', password);
      } else {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedPassword');
      }
      
      toast({
        title: "¡Bienvenido!",
        description: "Sesión iniciada correctamente",
      });
      
      // ✅ CRÍTICO: Usar replace:true para evitar que el back vuelva al login
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error en login:', error);
      toast({
        title: "Error al iniciar sesión",
        description: error.message || "Verifica tus credenciales",
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
            Iniciar Sesión
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Accede a tu cuenta de AL-EON
          </p>
        </div>

        {/* Formulario */}
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

          <div>
            <label 
              htmlFor="password" 
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="w-full px-4 py-3 pr-12 rounded-xl outline-none transition-all"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:opacity-70 transition-opacity"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded"
                style={{ accentColor: 'var(--color-accent)' }}
              />
              <span style={{ color: 'var(--color-text-secondary)' }}>
                Recordar mis datos
              </span>
            </label>
            <Link 
              to="/forgot-password"
              className="hover:underline"
              style={{ color: 'var(--color-accent)' }}
            >
              ¿Olvidaste tu contraseña?
            </Link>
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
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>

        {/* Registro */}
        <div className="mt-6 text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          ¿No tienes cuenta?{' '}
          <Link 
            to="/signup" 
            className="font-medium hover:underline"
            style={{ color: 'var(--color-accent)' }}
          >
            Regístrate aquí
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

export default LoginPage;
