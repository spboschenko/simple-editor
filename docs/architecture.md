# Architecture Overview

This project is intentionally small but architecturally explicit. Key principles:

- Document-first: the single source of truth for document geometry is the `core` document state.
- Renderer-separated: Konva reads state and renders; it does not own application truth.
- UI state separate: selection and active tool live in `ui` state.
- Interaction (transient) state: previews during drag/resize are stored separately and do not mutate the base document until commit.
- One command/action path: all changes go through the store dispatch (examples: `movePreview`, `commitMove`, `resizePreview`, `commitResize`, `updateProps`).
- **Centralized coordinate transform**: world coordinates use bottom-left origin (y-up). The transform to/from Konva screen space is centralized in `src/core/coord-transform.ts`. No component may define its own y-axis inversion.

See `docs/state-model.md`, `docs/interaction-model.md`, and `docs/rendering-model.md` for details.

