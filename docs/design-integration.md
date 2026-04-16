<!-- entities: design-tokens.ts, styles.css, InspectorField, Field, ToolButton, IconButton, PanelTitle, toolbar-tool-btn, toolbar-domain-tools, DomainUIProvider, icons.tsx -->

# Design Integration Guide

## Where tokens live

| File | Role |
|---|---|
| `docs/design-system.md` | Authoritative specification — human-readable |
| `src/shared/tokens/design-tokens.ts` | TypeScript token definitions — consumed by components |
| `src/styles.css` | CSS custom properties (`:root`) + component classes |

All three must stay in sync. `design-tokens.ts` is the source that both CSS and component code read.

---

## Token structure

```ts
import { spacing, fontSize, lineHeight, radius, colors, component, semantic, fontFamily }
  from 'src/shared/tokens/design-tokens'
```

| Export | Values | Unit |
|---|---|---|
| `spacing` | `{ 0, 1, 2, 3, 4, 5, 6, 8, 10, 12 }` | px numbers (4px grid) |
| `fontSize` | `{ xs: 11, sm: 12, base: 13, md: 14, lg: 16 }` | px numbers |
| `lineHeight` | `{ tight: 1.2, normal: 1.4, relaxed: 1.6 }` | unitless |
| `radius` | `{ sm: 4, md: 6, lg: 8 }` | px numbers |
| `colors` | `background, panel, border, textPrimary, textSecondary, accent` | hex strings |
| `component` | `toolbarHeight, buttonHeight, inputHeight, iconSize, overlayStrokeWidth, overlayHandleSize` | px numbers |
| `semantic` | `locked, lockedBg, lockedText, selectionBlue` | hex / rgba strings |
| `fontFamily` | `'Inter, system-ui, sans-serif'` | string |

---

## How to use tokens in components

### Inline style (React):
```tsx
import { spacing, colors } from '../../shared/tokens/design-tokens'

<div style={{ padding: spacing[4], color: colors.textSecondary }}>
```

### CSS class (styles.css):
```css
.some-element {
  padding: var(--sp-4);
  color: var(--color-muted);
}
```

`--sp-4` corresponds to `spacing[4] = 16px`. The mapping always follows `--sp-{key}`.

---

## Shared UI primitives

All common elements are in `src/shared/ui.tsx`. **Always use these — never write raw `<button className="tool-btn">` in feature files.**

| Component | CSS class | When to use |
|---|---|---|
| `<PanelTitle>` | `.panel-title` | Panel section headers |
| `<ToolButton active={…}>` | `.tool-btn` | Toolbar / inspector action buttons |
| `<IconButton>` | `.icon-btn` | Borderless icon actions (toggle, close…) |
| `<InspectorField label value onChange onBlur onKeyDown>` | `.figma-field` | Numeric inspector fields (geometry + domain). Supports scrub via `onScrub` prop. **Use this, not `<Field>`, for inspector inputs.** |
| `<Field label value onChange>` | `.inspector-field` | Legacy simple label+input pair for non-scrub contexts. Prefer `<InspectorField>` for all inspector use. |
| `<ToolbarSeparator>` | — (inline) | Visual group separator in toolbars |
| `<ZoomLabel scale={…}>` | `.canvas-toolbar-zoom` | Read-only zoom % in canvas toolbar |

---

## Icons

All icons are in `src/shared/icons.tsx`. Default size is `component.iconSize = 16px`.

```tsx
import { IconLockClosed } from '../../shared/icons'
<IconLockClosed />           // 16px
<IconLockClosed size={12} /> // override when used inline in text
```

**Do not create one-off SVGs in feature files.** Add new icons to `shared/icons.tsx`. Domain toolbar tool icons are an exception — they may be defined inline inside the `toolbarTools` array of a `DomainModule` because they are co-located with the domain logic, but they must still use `currentColor` stroke and the `16×16` viewBox convention.

---

## Overlay rules (canvas space)

Overlay elements (selection outline, resize handles, size label) live in Konva world-space but must appear at fixed pixel sizes regardless of zoom.

```ts
const strokeW = component.overlayStrokeWidth / scale  // 1px on screen
const handleR = (component.overlayHandleSize / 2) / scale  // 4px radius on screen
```

**Never use absolute world-space sizes for overlay UI.** Always divide by `camera.scale`.

---

## Rules that must not be broken

1. **No magic numbers.** Every px value in JSX or CSS must come from a token or a CSS var.

---

## Domain toolbar tool classes

When `DomainUIProvider` renders domain-injected toolbar buttons it uses two CSS classes defined in `styles.css`:

| Class | Role |
|---|---|
| `.toolbar-domain-tools` | Flex container holding the injected buttons strip; separated from the menu-bar by a `1px` border |
| `.toolbar-tool-btn` | Individual domain action button; `28×28px`, transparent background, accent border on `--active` variant |

These classes must not be used outside `GlobalToolbar.tsx`.
2. **No new hex literals** in component files — all colors come from `colors` or `semantic`.
3. **No new icon SVGs** in feature files — add to `shared/icons.tsx`.
4. **No raw `<button className="tool-btn">`** — use `<ToolButton>`.
5. **Spacing must be on the 4px grid** — only values from the `spacing` object are valid.
6. **Overlay stroke and handle sizes must divide by `camera.scale`** at the call site.

---

## Adding a new UI element

Checklist:

- [ ] Use `<ToolButton>`, `<IconButton>`, `<Field>`, or `<PanelTitle>` if applicable
- [ ] All sized values reference `spacing`, `fontSize`, `radius`, or `component` tokens
- [ ] All colors reference `colors` or `semantic` tokens
- [ ] Any icon uses `shared/icons.tsx`
- [ ] No new CSS classes unless a genuinely reusable pattern — add to `styles.css` with CSS vars
