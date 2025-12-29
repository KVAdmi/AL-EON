/**
 * ContactsManager.jsx
 * Gestor completo de contactos con agregar/editar/eliminar/tags/favoritos
 */

import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Star, Mail, Phone, Building, Tag, Search } from 'lucide-react';

export default function ContactsManager({ ownerUserId, onSelectContact, onClose }) {
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showNewContact, setShowNewContact] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    notes: '',
    tags: '',
    is_favorite: false,
  });

  useEffect(() => {
    loadContacts();
  }, [ownerUserId]);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredContacts(contacts);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredContacts(
        contacts.filter(c => 
          c.name.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query) ||
          (c.company && c.company.toLowerCase().includes(query))
        )
      );
    }
  }, [searchQuery, contacts]);

  const loadContacts = async () => {
    try {
      // TODO: Llamar a API real
      // const data = await getContacts(ownerUserId);
      // setContacts(data);
      
      // Mock data por ahora
      setContacts([
        {
          contact_id: '1',
          name: 'Juan Pérez',
          email: 'juan@ejemplo.com',
          phone: '+52 555 1234',
          company: 'Tech Corp',
          tags: 'cliente,vip',
          is_favorite: true,
          email_count: 15,
        },
        {
          contact_id: '2',
          name: 'María García',
          email: 'maria@ejemplo.com',
          phone: '+52 555 5678',
          company: 'Design Studio',
          tags: 'proveedor',
          is_favorite: false,
          email_count: 8,
        },
      ]);
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const handleSave = async () => {
    try {
      if (isEditing) {
        // TODO: Actualizar contacto
        // await updateContact(selectedContact.contact_id, formData);
        setContacts(contacts.map(c => 
          c.contact_id === selectedContact.contact_id 
            ? { ...c, ...formData }
            : c
        ));
      } else {
        // TODO: Crear contacto
        // const newContact = await createContact({ ...formData, owner_user_id: ownerUserId });
        const newContact = {
          contact_id: Date.now().toString(),
          ...formData,
          email_count: 0,
        };
        setContacts([...contacts, newContact]);
      }
      
      resetForm();
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleDelete = async (contactId) => {
    if (!confirm('¿Eliminar este contacto?')) return;
    
    try {
      // TODO: Eliminar contacto
      // await deleteContact(contactId);
      setContacts(contacts.filter(c => c.contact_id !== contactId));
      if (selectedContact?.contact_id === contactId) {
        setSelectedContact(null);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const toggleFavorite = async (contactId) => {
    try {
      // TODO: Toggle favorito en API
      setContacts(contacts.map(c => 
        c.contact_id === contactId 
          ? { ...c, is_favorite: !c.is_favorite }
          : c
      ));
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      notes: '',
      tags: '',
      is_favorite: false,
    });
    setIsEditing(false);
    setShowNewContact(false);
    setSelectedContact(null);
  };

  const handleEdit = (contact) => {
    setSelectedContact(contact);
    setFormData({
      name: contact.name,
      email: contact.email,
      phone: contact.phone || '',
      company: contact.company || '',
      notes: contact.notes || '',
      tags: contact.tags || '',
      is_favorite: contact.is_favorite,
    });
    setIsEditing(true);
    setShowNewContact(true);
  };

  const handleSelectForCompose = (contact) => {
    if (onSelectContact) {
      onSelectContact(contact);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex">
        {/* Lista de contactos */}
        <div className="w-1/3 border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Contactos</h2>
              <button
                onClick={() => {
                  resetForm();
                  setShowNewContact(true);
                }}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                title="Nuevo contacto"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar contactos..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredContacts.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-8">
                No hay contactos
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredContacts.map((contact) => (
                  <div
                    key={contact.contact_id}
                    onClick={() => setSelectedContact(contact)}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedContact?.contact_id === contact.contact_id
                        ? 'bg-blue-50'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 text-sm">
                            {contact.name}
                          </span>
                          {contact.is_favorite && (
                            <Star className="w-3 h-3 text-yellow-500" fill="currentColor" />
                          )}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">{contact.email}</div>
                        {contact.company && (
                          <div className="text-xs text-gray-500 mt-1">{contact.company}</div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          {contact.email_count} emails
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detalle / Formulario */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {showNewContact 
                ? (isEditing ? 'Editar Contacto' : 'Nuevo Contacto')
                : 'Detalle del Contacto'
              }
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {showNewContact ? (
              /* Formulario */
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Empresa
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags (separados por coma)
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="cliente, vip, proveedor"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_favorite}
                      onChange={(e) => setFormData({ ...formData, is_favorite: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm text-gray-700">Marcar como favorito</span>
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleSave}
                    disabled={!formData.name || !formData.email}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={resetForm}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : selectedContact ? (
              /* Detalle */
              <div className="space-y-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-2xl">
                      {selectedContact.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{selectedContact.name}</h3>
                      {selectedContact.company && (
                        <p className="text-sm text-gray-600">{selectedContact.company}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleFavorite(selectedContact.contact_id)}
                      className={`p-2 rounded-lg transition-colors ${
                        selectedContact.is_favorite
                          ? 'bg-yellow-100 text-yellow-600'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Star className="w-5 h-5" fill={selectedContact.is_favorite ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={() => handleEdit(selectedContact)}
                      className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(selectedContact.contact_id)}
                      className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <a href={`mailto:${selectedContact.email}`} className="text-blue-600 hover:underline">
                      {selectedContact.email}
                    </a>
                  </div>
                  
                  {selectedContact.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-700">{selectedContact.phone}</span>
                    </div>
                  )}
                  
                  {selectedContact.company && (
                    <div className="flex items-center gap-3">
                      <Building className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-700">{selectedContact.company}</span>
                    </div>
                  )}
                </div>

                {selectedContact.tags && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">Tags:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedContact.tags.split(',').map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
                        >
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedContact.notes && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Notas:</h4>
                    <p className="text-sm text-gray-600">{selectedContact.notes}</p>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleSelectForCompose(selectedContact)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Mail className="w-5 h-5" />
                    <span>Enviar email a {selectedContact.name}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Mail className="w-16 h-16 mb-4 opacity-20" />
                <p>Selecciona un contacto para ver sus detalles</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
