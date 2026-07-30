# Ledger ✓

*A calm place for your tasks.*

Ledger is a modern, minimal to-do list app built with plain HTML, CSS, and JavaScript — no frameworks, no build step, no backend. Everything runs in the browser and your tasks are stored locally.

## Features

- **Add tasks quickly** — type and hit Enter, or expand the details panel for a description, due date, priority, and category
- **Priorities & categories** — tag tasks as Low / Medium / High priority and organize them by custom categories
- **Due dates** — see what's due today or overdue at a glance
- **Search & filter** — filter by status (All / Active / Completed), priority, category, or due date, and sort manually, by due date, alphabetically, or by priority
- **Drag-to-reorder** — arrange tasks in your own manual order
- **Pin tasks** — keep important items at the top of the list
- **Inline editing** — edit a task's title, description, due date, priority, or category without leaving the list
- **Duplicate & delete** — quickly copy a task or remove it, with a confirmation modal for destructive actions
- **Bulk actions** — clear all completed tasks or delete everything at once
- **Stats dashboard** — track total, active, completed, and overdue tasks with a live completion percentage
- **Import / export** — export your task list to PDF, or import tasks from a JSON file
- **Themes** — switch between light and dark mode, and choose from three accent colors (Denim, Sage, Plum)
- **Accessible by design** — skip link, ARIA roles/labels throughout, keyboard-friendly controls, and live regions for dynamic updates

## Tech stack

- **HTML5** for structure and semantic markup
- **CSS3** with custom properties (design tokens) for theming — see `style.css`
- **Vanilla JavaScript** (`app.js`) for all app logic and local storage persistence
- **Fonts**: [Fraunces](https://fonts.google.com/specimen/Fraunces), [Inter](https://fonts.google.com/specimen/Inter), and [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) via Google Fonts
- **[jsPDF](https://github.com/parallax/jsPDF)** for exporting tasks to PDF

## Getting started

Ledger has no dependencies to install and no build process.

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/ledger.git
   cd ledger
   ```
2. Open `index.html` in your browser — that's it.

   Alternatively, serve it locally for the best experience (some browsers restrict local file access for scripts):
   ```bash
   npx serve .
   # or
   python3 -m http.server
   ```

## File structure

```
ledger/
├── index.html    # App markup and task card template
├── style.css     # Design tokens, themes, and all styling
├── app.js        # App logic: state, rendering, filtering, storage
└── README.md
```

## Usage

- **Add a task**: type a title in the input at the top and press Enter or click **Add task**. Click **+ Add details** to set a description, due date, priority, or category before adding.
- **Complete a task**: click the checkbox on the left of any task.
- **Edit a task**: click the pencil icon to edit inline, then **Save** or press **Esc** to cancel.
- **Reorder tasks**: drag using the handle on the left, or choose a sort option in the sidebar.
- **Filter & search**: use the sidebar filters (status, priority, category, due date) and the search bar to narrow down the list.
- **Switch theme**: use the sun/moon icon for dark mode, and the color swatches for accent theme.
- **Export / import**: use the download icon to export tasks as a PDF, or the upload icon to import a previously exported JSON file.

## Browser support

Ledger works in all modern evergreen browsers (Chrome, Firefox, Safari, Edge). It uses standard Web APIs and requires JavaScript to be enabled.

## Contributing

Issues and pull requests are welcome. If you spot a bug or have an idea for a feature, feel free to open an issue.

## License

[MIT](LICENSE)
