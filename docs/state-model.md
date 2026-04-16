<!-- entities: DocumentState, AnyDocumentState, UIState, InteractionState, CameraState, EditorState, Rect, domainType, data, computed, geometry, useNumericField, store.tsx, types.ts -->

# State Model

Layers:

- **Document/Core State** (`src/core/types.ts`) — the persisted document, containing four fields:
  - `domainType: string` — identifies the active domain module.
  - `geometry: Rect` — pure spatial/visual properties (x, y, width, height, fill, locked, visible). The only field the canvas layer reads.
  - `data: TData` — raw domain-specific input, opaque to all UI outside the domain module.
  - `computed: TComputed` — output of `DomainContract.process(geometry, data)`. Recomputed by the store's event bridge after every geometry change and after `updateDomainData`. **Stored in state and persisted to localStorage** alongside the rest of the document.
- **Editor UI State** — selection (`selectedId`), `activeTool`, and `showRulers`.
- **Interaction / Transient State** — preview rectangle used during move/resize and the current interaction mode. Not persisted.
- **Derived UI State** — values read-only derived for display only (e.g. the rectangle area shown in SpecPanel). These are NOT stored; they are computed from `geometry` or `computed` at render time.

All mutations flow through the central store in `src/core/store.tsx` using dispatched actions. The store also contains a minimal history for undo/redo. Domain-related actions include `updateDomainData`, `toggleChildLock`, and `changeDomain`.

## Raw input is not document truth

The text a user types into an inspector field is **not** document state.
Only values that have been parsed, validated, and dispatched via `updateProps`
become part of `document.geometry`. Raw field input lives entirely in component-local
state managed by `useNumericField` and is discarded on Escape or selection change.
