# Ledger — a calm to‑do list

A modern, responsive to-do list app. No build step, no external runtime dependencies, no backend — everything is saved to your browser's Local Storage.

## Run it

**Option A — just open it**
Double-click `index.html` (or open it via File → Open in your browser).

**Option B — with a local server**
```
npm install
npm start
```
Then visit http://localhost:3000. (`npm install` is a no-op here since there are no dependencies — the server is plain Node.js.)

## Features

- Add, edit, delete, and complete tasks with title, description, due date, priority, and category
- Search, filter (status / priority / category / due today / overdue), and sort (manual drag order, due date, created date, alphabetical, priority)
- Statistics dashboard with a live completion progress bar
- Pin important tasks, duplicate tasks, drag-and-drop reordering
- Undo for deletes, confirmation prompts for destructive bulk actions
- Toast notifications, keyboard support (Enter to add, Escape to cancel editing)
- Dark/light mode and three accent color themes, all remembered between visits
- Import/export your tasks as a JSON file
- Fully responsive, keyboard-accessible, and works offline

## Files

- `index.html` — markup and structure
- `style.css` — all styling, theming, and animation
- `app.js` — application logic and Local Storage persistence
- `server.js` / `package.json` — optional zero-dependency static server for `npm start`
