import React, { useState, useEffect } from 'react';
import { createEmailAccount, updateEmailAccount, testEmailConnection } from '@/services/emailService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/ui/use-toast';
import { CheckCircle2, XCircle, Loader2, Upload, X, Eye, EyeOff } from 'lucide-react';

const STORAGE_KEY = 'ale_email_form_draft';

export default function EmailAccountForm({ account = null, onSave, onCancel }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Intentar recuperar draft de localStorage si NO estamos editando
  const getInitialFormData = () => {
    if (account) {
      // Si estamos editando, mapear datos de Supabase (snake_case) a formato del form (camelCase)
      console.log('🔵 [EmailAccountForm] Cargando cuenta para editar:', account);
      return {
        fromName: account.from_name || account.fromName || '',
        fromEmail: account.from_email || account.fromEmail || '',
        signature: account.signature || '',
        signatureImage: null,
        enableFlags: account.enable_flags !== undefined ? account.enable_flags : true,
        enableSpamFilter: account.enable_spam_filter !== undefined ? account.enable_spam_filter : true,
        smtp: {
          host: account.smtp_host || account.smtp?.host || '',
          port: account.smtp_port || account.smtp?.port || 587,
          secure: account.smtp_secure !== undefined ? account.smtp_secure : (account.smtp?.secure || false),
          user: account.smtp_user || account.smtp?.user || '',
          password: '', // No cargar password por seguridad, usuario debe reescribirla
        },
        imap: {
          enabled: account.imap_host ? true : (account.imap?.enabled || false),
          host: account.imap_host || account.imap?.host || '',
          port: account.imap_port || account.imap?.port || 993,
          secure: account.imap_secure !== undefined ? account.imap_secure : (account.imap?.secure || true),
          user: account.imap_user || account.imap?.user || '',
          password: '', // No cargar password por seguridad, usuario debe reescribirla
        },
      };
    }

    // Si es nuevo, intentar recuperar draft
    try {
      const draft = localStorage.getItem(STORAGE_KEY);
      if (draft) {
        return JSON.parse(draft);
      }
    } catch (error) {
      console.error('Error recuperando draft:', error);
    }

    // Default vacío
    return {
      fromName: '',
      fromEmail: '',
      signature: '',
      signatureImage: null,
      enableFlags: true,
      enableSpamFilter: true,
      smtp: {
        host: '',
        port: 587,
        secure: false,
        user: '',
        password: '',
      },
      imap: {
        enabled: false,
        host: '',
        port: 993,
        secure: true,
        user: '',
        password: '',
      },
    };
  };

  const [formData, setFormData] = useState(getInitialFormData);
  const [signatureImagePreview, setSignatureImagePreview] = useState(account?.signatureImageUrl || null);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [showImapPassword, setShowImapPassword] = useState(false);

  // Guardar draft automáticamente cuando cambian los datos (solo si NO estamos editando)
  useEffect(() => {
    if (!account) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
      } catch (error) {
        console.error('Error guardando draft:', error);
      }
    }
  }, [formData, account]);

  function handleChange(section, field, value) {
    if (section) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }
    setTestResult(null); // Reset test result cuando cambian datos
  }

  function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      toast({
        variant: 'destructive',
        title: 'Formato no válido',
        description: 'Solo se permiten archivos JPG y PNG',
      });
      return;
    }

    // Validar tamaño (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Archivo muy grande',
        description: 'La imagen no debe superar 2MB',
      });
      return;
    }

    // Convertir a base64
    const reader = new FileReader();
    reader.onloadend = () => {
      setSignatureImagePreview(reader.result);
      setFormData(prev => ({
        ...prev,
        signatureImage: reader.result,
      }));
    };
    reader.readAsDataURL(file);
  }

  function removeSignatureImage() {
    setSignatureImagePreview(null);
    setFormData(prev => ({
      ...prev,
      signatureImage: null,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Usuario no autenticado',
      });
      return;
    }

    // Validación: fromName es OBLIGATORIO
    if (!formData.fromName || !formData.fromName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campos requeridos',
        description: 'El nombre del remitente es obligatorio',
      });
      return;
    }

    // Si estamos EDITANDO y las contraseñas están vacías, advertir
    if (account?.id) {
      if (!formData.smtp.password && !formData.imap.password) {
        toast({
          variant: 'destructive',
          title: 'Contraseñas requeridas',
          description: 'Debes reingresar las contraseñas SMTP e IMAP para actualizar la cuenta',
        });
        return;
      }
    }

    try {
      setLoading(true);
      
      const payload = {
        ownerUserId: user.id,
        fromName: formData.fromName.trim(),
        fromEmail: formData.fromEmail,
        signature: formData.signature,
        signatureImage: formData.signatureImage,
        enableFlags: formData.enableFlags,
        enableSpamFilter: formData.enableSpamFilter,
        smtpHost: formData.smtp.host,
        smtpPort: parseInt(formData.smtp.port),
        smtpSecure: formData.smtp.secure,
        smtpUser: formData.smtp.user,
        imapEnabled: formData.imap.enabled,
        imapHost: formData.imap.host,
        imapPort: parseInt(formData.imap.port),
        imapSecure: formData.imap.secure,
        imapUser: formData.imap.user,
      };

      // Solo incluir passwords si no están vacías
      if (formData.smtp.password) {
        payload.smtpPass = formData.smtp.password;
      }
      if (formData.imap.password) {
        payload.imapPass = formData.imap.password;
      }

      console.log('🔵 [EmailAccountForm] Guardando cuenta...', {
        isUpdate: !!account?.id,
        accountId: account?.id,
        payload: { ...payload, smtpPass: '***', imapPass: '***' }
      });

      if (account?.id) {
        // ACTUALIZAR cuenta existente
        await updateEmailAccount(account.id, payload);
        toast({
          title: 'Cuenta actualizada',
          description: '✓ Los cambios se guardaron correctamente',
        });
      } else {
        // CREAR nueva cuenta
        await createEmailAccount(payload);
        toast({
          title: 'Cuenta creada',
          description: '✓ La cuenta de email se creó correctamente',
        });
        // Limpiar draft después de crear exitosamente
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
          console.error('Error limpiando draft:', error);
        }
      }

      onSave();
    } catch (error) {
      console.error('❌ [EmailAccountForm] Error guardando:', error);
      toast({
        variant: 'destructive',
        title: 'Error al guardar',
        description: error.message || 'No se pudo guardar la cuenta',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleTest() {
    if (!account?.id) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Guarda la cuenta primero antes de probar la conexión',
      });
      return;
    }

    try {
      setTesting(true);
      const result = await testEmailConnection(account.id);
      setTestResult(result);
      
      if (result.success) {
        toast({
          title: 'Conexión exitosa',
          description: result.message,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error de conexión',
          description: result.message,
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo probar la conexión',
      });
    } finally {
      setTesting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 
          className="text-lg font-semibold mb-4"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {account ? 'Editar cuenta' : 'Nueva cuenta de correo'}
        </h3>
        
        {/* Alerta cuando estás editando */}
        {account && (
          <div 
            className="p-4 rounded-lg border-l-4 mb-4"
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderLeftColor: 'var(--color-primary)',
            }}
          >
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-primary)' }}>
              🔐 Modo Edición
            </p>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Los datos se cargarán automáticamente. Por seguridad, debes <strong>reingresar las contraseñas</strong> SMTP e IMAP para actualizar.
            </p>
          </div>
        )}
      </div>

      {/* Información general */}
      <div className="space-y-4">
        <div>
          <label 
            className="block text-sm font-medium mb-1.5"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Nombre del remitente
          </label>
          <input
            type="text"
            value={formData.fromName}
            onChange={(e) => handleChange(null, 'fromName', e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
            placeholder="Tu Nombre"
            required
          />
        </div>

        <div>
          <label 
            className="block text-sm font-medium mb-1.5"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Email del remitente
          </label>
          <input
            type="email"
            value={formData.fromEmail}
            onChange={(e) => handleChange(null, 'fromEmail', e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
            placeholder="tu@email.com"
            required
          />
        </div>
      </div>

      {/* Firma de correo */}
      <div 
        className="p-4 rounded-lg border"
        style={{
          backgroundColor: 'var(--color-bg-primary)',
          borderColor: 'var(--color-border)',
        }}
      >
        <h4 
          className="font-semibold mb-3"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Firma de correo
        </h4>
        
        <div className="space-y-4">
          <div>
            <label 
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Texto de firma
            </label>
            <textarea
              value={formData.signature}
              onChange={(e) => handleChange(null, 'signature', e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg border resize-none"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
              placeholder="Saludos,&#10;Tu nombre&#10;Tu empresa"
            />
          </div>

          <div>
            <label 
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Imagen de firma (JPG/PNG, máx 2MB)
            </label>
            
            {signatureImagePreview ? (
              <div className="relative inline-block">
                <img 
                  src={signatureImagePreview} 
                  alt="Firma" 
                  className="max-h-32 rounded border"
                  style={{ borderColor: 'var(--color-border)' }}
                />
                <button
                  type="button"
                  onClick={removeSignatureImage}
                  className="absolute -top-2 -right-2 p-1 rounded-full"
                  style={{ backgroundColor: 'var(--color-error, #ef4444)', color: 'white' }}
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label className="cursor-pointer">
                <div 
                  className="border-2 border-dashed rounded-lg p-6 text-center hover:opacity-80 transition-opacity"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <Upload 
                    size={32} 
                    className="mx-auto mb-2" 
                    style={{ color: 'var(--color-text-tertiary)' }}
                  />
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Click para subir imagen
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                    JPG o PNG, máximo 2MB
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Configuración de banderas y spam */}
      <div 
        className="p-4 rounded-lg border"
        style={{
          backgroundColor: 'var(--color-bg-primary)',
          borderColor: 'var(--color-border)',
        }}
      >
        <h4 
          className="font-semibold mb-3"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Clasificación de correos
        </h4>
        
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.enableFlags}
              onChange={(e) => handleChange(null, 'enableFlags', e.target.checked)}
              className="w-5 h-5 rounded"
              style={{ accentColor: 'var(--color-accent)' }}
            />
            <div>
              <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                Habilitar banderas
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                Permitir clasificar correos: Urgente, Importante, Pendiente, etc.
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.enableSpamFilter}
              onChange={(e) => handleChange(null, 'enableSpamFilter', e.target.checked)}
              className="w-5 h-5 rounded"
              style={{ accentColor: 'var(--color-accent)' }}
            />
            <div>
              <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                Filtro anti-spam
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                Clasificar automáticamente correos como spam
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* SMTP Configuration */}
      <div 
        className="p-4 rounded-lg border"
        style={{
          backgroundColor: 'var(--color-bg-primary)',
          borderColor: 'var(--color-border)',
        }}
      >
        <h4 
          className="font-semibold mb-3"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Configuración SMTP (Envío)
        </h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label 
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Host
            </label>
            <input
              type="text"
              value={formData.smtp.host}
              onChange={(e) => handleChange('smtp', 'host', e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
              placeholder="smtp.gmail.com"
              required
            />
          </div>

          <div>
            <label 
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Puerto
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
              placeholder="587"
              required
            />
          </div>

          <div className="col-span-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.smtp.secure}
                onChange={(e) => handleChange('smtp', 'secure', e.target.checked)}
                className="w-4 h-4"
              />
              <span 
                className="text-sm font-medium"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Usar conexión segura (SSL/TLS)
              </span>
            </label>
          </div>

          <div>
            <label 
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Usuario SMTP
            </label>
            <input
              type="text"
              value={formData.smtp.user}
              onChange={(e) => handleChange('smtp', 'user', e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
              placeholder="usuario@email.com"
              required
            />
          <div>
            <label 
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Contraseña SMTP
            </label>
            <div className="relative">
              <input
                type={showSmtpPassword ? "text" : "password"}
                value={formData.smtp.password}
                onChange={(e) => handleChange('smtp', 'password', e.target.value)}
                className="w-full px-4 py-2.5 pr-12 rounded-lg border"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[var(--color-bg-hover)]"
                style={{ color: 'var(--color-text-secondary)' }}
                title={showSmtpPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showSmtpPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>quired
            /
          </div>
        </div>
      </div>

      {/* IMAP Configuration (opcional) */}
      <div 
        className="p-4 rounded-lg border"
        style={{
          backgroundColor: 'var(--color-bg-primary)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h4 
            className="font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Configuración IMAP (Recepción)
          </h4>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.imap.enabled}
              onChange={(e) => handleChange('imap', 'enabled', e.target.checked)}
              className="w-4 h-4"
            />
            <span 
              className="text-sm font-medium"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Habilitar
            </span>
          </label>
        </div>
        
        {formData.imap.enabled && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label 
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Host
              </label>
              <input
                type="text"
                value={formData.imap.host}
                onChange={(e) => handleChange('imap', 'host', e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                placeholder="imap.gmail.com"
              />
            </div>

            <div>
              <label 
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Puerto
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
                placeholder="993"
              />
            </div>

            <div>
              <label 
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Usuario IMAP
              </label>
              <input
                type="text"
                value={formData.imap.user}
                onChange={(e) => handleChange('imap', 'user', e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                placeholder="usuario@email.com"
              />
            </div>

            <div>
              <label 
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Contraseña IMAP
              </label>
              <div className="relative">
                <input
                  type={showImapPassword ? "text" : "password"}
                  value={formData.imap.password}
                  onChange={(e) => handleChange('imap', 'password', e.target.value)}
                  className="w-full px-4 py-2.5 pr-12 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowImapPassword(!showImapPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[var(--color-bg-hover)]"
                  style={{ color: 'var(--color-text-secondary)' }}
                  title={showImapPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showImapPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Test result */}
      {testResult && (
        <div 
          className={`p-4 rounded-lg border flex items-start gap-3`}
          style={{
            backgroundColor: testResult.success 
              ? 'rgba(16, 185, 129, 0.1)' 
              : 'rgba(239, 68, 68, 0.1)',
            borderColor: testResult.success ? 'var(--color-success, #10b981)' : 'var(--color-error, #ef4444)',
          }}
        >
          {testResult.success ? (
            <CheckCircle2 size={20} style={{ color: 'var(--color-success, #10b981)', marginTop: '2px' }} />
          ) : (
            <XCircle size={20} style={{ color: 'var(--color-error, #ef4444)', marginTop: '2px' }} />
          )}
          <div className="flex-1">
            <p 
              className="font-medium"
              style={{ color: testResult.success ? 'var(--color-success, #10b981)' : 'var(--color-error, #ef4444)' }}
            >
              {testResult.success ? 'Conexión exitosa' : 'Error de conexión'}
            </p>
            <p 
              className="text-sm mt-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {testResult.message}
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2.5 px-4 rounded-xl font-medium transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          style={{
            backgroundColor: 'var(--color-accent)',
            color: '#FFFFFF',
          }}
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? 'Guardando...' : 'Guardar'}
        </button>

        {account?.id && (
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="px-4 py-2.5 rounded-xl font-medium border transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          >
            {testing && <Loader2 size={16} className="animate-spin" />}
            {testing ? 'Probando...' : 'Probar conexión'}
          </button>
        )}

        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl font-medium border transition-all hover:opacity-90"
          style={{
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
