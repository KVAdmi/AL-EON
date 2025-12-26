import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="max-w-4xl mx-auto p-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 mb-6 transition-all hover:opacity-70"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <ArrowLeft size={20} />
            Volver
          </button>
          
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Política de Privacidad
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Última actualización: 26 de diciembre de 2025
          </p>
        </div>

        {/* Content */}
        <div 
          className="prose prose-invert max-w-none space-y-8"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {/* Introducción */}
          <section>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              1. Introducción
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', lineHeight: '1.8' }}>
              En <strong>Infinity Kode</strong>, desarrolladores de <strong>AL-EON</strong>, nos comprometemos a proteger tu privacidad. 
              Esta política describe cómo recopilamos, usamos y protegemos tu información personal cuando utilizas nuestro asistente 
              de inteligencia artificial.
            </p>
          </section>

          {/* Información que recopilamos */}
          <section>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              2. Información que Recopilamos
            </h2>
            <div style={{ color: 'var(--color-text-secondary)', lineHeight: '1.8' }}>
              <h3 className="text-xl font-medium mb-3 mt-4" style={{ color: 'var(--color-text-primary)' }}>
                2.1 Información de Cuenta
              </h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Dirección de correo electrónico</li>
                <li>Nombre de usuario o nombre para mostrar</li>
                <li>Preferencias de idioma y zona horaria</li>
              </ul>

              <h3 className="text-xl font-medium mb-3 mt-4" style={{ color: 'var(--color-text-primary)' }}>
                2.2 Datos de Conversación
              </h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Mensajes intercambiados con AL-E</li>
                <li>Archivos adjuntos que compartes</li>
                <li>Configuraciones y preferencias del asistente</li>
              </ul>

              <h3 className="text-xl font-medium mb-3 mt-4" style={{ color: 'var(--color-text-primary)' }}>
                2.3 Integraciones (Opcional)
              </h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Tokens de acceso OAuth para Gmail y Google Calendar (si los autorizas)</li>
                <li>Configuraciones de integraciones de terceros</li>
              </ul>
            </div>
          </section>

          {/* Cómo usamos tu información */}
          <section>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              3. Cómo Usamos tu Información
            </h2>
            <div style={{ color: 'var(--color-text-secondary)', lineHeight: '1.8' }}>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Proporcionar el servicio:</strong> Procesar tus consultas y generar respuestas inteligentes</li>
                <li><strong>Mejorar la experiencia:</strong> Personalizar AL-E según tus preferencias</li>
                <li><strong>Integraciones autorizadas:</strong> Enviar emails, crear eventos de calendario (solo si lo autorizas)</li>
                <li><strong>Seguridad:</strong> Proteger tu cuenta y prevenir fraudes</li>
                <li><strong>Análisis:</strong> Mejorar el servicio mediante estadísticas agregadas y anónimas</li>
              </ul>
            </div>
          </section>

          {/* Compartir información */}
          <section>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              4. Compartir tu Información
            </h2>
            <div style={{ color: 'var(--color-text-secondary)', lineHeight: '1.8' }}>
              <p className="mb-3">
                <strong>NO vendemos ni compartimos</strong> tu información personal con terceros para fines de marketing.
              </p>
              <p className="mb-3">Compartimos datos solo en estos casos:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Proveedores de servicios:</strong> OpenAI (para procesamiento de IA), Supabase (almacenamiento seguro)</li>
                <li><strong>Servicios autorizados:</strong> Google (Gmail/Calendar) solo si conectas estas integraciones</li>
                <li><strong>Requisitos legales:</strong> Cuando la ley lo requiera</li>
              </ul>
            </div>
          </section>

          {/* Seguridad */}
          <section>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              5. Seguridad de tus Datos
            </h2>
            <div style={{ color: 'var(--color-text-secondary)', lineHeight: '1.8' }}>
              <p className="mb-3">Implementamos medidas de seguridad robustas:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Cifrado de datos en tránsito y en reposo</li>
                <li>Autenticación segura mediante Supabase Auth</li>
                <li>Aislamiento de datos entre usuarios (RLS policies)</li>
                <li>Tokens OAuth almacenados de forma segura</li>
                <li>Auditorías de seguridad regulares</li>
              </ul>
            </div>
          </section>

          {/* Tus derechos */}
          <section>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              6. Tus Derechos
            </h2>
            <div style={{ color: 'var(--color-text-secondary)', lineHeight: '1.8' }}>
              <p className="mb-3">Tienes derecho a:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Acceder:</strong> Ver toda tu información almacenada</li>
                <li><strong>Corregir:</strong> Actualizar datos incorrectos</li>
                <li><strong>Eliminar:</strong> Borrar tu cuenta y todos tus datos</li>
                <li><strong>Exportar:</strong> Descargar tus conversaciones</li>
                <li><strong>Revocar:</strong> Desconectar integraciones en cualquier momento</li>
              </ul>
            </div>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              7. Cookies y Almacenamiento Local
            </h2>
            <div style={{ color: 'var(--color-text-secondary)', lineHeight: '1.8' }}>
              <p>
                Usamos cookies y localStorage para mantener tu sesión activa y recordar tus preferencias (tema, idioma).
                No usamos cookies de terceros para publicidad.
              </p>
            </div>
          </section>

          {/* Retención de datos */}
          <section>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              8. Retención de Datos
            </h2>
            <div style={{ color: 'var(--color-text-secondary)', lineHeight: '1.8' }}>
              <ul className="list-disc pl-6 space-y-2">
                <li>Conversaciones: Se mantienen mientras uses el servicio o las elimines manualmente</li>
                <li>Cuenta inactiva: Si no usas AL-EON por más de 2 años, podemos eliminar tu cuenta previa notificación</li>
                <li>Datos de integraciones: Se eliminan inmediatamente al desconectar la integración</li>
              </ul>
            </div>
          </section>

          {/* Cambios */}
          <section>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              9. Cambios a esta Política
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', lineHeight: '1.8' }}>
              Podemos actualizar esta política ocasionalmente. Te notificaremos cambios significativos por email o 
              mediante un aviso en la aplicación.
            </p>
          </section>

          {/* Contacto */}
          <section>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              10. Contacto
            </h2>
            <div style={{ color: 'var(--color-text-secondary)', lineHeight: '1.8' }}>
              <p className="mb-3">
                Para preguntas sobre esta política o tus datos, contáctanos:
              </p>
              <div className="pl-6">
                <p><strong>Infinity Kode</strong></p>
                <p>Email: <a href="mailto:privacy@infinitykode.com" className="underline" style={{ color: 'var(--color-accent)' }}>privacy@infinitykode.com</a></p>
                <p>Web: <a href="https://infinitykode.com" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--color-accent)' }}>infinitykode.com</a></p>
              </div>
            </div>
          </section>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <p className="text-center text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
              © 2025 Infinity Kode. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
