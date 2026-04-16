# Architecture Overview

This project is intentionally small but architecturally explicit. Key principles:

- Document-first: the single source of truth for document geometry is the `core` document state.
- Renderer-separated: Konva reads state and renders; it does not own application truth.
- UI state separate: selection and active tool live in `ui` state.
- Interaction (transient) state: previews during drag/resize are stored separately and do not mutate the base document until commit.
- One command/action path: all changes go through the store dispatch (examples: `movePreview`, `commitMove`, `resizePreview`, `commitResize`, `updateProps`).

See `docs/state-model.md` and `docs/interaction-model.md` for details.
