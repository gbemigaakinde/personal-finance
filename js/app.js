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
    categories: null
  };

  /**
   * Load HTML fragments (only once)
   */
  async function loadPages() {
    try {
      const [dash, trans, cat] = await Promise.all([
        fetch('dashboard.html').then(r => r.text()),
        fetch('transactions.html').then(r => r.text()),
        fetch('categories.html').then(r => r.text())
      ]);
      pages.dashboard = dash;
      pages.transactions = trans;
      pages.categories = cat;
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
    } else {
      content = '<p class="text-center">Page not found.</p>';
    }

    $appContent.innerHTML = content;

    // Update active nav link
    $navLinks.forEach(link => link.classList.remove('active'));
    document.querySelector(`a[href="#/${view}"]`)?.classList.add('active');

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
    }

    // Set default date inputs to today
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
      if (!input.value) input.value = Utils.getTodayISO();
    });
  }

  /**
   * Update dashboard summary cards (income, expenses, balance)
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

    document.getElementById('month-income').textContent = Utils.formatCurrency(monthIncome, currency);
    document.getElementById('month-expenses').textContent = Utils.formatCurrency(monthExpenses, currency);
    const balanceEl = document.getElementById('current-balance');
    balanceEl.textContent = Utils.formatCurrency(totalBalance, currency);
    balanceEl.className = totalBalance >= 0 ? 'text-success font-bold text-2xl' : 'text-danger font-bold text-2xl';
  }

  /**
   * Handle hash changes for routing
   */
  function handleHashChange() {
    const hash = location.hash.slice(2) || 'dashboard'; // remove #/
    State.setView(hash);
    renderPage(hash);
  }

  /**
   * Modal control
   */
  function handleModal() {
    const isOpen = State.getState().modalOpen;
    if (isOpen && $modalOverlay) {
      $modalOverlay.classList.add('open');
    } else {
      $modalOverlay?.classList.remove('open');
    }
  }

  // Event listeners
  window.addEventListener('hashchange', handleHashChange);
  if ($closeModalBtn) $closeModalBtn.addEventListener('click', () => State.closeModal());
  if ($cancelEditBtn) $cancelEditBtn.addEventListener('click', () => State.closeModal());
  if ($modalOverlay) $modalOverlay.addEventListener('click', e => {
    if (e.target === $modalOverlay) State.closeModal();
  });

  // Global state subscription for cross-page updates
  State.subscribe(currentState => {
    if (currentState.currentView === 'dashboard') {
      updateDashboardSummary();
    }
    handleModal();
  });

  // Initialize app
  async function initApp() {
    // Load persisted data
    Storage.init();

    // Load page templates
    await loadPages();

    // Initial render based on hash or default
    handleHashChange();

    // Persist on every state change
    State.subscribe(Storage.persist);
  }

  initApp();
});
