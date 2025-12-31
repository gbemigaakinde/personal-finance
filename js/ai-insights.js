// ai-insights.js
// Generates simple, rule-based financial insights from current transaction data.
// Phase 1: 100% client-side, deterministic rules — no external API.
// Fully separated module for easy future upgrade to LLM-based insights.
// Insights are displayed on the dashboard.

const AIInsights = (function () {
  // Helper: Get transactions for a specific month (YYYY-MM format)
  function getTransactionsForMonth(transactions, yearMonth) {
    return transactions.filter(t => t.date.startsWith(yearMonth));
  }

  // Helper: Get current and previous month in YYYY-MM format
  function getCurrentAndPreviousMonth() {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // 1-12
    const current = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    let prevYear = currentYear;
    let prevMonth = currentMonth - 1;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear--;
    }
    const previous = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

    return { current, previous };
  }

  // Helper: Calculate total spending by category for a month
  function getCategoryTotals(transactions, type = 'expense') {
    const totals = {};
    transactions
      .filter(t => t.type === type)
      .forEach(t => {
        totals[t.category] = (totals[t.category] || 0) + t.amount;
      });
    return totals;
  }

  // Main function: Generate array of insight strings
  function generateInsights() {
    const insights = [];
    const transactions = State.getTransactions();
    const currency = State.getCurrency();

    if (transactions.length === 0) {
      insights.push('Start adding transactions to get personalized insights.');
      return insights;
    }

    const { current, previous } = getCurrentAndPreviousMonth();

    const currentMonthTx = getTransactionsForMonth(transactions, current);
    const previousMonthTx = getTransactionsForMonth(transactions, previous);

    // Expense category totals
    const currentExpenses = getCategoryTotals(currentMonthTx, 'expense');
    const previousExpenses = getCategoryTotals(previousMonthTx, 'expense');

    const currentTotalExpense = Object.values(currentExpenses).reduce((sum, v) => sum + v, 0);
    const previousTotalExpense = Object.values(previousExpenses).reduce((sum, v) => sum + v, 0);

    // 1. Top spending categories this month
    if (currentTotalExpense > 0) {
      const sortedCategories = Object.entries(currentExpenses)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3);

      if (sortedCategories.length > 0) {
        const top = sortedCategories[0][0];
        const percentage = Math.round((sortedCategories[0][1] / currentTotalExpense) * 100);
        insights.push(`Your biggest expense this month is ${Utils.capitalize(top)} (${percentage}% of total spending).`);
      }

      if (sortedCategories.length > 1) {
        const topThree = sortedCategories.map(([cat]) => Utils.capitalize(cat)).join(', ');
        insights.push(`Top spending categories: ${topThree}.`);
      }
    }

    // 2. Month-over-month spending change
    if (previousTotalExpense > 0 && currentTotalExpense > 0) {
      const change = ((currentTotalExpense - previousTotalExpense) / previousTotalExpense) * 100;
      if (Math.abs(change) > 10) { // only if significant
        const direction = change > 0 ? 'increased' : 'decreased';
        const absChange = Math.abs(change).toFixed(0);
        insights.push(`Your total spending ${direction} by ${absChange}% compared to last month.`);
      }
    } else if (previousTotalExpense === 0 && currentTotalExpense > 0) {
      insights.push('You started tracking expenses this month — great job!');
    }

    // 3. Specific high-growth category warning
    for (const [category, currentAmount] of Object.entries(currentExpenses)) {
      const previousAmount = previousExpenses[category] || 0;
      if (previousAmount > 0 && currentAmount > previousAmount * 1.5) { // 50%+ increase
        const increase = Math.round(((currentAmount - previousAmount) / previousAmount) * 100);
        insights.push(`You spent ${increase}% more on ${Utils.capitalize(category)} this month.`);
      }
    }

    // 4. Savings rate (income - expenses) / income
    const currentIncome = getCategoryTotals(currentMonthTx, 'income');
    const totalIncome = Object.values(currentIncome).reduce((sum, v) => sum + v, 0);

    if (totalIncome > 0) {
      const savings = totalIncome - currentTotalExpense;
      const savingsRate = Math.round((savings / totalIncome) * 100);
      if (savingsRate > 0) {
        insights.push(`Your savings rate this month is ${savingsRate}%. Keep it up!`);
      } else if (savingsRate < 0) {
        insights.push(`You spent more than you earned this month. Consider reviewing your budget.`);
      }
    }

    // 5. No insights fallback
    if (insights.length === 1 && insights[0].includes('Start adding')) {
      // already handled
    } else if (insights.length === 0) {
      insights.push('Your spending looks consistent this month.');
    }

    // Limit to 4 most relevant insights
    return insights.slice(0, 4);
  }

  /**
   * Render insights to the DOM (called on dashboard)
   * @param {HTMLElement} container
   */
  function render(container) {
    if (!container) return;

    const insights = generateInsights();

    container.innerHTML = `
      <h3>Insights</h3>
      <ul class="list-item" style="gap: var(--space-3);">
        ${insights.map(insight => `
          <li class="flex items-start gap-3">
            <span style="color: var(--color-primary); margin-top: 0.35em;">•</span>
            <span>${insight}</span>
          </li>
        `).join('')}
      </ul>
    `;
  }

  /**
   * Public API
   */
  return {
    generateInsights, // for testing or future use
    render
  };
})();

// window.AIInsights = AIInsights;