# Error Isolation

The canvas area is wrapped with an Error Boundary (`src/shared/error-boundary.tsx`). If a rendering error occurs inside the canvas zone, the shell (global toolbar, left panel, inspector) remains available and a clear fallback message is shown in the canvas area.

The boundary logs errors to the console. Event handler logic that performs geometry calculations should still guard against invalid input with local checks.
