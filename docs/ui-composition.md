# UI Composition

Top-level areas:

- Global Toolbar: app-level tools and commands (no object properties). See `src/ui/toolbar/GlobalToolbar.tsx`. Includes View menu (Rulers toggle).
- Left Panel: Structure (document navigation) and Specification (derived read-only metrics). See `src/ui/panels/LeftPanel.tsx`.
- Center Canvas: Canvas toolbar, Document Layer, Overlay Layer, Rulers. Document vs Overlay are distinct concerns.
- Right Inspector: precise property editing that commits via the shared command layer.

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

