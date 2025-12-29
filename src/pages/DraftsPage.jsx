import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getDrafts, getEmailAccounts } from '@/services/emailService';
import DraftsList from '@/components/email/DraftsList';
import DraftEditor from '@/components/email/DraftEditor';

export default function DraftsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [drafts, setDrafts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingDraft, setEditingDraft] = useState(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);
    
    try {
      // Cargar cuentas
      const accountsData = await getEmailAccounts(user.id);
      setAccounts(accountsData);
      
      if (accountsData.length > 0) {
        setSelectedAccount(accountsData[0]);
        // Cargar borradores de la primera cuenta
        const draftsData = await getDrafts(user.id, accountsData[0].account_id);
        setDrafts(draftsData);
      }
    } catch (err) {
      console.error('Error loading drafts:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDraft = (draft) => {
    setEditingDraft(draft);
    setShowEditor(true);
  };

  const handleNewDraft = () => {
    if (!selectedAccount) {
      alert('Debes tener al menos una cuenta de email configurada');
      return;
    }
    setEditingDraft(null);
    setShowEditor(true);
  };

  const handleDraftDeleted = (draftId) => {
    setDrafts(prev => prev.filter(d => d.draft_id !== draftId));
  };

  const handleDraftSent = () => {
    loadData(); // Recargar lista después de enviar
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Borradores</h1>
              <p className="text-sm text-gray-600 mt-1">
                {drafts.length} {drafts.length === 1 ? 'borrador' : 'borradores'} guardados
              </p>
            </div>
          </div>

          <button
            onClick={handleNewDraft}
            disabled={accounts.length === 0}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
            <span>Nuevo Borrador</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto py-6 px-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {accounts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-600 mb-4">
              No tienes cuentas de email configuradas
            </p>
            <button
              onClick={() => navigate('/email')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Configurar cuenta de email
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm">
            <DraftsList
              drafts={drafts}
              onSelectDraft={handleSelectDraft}
              onDraftDeleted={handleDraftDeleted}
            />
          </div>
        )}
      </div>

      {/* Draft Editor Modal */}
      {showEditor && selectedAccount && (
        <DraftEditor
          draft={editingDraft}
          accountId={selectedAccount.account_id || selectedAccount.id}
          ownerUserId={user?.id}
          onClose={() => {
            setShowEditor(false);
            setEditingDraft(null);
            loadData(); // Recargar lista al cerrar
          }}
          onSent={handleDraftSent}
        />
      )}
    </div>
  );
}
