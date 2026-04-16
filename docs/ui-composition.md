# UI Composition

Top-level areas:

- Global Toolbar: app-level tools and commands (no object properties). See `src/ui/toolbar/GlobalToolbar.tsx`.
- Left Panel: Structure (document navigation) and Specification (derived read-only metrics). See `src/ui/panels/LeftPanel.tsx`.
- Center Canvas: Canvas toolbar, Document Layer, Overlay Layer. Document vs Overlay are distinct concerns.
- Right Inspector: precise property editing that commits via the shared command layer.

Each block has a single responsibility and communicates via the shared store.
