/**
 * ErrorBoundary - Componente para capturar errores de renderizado
 * 
 * PROBLEMA QUE RESUELVE:
 * - Pantallas negras cuando un componente lanza error
 * - Settings de voz que se rompen sin mostrar error
 * - Crashes silenciosos que dejan la app inutilizable
 * 
 * USO:
 * <ErrorBoundary>
 *   <MiComponente />
 * </ErrorBoundary>
 */

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('❌ [ErrorBoundary] Error capturado:', error);
    console.error('❌ [ErrorBoundary] Stack:', errorInfo.componentStack);
    
    this.setState({
      error,
      errorInfo
    });

    // 🔥 ENVIAR A MONITOREO (opcional)
    if (typeof window !== 'undefined' && window.parent) {
      window.parent.postMessage({
        type: 'app-error',
        error: {
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack
        }
      }, '*');
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    
    // Recargar la página si es necesario
    if (this.props.resetOnError) {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div 
          className="min-h-screen flex items-center justify-center p-4"
          style={{ backgroundColor: 'var(--color-bg-primary)' }}
        >
          <div 
            className="max-w-2xl w-full p-8 rounded-2xl border"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-error, #ef4444)'
            }}
          >
            {/* Icono y título */}
            <div className="flex items-start gap-4 mb-6">
              <div 
                className="p-3 rounded-full"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: 'var(--color-error, #ef4444)'
                }}
              >
                <AlertTriangle size={32} />
              </div>
              <div className="flex-1">
                <h2 
                  className="text-2xl font-bold mb-2"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Algo salió mal
                </h2>
                <p style={{ color: 'var(--color-text-secondary)' }}>
                  La aplicación encontró un error inesperado y no pudo continuar.
                </p>
              </div>
            </div>

            {/* Mensaje de error */}
            <div 
              className="p-4 rounded-lg mb-6"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                borderLeft: '4px solid var(--color-error, #ef4444)'
              }}
            >
              <p 
                className="font-mono text-sm"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {this.state.error?.message || 'Error desconocido'}
              </p>
            </div>

            {/* Detalles técnicos (colapsable) */}
            {process.env.NODE_ENV === 'development' && (
              <details className="mb-6">
                <summary 
                  className="cursor-pointer text-sm font-medium mb-2"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Detalles técnicos (desarrollo)
                </summary>
                <pre 
                  className="text-xs p-4 rounded overflow-auto max-h-48"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    color: 'var(--color-text-tertiary)'
                  }}
                >
                  {this.state.error?.stack}
                  {'\n\n'}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            {/* Acciones */}
            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: '#FFFFFF'
                }}
              >
                <RefreshCw size={18} />
                <span>Reintentar</span>
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 px-4 py-3 rounded-lg font-medium transition-all"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)'
                }}
              >
                Ir al inicio
              </button>
            </div>

            {/* Info adicional */}
            <div 
              className="mt-6 p-4 rounded-lg text-sm"
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                color: 'var(--color-text-secondary)'
              }}
            >
              <p className="mb-2">💡 <strong>¿Qué puedes hacer?</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Recargar la página (F5 o Cmd+R)</li>
                <li>Cerrar sesión y volver a entrar</li>
                <li>Limpiar caché del navegador</li>
                <li>Contactar a soporte si el problema persiste</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
