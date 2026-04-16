# Architecture Overview

Universal environment for designing and visualising parametric 2D structures with persistent local storage and project management.

## Key Principles

- **Document-first** — the single source of truth for geometry is the core `DocumentState`.
- **Renderer-separated** — Konva reads state and renders; it does not own application truth.
- **UI state separate** — selection, active tool, rulers live in `UIState`.
- **Transient interaction** — previews during drag/resize live in `InteractionState` and do not mutate the document until commit.
- **One action path** — all mutations go through the store dispatch.
- **Centralized coordinates** — world uses bottom-left origin (y-up). All transforms live in `coord-transform.ts`.

## Application Structure

```
App  (view router: "dashboard" | "editor")
├── Dashboard               ← default entry point
│   └── project-storage     ← reads / writes localStorage
└── NavProvider
    └── EditorProvider      ← mounted per project, receives payload
        └── AppShell        ← layout selector (desktop / compact / mobile)
            ├── Canvas      ← Konva viewport, rulers, floating toolbar
            ├── Layers      ← parametric object tree
            ├── Inspector   ← property editor, label-scrub
            └── Spec panel  ← derived geometry readout
```

## Project Model

A **Project** is a universal container:

| Field | Type | Purpose |
|---|---|---|
| `id` | string | UUID |
| `name` | string | Display name |
| `createdAt` | ISO-8601 | Creation timestamp |
| `updatedAt` | ISO-8601 | Last-save timestamp |
| `payload` | `ProjectPayload` | Serialised `DocumentState` + `CameraState` |

Defined in `src/core/project-types.ts`.

## Persistent Storage

`localStorage` is the primary storage backend.

- Key: `"projects"` → JSON array of `Project` records.
- Managed by `src/core/project-storage.ts` (CRUD + factory).
- The Dashboard reads lightweight metadata; full payload is loaded only when a project is opened.
- On returning to the Dashboard the Workspace auto-saves the current editor state.

## Navigation

Routing is handled by a single `useState` in `App.tsx` (no external router).
`NavContext` exposes `returnToDashboard()` so deep components (e.g. `GlobalToolbar`) can navigate without prop drilling.

## Parametric Objects

Currently the document holds a single `Rect`. The types and reducer are designed so additional shape kinds can be introduced without structural changes.

See `docs/state-model.md`, `docs/interaction-model.md`, and `docs/rendering-model.md` for details.

