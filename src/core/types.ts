export type ID = string

export type Rect = {
  id: ID
  x: number
  y: number
  width: number
  height: number
  fill: string
  locked: boolean
  visible: boolean
}

/**
 * DocumentState — the persisted, version-controlled document.
 *
 * TData    — domain-specific input data (opaque to the UI canvas layer).
 * TComputed — result produced by DomainContract.process(geometry, data).
 *             Stored in state and recomputed by the store's event bridge
 *             after every geometry change.
 */
export interface DocumentState<TData = unknown, TComputed = unknown> {
  /** Identifies the domain that owns this document (see domain-contract.ts). */
  domainType: string
  /**
   * Pure spatial / visual properties — the only data the canvas layer touches.
   * Includes position, size, appearance, and visual modifiers (locked, visible).
   */
  geometry: Rect
  /**
   * Domain-specific raw data. Opaque to the UI; interpreted exclusively by
   * the registered DomainContract. Never read directly by canvas components.
   */
  data: TData
  /**
   * Output of DomainContract.process(geometry, data). Recomputed automatically
   * by the event bridge on every geometry change. Read-only from the UI.
   */
  computed: TComputed
}

/** Convenience alias for untyped use (store internals, storage layer). */
export type AnyDocumentState = DocumentState<unknown, unknown>

export type UIState = {
  selectedId: ID | null
  activeTool: 'select' | 'rectangle'
  /** Whether horizontal and vertical rulers are visible. Toggle with Shift+R or View → Rulers. */
  showRulers: boolean
}

export type InteractionState = {
  // preview rect used during drag/resize
  previewRect: Rect | null
  // current interaction kind
  mode: 'idle' | 'moving' | 'resizing'
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
