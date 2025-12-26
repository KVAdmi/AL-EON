/**
 * TestIntegrationsPage.jsx
 * 
 * Página de prueba para verificar que Gmail y Calendar funcionan correctamente
 */

import React, { useState } from 'react';
import { 
  sendEmail, 
  createCalendarEvent, 
  listCalendarEvents,
  checkIntegrationsStatus 
} from '../services/integrationsService';
import { ArrowLeft, Mail, Calendar, Send, CheckCircle, XCircle, Loader } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TestIntegrationsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [integrationsStatus, setIntegrationsStatus] = useState(null);

  // Estado para el formulario de Email
  const [emailForm, setEmailForm] = useState({
    to: '',
    subject: 'Prueba de Gmail desde AL-EON',
    body: '<h1>¡Hola!</h1><p>Este es un email de prueba enviado desde AL-EON usando Gmail API.</p>',
  });

  // Estado para el formulario de Calendar
  const [calendarForm, setCalendarForm] = useState({
    summary: 'Reunión de prueba AL-EON',
    description: 'Evento de prueba creado desde AL-EON',
    startDateTime: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16), // +1 hora
    endDateTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16), // +2 horas
    attendees: '',
  });

  // Verificar estado de integraciones
  const handleCheckStatus = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const status = await checkIntegrationsStatus();
      setIntegrationsStatus(status);
      setResult({
        type: 'status',
        data: status,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Enviar email de prueba
  const handleSendEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await sendEmail({
        to: emailForm.to,
        subject: emailForm.subject,
        body: emailForm.body,
      });

      setResult({
        type: 'email',
        data: response,
        message: `✅ Email enviado exitosamente a ${emailForm.to}`,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Crear evento de calendario
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const attendeesList = calendarForm.attendees
        .split(',')
        .map(email => email.trim())
        .filter(email => email);

      const response = await createCalendarEvent({
        summary: calendarForm.summary,
        description: calendarForm.description,
        startDateTime: new Date(calendarForm.startDateTime).toISOString(),
        endDateTime: new Date(calendarForm.endDateTime).toISOString(),
        attendees: attendeesList,
      });

      setResult({
        type: 'calendar',
        data: response,
        message: `✅ Evento creado exitosamente: ${calendarForm.summary}`,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Listar próximos eventos
  const handleListEvents = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const events = await listCalendarEvents({ maxResults: 5 });
      setResult({
        type: 'list',
        data: events,
        message: `✅ Se encontraron ${events.length} eventos próximos`,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link
              to="/integrations"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Prueba de Integraciones
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Gmail y Google Calendar
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Estado de integraciones */}
        <div className="mb-8">
          <button
            onClick={handleCheckStatus}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? <Loader size={16} className="animate-spin" /> : <CheckCircle size={16} />}
            Verificar Estado de Integraciones
          </button>

          {integrationsStatus && (
            <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Estado: {integrationsStatus.available ? '✅ Activas' : '❌ No disponibles'}
              </h3>
              <ul className="space-y-1">
                {integrationsStatus.integrations.map((int) => (
                  <li key={int.integration_type} className="text-sm text-gray-600 dark:text-gray-400">
                    • {int.integration_name} ({int.integration_type})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Gmail Test */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="text-blue-600" size={24} />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Prueba de Gmail
              </h2>
            </div>

            <form onSubmit={handleSendEmail} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Para (email):
                </label>
                <input
                  type="email"
                  value={emailForm.to}
                  onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })}
                  required
                  placeholder="destinatario@ejemplo.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Asunto:
                </label>
                <input
                  type="text"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mensaje (HTML):
                </label>
                <textarea
                  value={emailForm.body}
                  onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
                  required
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
                Enviar Email
              </button>
            </form>
          </div>

          {/* Calendar Test */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="text-green-600" size={24} />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Prueba de Calendar
              </h2>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Título:
                </label>
                <input
                  type="text"
                  value={calendarForm.summary}
                  onChange={(e) => setCalendarForm({ ...calendarForm, summary: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descripción:
                </label>
                <input
                  type="text"
                  value={calendarForm.description}
                  onChange={(e) => setCalendarForm({ ...calendarForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Inicio:
                  </label>
                  <input
                    type="datetime-local"
                    value={calendarForm.startDateTime}
                    onChange={(e) => setCalendarForm({ ...calendarForm, startDateTime: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fin:
                  </label>
                  <input
                    type="datetime-local"
                    value={calendarForm.endDateTime}
                    onChange={(e) => setCalendarForm({ ...calendarForm, endDateTime: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Invitados (separados por coma):
                </label>
                <input
                  type="text"
                  value={calendarForm.attendees}
                  onChange={(e) => setCalendarForm({ ...calendarForm, attendees: e.target.value })}
                  placeholder="email1@ejemplo.com, email2@ejemplo.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? <Loader size={16} className="animate-spin" /> : <Calendar size={16} />}
                  Crear Evento
                </button>

                <button
                  type="button"
                  onClick={handleListEvents}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Listar
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Resultados */}
        {result && (
          <div className="mt-8 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="font-medium text-green-900 dark:text-green-100 mb-2">
                  {result.message}
                </p>
                <pre className="text-xs bg-white dark:bg-gray-800 p-3 rounded border border-green-200 dark:border-green-800 overflow-x-auto">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Errores */}
        {error && (
          <div className="mt-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-3">
              <XCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="font-medium text-red-900 dark:text-red-100">Error</p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
