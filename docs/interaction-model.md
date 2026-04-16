# Interaction Model

Supported interactions:

- Select: click the rectangle on canvas or click its row in the Structure panel.
- Move: click+drag inside rectangle. During drag the system updates a `previewRect` in `interaction` state; only on mouse up the new geometry is committed via `commitMove` which pushes the previous document to history.
- Resize: drag one of eight affordance handles (4 corners + 4 edges). Resizing uses the same preview-before-commit pattern.
- Inspector edits: type a value or expression (e.g. `1000+200`) into a numeric field, then press Enter or click Commit. Values are evaluated, rounded to integers, validated against per-field constraints, and written to the document via `updateProps`. Invalid expressions keep the previous committed value.
- Undo/Redo: operate on committed document states.

## Numeric Field Commit Rules

Numeric inspector fields distinguish three levels:

1. **Raw text** — what the user is currently typing (e.g. `"3000-150"`).
   Not written to document state. Field is free to contain any string while the user edits.
2. **Parsed value** — result of expression evaluation (e.g. `2850`).
   Computed on commit; never stored directly as a React state.
3. **Committed model value** — the integer that reaches `document.rect`.
   Must pass `Math.round` + per-field `min`/`max` constraints.

### Commit triggers

| Trigger | Behavior |
|---|---|
| **Enter** in a numeric field | Evaluate that field's expression; if valid → `updateProps` |
| **Blur** (tab away) | Evaluate and format; update `numericRef` silently; no dispatch |
| **Commit button** | Evaluate all fields; dispatch `updateProps` with all current values |
| **Escape** | Reset all fields to current document values; no dispatch |

### Invalid input

- Field border turns red; no value is written to the document.
- The field retains the raw text so the user can fix it.
- On Escape or external reset the raw text reverts to the last committed value.

### Constraints (per field)

| Field | min |
|---|---|
| X | 0 |
| Y | 0 |
| Width | 1 |
| Height | 1 |

See `src/shared/numeric.ts` and `src/shared/hooks/useNumericField.ts`.

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