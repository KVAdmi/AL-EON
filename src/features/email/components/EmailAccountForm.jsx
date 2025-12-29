import React, { useState } from 'react';
import { createEmailAccount, updateEmailAccount, testEmailConnection } from '@/services/emailService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/ui/use-toast';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function EmailAccountForm({ account = null, onSave, onCancel }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const [formData, setFormData] = useState({
    fromName: account?.fromName || '',
    fromEmail: account?.fromEmail || '',
    smtp: {
      host: account?.smtp?.host || '',
      port: account?.smtp?.port || 587,
      secure: account?.smtp?.secure || false,
      user: account?.smtp?.user || '',
      password: account?.smtp?.password || '',
    },
    imap: {
      enabled: account?.imap?.enabled || false,
      host: account?.imap?.host || '',
      port: account?.imap?.port || 993,
      secure: account?.imap?.secure || true,
      user: account?.imap?.user || '',
      password: account?.imap?.password || '',
    },
  });

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

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!user) return;

    try {
      setLoading(true);
      
      const payload = {
        userId: user.id,
        ...formData,
        ...(account?.id && { accountId: account.id }),
      };

      if (account?.id) {
        await updateEmailAccount(account.id, payload);
        toast({
          title: 'Cuenta actualizada',
          description: 'La cuenta de email se actualizó correctamente',
        });
      } else {
        await createEmailAccount(payload);
        toast({
          title: 'Cuenta creada',
          description: 'La cuenta de email se creó correctamente',
        });
      }

      onSave();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
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
          </div>

          <div>
            <label 
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Contraseña SMTP
            </label>
            <input
              type="password"
              value={formData.smtp.password}
              onChange={(e) => handleChange('smtp', 'password', e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
              placeholder="••••••••"
              required
            />
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
              <input
                type="password"
                value={formData.imap.password}
                onChange={(e) => handleChange('imap', 'password', e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                placeholder="••••••••"
              />
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
            borderColor: testResult.success ? '#10b981' : '#ef4444',
          }}
        >
          {testResult.success ? (
            <CheckCircle2 size={20} style={{ color: '#10b981', marginTop: '2px' }} />
          ) : (
            <XCircle size={20} style={{ color: '#ef4444', marginTop: '2px' }} />
          )}
          <div className="flex-1">
            <p 
              className="font-medium"
              style={{ color: testResult.success ? '#10b981' : '#ef4444' }}
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
