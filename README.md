# WorkWith — Development Snapshot (Alpha)

A lightweight Electron + Vite desktop app for managing multiple Kanban-style task boards. This README reflects the current development stage so contributors and testers can run, package, and troubleshoot the app quickly.

## Status
- Active development, alpha quality. Core flows work; features and styles are evolving.

## Quick start
```bash
git clone <repository-url>
cd Workwith
npm install

# Development (Vite + Electron)
npm run dev

# Production build (Vite bundle only)
npm run build

# Package desktop app (creates installer in dist/)
npm run dist
```

Scripts
- `npm run dev`: Start Vite and Electron with HMR
- `npm run build`: Build web assets to `dist/`
- `npm run dist`: Build assets then package via electron-builder
- `npm run electron:prod`: Run Electron against built assets

## Implemented now
- Multiple boards with create/rename/delete and last-accessed info
- Three columns per board: In Process, Today, Done
- Drag-and-drop between columns and reordering within a column
- Subtasks and optional time estimate (HH:MM)
- Polished dark UI with glass effects; custom window controls
- Local persistence using `localStorage`

## Important notes for this stage
- Styles for the task board are loaded at runtime using Vite-friendly URLs to work in both dev and production:
  - `new URL('./TaskBoardModal.css', import.meta.url).href`
  - `new URL('./TaskCard.css', import.meta.url).href`
- Build artifacts in `dist/` are ignored by Git. If `dist/` was previously tracked:
  ```bash
  git rm -r --cached dist
  git add .gitignore
  git commit -m "chore(git): ignore dist build output"
  ```

## Windows packaging tips
electron-builder downloads auxiliary archives that contain symlinks. On Windows, creating symlinks may require Developer Mode or admin privileges.

If `npm run dist` fails with “Cannot create symbolic link”:
1) Enable Developer Mode (recommended) → Settings → Privacy & security → For developers.
2) Or run Terminal as Administrator.
3) If a previous attempt partially extracted files, clear the cache then retry:
```powershell
rmdir "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign" -Recurse -Force
npm run dist
```

## Project structure
```
Workwith/
├── electron/                 # Electron main & preload
├── src/
│   ├── components/
│   │   ├── task-board-modal.js
│   │   ├── TaskBoardModal.css
│   │   ├── TaskCard.css
│   │   └── (TaskCard.js created by build-time generation or future work)
│   └── home.js
├── index.html
├── vite.config.js
├── package.json
└── .gitignore                # includes dist/
```

## Tech stack
- Electron 28, Vite 5, Vanilla JS, CSS
- Packaging: electron-builder
- Storage: `localStorage`

## Roadmap (short)
- Export/import board data
- Task metadata (priority, tags)
- Keyboard shortcuts and accessibility polish
- Tests and crash reporting

## License
MIT