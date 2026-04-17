export type ID = string

/** A paint style with color, opacity, and visibility (Figma-like). */
export type Paint = {
  color: string    // Hex without alpha, e.g. '#60a5fa'
  opacity: number  // 0–100
  visible: boolean
}

/** Default fill paint for new nodes. */
export const DEFAULT_FILL: Paint = { color: '#60a5fa', opacity: 100, visible: true }

/** Default stroke paint (invisible). */
export const DEFAULT_STROKE: Paint = { color: '#000000', opacity: 100, visible: false }

export type StrokePosition = 'center' | 'inside' | 'outside'

export type Rect = {
  id: ID
  x: number
  y: number
  width: number
  height: number
  fill: Paint
  stroke: Paint
  strokeWidth: number
  strokePosition: StrokePosition
  locked: boolean
  visible: boolean
}

/** Visual styles extracted from a node for rendering / inspector. */
export type NodeStyles = {
  fill: Paint
  stroke: Paint
  strokeWidth: number
  strokePosition: StrokePosition
}

/** Default style values for new nodes and migration fallbacks. */
export const DEFAULT_STYLES: NodeStyles = {
  fill: DEFAULT_FILL,
  stroke: DEFAULT_STROKE,
  strokeWidth: 1,
  strokePosition: 'center',
}

/**
 * Convert a Paint to a CSS rgba() string for canvas rendering.
 * Returns undefined when the paint is invisible.
 */
export function paintToRgba(paint: Paint): string | undefined {
  if (!paint.visible) return undefined
  const alpha = paint.opacity / 100
  // Parse hex to rgb
  const hex = paint.color.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return paint.color
  return `rgba(${r},${g},${b},${alpha})`
}

/**
 * Migrate a legacy string-based fill/stroke to a Paint object.
 * Handles old formats gracefully.
 */
export function migrateToPaint(value: unknown, fallback: Paint): Paint {
  if (value && typeof value === 'object' && 'color' in value) return value as Paint
  if (typeof value === 'string') {
    if (!value || value === 'transparent' || value === 'none') {
      return { ...fallback, visible: false }
    }
    return { color: value, opacity: 100, visible: true }
  }
  return fallback
}

/**
 * Extract visual styles from a SceneNode, with safe defaults for legacy data.
 * This is the canonical source of truth for rendering.
 */
export function getNodeDisplayStyles(node: SceneNode): NodeStyles {
  const g = node.geometry
  return {
    fill: g.fill && typeof g.fill === 'object' ? g.fill : migrateToPaint(g.fill, DEFAULT_FILL),
    stroke: g.stroke && typeof g.stroke === 'object' ? g.stroke : migrateToPaint(g.stroke, DEFAULT_STROKE),
    strokeWidth: g.strokeWidth ?? DEFAULT_STYLES.strokeWidth,
    strokePosition: g.strokePosition ?? 'center',
  }
}

/**
 * SceneNode — a single object in the scene graph.
 *
 * Each node carries its own geometry, domain type, domain data, and
 * computed output. Nodes are stored back-to-front: last = topmost.
 */
export type SceneNode = {
  geometry: Rect
  domainType: string
  data: unknown
  computed: unknown
}

/**
 * DocumentState — the persisted, version-controlled document.
 *
 * Contains an ordered scene graph of nodes (back-to-front rendering order).
 */
export interface DocumentState {
  nodes: SceneNode[]
}

/** Convenience alias for untyped use (store internals, storage layer). */
export type AnyDocumentState = DocumentState

export type UIState = {
  /** IDs of currently selected nodes. */
  selection: string[]
  activeTool: 'select' | 'rectangle'
  /** Whether horizontal and vertical rulers are visible. Toggle with Shift+R or View → Rulers. */
  showRulers: boolean
}

export type InteractionState = {
  /** Preview rects during drag/resize, keyed by node id. */
  previewRects: Record<string, Rect>
  /** Current interaction kind. */
  mode: 'idle' | 'moving' | 'resizing' | 'drawing'
}

// Camera lives in editor UI state — not in the document.
// scale is a multiplier (1 = 100%), x/y are stage offsets in screen pixels.
export type CameraState = {
  x: number
  y: number
  scale: number
}

export type EditorState = {
  document: AnyDocumentState
  ui: UIState
  interaction: InteractionState
  camera: CameraState
}
