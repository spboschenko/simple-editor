# UI Composition

Top-level areas:

- Global Toolbar: app-level tools and commands (no object properties). See `src/ui/toolbar/GlobalToolbar.tsx`. Includes View menu (Rulers toggle).
- Left Panel: Structure (document navigation) and Specification (derived read-only metrics). See `src/ui/panels/LeftPanel.tsx`.
- Center Canvas: Canvas toolbar, Document Layer, Overlay Layer, Rulers. Document vs Overlay are distinct concerns.
- Right Inspector: precise property editing that commits via the shared command layer.
  Numeric fields (`x`, `y`, `width`, `height`) accept plain numbers or math expressions
  (`+`, `-`, `*`, `/`, `^`, parentheses). Values are evaluated on Enter / blur / Commit button,
  rounded to integers, and validated against per-field constraints before dispatch.
  Invalid expressions are not written to state; the field highlights red instead.
  See `docs/input-rules.md` for the full numeric input contract.

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

