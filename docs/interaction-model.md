# Interaction Model

Supported interactions:

- Select: click the rectangle on canvas or click its row in the Structure panel.
- Move: click+drag inside rectangle. During drag the system updates a `previewRect` in `interaction` state; only on mouse up the new geometry is committed via `commitMove` which pushes the previous document to history.
- Resize: drag one of eight affordance handles (4 corners + 4 edges). Resizing uses the same preview-before-commit pattern.
- Inspector edits: change values and press Enter (or click Commit) to update the document via `updateProps` action.
- Undo/Redo: operate on committed document states.

Preview vs Commit is explicit: preview actions (`movePreview`, `resizePreview`) mutate only `interaction.previewRect`; commit actions (`commitMove`, `commitResize`, `updateProps`) replace the document and record history.

## Coordinate System

All interactions operate in **world coordinates with bottom-left origin (y-up)**:

- `x` increases to the right
- `y` increases upward
- `(0, 0)` is the bottom-left of the document workspace

Conversion between world and screen coordinates is centralized in `src/core/coord-transform.ts`. Interaction handlers (move, resize, hit-test) must use `screenToWorld()` for pointer events and must never apply their own y-inversion.

## Object Manipulation Model

All editable objects in the editor expose their interaction through overlay-based affordances.

### Core principle

Objects are not directly manipulated through their geometry.

All manipulation happens through:
- selection
- overlay
- affordances (handles)

---

### Affordances

Each object type defines a set of affordances:

Examples:
- Rectangle: corner handles, edge handles, body
- Line: endpoints, body
- Joint: axis-constrained handle

Affordances define:
- where interaction is possible
- what type of interaction is allowed

---

### Interaction pipeline

All objects follow the same interaction lifecycle:

1. Hover → detect affordance
2. Cursor → mapped from affordance type
3. Pointer down → start interaction
4. Pointer move → update preview state
5. Pointer up → commit change via action

---

### Cursor semantics

Cursor is determined by affordance type, not by object type.

Examples:
- corner → diagonal resize
- edge → axis resize
- endpoint → point move
- body (selected) → move
- body (unselected) → default (hover outline shown instead)

---

### Hover outline

When the pointer hovers over an unselected object, the cursor stays at `default`
but the overlay renders a semi-transparent accent outline around the object.
This signals interactivity without implying an immediate drag operation.
On click the object becomes selected and only then `body → move` cursor applies.

---

### Overlay responsibility

Overlay layer:
- renders affordances
- performs hit testing
- defines interaction zones

Document layer:
- renders geometry only

---

### Shape-specific logic

Each object type defines:
- its affordances
- its manipulation constraints
- its geometry update rules

But does NOT define:
- interaction lifecycle
- cursor system
- preview/commit logic

---

### Rule

Interaction behavior must be reusable across object types.

Adding a new object must not require rewriting:
- cursor logic
- interaction lifecycle
- overlay system