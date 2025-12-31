// app.js
// Entry point and orchestrator for the entire application.
// Handles routing, page loading, modal control, hamburger menu, global updates, and initialization.

document.addEventListener('DOMContentLoaded', () => {
  const $appContent = document.getElementById('app-content');
  const $navLinks = document.querySelectorAll('.nav-link');
  const $modalOverlay = document.getElementById('edit-transaction-modal');
  const $closeModalBtn = document.getElementById('close-modal');
  const $cancelEditBtn = document.getElementById('cancel-edit');

  // Hamburger menu elements
  const $mobileToggle = document.getElementById('mobile-menu-toggle');
  const $mobileMenu = document.getElementById('mobile-menu');
  const $mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

  // Page templates (loaded as fragments)
  const pages = {
    dashboard: null,
    transactions: null,
    categories: null,
    settings: null
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

    // Update active nav links (both desktop and mobile)
    $navLinks.forEach(link => link.classList.remove('active'));
    $mobileNavLinks.forEach(link => link.classList.remove('active'));

    const desktopActive = document.querySelector(`.nav-link[href="#/${view}"]`);
    const mobileActive = document.querySelector(`.mobile-nav-link[href="#/${view}"]`);

    if (desktopActive) desktopActive.classList.add('active');
    if (mobileActive) mobileActive.classList.add('active');

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

    // Set default date inputs to today
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
      if (!input.value) input.value = Utils.getTodayISO();
    });
  }

  /**
   * Update dashboard summary cards
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
   * Settings page initialization
   */
  function initSettingsPage() {
    const $currencySelect = document.getElementById('currency-select');
    const $exportBtn = document.getElementById('export-data');
    const $importBtn = document.getElementById('import-data-btn');
    const $importFile = document.getElementById('import-file');
    const $clearBtn = document.getElementById('clear-data');

    if (!$currencySelect) return;

    $currencySelect.value = State.getCurrency();

    $currencySelect.addEventListener('change', () => {
      State.setCurrency($currencySelect.value);
      alert(`Currency updated to ${$currencySelect.value}!`);
    });

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

    $importBtn.addEventListener('click', () => $importFile.click());
    $importFile.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const data = JSON.parse(ev.target.result);
          if (Storage.importData(data)) {
            alert('Data imported successfully! Reloading...');
            location.reload();
          } else {
            alert('Invalid file format.');
          }
        } catch (err) {
          alert('Error reading file.');
        }
      };
      reader.readAsText(file);
      $importFile.value = '';
    });

    $clearBtn.addEventListener('click', () => {
      if (confirm('Are you sure? This will permanently delete ALL data.')) {
        Storage.clearAll();
        alert('Data cleared. Reloading...');
        location.reload();
      }
    });
  }

  /**
   * Handle hash routing
   */
  function handleHashChange() {
    let hash = location.hash.slice(2) || 'dashboard';
    if (!['dashboard', 'transactions', 'categories', 'settings'].includes(hash)) {
      hash = 'dashboard';
    }
    State.setView(hash);
    renderPage(hash);

    // Close mobile menu on navigation
    if ($mobileToggle?.classList.contains('active')) {
      $mobileToggle.classList.remove('active');
      $mobileMenu?.classList.remove('open');
    }
  }

  /**
   * Modal control
   */
  function handleModal() {
    const { modalOpen } = State.getState();
    if (modalOpen === 'editTransaction' && $modalOverlay) {
      $modalOverlay.classList.add('open');
    } else {
      $modalOverlay?.classList.remove('open');
    }
  }

  // === Event Listeners ===

  // Routing
  window.addEventListener('hashchange', handleHashChange);

  // Transaction edit modal
  if ($closeModalBtn) $closeModalBtn.addEventListener('click', () => State.closeModal());
  if ($cancelEditBtn) $cancelEditBtn.addEventListener('click', () => State.closeModal());
  if ($modalOverlay) {
    $modalOverlay.addEventListener('click', e => {
      if (e.target === $modalOverlay) State.closeModal();
    });
  }

    // Hamburger menu toggle
  if ($mobileToggle && $mobileMenu) {
    $mobileToggle.addEventListener('click', () => {
      $mobileToggle.classList.toggle('active');
      $mobileMenu.classList.toggle('open');
    });

    // Handle mobile nav link clicks — manually navigate + close menu
    $mobileNavLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        // Do NOT preventDefault — we want the hash to change
        // But close menu immediately
        $mobileToggle.classList.remove('active');
        $mobileMenu.classList.remove('open');

        const href = link.getAttribute('href');
        if (href && href.startsWith('#/')) {
          const newView = href.slice(2);
          if (newView !== State.getState().currentView) {
            // Force navigation even if same page (rare)
            location.hash = href;
          }
        }
      });
    });

    // Close on backdrop click
    $mobileMenu.addEventListener('click', (e) => {
      if (e.target === $mobileMenu) {
        $mobileToggle.classList.remove('active');
        $mobileMenu.classList.remove('open');
      }
    });
  }

  // Global state updates
  State.subscribe(currentState => {
    if (currentState.currentView === 'dashboard') {
      updateDashboardSummary();
    }
    handleModal();
  });

  // Persist data on every state change
  State.subscribe(Storage.persist);

  // === App Initialization ===
  async function initApp() {
    Storage.init();
    await loadPages();
    handleHashChange(); // Initial render
  }

  initApp();
});