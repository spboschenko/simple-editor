# mini-editor-architecture-lab

This repository is an architecture-first educational mini editor built with React + TypeScript + Konva.

Purpose
- Demonstrate clear separation between document/core state, editor UI state, transient interaction state, renderer, overlay layer, command layer, and shell UI.

Run

1. Install dependencies:

```bash
npm install
```

2. Run dev server:

```bash
npm run dev
```

What this includes
- One document object: Rectangle #1
- Global toolbar (select, rectangle stub, undo/redo, reset selection/view)
- Left Structure and Specification panels
- Center Canvas with Document and Overlay layers
- Right Inspector editing the rectangle via shared actions
- Move and resize use preview-before-commit
- Undo/Redo history for committed changes
- Error Boundary around the canvas area

Docs: see `docs/` for architecture, state model, rendering and interaction descriptions.
