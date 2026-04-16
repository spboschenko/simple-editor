/**
 * design-tokens.ts
 *
 * Single source of truth for all design values.
 * Derived from docs/design-system.md.
 *
 * Rules:
 *  - All UI dimensions must reference these tokens — no magic numbers.
 *  - Adding a new value requires updating this file first.
 *  - Values are in logical units (px numbers); CSS vars are kept in sync
 *    in styles.css via the :root block.
 */

// ── Spacing (4px grid) ────────────────────────────────────────────────────────

export const spacing = {
  0:  0,
  1:  4,
  2:  8,
  3:  12,
  4:  16,
  5:  20,
  6:  24,
  8:  32,
  10: 40,
  12: 48,
} as const

// ── Typography ────────────────────────────────────────────────────────────────

export const fontSize = {
  xs:   11,   // inspector labels
  sm:   12,   // toolbar, specs
  base: 13,   // primary UI text, inputs
  md:   14,   // section titles, panel text
  lg:   16,   // icons (also the max used size)
} as const

export const lineHeight = {
  tight:   1.2,
  normal:  1.4,
  relaxed: 1.6,
} as const

export const fontFamily = 'Inter, system-ui, sans-serif'

// ── Border radius ─────────────────────────────────────────────────────────────

export const radius = {
  sm: 4,   // structure items, icon-btn
  md: 6,   // buttons, inputs (primary UI element)
  lg: 8,   // panels
} as const

// ── Colors ────────────────────────────────────────────────────────────────────

export const colors = {
  background:    '#1e1e1e',
  panel:         '#252526',
  border:        '#3c3c3c',
  textPrimary:   '#ffffff',
  textSecondary: '#a0a0a0',
  accent:        '#4a90e2',
} as const

// ── Component sizing constants ────────────────────────────────────────────────

export const component = {
  toolbarHeight:  40,   // px — topbar height
  buttonHeight:   28,   // px — tool-btn, action buttons
  inputHeight:    28,   // px — inspector inputs

  iconSize:       16,   // px — all icons (Lucide / inline SVG)

  // Overlay (screen-space constant — these are divided by camera.scale at call site)
  overlayStrokeWidth: 1,    // px on screen
  overlayHandleSize:  8,    // px diameter on screen → radius = 4 / scale
} as const

// ── Semantic state colors (not part of the neutral palette) ───────────────────
// Used only for clear UI states: locked, warning. Not for decoration.

export const semantic = {
  locked:        '#f59e0b',   // amber — locked object outline
  lockedBg:      'rgba(245,158,11,0.12)',
  lockedText:    '#f59e0b',
  selectionBlue: colors.accent,
} as const

// ── Breakpoints ───────────────────────────────────────────────────────────────
// Derived from docs/responsive-strategy.md §2
// desktop: >= 1200  |  tablet: 768–1199  |  mobile: < 768

export type LayoutMode = 'desktop' | 'compact' | 'mobile'

export const breakpoints = {
  desktop: 1200,   // px — min width for full 3-column editor
  compact:  768,   // px — min width for compact (panels collapse to drawers)
  // < compact → mobile (viewer-first)
} as const
