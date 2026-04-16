# Future Scaling

This lab is intentionally minimal but structured to show where to extend:

- Multiple objects: extend `DocumentState` to an array of objects and adjust selection to support ids or ranges.
- Second renderer: extract a renderer adapter interface and implement a `KonvaRenderer` now; add `CanvasRenderer` contract to swap later.
- Tools: `activeTool` and the toolbar are already present; adding more tools will reuse the same `dispatch` command path.

Each extension should keep the separation of concerns shown here.
