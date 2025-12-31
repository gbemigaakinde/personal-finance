// utils.js
// Collection of pure, reusable helper functions used across the app.
// No dependencies, no side effects — purely functional utilities.
// Includes date handling, currency formatting, and common operations.

const Utils = (function () {
  // Private helpers
  const isValidDate = (date) => date instanceof Date && !isNaN(date);

  // Public API
  return {
    /**
     * Formats a number as currency (USD for now, easy to extend later)
     * @param {number} amount - The numeric amount
     * @param {string} [currency='USD'] - Currency code
     * @returns {string} Formatted string, e.g., "$1,234.56" or "-$500.00"
     */
    formatCurrency(amount, currency = 'USD') {
      if (typeof amount !== 'number' || isNaN(amount)) return '$0.00';

      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    },

    /**
     * Parses an ISO date string or Date object into a clean display string
     * @param {string|Date} dateInput
     * @returns {string} Formatted date like "Dec 31, 2025"
     */
    formatDate(dateInput) {
      let date;
      if (typeof dateInput === 'string') {
        date = new Date(dateInput);
      } else if (dateInput instanceof Date) {
        date = dateInput;
      } else {
        return '';
      }

      if (!isValidDate(date)) return '';

      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(date);
    },

    /**
     * Returns today's date as an ISO string (YYYY-MM-DD) for <input type="date">
     * @returns {string}
     */
    getTodayISO() {
      return new Date().toISOString().split('T')[0];
    },

    /**
     * Returns the first day of the current month as ISO string
     * @returns {string}
     */
    getFirstDayOfMonthISO() {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0];
    },

    /**
     * Generates a simple unique ID (not cryptographically secure, sufficient for local use)
     * @returns {string}
     */
    generateId() {
      return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    /**
     * Deep clones a simple object/array (sufficient for our plain data structures)
     * @param {any} obj
     * @returns {any}
     */
    deepClone(obj) {
      return JSON.parse(JSON.stringify(obj));
    },

    /**
     * Capitalizes the first letter of a string
     * @param {string} str
     * @returns {string}
     */
    capitalize(str) {
      if (typeof str !== 'string' || str.length === 0) return '';
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },

    /**
     * Debounces a function call
     * @param {Function} func
     * @param {number} wait - milliseconds
     * @returns {Function}
     */
    debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    },
  };
})();

// Export for use in other modules (will be attached to window in app.js if needed)
// For now, we use a namespace pattern: window.Utils = Utils;
