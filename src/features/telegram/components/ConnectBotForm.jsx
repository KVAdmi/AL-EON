import React, { useState, useEffect } from 'react';
import { connectBot } from '@/services/telegramService';
import { useToast } from '@/ui/use-toast';
import { Send, Loader2, AlertCircle } from 'lucide-react';

const STORAGE_KEY = 'ale_telegram_bot_draft';

export default function ConnectBotForm({ userId, onSuccess, onCancel }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Recuperar draft de localStorage
  const getInitialFormData = () => {
    try {
      const draft = localStorage.getItem(STORAGE_KEY);
      if (draft) {
        return JSON.parse(draft);
      }
    } catch (error) {
      console.error('Error recuperando draft:', error);
    }
    return {
      botUsername: '',
      botToken: '',
    };
  };

  const [formData, setFormData] = useState(getInitialFormData);

  // Guardar draft automáticamente
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
    } catch (error) {
      console.error('Error guardando draft:', error);
    }
  }, [formData]);

  function handleChange(field, value) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!userId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo obtener el ID de usuario',
      });
      return;
    }

    try {
      setLoading(true);

      const payload = {
        ownerUserId: userId, // ✅ Backend espera ownerUserId
        botUsername: formData.botUsername.replace(/^@/, ''), // Remover @ del inicio
        botToken: formData.botToken.trim(),
      };

      console.log('[ConnectBotForm] 🔍 DEBUG - Información de envío:');
      console.log('  - userId recibido:', userId);
      console.log('  - tipo de userId:', typeof userId);
      console.log('  - userId válido:', !!userId && userId !== 'undefined');
      console.log('  - payload completo:', { 
        ...payload, 
        botToken: '***HIDDEN***' 
      });

      const result = await connectBot(payload);

      console.log('[ConnectBotForm] ✅ Respuesta exitosa:', result);

      toast({
        title: 'Bot conectado',
        description: `@${formData.botUsername} se conectó correctamente`,
      });

      // Limpiar draft después de éxito
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.error('Error limpiando draft:', error);
      }

      onSuccess();
    } catch (error) {
      console.error('[ConnectBotForm] ❌ Error detallado:', error);
      console.error('  - Mensaje:', error.message);
      console.error('  - Stack:', error.stack);
      
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo conectar el bot',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h3 
          className="text-lg font-semibold mb-4"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Conectar bot de Telegram
        </h3>
      </div>

      {/* Username */}
      <div>
        <label 
          className="block text-sm font-medium mb-1.5"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Username del bot
        </label>
        <input
          type="text"
          value={formData.botUsername}
          onChange={(e) => handleChange('botUsername', e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg border"
          style={{
            backgroundColor: 'var(--color-bg-primary)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
          placeholder="@mi_bot"
          required
        />
        <p 
          className="text-xs mt-1"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          Ejemplo: @mi_asistente_bot
        </p>
      </div>

      {/* Token */}
      <div>
        <label 
          className="block text-sm font-medium mb-1.5"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Token del bot
        </label>
        <input
          type="password"
          value={formData.botToken}
          onChange={(e) => handleChange('botToken', e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg border font-mono text-sm"
          style={{
            backgroundColor: 'var(--color-bg-primary)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
          placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
          required
        />
        <p 
          className="text-xs mt-1"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          Obtenlo de @BotFather en Telegram
        </p>
      </div>

      {/* Warning */}
      <div 
        className="p-4 rounded-lg border flex items-start gap-3"
        style={{
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          borderColor: '#f59e0b',
        }}
      >
        <AlertCircle size={20} style={{ color: '#f59e0b', marginTop: '2px', flexShrink: 0 }} />
        <div>
          <p 
            className="font-medium text-sm mb-1"
            style={{ color: '#f59e0b' }}
          >
            Importante
          </p>
          <p 
            className="text-xs"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            No compartas tu token. Es como una contraseña que da acceso total a tu bot.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-3 px-4 rounded-xl font-medium transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          style={{
            backgroundColor: 'var(--color-accent)',
            color: '#FFFFFF',
          }}
        >
          {loading && <Loader2 size={18} className="animate-spin" />}
          {loading ? 'Conectando...' : (
            <>
              <Send size={18} />
              Conectar bot
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-6 py-3 rounded-xl font-medium border transition-all hover:opacity-90 disabled:opacity-50"
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
