# State Model

Layers:

- Document/Core State: `src/core/types.ts` - contains the rectangle geometry and appearance.
- Editor UI State: selection (`selectedId`) and `activeTool`.
- Interaction / Transient State: preview rectangle used during move/resize and interaction mode.
- Derived State: not stored; the rectangle area is computed in the Specification panel from document geometry.

All mutations flow through the central store in `src/core/store.tsx` using dispatched actions. The store also contains a minimal history for undo/redo.

## Raw input is not document truth

The text a user types into an inspector field is **not** document state.
Only values that have been parsed, validated, and dispatched via `updateProps`
become part of `document.rect`. Raw field input lives entirely in component-local
state managed by `useNumericField` and is discarded on Escape or selection change.
