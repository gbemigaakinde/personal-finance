// categories.js
// Handles all category-related logic and UI updates.
// Responsible for rendering the categories page and managing add/remove operations.
// Works exclusively through the central State module.

const CategoriesManager = (function () {
  // Cache DOM elements (set during init)
  let $categoriesList;
  let $addCategoryForm;
  let $newCategoryInput;
  let $emptyState;

  /**
   * Render the full list of categories
   */
  function renderCategories() {
    const categories = State.getCategories();
    const defaultCategories = [
      'Salary', 'Freelance', 'Groceries', 'Dining Out', 'Transport', 'Fuel',
      'Rent', 'Utilities', 'Internet', 'Phone', 'Entertainment', 'Shopping',
      'Healthcare', 'Education', 'Savings', 'Investment', 'Transfer',
      'Other Income', 'Other Expense'
    ];

    if (categories.length === 0) {
      $emptyState.classList.remove('hidden');
      $categoriesList.innerHTML = '';
      return;
    }

    $emptyState.classList.add('hidden');

    $categoriesList.innerHTML = categories
      .sort((a, b) => a.localeCompare(b)) // alphabetical sort
      .map(category => {
        const isDefault = defaultCategories.includes(category);
        const disableRemove = isDefault ? 'disabled' : '';
        const removeBtn = isDefault
          ? ''
          : `<button class="btn btn-outline btn-danger btn-sm remove-category" data-category="${category}" ${disableRemove}>
               Remove
             </button>`;

        return `
          <li class="list-item">
            <span>${Utils.capitalize(category)}</span>
            ${removeBtn}
          </li>
        `;
      })
      .join('');
  }

  /**
   * Handle form submission for adding a new category
   */
  function handleAddCategory(e) {
    e.preventDefault();
    const value = $newCategoryInput.value.trim();

    if (!value) {
      // Simple feedback: could enhance with error class later
      $newCategoryInput.focus();
      return;
    }

    // Check for duplicates (case-sensitive for simplicity)
    const existing = State.getCategories();
    if (existing.includes(value)) {
      alert('Category already exists.');
      $newCategoryInput.value = '';
      return;
    }

    State.addCategory(value);
    $newCategoryInput.value = '';
    $newCategoryInput.focus();
  }

  /**
   * Handle remove category button clicks (event delegation)
   */
  function handleRemoveCategory(e) {
    if (!e.target.matches('.remove-category')) return;

    const category = e.target.dataset.category;
    if (!category) return;

    const success = State.removeCategory(category);
    if (!success) {
      alert('Cannot remove default categories or categories in use.');
    }
  }

  /**
   * Initialize the categories page
   */
  function init() {
    // Cache elements only if on categories page
    if (document.getElementById('categories-page')) {
      $categoriesList = document.getElementById('categories-list');
      $addCategoryForm = document.getElementById('add-category-form');
      $newCategoryInput = document.getElementById('new-category-input');
      $emptyState = document.querySelector('.empty-state');

      // Initial render
      renderCategories();

      // Event listeners
      $addCategoryForm.addEventListener('submit', handleAddCategory);
      $categoriesList.addEventListener('click', handleRemoveCategory);

      // Subscribe to state changes
      State.subscribe(currentState => {
        if (currentState.currentView === 'categories') {
          renderCategories();
        }
      });
    }
  }

  // Public API (only init needed for now)
  return {
    init
  };
})();

// Will be called from app.js after DOM loaded
// window.CategoriesManager = CategoriesManager;