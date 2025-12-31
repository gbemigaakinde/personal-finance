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

  // Page templates
  const pages = {
    dashboard: null,
    transactions: null,
    categories: null,
    settings: null
  };

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

  function renderPage(view = 'dashboard') {
    let content = '';
    if (view === 'dashboard' && pages.dashboard) content = pages.dashboard;
    else if (view === 'transactions' && pages.transactions) content = pages.transactions;
    else if (view === 'categories' && pages.categories) content = pages.categories;
    else if (view === 'settings' && pages.settings) content = pages.settings;
    else content = '<p class="text-center">Page not found.</p>';

    $appContent.innerHTML = content;

    // Update active states
    $navLinks.forEach(l => l.classList.remove('active'));
    $mobileNavLinks.forEach(l => l.classList.remove('active'));
    document.querySelectorAll(`.nav-link[href="#/${view}"], .mobile-nav-link[href="#/${view}"]`)
      .forEach(l => l.classList.add('active'));

    // Page-specific init
    if (view === 'dashboard') {
      updateDashboardSummary();
      ChartsManager.init();
      const insights = document.getElementById('insights-container');
      if (insights) AIInsights.render(insights);
    } else if (view === 'transactions') TransactionsManager.init();
    else if (view === 'categories') CategoriesManager.init();
    else if (view === 'settings') initSettingsPage();

    // Default dates
    document.querySelectorAll('input[type="date"]').forEach(input => {
      if (!input.value) input.value = Utils.getTodayISO();
    });
  }

  function updateDashboardSummary() {
    const transactions = State.getTransactions();
    let monthIncome = 0, monthExpenses = 0;
    const currentMonth = new Date().toISOString().slice(0, 7);

    transactions.forEach(t => {
      if (t.date.startsWith(currentMonth)) {
        t.type === 'income' ? monthIncome += t.amount : monthExpenses += t.amount;
      }
    });

    const totalBalance = transactions.reduce((bal, t) => t.type === 'income' ? bal + t.amount : bal - t.amount, 0);
    const currency = State.getCurrency();

    const els = {
      income: document.getElementById('month-income'),
      expenses: document.getElementById('month-expenses'),
      balance: document.getElementById('current-balance')
    };

    if (els.income) els.income.textContent = Utils.formatCurrency(monthIncome, currency);
    if (els.expenses) els.expenses.textContent = Utils.formatCurrency(monthExpenses, currency);
    if (els.balance) {
      els.balance.textContent = Utils.formatCurrency(totalBalance, currency);
      els.balance.className = totalBalance >= 0 ? 'text-success font-bold text-2xl' : 'text-danger font-bold text-2xl';
    }
  }

  function initSettingsPage() {
    // ... (same as before, unchanged)
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

    // Export / Import / Clear logic unchanged...
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
            alert('Import successful! Reloading...');
            location.reload();
          } else alert('Invalid file.');
        } catch { alert('Error reading file.'); }
      };
      reader.readAsText(file);
      $importFile.value = '';
    });

    $clearBtn.addEventListener('click', () => {
      if (confirm('Delete ALL data permanently?')) {
        Storage.clearAll();
        alert('Data cleared. Reloading...');
        location.reload();
      }
    });
  }

  function handleHashChange() {
    let hash = location.hash.slice(2) || 'dashboard';
    const validViews = ['dashboard', 'transactions', 'categories', 'settings'];
    if (!validViews.includes(hash)) hash = 'dashboard';

    State.setView(hash);
    renderPage(hash);

    // Always close mobile menu on navigation
    if ($mobileToggle && $mobileMenu) {
      $mobileToggle.classList.remove('active');
      $mobileMenu.classList.remove('open');
    }
  }

  function handleModal() {
    const { modalOpen } = State.getState();
    if (modalOpen === 'editTransaction' && $modalOverlay) {
      $modalOverlay.classList.add('open');
    } else {
      $modalOverlay?.classList.remove('open');
    }
  }

  // === Event Listeners ===

  window.addEventListener('hashchange', handleHashChange);

  // Modal
  if ($closeModalBtn) $closeModalBtn.addEventListener('click', () => State.closeModal());
  if ($cancelEditBtn) $cancelEditBtn.addEventListener('click', () => State.closeModal());
  if ($modalOverlay) $modalOverlay.addEventListener('click', e => { if (e.target === $modalOverlay) State.closeModal(); });

  // Hamburger Menu - FINAL WORKING VERSION
  if ($mobileToggle && $mobileMenu) {
    // Toggle menu open/close
    $mobileToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      $mobileToggle.classList.toggle('active');
      $mobileMenu.classList.toggle('open');
    });

    // CRITICAL: Manual navigation for mobile links
    document.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent default only long enough to control flow

        const href = link.getAttribute('href');
        if (!href || !href.startsWith('#/')) return;

        const targetView = href.slice(2);

        // Close menu first
        $mobileToggle.classList.remove('active');
        $mobileMenu.classList.remove('open');

        // Small delay to ensure menu close animation completes before navigation
        setTimeout(() => {
          if (location.hash.slice(1) !== href) {
            location.hash = href;
          } else {
            // If already on the same page, force re-render
            handleHashChange();
          }
        }, 300); // Matches CSS transition time (var(--transition-normal) = 0.3s)
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

  // Global subscriptions
  State.subscribe(currentState => {
    if (currentState.currentView === 'dashboard') updateDashboardSummary();
    handleModal();
  });
  State.subscribe(Storage.persist);

  // Init
  async function initApp() {
    Storage.init();
    await loadPages();
    handleHashChange();
  }

  initApp();
});