/**
 * EmailSearchBar.jsx
 * Barra de búsqueda avanzada con filtros
 */

import React, { useState } from 'react';
import { Search, SlidersHorizontal, X, Calendar, Paperclip, User } from 'lucide-react';

export default function EmailSearchBar({ onSearch, onClearSearch }) {
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    subject: '',
    hasAttachment: false,
    dateFrom: '',
    dateTo: '',
    folder: '',
  });

  const handleSearch = () => {
    onSearch({
      query: searchQuery,
      ...filters,
    });
  };

  const handleClear = () => {
    setSearchQuery('');
    setFilters({
      from: '',
      to: '',
      subject: '',
      hasAttachment: false,
      dateFrom: '',
      dateTo: '',
      folder: '',
    });
    setShowFilters(false);
    onClearSearch();
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '' && v !== false);

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Search Bar */}
      <div className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Buscar emails..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="Filtros avanzados"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
          
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Buscar
          </button>
          
          {(searchQuery || hasActiveFilters) && (
            <button
              onClick={handleClear}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Limpiar búsqueda"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="px-4 pb-4 border-t border-gray-200 pt-4">
          <div className="grid grid-cols-2 gap-4">
            {/* From */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                <User className="w-4 h-4" />
                De:
              </label>
              <input
                type="text"
                value={filters.from}
                onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                placeholder="remitente@ejemplo.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* To */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                <User className="w-4 h-4" />
                Para:
              </label>
              <input
                type="text"
                value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                placeholder="destinatario@ejemplo.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Subject */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Asunto:
              </label>
              <input
                type="text"
                value={filters.subject}
                onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                placeholder="Buscar en asunto..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Date Range */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4" />
                Desde:
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4" />
                Hasta:
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Has Attachment */}
            <div className="col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.hasAttachment}
                  onChange={(e) => setFilters({ ...filters, hasAttachment: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <Paperclip className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">Solo emails con adjuntos</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
