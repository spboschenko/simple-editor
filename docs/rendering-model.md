<!-- entities: DocumentLayer, DomainOverlayLayer, OverlayLayer, Rect, worldToKonvaY, coord-transform, renderOverlay, HorizontalRuler, VerticalRuler, camera, scale -->

# Rendering Model

Three rendering layers are stacked inside the Konva Stage in this order:

1. **DocumentLayer** (`src/ui/canvas/DocumentLayer.tsx`) — renders document geometry (the base `Rect`). The only layer that touches `document.geometry` directly.
2. **DomainOverlayLayer** — renders domain-specific decorations by calling `domain.renderOverlay(geometry, computed, scale)`. Only shown when the active domain returns a non-null element. Must use react-konva primitives only; all y-coordinates must pass through `worldToKonvaY()`; screen-constant sizes must be divided by `camera.scale`.
3. **OverlayLayer** (`src/ui/canvas/OverlayLayer.tsx`) — renders editor UI: selection outline, resize handles, hover effects. Always on top.

**Layer ownership rules:**
- Selection handles and affordance visuals belong exclusively to OverlayLayer.
- Domain decorations (grid cells, opening markers, etc.) belong exclusively to DomainOverlayLayer.
- DocumentLayer must not render any overlay-style chrome.

## Legacy two-layer note

Early versions of this document described only two layers. Three are now the canonical model.

## Coordinate System

The editor uses a **world coordinate system with bottom-left origin**:

- Origin: bottom-left
- X: increases to the right
- Y: increases upward

This is the canonical coordinate system for all document geometry. All `Rect` `x/y` values are in world coordinates.

### Centralized Transform

The bridge between world coords and screen coords lives in `src/core/coord-transform.ts`:

```
worldToScreen(wx, wy, camera)  →  { x: wx*scale + cam.x,  y: STAGE_H + cam.y - wy*scale }
screenToWorld(sx, sy, camera)  →  { x: (sx - cam.x)/scale, y: (STAGE_H + cam.y - sy)/scale }
```

The Konva Stage is configured with `scaleY = -camera.scale` and `y = STAGE_H + camera.y`, which applies the y-flip globally. Document geometry passed directly to Konva elements therefore renders at the correct world position without per-element y-inversions.

No component may define its own y-axis inversion. All world ↔ screen conversions go through `coord-transform.ts`.

## Canvas Chrome: Rulers

Horizontal and vertical rulers are **canvas chrome** — they are part of the editor UI shell, not document geometry.

- `HorizontalRuler` renders along the top edge of the Stage (width = STAGE_W, height = RULER_SIZE)
- `VerticalRuler` renders along the left edge (width = RULER_SIZE, height = STAGE_H)

Rulers:
- use world coordinates for labels (y-up aware)
- are non-interactive (display only)
- highlight selected-object boundaries with accent colour
- suppress tick labels that would collide with boundary labels (< LABEL_COLLISION_PX)
- are toggled via Shift+R or View → Rulers (stored in `ui.showRulers`)

### Tick Step Selection

Tick interval is chosen from `[1, 5, 10, 20, 50, 100, 500]` — the first step where `step * zoom >= 50px` on screen.

