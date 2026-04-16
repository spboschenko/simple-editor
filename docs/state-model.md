# State Model

Layers:

- Document/Core State: `src/core/types.ts` - contains the rectangle geometry and appearance.
- Editor UI State: selection (`selectedId`) and `activeTool`.
- Interaction / Transient State: preview rectangle used during move/resize and interaction mode.
- Derived State: not stored; the rectangle area is computed in the Specification panel from document geometry.

All mutations flow through the central store in `src/core/store.tsx` using dispatched actions. The store also contains a minimal history for undo/redo.
