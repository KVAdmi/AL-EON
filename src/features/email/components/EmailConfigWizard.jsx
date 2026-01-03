/**
 * EmailConfigWizard - Wizard paso a paso para configurar cuentas de email
 * Paso 1: Seleccionar Proveedor
 * Paso 2: Configurar IMAP (Recepción)
 * Paso 3: Configurar SMTP (Envío)
 */
import React, { useState } from 'react';
import { 
  Mail, 
  Server, 
  Send, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Info,
  Eye,
  EyeOff
} from 'lucide-react';
import { testEmailConnection, syncEmailAccount } from '../../../services/emailService';
import { useToast } from '../../../contexts/ToastContext';

const PROVIDERS = [
  {
    id: 'gmail',
    name: 'Gmail',
    icon: '📧',
    smtp: { host: 'smtp.gmail.com', port: 587, secure: false },
    imap: { host: 'imap.gmail.com', port: 993, secure: true },
    help: 'Usa una contraseña de aplicación, no tu contraseña normal.',
  },
  {
    id: 'outlook',
    name: 'Outlook / Office 365',
    icon: '📨',
    smtp: { host: 'smtp.office365.com', port: 587, secure: false },
    imap: { host: 'outlook.office365.com', port: 993, secure: true },
    help: 'Asegúrate de tener IMAP habilitado en la configuración de tu cuenta.',
  },
  {
    id: 'yahoo',
    name: 'Yahoo Mail',
    icon: '💌',
    smtp: { host: 'smtp.mail.yahoo.com', port: 587, secure: false },
    imap: { host: 'imap.mail.yahoo.com', port: 993, secure: true },
    help: 'Genera una contraseña de aplicación desde tu cuenta de Yahoo.',
  },
  {
    id: 'other',
    name: 'Otro proveedor',
    icon: '✉️',
    smtp: { host: '', port: 587, secure: false },
    imap: { host: '', port: 993, secure: true },
    help: 'Configura manualmente tu proveedor de correo.',
  },
];

export default function EmailConfigWizard({ onComplete, onCancel }) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [testing, setTesting] = useState({ imap: false, smtp: false });
  const [testResults, setTestResults] = useState({ imap: null, smtp: null });
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    imap: false,
    smtp: false,
  });
  
  const [formData, setFormData] = useState({
    provider: 'imap', // ses, gmail, outlook, imap
    domain: '',
    fromName: '',
    fromEmail: '',
    imap: {
      host: '',
      port: 993,
      secure: true,
      user: '',
      password: '',
    },
    smtp: {
      host: '',
      port: 587,
      secure: false,
      user: '',
      password: '',
    },
  });

  // Aplicar valores del proveedor seleccionado
  const handleProviderSelect = (provider) => {
    setSelectedProvider(provider);
    
    // Extraer dominio del email si existe
    const domain = formData.fromEmail ? formData.fromEmail.split('@')[1] : '';
    
    setFormData({
      ...formData,
      provider: provider.id, // gmail, outlook, yahoo, o imap para 'other'
      domain: domain || '',
      imap: { ...formData.imap, ...provider.imap },
      smtp: { ...formData.smtp, ...provider.smtp },
    });
  };

  const handleChange = (section, field, value) => {
    if (section) {
      setFormData({
        ...formData,
        [section]: { ...formData[section], [field]: value },
      });
    } else {
      // Si se actualiza el fromEmail, extraer el dominio
      if (field === 'fromEmail' && value.includes('@')) {
        const domain = value.split('@')[1];
        setFormData({ ...formData, [field]: value, domain: domain });
      } else {
        setFormData({ ...formData, [field]: value });
      }
    }
  };

  // Probar IMAP
  const handleTestIMAP = async () => {
    if (!formData.imap.host || !formData.imap.user || !formData.imap.password) {
      toast.error('Completa todos los campos IMAP');
      return;
    }

    setTesting({ ...testing, imap: true });
    setTestResults({ ...testResults, imap: null });

    try {
      const response = await fetch('https://api.al-eon.com/api/mail/test-imap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData.imap),
      });

      const result = await response.json();
      
      if (result.success) {
        setTestResults({ ...testResults, imap: { success: true, message: result.message } });
        toast.success('✓ Conexión IMAP exitosa');
      } else {
        setTestResults({ ...testResults, imap: { success: false, message: result.message } });
        toast.error(result.message || 'Error en conexión IMAP');
      }
    } catch (error) {
      setTestResults({ ...testResults, imap: { success: false, message: error.message } });
      toast.error('Error al probar IMAP: ' + error.message);
    } finally {
      setTesting({ ...testing, imap: false });
    }
  };

  // Probar SMTP
  const handleTestSMTP = async () => {
    if (!formData.smtp.host || !formData.smtp.user || !formData.smtp.password) {
      toast.error('Completa todos los campos SMTP');
      return;
    }

    setTesting({ ...testing, smtp: true });
    setTestResults({ ...testResults, smtp: null });

    try {
      const response = await fetch('https://api.al-eon.com/api/mail/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData.smtp),
      });

      const result = await response.json();
      
      if (result.success) {
        setTestResults({ ...testResults, smtp: { success: true, message: result.message } });
        toast.success('✓ Conexión SMTP exitosa');
      } else {
        setTestResults({ ...testResults, smtp: { success: false, message: result.message } });
        toast.error(result.message || 'Error en conexión SMTP');
      }
    } catch (error) {
      setTestResults({ ...testResults, smtp: { success: false, message: error.message } });
      toast.error('Error al probar SMTP: ' + error.message);
    } finally {
      setTesting({ ...testing, smtp: false });
    }
  };

  // Guardar y sincronizar
  const handleSaveAndSync = async () => {
    if (!formData.fromName || !formData.fromEmail) {
      toast.error('Completa el nombre y email del remitente');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('https://api.al-eon.com/api/mail/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const account = await response.json();

      if (!response.ok) {
        throw new Error(account.message || 'Error al guardar cuenta');
      }

      toast.success('✓ Cuenta guardada exitosamente');

      // Sincronizar automáticamente
      toast.info('Sincronizando correos...');
      await syncEmailAccount(account.id);
      
      toast.success('✓ Sincronización completa');
      
      if (onComplete) {
        onComplete(account);
      }
    } catch (error) {
      toast.error('Error: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const canGoNext = () => {
    if (step === 1) return selectedProvider !== null;
    if (step === 2) return testResults.imap?.success === true;
    if (step === 3) return testResults.smtp?.success === true;
    return false;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div
        className="max-w-3xl w-full rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
              <h2
                className="text-xl font-bold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Configurar Cuenta de Correo
              </h2>
            </div>
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Paso {step} de 3
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                backgroundColor: 'var(--color-primary)',
                width: `${(step / 3) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* PASO 1: Seleccionar Proveedor */}
          {step === 1 && (
            <div>
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                Selecciona tu proveedor de correo
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PROVIDERS.map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => handleProviderSelect(provider)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedProvider?.id === provider.id ? 'ring-2' : ''
                    }`}
                    style={{
                      backgroundColor: selectedProvider?.id === provider.id 
                        ? 'var(--color-bg-secondary)' 
                        : 'var(--color-bg-primary)',
                      borderColor: selectedProvider?.id === provider.id 
                        ? 'var(--color-primary)' 
                        : 'var(--color-border)',
                      ringColor: 'var(--color-primary)',
                    }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">{provider.icon}</span>
                      <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {provider.name}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      {provider.help}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PASO 2: Configurar IMAP */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                <Info className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--color-primary)' }} />
                <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {selectedProvider?.help}
                </div>
              </div>

              <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Configuración IMAP (Recepción)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
                    Servidor IMAP *
                  </label>
                  <input
                    type="text"
                    value={formData.imap.host}
                    onChange={(e) => handleChange('imap', 'host', e.target.value)}
                    placeholder={selectedProvider?.id === 'other' ? 'imap.tudominio.com' : ''}
                    className="w-full px-4 py-2.5 rounded-lg border"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
                    Puerto *
                  </label>
                  <input
                    type="number"
                    value={formData.imap.port}
                    onChange={(e) => handleChange('imap', 'port', parseInt(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-lg border"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                    required
                  />
                </div>

                <div className="flex items-center h-full">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.imap.secure}
                      onChange={(e) => handleChange('imap', 'secure', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                      Usar SSL/TLS
                    </span>
                  </label>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
                    Usuario IMAP *
                  </label>
                  <input
                    type="text"
                    value={formData.imap.user}
                    onChange={(e) => handleChange('imap', 'user', e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full px-4 py-2.5 rounded-lg border"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
                    Contraseña / App Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.imap ? 'text' : 'password'}
                      value={formData.imap.password}
                      onChange={(e) => handleChange('imap', 'password', e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 pr-12 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-primary)',
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, imap: !showPasswords.imap })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded hover:opacity-70 transition-all"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {showPasswords.imap ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Botón Probar IMAP */}
              <button
                onClick={handleTestIMAP}
                disabled={testing.imap}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-medium transition-all"
                style={{
                  backgroundColor: testing.imap ? 'var(--color-bg-tertiary)' : 'var(--color-primary)',
                  color: 'white',
                }}
              >
                {testing.imap ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Probando conexión...
                  </>
                ) : (
                  <>
                    <Server className="w-5 h-5" />
                    Probar Conexión IMAP
                  </>
                )}
              </button>

              {/* Resultado de prueba */}
              {testResults.imap && (
                <div
                  className={`flex items-start gap-3 p-4 rounded-lg ${
                    testResults.imap.success ? 'bg-green-50' : 'bg-red-50'
                  }`}
                >
                  {testResults.imap.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`font-medium ${testResults.imap.success ? 'text-green-900' : 'text-red-900'}`}>
                      {testResults.imap.success ? '¡Conexión exitosa!' : 'Error en la conexión'}
                    </p>
                    <p className={`text-sm mt-1 ${testResults.imap.success ? 'text-green-700' : 'text-red-700'}`}>
                      {testResults.imap.message}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PASO 3: Configurar SMTP */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Configuración SMTP (Envío)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
                    Nombre del remitente *
                  </label>
                  <input
                    type="text"
                    value={formData.fromName}
                    onChange={(e) => handleChange(null, 'fromName', e.target.value)}
                    placeholder="Tu Nombre"
                    className="w-full px-4 py-2.5 rounded-lg border"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
                    Email del remitente *
                  </label>
                  <input
                    type="email"
                    value={formData.fromEmail}
                    onChange={(e) => handleChange(null, 'fromEmail', e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full px-4 py-2.5 rounded-lg border"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
                    Servidor SMTP *
                  </label>
                  <input
                    type="text"
                    value={formData.smtp.host}
                    onChange={(e) => handleChange('smtp', 'host', e.target.value)}
                    placeholder={selectedProvider?.id === 'other' ? 'smtp.tudominio.com' : ''}
                    className="w-full px-4 py-2.5 rounded-lg border"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
                    Puerto *
                  </label>
                  <input
                    type="number"
                    value={formData.smtp.port}
                    onChange={(e) => handleChange('smtp', 'port', parseInt(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-lg border"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                    required
                  />
                </div>

                <div className="flex items-center h-full">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.smtp.secure}
                      onChange={(e) => handleChange('smtp', 'secure', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                      Usar TLS
                    </span>
                  </label>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
                    Usuario SMTP *
                  </label>
                  <input
                    type="text"
                    value={formData.smtp.user}
                    onChange={(e) => handleChange('smtp', 'user', e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full px-4 py-2.5 rounded-lg border"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
                    Contraseña / App Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.smtp ? 'text' : 'password'}
                      value={formData.smtp.password}
                      onChange={(e) => handleChange('smtp', 'password', e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 pr-12 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-primary)',
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, smtp: !showPasswords.smtp })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded hover:opacity-70 transition-all"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {showPasswords.smtp ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Botón Probar SMTP */}
              <button
                onClick={handleTestSMTP}
                disabled={testing.smtp}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-medium transition-all"
                style={{
                  backgroundColor: testing.smtp ? 'var(--color-bg-tertiary)' : 'var(--color-primary)',
                  color: 'white',
                }}
              >
                {testing.smtp ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Probando conexión...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Probar Conexión SMTP
                  </>
                )}
              </button>

              {/* Resultado de prueba */}
              {testResults.smtp && (
                <div
                  className={`flex items-start gap-3 p-4 rounded-lg ${
                    testResults.smtp.success ? 'bg-green-50' : 'bg-red-50'
                  }`}
                >
                  {testResults.smtp.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`font-medium ${testResults.smtp.success ? 'text-green-900' : 'text-red-900'}`}>
                      {testResults.smtp.success ? '¡Conexión exitosa!' : 'Error en la conexión'}
                    </p>
                    <p className={`text-sm mt-1 ${testResults.smtp.success ? 'text-green-700' : 'text-red-700'}`}>
                      {testResults.smtp.message}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 border-t flex items-center justify-between"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <button
            onClick={() => {
              if (step > 1) {
                setStep(step - 1);
              } else {
                onCancel();
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-text-primary)',
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            {step === 1 ? 'Cancelar' : 'Anterior'}
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canGoNext()}
              className="flex items-center gap-2 px-6 py-2 rounded-2xl font-medium transition-all disabled:opacity-50"
              style={{
                backgroundColor: canGoNext() ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
                color: 'white',
              }}
            >
              Siguiente
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSaveAndSync}
              disabled={!canGoNext() || saving}
              className="flex items-center gap-2 px-6 py-2 rounded-2xl font-medium transition-all disabled:opacity-50"
              style={{
                backgroundColor: canGoNext() && !saving ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
                color: 'white',
              }}
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Guardar y Sincronizar
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
