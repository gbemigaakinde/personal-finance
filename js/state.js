// state.js
// Central state management for the entire application.
// Single source of truth using a simple object with pub-sub pattern.
// All other modules read from or update via this module to ensure consistency.
// State is reactive: subscribers are notified on any change.

const State = (function () {
  // Default application state
  let state = {
    // User preferences
    currency: 'NGN', // Default to Nigerian Naira as requested

    // Data collections
    transactions: [], // Array of transaction objects
    categories: [],   // Array of category strings (names only for simplicity)

    // UI state (not persisted)
    currentView: 'dashboard', // dashboard | transactions | categories | settings
    modalOpen: null,         // null | 'addTransaction' | 'editTransaction' | etc.
    editingTransactionId: null,
  };

  // Default categories (common for personal finance, Nigerian context included)
  const defaultCategories = [
    'Salary',
    'Freelance',
    'Groceries',
    'Dining Out',
    'Transport',
    'Fuel',
    'Rent',
    'Utilities',
    'Internet',
    'Phone',
    'Entertainment',
    'Shopping',
    'Healthcare',
    'Education',
    'Savings',
    'Investment',
    'Transfer',
    'Other Income',
    'Other Expense',
  ];

  // Subscribers: array of callback functions
  let subscribers = [];

  // Private: notify all subscribers of state change
  function notify() {
    subscribers.forEach(callback => {
      try {
        callback(state);
      } catch (err) {
        console.error('Error in state subscriber:', err);
      }
    });
  }

  // Public API
  return {
    /**
     * Initialize or reset state (called on app load)
     * @param {Object} loadedData - Data loaded from storage
     */
    init(loadedData = {}) {
      // Merge loaded data, preserve defaults where missing
      state.transactions = Array.isArray(loadedData.transactions) ? loadedData.transactions : [];
      
      // Ensure categories exist and include defaults
      const savedCategories = Array.isArray(loadedData.categories) ? loadedData.categories : [];
      state.categories = savedCategories.length > 0 ? savedCategories : defaultCategories;

      // Preserve currency preference, default to NGN
      state.currency = typeof loadedData.currency === 'string' ? loadedData.currency : 'NGN';

      // Reset UI state
      state.currentView = 'dashboard';
      state.modalOpen = null;
      state.editingTransactionId = null;

      notify();
    },

    /**
     * Get a deep clone of current state (prevents direct mutation)
     * @returns {Object}
     */
    getState() {
      return Utils.deepClone(state);
    },

    /**
     * Get specific part of state
     */
    getTransactions() {
      return Utils.deepClone(state.transactions);
    },

    getCategories() {
      return Utils.deepClone(state.categories);
    },

    getCurrency() {
      return state.currency;
    },

    /**
     * Update currency preference
     * @param {string} currencyCode - e.g., 'NGN', 'USD', 'EUR'
     */
    setCurrency(currencyCode) {
      if (typeof currencyCode === 'string' && currencyCode.length >= 3) {
        state.currency = currencyCode.toUpperCase();
        notify();
      }
    },

    /**
     * Add a new transaction
     * @param {Object} transaction
     */
    addTransaction(transaction) {
      const newTransaction = {
        id: Utils.generateId(),
        ...transaction,
        amount: Number(transaction.amount), // ensure numeric
        date: transaction.date || Utils.getTodayISO(),
      };
      state.transactions.push(newTransaction);
      notify();
    },

    /**
     * Update existing transaction
     * @param {string} id
     * @param {Object} updates
     */
    updateTransaction(id, updates) {
      const index = state.transactions.findIndex(t => t.id === id);
      if (index !== -1) {
        state.transactions[index] = {
          ...state.transactions[index],
          ...updates,
          amount: Number(updates.amount || state.transactions[index].amount),
        };
        notify();
      }
    },

    /**
     * Delete transaction by id
     * @param {string} id
     */
    deleteTransaction(id) {
      state.transactions = state.transactions.filter(t => t.id !== id);
      notify();
    },

    /**
     * Add a custom category (if not already present)
     * @param {string} categoryName
     */
    addCategory(categoryName) {
      const trimmed = categoryName.trim();
      if (trimmed && !state.categories.includes(trimmed)) {
        state.categories.push(trimmed);
        notify();
      }
    },

    /**
     * Remove a category (only if not default and no transactions use it)
     * @param {string} categoryName
     * @returns {boolean} success
     */
    removeCategory(categoryName) {
      const trimmed = categoryName.trim();
      if (defaultCategories.includes(trimmed)) return false; // cannot remove defaults

      const isUsed = state.transactions.some(t => t.category === trimmed);
      if (isUsed) return false;

      state.categories = state.categories.filter(c => c !== trimmed);
      notify();
      return true;
    },

    /**
     * Set current view for routing
     * @param {string} view
     */
    setView(view) {
      if (['dashboard', 'transactions', 'categories', 'settings'].includes(view)) {
        state.currentView = view;
        notify();
      }
    },

    /**
     * Control modal visibility
     */
    openModal(type, editingId = null) {
      state.modalOpen = type;
      state.editingTransactionId = editingId;
      notify();
    },

    closeModal() {
      state.modalOpen = null;
      state.editingTransactionId = null;
      notify();
    },

    /**
     * Subscribe to state changes
     * @param {Function} callback
     * @returns {Function} unsubscribe
     */
    subscribe(callback) {
      if (typeof callback === 'function') {
        subscribers.push(callback);
        // Immediately call with current state
        callback(state);
      }
      return () => {
        subscribers = subscribers.filter(cb => cb !== callback);
      };
    },
  };
})();

// Make available globally (will be initialized in app.js)
// window.State = State;