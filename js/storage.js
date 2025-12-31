// storage.js
// Abstraction layer for data persistence.
// Phase 1: Uses LocalStorage only.
// Designed as a thin wrapper so we can swap to Firebase/Firestore later with minimal changes.
// All save/load operations go through here.

const Storage = (function () {
  // Key used in LocalStorage
  const STORAGE_KEY = 'personalFinanceAppData';

  /**
   * Load data from LocalStorage
   * @returns {Object} Parsed data or empty object on failure/first load
   */
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return {}; // First-time user
      }
      return JSON.parse(raw);
    } catch (err) {
      console.error('Failed to load data from LocalStorage:', err);
      // Optional: could prompt user to clear corrupted data
      return {};
    }
  }

  /**
   * Save current state to LocalStorage
   * Only persists data fields (not transient UI state)
   * @param {Object} state - Current app state from State module
   */
  function save(state) {
    try {
      // Select only persistable fields
      const dataToSave = {
        currency: state.currency,
        transactions: state.transactions,
        categories: state.categories,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (err) {
      console.error('Failed to save data to LocalStorage:', err);
      // In production, could show a toast notification
    }
  }

  /**
   * Public API
   */
  return {
    /**
     * Initialize the app by loading saved data and passing to State
     */
    init() {
      const loadedData = load();
      State.init(loadedData);
      // Save immediately in case defaults were applied
      save(State.getState());
    },

    /**
     * Save the current state whenever it changes
     * Called by app.js on every state notification
     */
    persist() {
      save(State.getState());
    },

    /**
     * Export data as JSON (for future download feature)
     * @returns {string} JSON string
     */
    exportData() {
      const state = State.getState();
      const data = {
        currency: state.currency,
        transactions: state.transactions,
        categories: state.categories,
        exportDate: new Date().toISOString(),
        appVersion: '1.0.0', // placeholder
      };
      return JSON.stringify(data, null, 2);
    },

    /**
     * Import data (for future restore feature)
     * Validates basic structure before applying
     * @param {Object} importedData
     * @returns {boolean} success
     */
    importData(importedData) {
      try {
        if (typeof importedData !== 'object' || importedData === null) return false;

        const validated = {
          currency: typeof importedData.currency === 'string' ? importedData.currency : 'NGN',
          transactions: Array.isArray(importedData.transactions) ? importedData.transactions : [],
          categories: Array.isArray(importedData.categories) ? importedData.categories : [],
        };

        State.init(validated);
        save(State.getState());
        return true;
      } catch (err) {
        console.error('Import failed:', err);
        return false;
      }
    },

    /**
     * Clear all data (for settings reset)
     */
    clearAll() {
      localStorage.removeItem(STORAGE_KEY);
      State.init(); // resets to defaults
    },
  };
})();

// Make available globally
// window.Storage = Storage;