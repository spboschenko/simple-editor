# Simple Editor

Universal environment for designing and visualising parametric 2D structures with persistent local storage and project management.

Built with React, TypeScript, and Konva.

## Run

```bash
npm install
npm run dev
```

## User Flow

```
Dashboard  (browse / create / delete projects)
    ↓
Workspace  (Canvas, Layers, Inspector — design parametric objects)
    ↓
← Back to Dashboard  (File menu — auto-saves project to localStorage)
```

On launch the application opens the **Dashboard**.
Clicking **Create New Project** allocates a new project in localStorage and opens the **Workspace**.
Clicking an existing project card loads its stored payload into the editor.
Returning via `File → ← Back to Dashboard` auto-saves the current state.

## Architecture Highlights

| Concept | Description |
|---|---|
| **Project** | Container with metadata (id, name, timestamps) and a payload (serialised editor state). |
| **Persistent Storage** | `localStorage` — the primary backend. Managed by `project-storage.ts`. |
| **Canvas** | Konva-based 2D viewport with rulers, zoom, pan. |
| **Layers** | Tree panel listing all parametric objects with visibility / lock toggles. |
| **Inspector** | Figma-style property editor with inline labels, 2-column grid, and label-scrub. |
| **Parametric Objects** | Currently a single Rectangle; the architecture supports arbitrary shapes. |

## Documentation

See `docs/` for architecture, state model, rendering and interaction details.
