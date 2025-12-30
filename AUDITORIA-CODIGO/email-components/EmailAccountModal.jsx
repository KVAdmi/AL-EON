/**
 * EmailAccountModal.jsx
 * Modal COMPLETO para configurar cuenta de email
 * Tabs: Servidor, Firma, Respuesta Automática, Filtros
 */

import React, { useState, useEffect } from 'react';
import { X, Server, FileSignature, Mail, Filter, Eye } from 'lucide-react';

export default function EmailAccountModal({ account, onSave, onClose }) {
  const [activeTab, setActiveTab] = useState('server');
  const [formData, setFormData] = useState({
    // Servidor
    display_name: account?.display_name || '',
    email: account?.email || '',
    smtp_host: account?.smtp_host || '',
    smtp_port: account?.smtp_port || 587,
    smtp_secure: account?.smtp_secure || true,
    smtp_user: account?.smtp_user || '',
    smtp_pass: account?.smtp_pass || '',
    imap_host: account?.imap_host || '',
    imap_port: account?.imap_port || 993,
    imap_secure: account?.imap_secure || true,
    imap_user: account?.imap_user || '',
    imap_pass: account?.imap_pass || '',
    
    // Firma
    signature_html: account?.signature_html || '',
    signature_enabled: account?.signature_enabled || false,
    
    // Respuesta automática
    auto_reply_enabled: account?.auto_reply_enabled || false,
    auto_reply_subject: account?.auto_reply_subject || '',
    auto_reply_body: account?.auto_reply_body || '',
    
    // Configuración
    default_folder: account?.default_folder || 'INBOX',
    sync_frequency: account?.sync_frequency || 5,
  });
  
  const [showSignaturePreview, setShowSignaturePreview] = useState(false);
  const [errors, setErrors] = useState({});

  const tabs = [
    { id: 'server', label: 'Servidor', icon: Server },
    { id: 'signature', label: 'Firma', icon: FileSignature },
    { id: 'autoreply', label: 'Respuesta Auto', icon: Mail },
    { id: 'filters', label: 'Filtros', icon: Filter },
  ];

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.display_name) newErrors.display_name = 'Campo requerido';
    if (!formData.email) newErrors.email = 'Campo requerido';
    if (!formData.smtp_host) newErrors.smtp_host = 'Campo requerido';
    if (!formData.imap_host) newErrors.imap_host = 'Campo requerido';
    if (!formData.smtp_user) newErrors.smtp_user = 'Campo requerido';
    if (!formData.imap_user) newErrors.imap_user = 'Campo requerido';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      setActiveTab('server');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {account ? 'Editar Cuenta' : 'Nueva Cuenta de Email'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 font-medium'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB: SERVIDOR */}
          {activeTab === 'server' && (
            <div className="space-y-6">
              {/* Información General */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Información General</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre para mostrar *
                    </label>
                    <input
                      type="text"
                      value={formData.display_name}
                      onChange={(e) => handleChange('display_name', e.target.value)}
                      placeholder="Ej: Patricia Garibay"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.display_name ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.display_name && (
                      <p className="text-xs text-red-600 mt-1">{errors.display_name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="tu@dominio.com"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.email && (
                      <p className="text-xs text-red-600 mt-1">{errors.email}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* SMTP */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuración SMTP (Envío)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Servidor SMTP *
                    </label>
                    <input
                      type="text"
                      value={formData.smtp_host}
                      onChange={(e) => handleChange('smtp_host', e.target.value)}
                      placeholder="smtp.gmail.com"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.smtp_host ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Puerto</label>
                    <input
                      type="number"
                      value={formData.smtp_port}
                      onChange={(e) => handleChange('smtp_port', parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center pt-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.smtp_secure}
                        onChange={(e) => handleChange('smtp_secure', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Usar SSL/TLS</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Usuario SMTP *
                    </label>
                    <input
                      type="text"
                      value={formData.smtp_user}
                      onChange={(e) => handleChange('smtp_user', e.target.value)}
                      placeholder="tu@dominio.com"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.smtp_user ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contraseña SMTP *
                    </label>
                    <input
                      type="password"
                      value={formData.smtp_pass}
                      onChange={(e) => handleChange('smtp_pass', e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* IMAP */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuración IMAP (Recepción)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Servidor IMAP *
                    </label>
                    <input
                      type="text"
                      value={formData.imap_host}
                      onChange={(e) => handleChange('imap_host', e.target.value)}
                      placeholder="imap.gmail.com"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.imap_host ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Puerto</label>
                    <input
                      type="number"
                      value={formData.imap_port}
                      onChange={(e) => handleChange('imap_port', parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center pt-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.imap_secure}
                        onChange={(e) => handleChange('imap_secure', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Usar SSL/TLS</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Usuario IMAP *
                    </label>
                    <input
                      type="text"
                      value={formData.imap_user}
                      onChange={(e) => handleChange('imap_user', e.target.value)}
                      placeholder="tu@dominio.com"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.imap_user ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contraseña IMAP *
                    </label>
                    <input
                      type="password"
                      value={formData.imap_pass}
                      onChange={(e) => handleChange('imap_pass', e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Sincronización */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Sincronización</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frecuencia de sincronización (minutos)
                  </label>
                  <select
                    value={formData.sync_frequency}
                    onChange={(e) => handleChange('sync_frequency', parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>Cada minuto</option>
                    <option value={5}>Cada 5 minutos</option>
                    <option value={15}>Cada 15 minutos</option>
                    <option value={30}>Cada 30 minutos</option>
                    <option value={60}>Cada hora</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB: FIRMA */}
          {activeTab === 'signature' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Firma de Email</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Esta firma se agregará automáticamente al final de tus emails
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.signature_enabled}
                    onChange={(e) => handleChange('signature_enabled', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Activar firma</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  HTML de la Firma
                </label>
                <textarea
                  value={formData.signature_html}
                  onChange={(e) => handleChange('signature_html', e.target.value)}
                  rows={12}
                  placeholder={`<div style="font-family: Arial, sans-serif; color: #333;">
  <strong>Patricia Garibay</strong><br/>
  CEO - AL-EON<br/>
  <a href="mailto:patricia@al-eon.com">patricia@al-eon.com</a><br/>
  Tel: +52 123 456 7890<br/>
  <a href="https://al-eon.com">www.al-eon.com</a>
</div>`}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowSignaturePreview(!showSignaturePreview)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span>{showSignaturePreview ? 'Ocultar' : 'Ver'} Preview</span>
                </button>
              </div>

              {showSignaturePreview && formData.signature_html && (
                <div className="border border-gray-300 rounded-lg p-6 bg-gray-50">
                  <div className="text-xs text-gray-500 mb-3 font-medium">PREVIEW:</div>
                  <div 
                    className="bg-white p-4 rounded border border-gray-200"
                    dangerouslySetInnerHTML={{ __html: formData.signature_html }}
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB: RESPUESTA AUTOMÁTICA */}
          {activeTab === 'autoreply' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Respuesta Automática</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Envía una respuesta automática cuando estés ausente
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.auto_reply_enabled}
                    onChange={(e) => handleChange('auto_reply_enabled', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Activar</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Asunto
                </label>
                <input
                  type="text"
                  value={formData.auto_reply_subject}
                  onChange={(e) => handleChange('auto_reply_subject', e.target.value)}
                  placeholder="Ej: Fuera de oficina"
                  disabled={!formData.auto_reply_enabled}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mensaje
                </label>
                <textarea
                  value={formData.auto_reply_body}
                  onChange={(e) => handleChange('auto_reply_body', e.target.value)}
                  rows={8}
                  placeholder="Gracias por tu mensaje. Actualmente estoy fuera de la oficina y responderé a tu email tan pronto como sea posible."
                  disabled={!formData.auto_reply_enabled}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          )}

          {/* TAB: FILTROS */}
          {activeTab === 'filters' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Filtros y Reglas</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Configura reglas para organizar automáticamente tus emails
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <p className="text-sm text-blue-800">
                  🚧 Los filtros avanzados estarán disponibles en la próxima actualización
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Guardar Configuración
          </button>
        </div>
      </div>
    </div>
  );
}
