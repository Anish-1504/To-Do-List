/**
 * LEDGER — a calm to-do list
 * Vanilla JS, no dependencies. All state lives in `tasks` and is
 * persisted to localStorage after every mutation.
 */
(function () {
  "use strict";

  /* ============================== constants ============================== */
  const STORAGE_KEY = "ledger.tasks.v1";
  const THEME_KEY = "ledger.theme";
  const ACCENT_KEY = "ledger.accent";
  const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };
  const UNDO_WINDOW_MS = 6000;

  /* ============================== state =================================== */
  /** @typedef {{
   *   id: string, title: string, description: string, dueDate: string|null,
   *   priority: 'low'|'medium'|'high', category: string, createdAt: string,
   *   completedAt: string|null, completed: boolean, pinned: boolean, order: number
   * }} Task */

  /** @type {Task[]} */
  let tasks = [];
  let orderCounter = 0;

  const filters = {
    status: "all",       // all | active | completed
    priority: "all",      // all | low | medium | high
    category: "all",      // all | <category>
    due: "all",           // all | today | overdue
    search: "",
  };
  let sortBy = "manual";

  let editingId = null;
  let draggedId = null;
  let pendingConfirmResolve = null;

  /* ============================== dom refs ================================ */
  const el = {
    form: document.getElementById("task-form"),
    titleInput: document.getElementById("task-title"),
    descInput: document.getElementById("task-description"),
    dueInput: document.getElementById("task-due"),
    priorityInput: document.getElementById("task-priority"),
    categoryInput: document.getElementById("task-category"),
    categoryDatalist: document.getElementById("category-list"),
    toggleDetailsBtn: document.getElementById("toggle-details"),
    detailsPanel: document.getElementById("task-details"),
    formError: document.getElementById("form-error"),

    searchInput: document.getElementById("search-input"),
    resultCount: document.getElementById("result-count"),

    taskList: document.getElementById("task-list"),
    emptyState: document.getElementById("empty-state"),
    emptySub: document.getElementById("empty-sub"),
    template: document.getElementById("task-template"),

    statTotal: document.getElementById("stat-total"),
    statActive: document.getElementById("stat-active"),
    statCompleted: document.getElementById("stat-completed"),
    statOverdue: document.getElementById("stat-overdue"),
    statPercent: document.getElementById("stat-percent"),
    progressBar: document.getElementById("progress-bar"),
    progressFill: document.getElementById("progress-fill"),

    tabs: Array.from(document.querySelectorAll(".tab[data-status]")),
    filterPriority: document.getElementById("filter-priority"),
    filterCategory: document.getElementById("filter-category"),
    filterDue: document.getElementById("filter-due"),
    sortBySelect: document.getElementById("sort-by"),
    resetFiltersBtn: document.getElementById("reset-filters"),

    clearCompletedBtn: document.getElementById("clear-completed-btn"),
    deleteAllBtn: document.getElementById("delete-all-btn"),

    themeToggle: document.getElementById("theme-toggle"),
    swatches: Array.from(document.querySelectorAll(".swatch")),

    exportBtn: document.getElementById("export-btn"),
    importBtn: document.getElementById("import-btn"),
    importInput: document.getElementById("import-input"),

    toastContainer: document.getElementById("toast-container"),

    confirmModal: document.getElementById("confirm-modal"),
    confirmTitle: document.getElementById("confirm-title"),
    confirmBody: document.getElementById("confirm-body"),
    confirmOk: document.getElementById("confirm-ok"),
    confirmCancel: document.getElementById("confirm-cancel"),
  };

  /* ============================== utilities ================================ */
  const uid = () => `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  const todayISO = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return toDateOnly(d);
  };

  function toDateOnly(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function isOverdue(task) {
    if (!task.dueDate || task.completed) return false;
    return task.dueDate < todayISO();
  }

  function isDueToday(task) {
    if (!task.dueDate) return false;
    return task.dueDate === todayISO();
  }

  function formatDueDate(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((date - today) / 86400000);
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays === -1) return "Yesterday";
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined });
  }

  function formatTimestamp(iso) {
    if (!iso) return "";
    const date = new Date(iso);
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " · " +
      date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function debounce(fn, wait) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  /* ============================== persistence =============================== */
  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch (e) {
      console.error("Failed to load tasks from storage", e);
      return [];
    }
  }

  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
      console.error("Failed to save tasks", e);
      showToast("Couldn't save — storage may be full.");
    }
  }

  function loadPreferences() {
    const theme = localStorage.getItem(THEME_KEY);
    const accent = localStorage.getItem(ACCENT_KEY);
    if (theme === "dark") {
      document.body.setAttribute("data-theme", "dark");
      el.themeToggle.setAttribute("aria-pressed", "true");
      el.themeToggle.setAttribute("aria-label", "Switch to light mode");
    }
    if (accent) {
      document.body.setAttribute("data-accent", accent);
      el.swatches.forEach((s) => {
        const active = s.dataset.accent === accent;
        s.classList.toggle("is-active", active);
        s.setAttribute("aria-pressed", String(active));
      });
    }
  }

  /* ============================== toasts ===================================== */
  function showToast(message, options = {}) {
    const { actionLabel, onAction, duration = 4000 } = options;
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");

    const text = document.createElement("span");
    text.textContent = message;
    toast.appendChild(text);

    if (actionLabel && onAction) {
      const btn = document.createElement("button");
      btn.className = "toast-action";
      btn.type = "button";
      btn.textContent = actionLabel;
      btn.addEventListener("click", () => {
        onAction();
        dismiss();
      });
      toast.appendChild(btn);
    }

    el.toastContainer.appendChild(toast);

    const dismiss = () => {
      toast.classList.add("is-leaving");
      setTimeout(() => toast.remove(), 180);
    };
    const timer = setTimeout(dismiss, duration);
    toast.addEventListener("mouseenter", () => clearTimeout(timer));
  }

  /* ============================== confirm modal ============================== */
  function showConfirm(title, body) {
    el.confirmTitle.textContent = title;
    el.confirmBody.textContent = body;
    el.confirmModal.hidden = false;
    el.confirmOk.focus();
    return new Promise((resolve) => {
      pendingConfirmResolve = resolve;
    });
  }

  function closeConfirm(result) {
    el.confirmModal.hidden = true;
    if (pendingConfirmResolve) {
      pendingConfirmResolve(result);
      pendingConfirmResolve = null;
    }
  }

  el.confirmOk.addEventListener("click", () => closeConfirm(true));
  el.confirmCancel.addEventListener("click", () => closeConfirm(false));
  el.confirmModal.addEventListener("click", (e) => {
    if (e.target === el.confirmModal) closeConfirm(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !el.confirmModal.hidden) closeConfirm(false);
  });

  /* ============================== task CRUD ================================== */
  function createTask(data) {
    const now = new Date().toISOString();
    /** @type {Task} */
    const task = {
      id: uid(),
      title: data.title.trim(),
      description: (data.description || "").trim(),
      dueDate: data.dueDate || null,
      priority: data.priority || "medium",
      category: (data.category || "").trim(),
      createdAt: now,
      completedAt: null,
      completed: false,
      pinned: false,
      order: orderCounter++,
    };
    tasks.push(task);
    saveTasks();
    return task;
  }

  function updateTask(id, patch) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    Object.assign(task, patch);
    saveTasks();
  }

  function deleteTask(id, { silent = false } = {}) {
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) return;
    const [removed] = tasks.splice(index, 1);
    saveTasks();
    render();
    if (!silent) {
      showToast("Task deleted.", {
        actionLabel: "Undo",
        onAction: () => {
          tasks.splice(index, 0, removed);
          saveTasks();
          render();
          showToast("Task restored.");
        },
        duration: UNDO_WINDOW_MS,
      });
    }
  }

  function toggleComplete(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date().toISOString() : null;
    saveTasks();
    render();
    showToast(task.completed ? "Task completed. Nice work." : "Task marked active.");
  }

  function duplicateTask(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const copy = createTask({
      title: task.title + " (copy)",
      description: task.description,
      dueDate: task.dueDate,
      priority: task.priority,
      category: task.category,
    });
    render();
    showToast("Task duplicated.");
    return copy;
  }

  function togglePin(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    task.pinned = !task.pinned;
    saveTasks();
    render();
  }

  async function clearCompleted() {
    const completedCount = tasks.filter((t) => t.completed).length;
    if (completedCount === 0) {
      showToast("No completed tasks to clear.");
      return;
    }
    const ok = await showConfirm(
      "Clear completed tasks?",
      `This will remove ${completedCount} completed task${completedCount === 1 ? "" : "s"}. This can't be undone.`
    );
    if (!ok) return;
    tasks = tasks.filter((t) => !t.completed);
    saveTasks();
    render();
    showToast("Completed tasks cleared.");
  }

  async function deleteAllTasks() {
    if (tasks.length === 0) {
      showToast("There's nothing to delete.");
      return;
    }
    const ok = await showConfirm(
      "Delete all tasks?",
      `This will permanently remove all ${tasks.length} task${tasks.length === 1 ? "" : "s"}. This can't be undone.`
    );
    if (!ok) return;
    tasks = [];
    saveTasks();
    render();
    showToast("All tasks deleted.");
  }

  /* ============================== filtering & sorting ========================= */
  function getVisibleTasks() {
    const search = filters.search.trim().toLowerCase();

    let list = tasks.filter((task) => {
      if (filters.status === "active" && task.completed) return false;
      if (filters.status === "completed" && !task.completed) return false;
      if (filters.priority !== "all" && task.priority !== filters.priority) return false;
      if (filters.category !== "all" && task.category !== filters.category) return false;
      if (filters.due === "today" && !isDueToday(task)) return false;
      if (filters.due === "overdue" && !isOverdue(task)) return false;
      if (search) {
        const haystack = `${task.title} ${task.description} ${task.category}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      switch (sortBy) {
        case "createdDesc":
          return b.createdAt.localeCompare(a.createdAt);
        case "createdAsc":
          return a.createdAt.localeCompare(b.createdAt);
        case "due": {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.localeCompare(b.dueDate);
        }
        case "alpha":
          return a.title.localeCompare(b.title);
        case "priority":
          return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        case "manual":
        default:
          return a.order - b.order;
      }
    });

    // pinned tasks always float to top, preserving relative sort within each group
    list.sort((a, b) => Number(b.pinned) - Number(a.pinned));

    return list;
  }

  /* ============================== rendering ==================================== */
  function render() {
    renderCategoryOptions();
    renderStats();
    renderList();
  }

  function renderCategoryOptions() {
    const categories = Array.from(new Set(tasks.map((t) => t.category).filter(Boolean))).sort();

    const currentFilterValue = el.filterCategory.value;
    el.filterCategory.innerHTML = '<option value="all">Any category</option>' +
      categories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
    el.filterCategory.value = categories.includes(currentFilterValue) ? currentFilterValue : "all";
    if (!categories.includes(filters.category)) filters.category = el.filterCategory.value;

    el.categoryDatalist.innerHTML = categories.map((c) => `<option value="${escapeHtml(c)}"></option>`).join("");
  }

  function renderStats() {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const active = total - completed;
    const overdue = tasks.filter(isOverdue).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

    el.statTotal.textContent = total;
    el.statActive.textContent = active;
    el.statCompleted.textContent = completed;
    el.statOverdue.textContent = overdue;
    el.statPercent.textContent = `${percent}%`;
    el.progressFill.style.width = `${percent}%`;
    el.progressBar.setAttribute("aria-valuenow", String(percent));
  }

  function renderList() {
    const visible = getVisibleTasks();
    const manualSort = sortBy === "manual";

    el.resultCount.textContent = visible.length !== tasks.length
      ? `${visible.length} of ${tasks.length}`
      : `${tasks.length} task${tasks.length === 1 ? "" : "s"}`;

    // Preserve editing state across re-render by remembering it, then clear the list.
    el.taskList.innerHTML = "";

    if (visible.length === 0) {
      el.emptyState.hidden = false;
      el.emptySub.textContent = tasks.length === 0
        ? "Add your first task above to get started."
        : "No tasks match your filters. Try adjusting search or filters.";
      return;
    }
    el.emptyState.hidden = true;

    const fragment = document.createDocumentFragment();
    visible.forEach((task) => fragment.appendChild(buildTaskCard(task, manualSort)));
    el.taskList.appendChild(fragment);
  }

  function buildTaskCard(task, manualSort) {
    const node = el.template.content.cloneNode(true);
    const li = node.querySelector(".task-card");
    li.dataset.id = task.id;
    li.draggable = manualSort;
    if (task.completed) li.classList.add("is-complete");
    if (task.pinned) li.classList.add("is-pinned");

    // checkbox
    const checkBtn = node.querySelector(".check-btn");
    checkBtn.setAttribute("aria-checked", String(task.completed));
    checkBtn.setAttribute("aria-label", task.completed ? "Mark task active" : "Mark task complete");
    checkBtn.addEventListener("click", () => toggleComplete(task.id));

    // priority + title
    node.querySelector("[data-priority-pill]").dataset.level = task.priority;
    node.querySelector("[data-priority-pill]").setAttribute("title", `${capitalize(task.priority)} priority`);
    node.querySelector("[data-title]").textContent = task.title;

    // pin button
    const pinBtn = node.querySelector("[data-pin-btn]");
    pinBtn.setAttribute("aria-label", task.pinned ? "Unpin task" : "Pin task to top");
    pinBtn.addEventListener("click", () => togglePin(task.id));

    // description
    const descEl = node.querySelector("[data-description]");
    if (task.description) {
      descEl.textContent = task.description;
      descEl.hidden = false;
    }

    // meta chips
    const dueEl = node.querySelector("[data-due]");
    if (task.dueDate) {
      dueEl.hidden = false;
      dueEl.textContent = `Due ${formatDueDate(task.dueDate)}`;
      dueEl.classList.toggle("is-overdue", isOverdue(task));
      dueEl.classList.toggle("is-today", isDueToday(task));
    }
    const catEl = node.querySelector("[data-category]");
    if (task.category) {
      catEl.hidden = false;
      catEl.textContent = task.category;
    }
    const createdEl = node.querySelector("[data-created]");
    createdEl.textContent = task.completed && task.completedAt
      ? `Done ${formatTimestamp(task.completedAt)}`
      : `Added ${formatTimestamp(task.createdAt)}`;

    // action buttons
    node.querySelector("[data-edit-btn]").addEventListener("click", () => enterEditMode(li, task));
    node.querySelector("[data-duplicate-btn]").addEventListener("click", () => duplicateTask(task.id));
    node.querySelector("[data-delete-btn]").addEventListener("click", () => deleteTask(task.id));

    // edit form wiring
    setupEditForm(node, li, task);

    // drag and drop (manual sort only)
    if (manualSort) {
      li.addEventListener("dragstart", () => {
        draggedId = task.id;
        requestAnimationFrame(() => li.classList.add("is-dragging"));
      });
      li.addEventListener("dragend", () => {
        li.classList.remove("is-dragging");
        document.querySelectorAll(".is-drop-target").forEach((n) => n.classList.remove("is-drop-target"));
        draggedId = null;
      });
      li.addEventListener("dragover", (e) => {
        e.preventDefault();
        if (draggedId && draggedId !== task.id) li.classList.add("is-drop-target");
      });
      li.addEventListener("dragleave", () => li.classList.remove("is-drop-target"));
      li.addEventListener("drop", (e) => {
        e.preventDefault();
        li.classList.remove("is-drop-target");
        if (!draggedId || draggedId === task.id) return;
        reorderTasks(draggedId, task.id);
      });
    }

    if (editingId === task.id) {
      // re-enter edit mode after a re-render triggered elsewhere
      requestAnimationFrame(() => enterEditMode(li, task));
    }

    return node;
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function reorderTasks(draggedTaskId, targetTaskId) {
    const dragged = tasks.find((t) => t.id === draggedTaskId);
    const target = tasks.find((t) => t.id === targetTaskId);
    if (!dragged || !target) return;

    // Reassign `order` values so dragged sits just before target's position.
    const withoutDragged = tasks.filter((t) => t.id !== draggedTaskId).sort((a, b) => a.order - b.order);
    const targetIndex = withoutDragged.findIndex((t) => t.id === targetTaskId);
    withoutDragged.splice(targetIndex, 0, dragged);
    withoutDragged.forEach((t, i) => (t.order = i));
    saveTasks();
    render();
  }

  /* ============================== inline editing ================================ */
  function enterEditMode(li, task) {
    editingId = task.id;
    const viewEl = li.querySelector(".task-view");
    const formEl = li.querySelector(".task-edit");
    viewEl.hidden = true;
    formEl.hidden = false;

    const titleInput = formEl.querySelector("[data-edit-title]");
    titleInput.value = task.title;
    formEl.querySelector("[data-edit-desc]").value = task.description;
    formEl.querySelector("[data-edit-due]").value = task.dueDate || "";
    formEl.querySelector("[data-edit-priority]").value = task.priority;
    formEl.querySelector("[data-edit-category]").value = task.category;

    titleInput.focus();
    titleInput.setSelectionRange(titleInput.value.length, titleInput.value.length);
  }

  function exitEditMode(li) {
    editingId = null;
    const viewEl = li.querySelector(".task-view");
    const formEl = li.querySelector(".task-edit");
    viewEl.hidden = false;
    formEl.hidden = true;
  }

  function setupEditForm(node, li, task) {
    const formEl = node.querySelector(".task-edit");
    const titleInput = formEl.querySelector("[data-edit-title]");
    const descInput = formEl.querySelector("[data-edit-desc]");
    const dueInput = formEl.querySelector("[data-edit-due]");
    const priorityInput = formEl.querySelector("[data-edit-priority]");
    const categoryInput = formEl.querySelector("[data-edit-category]");
    const hint = formEl.querySelector("[data-autosave-hint]");

    function readForm() {
      return {
        title: titleInput.value.trim(),
        description: descInput.value.trim(),
        dueDate: dueInput.value || null,
        priority: priorityInput.value,
        category: categoryInput.value.trim(),
      };
    }

    const autoSave = debounce(() => {
      const data = readForm();
      if (!data.title) return; // never autosave an empty title
      updateTask(task.id, data);
      hint.classList.add("is-visible");
      renderCategoryOptions();
      renderStats();
      setTimeout(() => hint.classList.remove("is-visible"), 1200);
    }, 600);

    [titleInput, descInput, dueInput, priorityInput, categoryInput].forEach((input) => {
      input.addEventListener("input", autoSave);
    });

    formEl.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = readForm();
      if (!data.title) {
        titleInput.focus();
        return;
      }
      updateTask(task.id, data);
      showToast("Task updated.");
      exitEditMode(li);
      render();
    });

    formEl.querySelector("[data-cancel-edit]").addEventListener("click", () => {
      exitEditMode(li);
      render();
    });

    formEl.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        exitEditMode(li);
        render();
      }
    });
  }

  /* ============================== add-task form ================================= */
  el.toggleDetailsBtn.addEventListener("click", () => {
    const expanded = el.toggleDetailsBtn.getAttribute("aria-expanded") === "true";
    el.toggleDetailsBtn.setAttribute("aria-expanded", String(!expanded));
    el.detailsPanel.hidden = expanded;
    el.toggleDetailsBtn.textContent = expanded
      ? "+ Add details (description, due date, priority, category)"
      : "− Hide details";
  });

  el.form.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = el.titleInput.value.trim();
    if (!title) {
      el.formError.textContent = "A task needs a title before you can add it.";
      el.titleInput.focus();
      return;
    }
    el.formError.textContent = "";

    createTask({
      title,
      description: el.descInput.value,
      dueDate: el.dueInput.value || null,
      priority: el.priorityInput.value,
      category: el.categoryInput.value,
    });

    el.form.reset();
    el.priorityInput.value = "medium";
    el.titleInput.focus();
    render();
    showToast("Task added.");
  });

  el.titleInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      el.form.reset();
      el.priorityInput.value = "medium";
      el.formError.textContent = "";
      el.titleInput.blur();
    }
  });

  /* ============================== search & filters =============================== */
  el.searchInput.addEventListener("input", debounce((e) => {
    filters.search = e.target.value;
    renderList();
  }, 150));

  el.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      el.tabs.forEach((t) => {
        t.classList.remove("is-active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("is-active");
      tab.setAttribute("aria-selected", "true");
      filters.status = tab.dataset.status;
      renderList();
    });
  });

  el.filterPriority.addEventListener("change", (e) => {
    filters.priority = e.target.value;
    renderList();
  });
  el.filterCategory.addEventListener("change", (e) => {
    filters.category = e.target.value;
    renderList();
  });
  el.filterDue.addEventListener("change", (e) => {
    filters.due = e.target.value;
    renderList();
  });
  el.sortBySelect.addEventListener("change", (e) => {
    sortBy = e.target.value;
    renderList();
  });

  el.resetFiltersBtn.addEventListener("click", () => {
    filters.status = "all";
    filters.priority = "all";
    filters.category = "all";
    filters.due = "all";
    filters.search = "";
    sortBy = "manual";

    el.tabs.forEach((t) => {
      const active = t.dataset.status === "all";
      t.classList.toggle("is-active", active);
      t.setAttribute("aria-selected", String(active));
    });
    el.filterPriority.value = "all";
    el.filterCategory.value = "all";
    el.filterDue.value = "all";
    el.sortBySelect.value = "manual";
    el.searchInput.value = "";

    render();
  });

  /* ============================== bulk actions =================================== */
  el.clearCompletedBtn.addEventListener("click", clearCompleted);
  el.deleteAllBtn.addEventListener("click", deleteAllTasks);

  /* ============================== theme & accent ================================== */
  el.themeToggle.addEventListener("click", () => {
    const isDark = document.body.getAttribute("data-theme") === "dark";
    if (isDark) {
      document.body.removeAttribute("data-theme");
      localStorage.setItem(THEME_KEY, "light");
      el.themeToggle.setAttribute("aria-pressed", "false");
      el.themeToggle.setAttribute("aria-label", "Switch to dark mode");
    } else {
      document.body.setAttribute("data-theme", "dark");
      localStorage.setItem(THEME_KEY, "dark");
      el.themeToggle.setAttribute("aria-pressed", "true");
      el.themeToggle.setAttribute("aria-label", "Switch to light mode");
    }
  });

  el.swatches.forEach((swatch) => {
    swatch.addEventListener("click", () => {
      const accent = swatch.dataset.accent;
      document.body.setAttribute("data-accent", accent);
      localStorage.setItem(ACCENT_KEY, accent);
      el.swatches.forEach((s) => {
        const active = s === swatch;
        s.classList.toggle("is-active", active);
        s.setAttribute("aria-pressed", String(active));
      });
    });
  });

  /* ============================== import / export ================================== */
  el.exportBtn.addEventListener("click", () => {
    if (tasks.length === 0) {
      showToast("There's nothing to export yet.");
      return;
    }
    const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ledger-tasks-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("Tasks exported.");
  });

  el.importBtn.addEventListener("click", () => el.importInput.click());

  el.importInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error("Invalid file: expected a list of tasks.");

      const imported = parsed
        .filter((item) => item && typeof item.title === "string" && item.title.trim())
        .map((item) => ({
          id: uid(),
          title: String(item.title).trim(),
          description: typeof item.description === "string" ? item.description : "",
          dueDate: typeof item.dueDate === "string" ? item.dueDate : null,
          priority: ["low", "medium", "high"].includes(item.priority) ? item.priority : "medium",
          category: typeof item.category === "string" ? item.category : "",
          createdAt: item.createdAt || new Date().toISOString(),
          completedAt: item.completedAt || null,
          completed: Boolean(item.completed),
          pinned: Boolean(item.pinned),
          order: orderCounter++,
        }));

      if (imported.length === 0) {
        showToast("No valid tasks found in that file.");
        return;
      }

      tasks = tasks.concat(imported);
      saveTasks();
      render();
      showToast(`Imported ${imported.length} task${imported.length === 1 ? "" : "s"}.`);
    } catch (err) {
      console.error(err);
      showToast("Couldn't import that file — check it's a valid Ledger export.");
    } finally {
      el.importInput.value = "";
    }
  });

  /* ============================== global drop fallback ================================ */
  // Allow dropping onto the list container (after the last item) to move a task to the end.
  el.taskList.addEventListener("dragover", (e) => e.preventDefault());
  el.taskList.addEventListener("drop", (e) => {
    if (e.target !== el.taskList || !draggedId) return;
    const dragged = tasks.find((t) => t.id === draggedId);
    if (!dragged) return;
    const maxOrder = Math.max(0, ...tasks.map((t) => t.order));
    dragged.order = maxOrder + 1;
    saveTasks();
    render();
  });

  /* ============================== init ================================================= */
  function init() {
    loadPreferences();
    tasks = loadTasks();
    orderCounter = tasks.length ? Math.max(...tasks.map((t) => t.order || 0)) + 1 : 0;
    render();
  }

  init();
})();
