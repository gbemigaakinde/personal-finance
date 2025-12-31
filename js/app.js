// app.js
// Entry point and orchestrator for the entire application.
// Handles routing, page loading, modal control, global updates, and initialization.

document.addEventListener('DOMContentLoaded', () => {
  const $appContent = document.getElementById('app-content');
  const $navLinks = document.querySelectorAll('.nav-link');
  const $modalOverlay = document.getElementById('edit-transaction-modal');
  const $closeModalBtn = document.getElementById('close-modal');
  const $cancelEditBtn = document.getElementById('cancel-edit');

  // Page templates (loaded as fragments)
  const pages = {
    dashboard: null,
    transactions: null,
    categories: null,
    settings: null  // Added settings page
  };

  /**
   * Load HTML fragments (only once)
   */
  async function loadPages() {
    try {
      const [dash, trans, cat, set] = await Promise.all([
        fetch('dashboard.html').then(r => r.text()),
        fetch('transactions.html').then(r => r.text()),
        fetch('categories.html').then(r => r.text()),
        fetch('settings.html').then(r => r.text())
      ]);
      pages.dashboard = dash;
      pages.transactions = trans;
      pages.categories = cat;
      pages.settings = set;
    } catch (err) {
      console.error('Failed to load pages:', err);
      $appContent.innerHTML = '<p class="text-center text-danger">Error loading app. Please refresh.</p>';
    }
  }

  /**
   * Render a page based on hash
   */
  function renderPage(view = 'dashboard') {
    let content = '';
    if (view === 'dashboard' && pages.dashboard) {
      content = pages.dashboard;
    } else if (view === 'transactions' && pages.transactions) {
      content = pages.transactions;
    } else if (view === 'categories' && pages.categories) {
      content = pages.categories;
    } else if (view === 'settings' && pages.settings) {
      content = pages.settings;
    } else {
      content = '<p class="text-center">Page not found.</p>';
    }

    $appContent.innerHTML = content;

    // Update active nav link
    $navLinks.forEach(link => link.classList.remove('active'));
    const activeLink = document.querySelector(`a[href="#/${view}"]`);
    if (activeLink) activeLink.classList.add('active');

    // Initialize page-specific managers
    if (view === 'dashboard') {
      updateDashboardSummary();
      ChartsManager.init();
      const insightsContainer = document.getElementById('insights-container');
      if (insightsContainer) AIInsights.render(insightsContainer);
    } else if (view === 'transactions') {
      TransactionsManager.init();
    } else if (view === 'categories') {
      CategoriesManager.init();
    } else if (view === 'settings') {
      initSettingsPage();
    }

    // Set default date inputs to today (for transaction forms)
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
      if (!input.value) input.value = Utils.getTodayISO();
    });
  }

  /**
   * Update dashboard summary cards (monthly income, expenses, total balance)
   */
  function updateDashboardSummary() {
    const transactions = State.getTransactions();
    let monthIncome = 0;
    let monthExpenses = 0;
    const currentMonth = new Date().toISOString().slice(0, 7);

    transactions.forEach(t => {
      if (t.date.startsWith(currentMonth)) {
        if (t.type === 'income') monthIncome += t.amount;
        else monthExpenses += t.amount;
      }
    });

    const totalBalance = transactions.reduce((bal, t) =>
      t.type === 'income' ? bal + t.amount : bal - t.amount, 0
    );

    const currency = State.getCurrency();

    const monthIncomeEl = document.getElementById('month-income');
    const monthExpensesEl = document.getElementById('month-expenses');
    const balanceEl = document.getElementById('current-balance');

    if (monthIncomeEl) monthIncomeEl.textContent = Utils.formatCurrency(monthIncome, currency);
    if (monthExpensesEl) monthExpensesEl.textContent = Utils.formatCurrency(monthExpenses, currency);
    if (balanceEl) {
      balanceEl.textContent = Utils.formatCurrency(totalBalance, currency);
      balanceEl.className = totalBalance >= 0
        ? 'text-success font-bold text-2xl'
        : 'text-danger font-bold text-2xl';
    }
  }

  /**
   * Settings page specific initialization
   */
  function initSettingsPage() {
    const $currencySelect = document.getElementById('currency-select');
    const $exportBtn = document.getElementById('export-data');
    const $importBtn = document.getElementById('import-data-btn');
    const $importFile = document.getElementById('import-file');
    const $clearBtn = document.getElementById('clear-data');

    if (!$currencySelect) return; // Safety check

    // Set current currency in dropdown
    $currencySelect.value = State.getCurrency();

    // Currency change handler
    $currencySelect.addEventListener('change', () => {
      State.setCurrency($currencySelect.value);
      alert(`Currency updated to ${$currencySelect.value}! All amounts will now display accordingly.`);
    });

    // Export data
    $exportBtn.addEventListener('click', () => {
      const dataStr = Storage.exportData();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trackmoni-backup-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    // Import data
    $importBtn.addEventListener('click', () => $importFile.click());
    $importFile.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const data = JSON.parse(ev.target.result);
          if (Storage.importData(data)) {
            alert('Data imported successfully! The page will now reload.');
            location.reload();
          } else {
            alert('Invalid or corrupted file format.');
          }
        } catch (err) {
          alert('Error reading file. Please ensure it is a valid JSON backup.');
        }
      };
      reader.readAsText(file);
      $importFile.value = ''; // Reset input
    });

    // Clear all data
    $clearBtn.addEventListener('click', () => {
      if (confirm('Are you sure? This will permanently delete ALL your transactions and reset the app to defaults.')) {
        Storage.clearAll();
        alert('All data cleared. Reloading...');
        location.reload();
      }
    });
  }

  /**
   * Handle hash changes for routing
   */
  function handleHashChange() {
    let hash = location.hash.slice(2) || 'dashboard'; // remove #/
    // Normalize view name
    if (!['dashboard', 'transactions', 'categories', 'settings'].includes(hash)) {
      hash = 'dashboard';
    }
    State.setView(hash);
    renderPage(hash);
  }

  /**
   * Modal control (edit transaction)
   */
  function handleModal() {
    const { modalOpen } = State.getState();
    if (modalOpen === 'editTransaction' && $modalOverlay) {
      $modalOverlay.classList.add('open');
    } else {
      $modalOverlay?.classList.remove('open');
    }
  }

  // Event listeners
  window.addEventListener('hashchange', handleHashChange);

  if ($closeModalBtn) $closeModalBtn.addEventListener('click', () => State.closeModal());
  if ($cancelEditBtn) $cancelEditBtn.addEventListener('click', () => State.closeModal());
  if ($modalOverlay) {
    $modalOverlay.addEventListener('click', e => {
      if (e.target === $modalOverlay) State.closeModal();
    });
  }

  // Global state subscription
  State.subscribe(currentState => {
    // Update dashboard summary whenever state changes and we're on dashboard
    if (currentState.currentView === 'dashboard') {
      updateDashboardSummary();
    }
    // Keep modal in sync
    handleModal();
  });

  // Persist state on every change
  State.subscribe(Storage.persist);

  // Initialize app
  async function initApp() {
    Storage.init();           // Load saved data into State
    await loadPages();        // Fetch all HTML fragments
    handleHashChange();       // Render initial page
  }

  initApp();
});
