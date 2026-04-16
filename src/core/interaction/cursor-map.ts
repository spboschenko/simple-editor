import { AffordanceKind } from './affordance-types'

/**
 * Maps every affordance kind (plus tool-level states) to a CSS cursor value.
 *
 * Cursor is derived from affordance kind — NOT from object type.
 * This is the single source of cursor truth for the entire editor.
 *
 * Note: `body` → 'move' is only applied when the object is **selected**.
 * Unselected objects show `default` cursor with a hover outline instead.
 * See CanvasRoot handleMouseMove for the selection-aware guard.
 */
export type CursorSource = AffordanceKind | 'none' | 'pan' | 'panning'

export const cursorForAffordance: Record<CursorSource, string> = {
  body:        'move',
  'corner-nw': 'nwse-resize',
  'corner-se': 'nwse-resize',
  'corner-ne': 'nesw-resize',
  'corner-sw': 'nesw-resize',
  'edge-n':    'ns-resize',
  'edge-s':    'ns-resize',
  'edge-e':    'ew-resize',
  'edge-w':    'ew-resize',
  none:        'default',
  pan:         'grab',
  panning:     'grabbing',
}
