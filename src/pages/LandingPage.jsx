import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Lock } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden relative flex flex-col">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full animate-float"
            style={{
              backgroundColor: '#2FA4C7',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`,
              opacity: Math.random() * 0.3 + 0.1,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col">
        {/* Header */}
        <header className="w-full px-6 sm:px-8 py-6 flex justify-end items-center">
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2.5 rounded-full font-medium transition-all duration-300 hover:scale-105"
            style={{
              backgroundColor: 'rgba(47, 164, 199, 0.1)',
              border: '1px solid rgba(47, 164, 199, 0.3)',
              color: '#2FA4C7'
            }}
          >
            Iniciar Sesión
          </button>
        </header>

        {/* Hero Section */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-20">
          <div
            className={`max-w-5xl mx-auto text-center transition-all duration-1000 transform ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            {/* Logo grande */}
            <div className="mb-12 flex justify-center">
              <div className="relative">
                <div 
                  className="absolute inset-0 rounded-full blur-3xl opacity-40 animate-pulse-slow"
                  style={{ backgroundColor: '#2FA4C7' }}
                />
                <img 
                  src="/Logo AL-E sobre fondo negro.png" 
                  alt="AL-EON" 
                  className="relative h-64 sm:h-80 lg:h-96 object-contain animate-float"
                />
              </div>
            </div>

            {/* Título principal */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-8 leading-tight">
              <span 
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #2FA4C7 0%, #4FC3E0 100%)',
                }}
              >
                Inteligencia Artificial
              </span>
              <br />
              <span className="text-white">
                exclusiva de Infinity Kode
              </span>
            </h1>

            {/* Subtítulo */}
            <p className="text-lg sm:text-xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
              Plataforma avanzada de IA diseñada para potenciar tu productividad.
              <br />
              <span style={{ color: '#2FA4C7' }} className="font-semibold">Análisis, creación y automatización al más alto nivel.</span>
            </p>

            {/* CTA Button */}
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={() => navigate('/login')}
                className="group px-10 py-4 rounded-full font-semibold text-lg flex items-center gap-3 transition-all duration-300 hover:scale-105"
                style={{
                  backgroundColor: '#2FA4C7',
                  color: 'white',
                  boxShadow: '0 0 30px rgba(47, 164, 199, 0.3)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3DB5D6'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2FA4C7'}
              >
                Acceder a la Plataforma
                <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
              </button>
              
              {/* Links legales visibles */}
              <div className="flex gap-4 text-sm text-gray-500">
                <a href="/privacy" className="hover:underline" style={{ color: '#2FA4C7' }}>
                  Política de Privacidad
                </a>
                <span className="text-gray-600">•</span>
                <a href="/terms" className="hover:underline" style={{ color: '#2FA4C7' }}>
                  Términos de Servicio
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer 
          className="w-full px-6 sm:px-8 py-6 backdrop-blur-sm"
          style={{ borderTop: '1px solid rgba(47, 164, 199, 0.2)' }}
        >
          <div className="max-w-6xl mx-auto text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
              <Lock size={16} />
              <span>© 2025 AL-EON by Infinity Kode. Todos los derechos reservados.</span>
            </div>
          </div>
        </footer>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
          }
          25% {
            transform: translateY(-20px) translateX(10px);
          }
          50% {
            transform: translateY(-40px) translateX(-10px);
          }
          75% {
            transform: translateY(-20px) translateX(10px);
          }
        }

        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
          }
          50% {
            box-shadow: 0 0 40px rgba(59, 130, 246, 0.8);
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.05);
          }
        }

        @keyframes gradient {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        .animate-float {
          animation: float ease-in-out infinite;
        }

        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }

        .bg-gradient-radial {
          background: radial-gradient(circle at center, var(--tw-gradient-stops));
        }
      `}</style>
    </div>
  );
}
