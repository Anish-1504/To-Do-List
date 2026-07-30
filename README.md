# Ledger — a calm to‑do list

Ledger is a modern, responsive to-do list app built with plain HTML, CSS, and JavaScript. It offers a calm, minimalist experience for managing daily tasks without any build step or backend setup.

## What it does

You can create and organize tasks with:
- titles and descriptions
- due dates
- priority levels
- categories
- completion status
- pinning and reordering

The app also includes search, filters, statistics, undo support, and theme customization.

## Run it

### Option A — open directly
Open [index.html](index.html) in your browser.

### Option B — run with a local server
```bash
npm install
npm start
```
Then visit http://localhost:3000.

## Features

- Add, edit, delete, and complete tasks
- Search and filter by status, priority, category, and due date
- Sort tasks manually or by date, alphabet, or priority
- View progress statistics and overdue counts
- Pin important tasks and duplicate existing ones
- Export your current task list as a PDF
- Save everything locally in the browser using Local Storage
- Use dark mode and accent themes

## Project files

- [index.html](index.html) — app structure and UI
- [style.css](style.css) — styling, layout, and themes
- [app.js](app.js) — app logic, task management, and export behavior
- [server.js](server.js) — simple local server for running the app
- [package.json](package.json) — npm start script

## Notes

- Tasks are stored in your browser, so they remain available on the same device/browser.
- The export feature creates a PDF version of the current task list.
