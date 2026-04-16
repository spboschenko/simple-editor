# Rendering Model

There are two rendering concerns:

- Document Layer: renders the document object(s) — currently the rectangle. Implemented in `src/ui/canvas/DocumentLayer.tsx`.
- Overlay Layer: renders editor overlays like selection outline and handles. Implemented in `src/ui/canvas/OverlayLayer.tsx`.

Overlay visuals are separate from document geometry and are screen-space aware (handles have fixed radius irrespective of document coordinates).
