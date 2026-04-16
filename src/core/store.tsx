import React, { createContext, useContext, useReducer } from 'react'
import { CameraState, DocumentState, EditorState, Rect, UIState, InteractionState } from './types'

type Action =
  | { type: 'select'; id: string | null }
  | { type: 'setActiveTool'; tool: 'select'|'rectangle' }
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

type History = {
  past: DocumentState[]
  future: DocumentState[]
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

const initialDocument: DocumentState = { rect: initialRect }

const initialUI: UIState = { selectedId: null, activeTool: 'select' }

const initialInteraction: InteractionState = { previewRect: null, mode: 'idle' }

export const initialCamera: CameraState = { x: 0, y: 0, scale: 1 }

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
      const newDoc: DocumentState = { rect: action.rect }
      const newHistory: History = { past: [...history.past, state.document], future: [] }
      return { document: newDoc, ui: state.ui, interaction: { previewRect: null, mode: 'idle' }, camera: state.camera, history: newHistory }
    }
    case 'updateProps': {
      const newDoc: DocumentState = { rect: action.rect }
      const newHistory: History = { past: [...history.past, state.document], future: [] }
      return { document: newDoc, ui: state.ui, interaction: state.interaction, camera: state.camera, history: newHistory }
    }
    case 'resetSelection':
      return { ...state, ui: { ...state.ui, selectedId: null } }
    // Lock and visibility are instant UI-level toggles — not recorded in undo history.
    case 'setLocked':
      return { ...state, document: { rect: { ...state.document.rect, locked: action.locked } } }
    case 'setVisible': {
      const next = { ...state, document: { rect: { ...state.document.rect, visible: action.visible } } }
      // If hiding a selected object, deselect it
      if (!action.visible && state.ui.selectedId === state.document.rect.id) {
        return { ...next, ui: { ...next.ui, selectedId: null } }
      }
      return next
    }
    case 'setCamera':
      return { ...state, camera: action.camera }
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
  }
}

export const EditorProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [fullState, dispatch] = useReducer(reducer, initialStateWithHistory)

  // Expose only EditorState to consumers — history is an internal concern
  const store: Store = { state: fullState, dispatch }

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

export const useEditor = () => {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useEditor must be used within EditorProvider')
  return ctx
}
