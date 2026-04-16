<!-- entities: DomainContract, DomainModule, DomainUIProvider, EditorProvider, AppShell, NavContext, ProjectPayload, project-storage, domains/index.ts, registerDomain, getDomain, listDomains, nullDomain, DocumentState, EditorState, TypedDocumentState -->

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
        └── DomainUIProvider ← resolves active domain, injects UI contributions
            └── AppShell    ← layout selector (desktop / compact / mobile)
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

Currently the document holds a single `Rect` wrapped in a `DocumentState`. The types and reducer are designed so additional shape kinds can be introduced without structural changes. Subject-matter logic that transforms the geometry is encapsulated in domain modules (see Domain Plugin System and domain-protocol.md).

See `docs/state-model.md`, `docs/interaction-model.md`, and `docs/rendering-model.md` for details.

---

## Domain Plugin System

Every document carries a `domainType` string that identifies the active domain module. Domains are registered **once at app startup** via `registerDomain()` in `src/domains/index.ts` — the single registration point. No other file needs to change when a new domain is added.

A domain is a plain TypeScript object satisfying either `DomainContract` or its superset `DomainModule` (both defined in `src/core/domain-contract.ts`):

| Interface | Purpose |
|---|---|
| `DomainContract<TData, TComputed>` | Core contract: `process()`, `renderOverlay()`, `InspectorSection`, `getChildren()`, `isGeometryLocked()`, `toggleChildLock()` |
| `DomainModule<TData, TComputed>` | Extends the contract with `toolbarTools`, `exportTemplates`, `onToolActivate()` |
| `ToolbarTool` | Descriptor for a domain-injected toolbar button |
| `ExportTemplate<TData, TComputed>` | Serialisation descriptor for File › Export |

The registry is a `Map<string, DomainModule>` in module scope. Three functions access it:

| Function | Returns | Use |
|---|---|---|
| `registerDomain(d)` | `void` | Called in `domains/index.ts` at startup |
| `getDomain(type)` | `DomainModule \| undefined` | Store event bridge, Inspector, StructurePanel |
| `listDomains()` | `ReadonlyArray<DomainModule>` | Dashboard domain cards, Change Type dialog |

**Adding a new domain** requires exactly two steps: create `src/domains/<name>.tsx` implementing `DomainModule`, and add one `registerDomain()` call in `src/domains/index.ts`.

See `docs/domain-protocol.md` for the full contract specification.

---

## Inversion of Control

The domain system inverts the traditional relationship between the editor shell and subject-matter modules. The shell does not know the details of any particular domain. Instead, each domain **declares its UI contributions declaratively**, and the shell injects them at the correct mount points:

```
DomainModule.toolbarTools      → DomainUIProvider → toolbar strip after built-in tools
DomainModule.InspectorSection  → Inspector.tsx     → bottom block of the right Inspector panel
DomainModule.getChildren()     → StructurePanel    → child rows below the base rect
DomainModule.renderOverlay()   → DomainLayer       → Konva layer between DocLayer and OverlayLayer
DomainModule.exportTemplates   → (File menu)       → File › Export submenu entries
```

`DomainUIProvider` (in `src/core/domain-ui-context.tsx`) reads `document.domainType` from the store, looks up the active module, and makes its contributions available to all descendants via the `useDomainUI()` hook. All state mutations triggered by domain tool buttons travel through the standard `dispatch({ type: 'updateDomainData', data })` path — **a domain module never imports or touches the store directly**.

