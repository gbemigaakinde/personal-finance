// transactions.js
// Manages all transaction-related logic and UI for the transactions page.
// Handles adding, editing, deleting, listing, and filtering transactions.
// Communicates exclusively through the central State module.

const TransactionsManager = (function () {
  // Cached DOM elements
  let $transactionsList;
  let $transactionForm;
  let $amountInput;
  let $categorySelect;
  let $descriptionInput;
  let $dateInput;
  let $typeIncome;
  let $typeExpense;
  let $emptyState;
  let $balanceSummary;

  /**
   * Calculate totals from current transactions
   * @returns {Object} {income, expenses, balance}
   */
  function calculateTotals() {
    const transactions = State.getTransactions();
    let income = 0;
    let expenses = 0;

    transactions.forEach(t => {
      if (t.type === 'income') {
        income += t.amount;
      } else {
        expenses += t.amount;
      }
    });

    return {
      income,
      expenses,
      balance: income - expenses
    };
  }

  /**
   * Render the transaction list
   */
  function renderTransactions() {
    const transactions = State.getTransactions();
    const currency = State.getCurrency();

    // Sort newest first
    const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sorted.length === 0) {
      $emptyState.classList.remove('hidden');
      $transactionsList.innerHTML = '';
      return;
    }

    $emptyState.classList.add('hidden');

    $transactionsList.innerHTML = sorted.map(t => {
      const amountClass = t.type === 'income' ? 'positive' : 'negative';
      const amountSign = t.type === 'income' ? '+' : '-';

      return `
        <li class="list-item">
          <div>
            <div class="font-medium">${Utils.capitalize(t.category)}</div>
            <div class="text-muted small">${t.description || 'No description'}</div>
            <div class="text-muted small">${Utils.formatDate(t.date)}</div>
          </div>
          <div class="flex items-center gap-3">
            <span class="font-semibold ${amountClass}">
              ${amountSign}${Utils.formatCurrency(t.amount, currency)}
            </span>
            <button class="btn btn-outline btn-sm edit-transaction" data-id="${t.id}">Edit</button>
            <button class="btn btn-outline btn-danger btn-sm delete-transaction" data-id="${t.id}">Delete</button>
          </div>
        </li>
      `;
    }).join('');
  }

  /**
   * Render quick balance summary (shown on transactions page)
   */
  function renderSummary() {
    if (!$balanceSummary) return;
    const {income, expenses, balance} = calculateTotals();
    const currency = State.getCurrency();

    $balanceSummary.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
        <div class="card text-center">
          <div class="text-muted small">Total Income</div>
          <div class="text-success font-bold text-xl">
            ${Utils.formatCurrency(income, currency)}
          </div>
        </div>
        <div class="card text-center">
          <div class="text-muted small">Total Expenses</div>
          <div class="text-danger font-bold text-xl">
            ${Utils.formatCurrency(expenses, currency)}
          </div>
        </div>
        <div class="card text-center">
          <div class="text-muted small">Current Balance</div>
          <div class="font-bold text-xl ${balance >= 0 ? 'text-success' : 'text-danger'}">
            ${Utils.formatCurrency(balance, currency)}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Populate form for editing a transaction
   */
  function populateEditForm(transactionId) {
    const transaction = State.getTransactions().find(t => t.id === transactionId);
    if (!transaction) return;

    $amountInput.value = Math.abs(transaction.amount);
    $descriptionInput.value = transaction.description || '';
    $dateInput.value = transaction.date;
    $categorySelect.value = transaction.category;

    // Set type radio
    if (transaction.type === 'income') {
      $typeIncome.checked = true;
    } else {
      $typeExpense.checked = true;
    }

    State.openModal('editTransaction', transactionId);
  }

  /**
   * Handle form submission (add or edit)
   */
  function handleSubmit(e) {
    e.preventDefault();

    const amount = parseFloat($amountInput.value);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    const type = $typeIncome.checked ? 'income' : 'expense';
    const finalAmount = type === 'income' ? amount : -amount;

    const transactionData = {
      amount: Math.abs(finalAmount),
      type,
      category: $categorySelect.value,
      description: $descriptionInput.value.trim(),
      date: $dateInput.value || Utils.getTodayISO(),
    };

    const editingId = State.getState().editingTransactionId;

    if (editingId) {
      State.updateTransaction(editingId, transactionData);
      State.closeModal();
    } else {
      State.addTransaction(transactionData);
    }

    // Reset form
    $transactionForm.reset();
    $typeExpense.checked = true; // default to expense
    $dateInput.value = Utils.getTodayISO();
    $amountInput.focus();
  }

  /**
   * Handle edit and delete clicks (event delegation)
   */
  function handleListClick(e) {
    const id = e.target.dataset.id;
    if (!id) return;

    if (e.target.classList.contains('edit-transaction')) {
      populateEditForm(id);
    } else if (e.target.classList.contains('delete-transaction')) {
      if (confirm('Are you sure you want to delete this transaction?')) {
        State.deleteTransaction(id);
      }
    }
  }

  /**
   * Populate category dropdown
   */
  function populateCategoryOptions() {
    const categories = State.getCategories();
    $categorySelect.innerHTML = categories
      .sort((a, b) => a.localeCompare(b))
      .map(cat => `<option value="${cat}">${Utils.capitalize(cat)}</option>`)
      .join('');
  }

  /**
   * Initialize the transactions page
   */
  function init() {
    if (!document.getElementById('transactions-page')) return;

    // Cache elements
    $transactionsList = document.getElementById('transactions-list');
    $transactionForm = document.getElementById('transaction-form');
    $amountInput = document.getElementById('amount');
    $categorySelect = document.getElementById('category');
    $descriptionInput = document.getElementById('description');
    $dateInput = document.getElementById('date');
    $typeIncome = document.getElementById('type-income');
    $typeExpense = document.getElementById('type-expense');
    $emptyState = document.querySelector('#transactions-page .empty-state');
    $balanceSummary = document.getElementById('balance-summary');

    // Initial render
    populateCategoryOptions();
    renderTransactions();
    renderSummary();

    // Event listeners
    $transactionForm.addEventListener('submit', handleSubmit);
    $transactionsList.addEventListener('click', handleListClick);

    // Subscribe to state changes
    State.subscribe(currentState => {
      if (currentState.currentView === 'transactions') {
        populateCategoryOptions();
        renderTransactions();
        renderSummary();
      }
    });
  }

  return {
    init
  };
})();

// window.TransactionsManager = TransactionsManager;