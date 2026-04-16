# Interaction Model

Supported interactions:

- Select: click the rectangle on canvas or click its row in the Structure panel.
- Move: click+drag inside rectangle. During drag the system updates a `previewRect` in `interaction` state; only on mouse up the new geometry is committed via `commitMove` which pushes the previous document to history.
- Resize: drag one of four corner handles. Resizing uses the same preview-before-commit pattern.
- Inspector edits: change values and press Enter (or click Commit) to update the document via `updateProps` action.
- Undo/Redo: operate on committed document states.

Preview vs Commit is explicit: preview actions (`movePreview`, `resizePreview`) mutate only `interaction.previewRect`; commit actions (`commitMove`, `commitResize`, `updateProps`) replace the document and record history.
