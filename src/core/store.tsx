import React, { createContext, useContext, useReducer, useMemo } from 'react'
import { AnyDocumentState, CameraState, EditorState, Rect, UIState, InteractionState } from './types'
import type { ProjectPayload } from './project-types'
import { fitCamera } from './coord-transform'
import { getDomain, nullDomain } from './domain-contract'

const HISTORY_LIMIT = 50

type Action =
  | { type: 'select'; id: string | null }
  | { type: 'setActiveTool'; tool: 'select'|'rectangle' }
  | { type: 'toggleRulers' }
  | { type: 'movePreview'; rect: Rect }
  | { type: 'commitMove'; rect: Rect }
  | { type: 'resizePreview'; rect: Rect }
  | { type: 'commitResize'; rect: Rect }
  | { type: 'updateProps'; rect: Rect }
  | { type: 'resetSelection' }
  | { type: 'setLocked'; locked: boolean }
  | { type: 'setVisible'; visible: boolean }
  | { type: 'setCamera'; camera: CameraState }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'scrubProps'; rect: Rect }
  | { type: 'snapshotHistory' }
  | { type: 'changeDomain'; domainType: string }
  | { type: 'updateDomainData'; data: unknown }
  | { type: 'toggleChildLock'; childId: string }

type History = {
  past: AnyDocumentState[]
  future: AnyDocumentState[]
}

const initialRect = {
  id: 'rect-1',
  x: 120,
  y: 80,
  width: 240,
  height: 160,
  fill: '#60a5fa',
  locked: false,
  visible: true,
}

/**
 * Event bridge helper — creates a new DocumentState with updated geometry and
 * recomputed domain output. Called after every geometry-mutating action.
 */
function applyDomain(doc: AnyDocumentState, geometry: Rect): AnyDocumentState {
  const domain = getDomain(doc.domainType)
  return {
    ...doc,
    geometry,
    computed: domain ? domain.process(geometry, doc.data) : doc.computed,
  }
}

/**
 * Returns true when the document is locked for geometry changes.
 * Combines the base-rect locked flag with domain-level child locks.
 */
function isGeoLocked(doc: AnyDocumentState): boolean {
  if (doc.geometry.locked) return true
  const domain = getDomain(doc.domainType)
  return domain?.isGeometryLocked?.(doc.data) ?? false
}

const initialDocument: AnyDocumentState = {
  domainType: nullDomain.type,
  geometry: initialRect,
  data: nullDomain.defaults,
  computed: nullDomain.process(initialRect, nullDomain.defaults),
}

const initialUI: UIState = { selectedId: null, activeTool: 'select', showRulers: true }

const initialInteraction: InteractionState = { previewRect: null, mode: 'idle' }

// Centre on the initial rect using the y-up fitCamera formula.
export const initialCamera: CameraState = fitCamera({
  x: 120, y: 80, width: 240, height: 160,
})

// Full internal state that includes undo/redo history.
// History is an implementation detail of the store — consumers only see EditorState.
type EditorStateWithHistory = EditorState & { history: History }

type Store = {
  state: EditorState
  dispatch: (a: Action) => void
}

const initialEditorState: EditorState = {
  document: initialDocument,
  ui: initialUI,
  interaction: initialInteraction,
  camera: initialCamera
}

const initialStateWithHistory: EditorStateWithHistory = {
  ...initialEditorState,
  history: { past: [], future: [] }
}

const StoreContext = createContext<Store | null>(null)

function reducer(state: EditorStateWithHistory, action: Action): EditorStateWithHistory {
  const { history } = state
  switch (action.type) {
    case 'select':
      return { ...state, ui: { ...state.ui, selectedId: action.id } }
    case 'setActiveTool':
      return { ...state, ui: { ...state.ui, activeTool: action.tool } }
    case 'movePreview':
      return { ...state, interaction: { ...state.interaction, previewRect: action.rect, mode: 'moving' } }
    case 'resizePreview':
      return { ...state, interaction: { ...state.interaction, previewRect: action.rect, mode: 'resizing' } }
    case 'commitMove':
    case 'commitResize': {
      if (isGeoLocked(state.document)) return state
      const newDoc = applyDomain(state.document, action.rect)
      const newHistory: History = { past: [...history.past, state.document].slice(-HISTORY_LIMIT), future: [] }
      return { document: newDoc, ui: state.ui, interaction: { previewRect: null, mode: 'idle' }, camera: state.camera, history: newHistory }
    }
    case 'updateProps': {
      if (isGeoLocked(state.document)) return state
      const newDoc = applyDomain(state.document, action.rect)
      const newHistory: History = { past: [...history.past, state.document].slice(-HISTORY_LIMIT), future: [] }
      return { document: newDoc, ui: state.ui, interaction: state.interaction, camera: state.camera, history: newHistory }
    }
    case 'toggleRulers':
      return { ...state, ui: { ...state.ui, showRulers: !state.ui.showRulers } }
    case 'resetSelection':
      return { ...state, ui: { ...state.ui, selectedId: null } }
    // Lock and visibility are instant UI-level toggles — not recorded in undo history.
    case 'setLocked':
      return { ...state, document: applyDomain(state.document, { ...state.document.geometry, locked: action.locked }) }
    case 'setVisible': {
      const next = { ...state, document: applyDomain(state.document, { ...state.document.geometry, visible: action.visible }) }
      // If hiding a selected object, deselect it
      if (!action.visible && state.ui.selectedId === state.document.geometry.id) {
        return { ...next, ui: { ...next.ui, selectedId: null } }
      }
      return next
    }
    case 'setCamera':
      return { ...state, camera: action.camera }
    case 'scrubProps':
      if (isGeoLocked(state.document)) return state
      return { ...state, document: applyDomain(state.document, action.rect) }
    case 'snapshotHistory': {
      const newHistory: History = {
        past: [...history.past, state.document].slice(-HISTORY_LIMIT),
        future: [],
      }
      return { ...state, history: newHistory }
    }
    case 'undo': {
      if (history.past.length === 0) return state
      const previous = history.past[history.past.length - 1]
      const newPast = history.past.slice(0, -1)
      const newFuture = [state.document, ...history.future]
      return { document: previous, ui: state.ui, interaction: { previewRect: null, mode: 'idle' }, camera: state.camera, history: { past: newPast, future: newFuture } }
    }
    case 'redo': {
      if (history.future.length === 0) return state
      const next = history.future[0]
      const newFuture = history.future.slice(1)
      const newPast = [...history.past, state.document]
      return { document: next, ui: state.ui, interaction: { previewRect: null, mode: 'idle' }, camera: state.camera, history: { past: newPast, future: newFuture } }
    }
    case 'changeDomain': {
      const newDomain = getDomain(action.domainType)
      if (!newDomain) return state
      const geometry = state.document.geometry
      const newDoc: AnyDocumentState = {
        ...state.document,
        domainType: action.domainType,
        data: newDomain.defaults,
        computed: newDomain.process(geometry, newDomain.defaults),
      }
      const newHistory: History = { past: [...history.past, state.document].slice(-HISTORY_LIMIT), future: [] }
      return { ...state, document: newDoc, history: newHistory }
    }
    case 'updateDomainData': {
      const domain = getDomain(state.document.domainType)
      if (!domain) return state
      const newDoc: AnyDocumentState = {
        ...state.document,
        data: action.data,
        computed: domain.process(state.document.geometry, action.data),
      }
      const newHistory: History = { past: [...history.past, state.document].slice(-HISTORY_LIMIT), future: [] }
      return { ...state, document: newDoc, history: newHistory }
    }
    case 'toggleChildLock': {
      const domain = getDomain(state.document.domainType)
      if (!domain?.toggleChildLock) return state
      const newData = domain.toggleChildLock(action.childId, state.document.data)
      const newDoc: AnyDocumentState = {
        ...state.document,
        data: newData,
        computed: domain.process(state.document.geometry, newData),
      }
      return { ...state, document: newDoc }
    }
  }
}

export const EditorProvider: React.FC<{ payload?: ProjectPayload; children?: React.ReactNode }> = ({ payload, children }) => {
  const init = useMemo((): EditorStateWithHistory => {
    if (payload) {
      return {
        document: payload.document,
        ui: initialUI,
        interaction: initialInteraction,
        camera: payload.camera,
        history: { past: [], future: [] },
      }
    }
    return initialStateWithHistory
  }, []) // intentionally empty — payload is only read on first mount

  const [fullState, dispatch] = useReducer(reducer, init)

  // Expose only EditorState to consumers — history is an internal concern
  const store: Store = { state: fullState, dispatch }

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

export const useEditor = () => {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useEditor must be used within EditorProvider')
  return ctx
}
