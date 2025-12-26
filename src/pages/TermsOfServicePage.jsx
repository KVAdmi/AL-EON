import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfServicePage() {
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
            Términos de Servicio
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
          {/* Aceptación */}
          <section>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              1. Aceptación de los Términos
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', lineHeight: '1.8' }}>
              Al acceder y usar <strong>AL-EON</strong> ("el Servicio"), desarrollado por <strong>Infinity Kode</strong> ("nosotros", "nuestro"), 
              aceptas estos Términos de Servicio. Si no estás de acuerdo, no uses el Servicio.
            </p>
          </section>

          {/* Descripción del servicio */}
          <section>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              2. Descripción del Servicio
            </h2>
            <div style={{ color: 'var(--color-text-secondary)', lineHeight: '1.8' }}>
              <p className="mb-3">
                AL-EON es un asistente de inteligencia artificial que proporciona:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Respuestas inteligentes a consultas</li>
                <li>Análisis y procesamiento de documentos</li>
                <li>Integraciones opcionales con Gmail, Google Calendar y otras herramientas</li>
                <li>Gestión de proyectos y conversaciones</li>
              </ul>
            </div>
          </section>

          {/* Elegibilidad */}
          <section>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              3. Elegibilidad
            </h2>
            <div style={{ color: 'var(--color-text-secondary)', lineHeight: '1.8' }}>
              <p>Debes tener al menos 18 años para usar AL-EON. Al crear una cuenta, confirmas que:</p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>Tienes capacidad legal para aceptar estos términos</li>
                <li>Proporcionarás información veraz y actualizada</li>
                <li>Eres responsable de mantener la confidencialidad de tu cuenta</li>
              </ul>
            </div>
          </section>

          {/* Uso aceptable */}
          <section>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              4. Uso Aceptable
            </h2>
            <div style={{ color: 'var(--color-text-secondary)', lineHeight: '1.8' }}>
              <h3 className="text-xl font-medium mb-3 mt-4" style={{ color: 'var(--color-text-primary)' }}>
                4.1 Usos Permitidos
              </h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Consultas legítimas y éticas</li>
                <li>Procesamiento de tus propios datos y documentos</li>
                <li>Automatización de tareas personales o empresariales</li>
              </ul>

              <h3 className="text-xl font-medium mb-3 mt-4" style={{ color: 'var(--color-text-primary)' }}>
                4.2 Usos Prohibidos
              </h3>
              <p className="mb-3">No puedes usar AL-EON para:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Actividades ilegales o fraudulentas</li>
                <li>Generar contenido dañino, ofensivo o discriminatorio</li>
                <li>Intentar eludir limitaciones o medidas de seguridad</li>
                <li>Enviar spam o phishing</li>
                <li>Violar derechos de propiedad intelectual de terceros</li>
                <li>Hacerse pasar por otra persona o entidad</li>
              </ul>
            </div>
          </section>

          {/* Cuenta de usuario */}
          <section>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              5. Tu Cuenta
            </h2>
            <div style={{ color: 'var(--color-text-secondary)', lineHeight: '1.8' }}>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Seguridad:</strong> Eres responsable de proteger tu contraseña</li>
                <li><strong>Notificación:</strong> Debes informarnos inmediatamente de accesos no autorizados</li>
                <li><strong>Responsabilidad:</strong> Eres responsable de toda actividad en tu cuenta</li>
                <li><strong>Suspensión:</strong> Podemos suspender o terminar tu cuenta si violas estos términos</li>
              </ul>
            </div>
          </section>

          {/* Integraciones */}
          <section>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              6. Integraciones de Terceros
            </h2>
            <div style={{ color: 'var(--color-text-secondary)', lineHeight: '1.8' }}>
              <p className="mb-3">
                Si conectas servicios de terceros (Gmail, Google Calendar, etc.):
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Otorgas a AL-EON los permisos necesarios para operar en tu nombre</li>
                <li>Puedes revocar el acceso en cualquier momento</li>
                <li>Los términos de esos servicios también aplican</li>
                <li>No somos responsables de cambios o interrupciones en servicios de terceros</li>
              </ul>
            </div>
          </section>

          {/* Propiedad intelectual */}
          <section>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              7. Propiedad Intelectual
            </h2>
            <div style={{ color: 'var(--color-text-secondary)', lineHeight: '1.8' }}>
              <h3 className="text-xl font-medium mb-3 mt-4" style={{ color: 'var(--color-text-primary)' }}>
                7.1 Nuestro Contenido
              </h3>
              <p className="mb-3">
                AL-EON, su código, diseño, marca y contenido son propiedad de Infinity Kode y están protegidos por leyes de propiedad intelectual.
              </p>

              <h3 className="text-xl font-medium mb-3 mt-4" style={{ color: 'var(--color-text-primary)' }}>
                7.2 Tu Contenido
              </h3>
              <p className="mb-3">
                Mantienes todos los derechos sobre el contenido que proporcionas (mensajes, archivos). Al usar el Servicio, nos otorgas 
                una licencia limitada para procesar tu contenido únicamente para proporcionarte el servicio.
              </p>

              <h3 className="text-xl font-medium mb-3 mt-4" style={{ color: 'var(--color-text-primary)' }}>
                7.3 Contenido Generado por IA
              </h3>
              <p>
                Las respuestas generadas por AL-E son tuyas para usar, pero no garantizamos su exactitud absoluta. 
                Verifica siempre información crítica.
              </p>
            </div>
          </section>

          {/* Limitación de responsabilidad */}
          <section>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              8. Limitación de Responsabilidad
            </h2>
            <div style={{ color: 'var(--color-text-secondary)', lineHeight: '1.8' }}>
              <p className="mb-3">
                AL-EON se proporciona "tal cual". En la máxima medida permitida por la ley:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>No garantizamos disponibilidad ininterrumpida del servicio</li>
                <li>No somos responsables de errores en respuestas de IA</li>
                <li>No nos hacemos responsables de pérdidas derivadas del uso del servicio</li>
                <li>Tu uso del servicio es bajo tu propio riesgo</li>
              </ul>
            </div>
          </section>

          {/* Modificaciones */}
          <section>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              9. Modificaciones del Servicio
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', lineHeight: '1.8' }}>
              Podemos modificar, suspender o discontinuar cualquier aspecto del Servicio en cualquier momento. 
              Intentaremos notificarte cambios significativos con anticipación.
            </p>
          </section>

          {/* Terminación */}
          <section>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              10. Terminación
            </h2>
            <div style={{ color: 'var(--color-text-secondary)', lineHeight: '1.8' }}>
              <p className="mb-3">Puedes cancelar tu cuenta en cualquier momento desde la configuración.</p>
              <p>
                Podemos suspender o terminar tu acceso si violas estos términos, con o sin previo aviso.
              </p>
            </div>
          </section>

          {/* Ley aplicable */}
          <section>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              11. Ley Aplicable
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', lineHeight: '1.8' }}>
              Estos términos se rigen por las leyes de México. Cualquier disputa se resolverá en los tribunales de México.
            </p>
          </section>

          {/* Contacto */}
          <section>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              12. Contacto
            </h2>
            <div style={{ color: 'var(--color-text-secondary)', lineHeight: '1.8' }}>
              <p className="mb-3">
                Para preguntas sobre estos términos:
              </p>
              <div className="pl-6">
                <p><strong>Infinity Kode</strong></p>
                <p>Email: <a href="mailto:legal@infinitykode.com" className="underline" style={{ color: 'var(--color-accent)' }}>legal@infinitykode.com</a></p>
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
