/**
 * ContactFormModal.jsx
 * Modal para crear/editar contactos manualmente
 */

import React, { useState } from 'react';
import { X, User, Mail, Phone, Building, Tag } from 'lucide-react';
import { useToast } from '@/ui/use-toast';

export default function ContactFormModal({ isOpen, onClose, onSave, initialContact = null }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: initialContact?.name || '',
    email: initialContact?.email || '',
    phone: initialContact?.phone || '',
    company: initialContact?.company || '',
    notes: initialContact?.notes || '',
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'El nombre es requerido',
      });
      return;
    }

    if (!formData.email.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'El email es requerido',
      });
      return;
    }

    try {
      setLoading(true);
      await onSave(formData);
      
      toast({
        title: 'Contacto guardado',
        description: `${formData.name} ha sido ${initialContact ? 'actualizado' : 'creado'} exitosamente`,
      });
      
      onClose();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo guardar el contacto',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div 
        className="max-w-md w-full rounded-2xl shadow-2xl"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        {/* Header */}
        <div className="p-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {initialContact ? 'Editar contacto' : 'Nuevo contacto'}
            </h2>
            <button 
              onClick={onClose}
              className="p-2 hover:opacity-80 rounded-xl transition-all"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nombre */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
              <User size={16} />
              Nombre completo *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Juan Pérez"
              className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#0078d4]"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)'
              }}
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
              <Mail size={16} />
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Ej: juan@empresa.com"
              className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#0078d4]"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)'
              }}
              required
            />
          </div>

          {/* Teléfono */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
              <Phone size={16} />
              Teléfono
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Ej: +52 55 1234 5678"
              className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#0078d4]"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)'
              }}
            />
          </div>

          {/* Empresa */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
              <Building size={16} />
              Empresa
            </label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              placeholder="Ej: ACME Corp"
              className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#0078d4]"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)'
              }}
            />
          </div>

          {/* Notas */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
              <Tag size={16} />
              Notas
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notas adicionales..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#0078d4]"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)'
              }}
            />
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 px-4 rounded-xl font-medium hover:opacity-80 transition-all"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)'
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: '#fff'
              }}
            >
              {loading ? 'Guardando...' : (initialContact ? 'Actualizar' : 'Crear contacto')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
