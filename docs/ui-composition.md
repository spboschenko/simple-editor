<!-- entities: GlobalToolbar, StructurePanel, SpecPanel, Inspector, CanvasShell, DomainUIProvider, useDomainUI, InspectorSection, ResolvedToolbarTool, ToolbarTool, domain-ui-context.tsx -->

# UI Composition

Top-level areas:

- **Global Toolbar:** app-level tools and commands (no object properties). See `src/ui/toolbar/GlobalToolbar.tsx`. Includes View menu (Rulers toggle) and File menu (Change Type…). When the active domain declares `toolbarTools`, `DomainUIProvider` injects a secondary strip of domain-specific action buttons immediately after the menu-bar, separated by a visual border. Each button is rendered as `.toolbar-tool-btn` and calls `domain.onToolActivate()` via the pre-bound `ResolvedToolbarTool.onClick` — state mutations still travel through `dispatch({ type: 'updateDomainData' })`.
- **Left Panel:** Structure (document navigation) and Specification (derived read-only metrics). See `src/ui/panels/StructurePanel.tsx` and `src/ui/panels/SpecPanel.tsx`. The StructurePanel contains:
  - A **Document** root row.
  - A **Base** rect row (the `geometry` Rect) with lock/visibility toggles.
  - When the active domain implements `getChildren()`, its returned child rows (cells, elements, etc.) are rendered below Base, each with an individual lock toggle that dispatches `toggleChildLock`.
- Center Canvas: Canvas toolbar, Document Layer, Overlay Layer, Rulers. Document vs Overlay are distinct concerns.
- **Right Inspector:** precise property editing that commits via the shared command layer.
  Numeric fields (`x`, `y`, `width`, `height`) accept plain numbers or math expressions
  (`+`, `-`, `*`, `/`, `^`, parentheses). Values are evaluated on Enter / blur,
  rounded to integers, and validated against per-field constraints before dispatch.
  Invalid expressions are silently reverted to the last committed value — the field does not enter an error state.
  See `docs/input-rules.md` for the full numeric input contract.

  When the active domain declares an `InspectorSection` component, it is rendered **below the geometry and fill fields** as a domain-specific editing block. The `InspectorSection` receives `{ data, onUpdateData, isLocked }` and must use `useNumericField` + `<InspectorField>` for any numeric inputs (same contract as geometry fields).

Each block has a single responsibility and communicates via the shared store.

## Canvas Composition

When rulers are visible (`ui.showRulers = true`), the canvas area contains:

```
┌──────────────────────────────┐
│ Corner │  HorizontalRuler   │  RULER_SIZE tall
├──────────────────────────────┤
│ Vert-  │                    │
│ ical-  │    Konva Stage     │  STAGE_H tall
│ Ruler  │                    │
└──────────────────────────────┘
  RULER_SIZE wide  STAGE_W wide
```

Rulers are canvas chrome — not document geometry. They know about camera and selected object bounds but have no document business logic.

