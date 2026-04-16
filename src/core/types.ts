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

export type DocumentState = {
  rect: Rect
}

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
  document: DocumentState
  ui: UIState
  interaction: InteractionState
  camera: CameraState
}
