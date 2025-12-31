// charts.js
// Handles all chart rendering using Chart.js (loaded via CDN).
// Currently creates two charts for the dashboard:
// 1. Monthly spending breakdown by category (doughnut/pie)
// 2. Income vs Expenses over the last 6 months (bar)
// Charts are responsive, minimalist, and use the app's color palette.

const ChartsManager = (function () {
  let spendingChartInstance = null;
  let trendChartInstance = null;

  // Helper: Get last N months in YYYY-MM format, including current
  function getLastNMonths(n) {
    const months = [];
    const today = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      months.push(`${year}-${month}`);
    }
    return months;
  }

  // Helper: Aggregate transactions by month and type
  function aggregateByMonth(transactions) {
    const monthly = {
      income: {},
      expense: {}
    };

    transactions.forEach(t => {
      const month = t.date.slice(0, 7); // YYYY-MM
      const key = t.type; // 'income' or 'expense'
      if (!monthly[key][month]) monthly[key][month] = 0;
      monthly[key][month] += t.amount;
    });

    return monthly;
  }

  // Helper: Get category totals for current month expenses
  function getCurrentMonthCategoryTotals(transactions) {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const totals = {};

    transactions
      .filter(t => t.type === 'expense' && t.date.startsWith(currentMonth))
      .forEach(t => {
        totals[t.category] = (totals[t.category] || 0) + t.amount;
      });

    // Sort and take top 7, group rest as "Other"
    const sorted = Object.entries(totals)
      .sort(([,a], [,b]) => b - a);

    if (sorted.length <= 7) return Object.fromEntries(sorted);

    const top = sorted.slice(0, 7);
    const otherAmount = sorted.slice(7).reduce((sum, [,amt]) => sum + amt, 0);

    const result = Object.fromEntries(top);
    if (otherAmount > 0) result.Other = otherAmount;
    return result;
  }

  /**
   * Render the spending breakdown doughnut chart
   */
  function renderSpendingChart(ctx) {
    if (!ctx) return;

    const transactions = State.getTransactions();
    const categoryTotals = getCurrentMonthCategoryTotals(transactions);
    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);

    const backgroundColors = [
      '#4361ee', '#3a56d4', '#5d7bff', '#7209b7', '#b5179e',
      '#f72585', '#f08c00', '#2fb344', '#4cc9f0'
    ];

    if (spendingChartInstance) {
      spendingChartInstance.destroy();
    }

    spendingChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels.length ? labels.map(Utils.capitalize) : ['No expenses yet'],
        datasets: [{
          data: data.length ? data : [1],
          backgroundColor: backgroundColors,
          borderWidth: 0,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              font: { size: 14 },
              color: 'var(--color-text-primary)'
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                if (data.length === 0) return '';
                const value = context.parsed;
                const total = data.reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                return `${Utils.formatCurrency(value, State.getCurrency())} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

  /**
   * Render the income vs expense trend bar chart (last 6 months)
   */
  function renderTrendChart(ctx) {
    if (!ctx) return;

    const transactions = State.getTransactions();
    const monthly = aggregateByMonth(transactions);
    const months = getLastNMonths(6);
    const currency = State.getCurrency();

    const incomeData = months.map(m => monthly.income[m] || 0);
    const expenseData = months.map(m => monthly.expense[m] || 0);

    const monthLabels = months.map(m => {
      const [year, month] = m.split('-');
      return new Intl.DateTimeFormat('en-US', { month: 'short', year: year !== new Date().getFullYear().toString() ? 'numeric' : undefined })
        .format(new Date(year, month - 1));
    });

    if (trendChartInstance) {
      trendChartInstance.destroy();
    }

    trendChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: monthLabels,
        datasets: [
          {
            label: 'Income',
            data: incomeData,
            backgroundColor: 'rgba(47, 179, 68, 0.7)', // success green
            borderColor: '#2fb344',
            borderWidth: 1
          },
          {
            label: 'Expenses',
            data: expenseData,
            backgroundColor: 'rgba(224, 49, 49, 0.7)', // danger red
            borderColor: '#e03131',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: value => Utils.formatCurrency(value, currency)
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: { font: { size: 14 }, color: 'var(--color-text-primary)' }
          },
          tooltip: {
            callbacks: {
              label: context => {
                return `${context.dataset.label}: ${Utils.formatCurrency(context.parsed.y, currency)}`;
              }
            }
          }
        }
      }
    });
  }

  /**
   * Public init — called from dashboard when ready
   */
  function init() {
    const spendingCtx = document.getElementById('spending-chart')?.getContext('2d');
    const trendCtx = document.getElementById('trend-chart')?.getContext('2d');

    if (spendingCtx) renderSpendingChart(spendingCtx);
    if (trendCtx) renderTrendChart(trendCtx);

    // Re-render on state change when on dashboard
    State.subscribe(currentState => {
      if (currentState.currentView === 'dashboard') {
        if (spendingCtx) renderSpendingChart(spendingCtx);
        if (trendCtx) renderTrendChart(trendCtx);
      }
    });
  }

  return {
    init
  };
})();

// window.ChartsManager = ChartsManager;