/**
 * Store global para el módulo de Email
 * Gestiona cuenta activa, bandeja de entrada, mensaje seleccionado, borrador
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useEmailStore = create(
  persist(
    (set, get) => ({
      // Estado de cuenta activa
      currentAccount: null,
      accounts: [],
      
      // Estado de inbox
      messages: [],
      selectedMessage: null,
      currentFolder: 'inbox',
      
      // Estado de búsqueda y filtrado
      searchQuery: '',
      filterUnread: false,
      filterStarred: false,
      
      // Estado de composición
      composeDraft: null,
      isComposing: false,
      
      // Estados de carga
      loading: {
        accounts: false,
        messages: false,
        sending: false,
        syncing: false,
      },
      
      // Paginación
      pagination: {
        page: 1,
        limit: 50,
        total: 0,
      },
      
      // Actions - Cuentas
      setCurrentAccount: (account) => set({ currentAccount: account }),
      setAccounts: (accounts) => set({ accounts }),
      addAccount: (account) => set((state) => ({
        accounts: [...state.accounts, account],
      })),
      updateAccount: (accountId, data) => set((state) => ({
        accounts: state.accounts.map((acc) =>
          acc.id === accountId ? { ...acc, ...data } : acc
        ),
      })),
      removeAccount: (accountId) => set((state) => ({
        accounts: state.accounts.filter((acc) => acc.id !== accountId),
        currentAccount: state.currentAccount?.id === accountId ? null : state.currentAccount,
      })),
      
      // Actions - Mensajes
      setMessages: (messages) => set({ messages }),
      setSelectedMessage: (message) => set({ selectedMessage: message }),
      updateMessage: (messageId, data) => set((state) => ({
        messages: state.messages.map((msg) =>
          msg.id === messageId ? { ...msg, ...data } : msg
        ),
        selectedMessage:
          state.selectedMessage?.id === messageId
            ? { ...state.selectedMessage, ...data }
            : state.selectedMessage,
      })),
      markAsRead: (messageId) => set((state) => ({
        messages: state.messages.map((msg) =>
          msg.id === messageId ? { ...msg, is_read: true } : msg
        ),
      })),
      toggleStar: (messageId) => set((state) => ({
        messages: state.messages.map((msg) =>
          msg.id === messageId ? { ...msg, is_starred: !msg.is_starred } : msg
        ),
      })),
      
      // Trigger para refrescar mensajes (callback externo)
      refreshMessages: null,
      setRefreshMessages: (callback) => set({ refreshMessages: callback }),
      triggerRefresh: () => {
        const state = get();
        if (state.refreshMessages) {
          state.refreshMessages();
        }
      },
      
      // Actions - Carpetas/Filtros
      setCurrentFolder: (folder) => set({ currentFolder: folder }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setFilterUnread: (value) => set({ filterUnread: value }),
      setFilterStarred: (value) => set({ filterStarred: value }),
      
      // Actions - Composición
      startCompose: (draft = null) => set({
        isComposing: true,
        composeDraft: draft || {
          to: [],
          cc: [],
          bcc: [],
          subject: '',
          body_html: '',
          body_text: '',
        },
      }),
      updateComposeDraft: (data) => set((state) => ({
        composeDraft: { ...state.composeDraft, ...data },
      })),
      closeCompose: () => set({ isComposing: false, composeDraft: null }),
      
      // Actions - Loading
      setLoading: (key, value) => set((state) => ({
        loading: { ...state.loading, [key]: value },
      })),
      
      // Actions - Paginación
      setPagination: (data) => set((state) => ({
        pagination: { ...state.pagination, ...data },
      })),
      
      // Actions - Reset
      reset: () => set({
        currentAccount: null,
        messages: [],
        selectedMessage: null,
        currentFolder: 'inbox',
        searchQuery: '',
        filterUnread: false,
        filterStarred: false,
        composeDraft: null,
        isComposing: false,
      }),
    }),
    {
      name: 'email-storage',
      partialize: (state) => ({
        currentAccount: state.currentAccount,
        currentFolder: state.currentFolder,
      }),
    }
  )
);

export default useEmailStore;
