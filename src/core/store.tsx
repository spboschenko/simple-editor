import React, { createContext, useContext, useReducer, useMemo } from 'react'
import { AnyDocumentState, CameraState, EditorState, Rect, UIState, InteractionState, SceneNode, NodeStyles, Paint, DEFAULT_FILL, DEFAULT_STROKE } from './types'
import type { ProjectPayload } from './project-types'
import { fitCamera } from './coord-transform'
import { getDomain, nullDomain } from './domain-contract'
import { rectAdapter } from './interaction/shape-adapters/rect-adapter'
import { cloneNodes } from './clipboard'

const HISTORY_LIMIT = 50

type Action =
  | { type: 'select'; id: string | null }
  | { type: 'addToSelection'; id: string }
  | { type: 'setSelection'; ids: string[] }
  | { type: 'rangeSelect'; id: string }
  | { type: 'setActiveTool'; tool: 'select'|'rectangle' }
  | { type: 'toggleRulers' }
  | { type: 'movePreview'; rects: Record<string, Rect> }
  | { type: 'commitMove'; rects: Record<string, Rect> }
  | { type: 'resizePreview'; rect: Rect }
  | { type: 'commitResize'; rect: Rect }
  | { type: 'updateProps'; rect: Rect }
  | { type: 'resetSelection' }
  | { type: 'setLocked'; nodeId: string; locked: boolean }
  | { type: 'setLockedBatch'; nodeIds: string[]; locked: boolean }
  | { type: 'setVisible'; nodeId: string; visible: boolean }
  | { type: 'setVisibleBatch'; nodeIds: string[]; visible: boolean }
  | { type: 'setCamera'; camera: CameraState }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'scrubProps'; rect: Rect }
  | { type: 'snapshotHistory' }
  | { type: 'changeDomain'; domainType: string }
  | { type: 'updateDomainData'; data: unknown }
  | { type: 'toggleChildLock'; childId: string }
  | { type: 'addNode'; node: SceneNode }
  | { type: 'drawPreview'; rect: Rect }
  | { type: 'commitDraw'; rect: Rect }
  | { type: 'resizeGroupPreview'; rects: Record<string, Rect> }
  | { type: 'duplicateSelection' }
  | { type: 'pasteNodes'; nodes: SceneNode[] }
  | { type: 'deleteSelected' }
  | { type: 'reorderNode'; nodeId: string; toIndex: number }
  | { type: 'groupSelection' }
  | { type: 'ungroupSelection' }
  | { type: 'updateStyles'; nodeIds: string[]; patch: Partial<NodeStyles> }
  | { type: 'scrubStyles'; nodeIds: string[]; patch: Partial<NodeStyles> }
  | { type: 'batchUpdateProps'; rects: Record<string, Rect> }
  | { type: 'batchScrubProps'; rects: Record<string, Rect> }

type History = {
  past: AnyDocumentState[]
  future: AnyDocumentState[]
}

// ── Node helpers ──────────────────────────────────────────────────────────────

function findNode(nodes: SceneNode[], id: string): SceneNode | undefined {
  return nodes.find(n => n.geometry.id === id)
}

function updateNode(nodes: SceneNode[], id: string, updater: (n: SceneNode) => SceneNode): SceneNode[] {
  return nodes.map(n => n.geometry.id === id ? updater(n) : n)
}

/** Apply domain processing to a node with new geometry. */
function applyNodeDomain(node: SceneNode, geometry: Rect): SceneNode {
  const domain = getDomain(node.domainType)
  return {
    ...node,
    geometry,
    computed: domain ? domain.process(geometry, node.data) : node.computed,
  }
}

/** Returns true when a node is locked for geometry changes. */
function isNodeGeoLocked(node: SceneNode): boolean {
  if (node.geometry.locked) return true
  const domain = getDomain(node.domainType)
  return domain?.isGeometryLocked?.(node.data) ?? false
}

// ── Public scene helpers ──────────────────────────────────────────────────────

/**
 * Find the topmost visible node under a world-space point.
 * Iterates in reverse (last = topmost in rendering order).
 */
export function findNodeAt(nodes: SceneNode[], worldPoint: { x: number; y: number }): SceneNode | null {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i]
    if (!node.geometry.visible) continue
    if (rectAdapter.hitTest(node.geometry, worldPoint) !== null) return node
  }
  return null
}

/** Compute the axis-aligned bounding box of all visible nodes. */
export function nodesBoundingBox(nodes: SceneNode[]): { x: number; y: number; width: number; height: number } | null {
  const visible = nodes.filter(n => n.geometry.visible)
  if (visible.length === 0) return null
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const n of visible) {
    const g = n.geometry
    minX = Math.min(minX, g.x)
    minY = Math.min(minY, g.y)
    maxX = Math.max(maxX, g.x + g.width)
    maxY = Math.max(maxY, g.y + g.height)
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

/** Get the effective rect for a node (preview if available, else committed). */
export function getNodeRect(state: EditorState, nodeId: string): Rect | null {
  const preview = state.interaction.previewRects[nodeId]
  if (preview) return preview
  const node = state.document.nodes.find(n => n.geometry.id === nodeId)
  return node?.geometry ?? null
}

/** Get all selected SceneNode objects. */
export function getSelectedNodes(state: EditorState): SceneNode[] {
  const ids = new Set(state.ui.selection)
  return state.document.nodes.filter(n => ids.has(n.geometry.id))
}

/**
 * Compute the axis-aligned bounding box of an array of Rects.
 * Returns null when the array is empty.
 */
export function rectsBoundingBox(rects: Rect[]): { x: number; y: number; width: number; height: number } | null {
  if (rects.length === 0) return null
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const r of rects) {
    minX = Math.min(minX, r.x)
    minY = Math.min(minY, r.y)
    maxX = Math.max(maxX, r.x + r.width)
    maxY = Math.max(maxY, r.y + r.height)
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

/**
 * Map each rect proportionally from an old bbox into a new bbox.
 * Used for group-resize: the user drags the bbox handle, and each
 * child rect is scaled to keep its relative position and size.
 */
export function scaleRectsInBBox(
  bases: Record<string, Rect>,
  oldBBox: { x: number; y: number; width: number; height: number },
  newBBox: { x: number; y: number; width: number; height: number },
): Record<string, Rect> {
  const result: Record<string, Rect> = {}
  for (const [id, rect] of Object.entries(bases)) {
    const relX = oldBBox.width  > 0 ? (rect.x - oldBBox.x) / oldBBox.width  : 0
    const relY = oldBBox.height > 0 ? (rect.y - oldBBox.y) / oldBBox.height : 0
    const relW = oldBBox.width  > 0 ? rect.width  / oldBBox.width  : 1
    const relH = oldBBox.height > 0 ? rect.height / oldBBox.height : 1
    result[id] = {
      ...rect,
      x:      Math.round(newBBox.x + relX * newBBox.width),
      y:      Math.round(newBBox.y + relY * newBBox.height),
      width:  Math.max(1, Math.round(relW * newBBox.width)),
      height: Math.max(1, Math.round(relH * newBBox.height)),
    }
  }
  return result
}

// ── Initial state ─────────────────────────────────────────────────────────────

const initialRect1: Rect = {
  id: 'rect-1',
  x: 120,
  y: 80,
  width: 240,
  height: 160,
  fill: { ...DEFAULT_FILL },
  stroke: { ...DEFAULT_STROKE },
  strokeWidth: 1,
  strokePosition: 'center',
  locked: false,
  visible: true,
}

const initialRect2: Rect = {
  id: 'rect-2',
  x: 420,
  y: 200,
  width: 180,
  height: 120,
  fill: { color: '#34d399', opacity: 100, visible: true },
  stroke: { ...DEFAULT_STROKE },
  strokeWidth: 1,
  strokePosition: 'center',
  locked: false,
  visible: true,
}

const initialNodes: SceneNode[] = [
  {
    geometry: initialRect1,
    domainType: nullDomain.type,
    data: nullDomain.defaults,
    computed: nullDomain.process(initialRect1, nullDomain.defaults),
  },
  {
    geometry: initialRect2,
    domainType: nullDomain.type,
    data: nullDomain.defaults,
    computed: nullDomain.process(initialRect2, nullDomain.defaults),
  },
]

const initialDocument: AnyDocumentState = {
  nodes: initialNodes,
}

const initialUI: UIState = { selection: [], activeTool: 'select', showRulers: true }

const initialInteraction: InteractionState = { previewRects: {}, mode: 'idle' }

// Centre on the bounding box of initial nodes.
export const initialCamera: CameraState = fitCamera(
  nodesBoundingBox(initialNodes) ?? { x: 120, y: 80, width: 240, height: 160 }
)

// Full internal state that includes undo/redo history.
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

/** Generate a unique ID for new nodes. */
let _nodeCounter = 0
function nextNodeId(): string {
  return `node-${Date.now()}-${++_nodeCounter}`
}

/** Create a new SceneNode from a Rect (assigns a unique id if needed). */
export function createNode(rect: Rect): SceneNode {
  const geometry: Rect = { ...rect, id: rect.id || nextNodeId() }
  return {
    geometry,
    domainType: nullDomain.type,
    data: nullDomain.defaults,
    computed: nullDomain.process(geometry, nullDomain.defaults),
  }
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
      if (action.id === null) return { ...state, ui: { ...state.ui, selection: [] } }
      return { ...state, ui: { ...state.ui, selection: [action.id] } }

    case 'addToSelection': {
      const sel = state.ui.selection
      if (sel.includes(action.id)) {
        return { ...state, ui: { ...state.ui, selection: sel.filter(id => id !== action.id) } }
      }
      return { ...state, ui: { ...state.ui, selection: [...sel, action.id] } }
    }

    case 'setSelection':
      return { ...state, ui: { ...state.ui, selection: action.ids } }

    case 'rangeSelect': {
      // Shift+Click: select range between the last anchor and the clicked id
      const allIds = state.document.nodes.map(n => n.geometry.id)
      const sel = state.ui.selection
      const anchorId = sel.length > 0 ? sel[sel.length - 1] : null
      const anchorIdx = anchorId ? allIds.indexOf(anchorId) : -1
      const targetIdx = allIds.indexOf(action.id)
      if (targetIdx === -1) return state
      if (anchorIdx === -1) {
        return { ...state, ui: { ...state.ui, selection: [action.id] } }
      }
      const lo = Math.min(anchorIdx, targetIdx)
      const hi = Math.max(anchorIdx, targetIdx)
      const range = allIds.slice(lo, hi + 1)
      // Merge with existing selection, preserving uniqueness
      const merged = Array.from(new Set([...sel, ...range]))
      return { ...state, ui: { ...state.ui, selection: merged } }
    }

    case 'setActiveTool':
      return { ...state, ui: { ...state.ui, activeTool: action.tool } }

    case 'movePreview':
      return { ...state, interaction: { previewRects: action.rects, mode: 'moving' } }

    case 'resizePreview':
      return { ...state, interaction: { previewRects: { [action.rect.id]: action.rect }, mode: 'resizing' } }

    case 'commitMove': {
      const updates = action.rects
      const newNodes = state.document.nodes.map(node => {
        const newGeom = updates[node.geometry.id]
        if (!newGeom || isNodeGeoLocked(node)) return node
        return applyNodeDomain(node, newGeom)
      })
      const newDoc: AnyDocumentState = { nodes: newNodes }
      const newHistory: History = { past: [...history.past, state.document].slice(-HISTORY_LIMIT), future: [] }
      return { document: newDoc, ui: state.ui, interaction: { previewRects: {}, mode: 'idle' }, camera: state.camera, history: newHistory }
    }

    case 'commitResize': {
      const nodeId = action.rect.id
      const node = findNode(state.document.nodes, nodeId)
      if (!node || isNodeGeoLocked(node)) return state
      const newNodes = updateNode(state.document.nodes, nodeId, n => applyNodeDomain(n, action.rect))
      const newDoc: AnyDocumentState = { nodes: newNodes }
      const newHistory: History = { past: [...history.past, state.document].slice(-HISTORY_LIMIT), future: [] }
      return { document: newDoc, ui: state.ui, interaction: { previewRects: {}, mode: 'idle' }, camera: state.camera, history: newHistory }
    }

    case 'updateProps': {
      const nodeId = action.rect.id
      const node = findNode(state.document.nodes, nodeId)
      if (!node || isNodeGeoLocked(node)) return state
      const newNodes = updateNode(state.document.nodes, nodeId, n => applyNodeDomain(n, action.rect))
      const newDoc: AnyDocumentState = { nodes: newNodes }
      const newHistory: History = { past: [...history.past, state.document].slice(-HISTORY_LIMIT), future: [] }
      return { document: newDoc, ui: state.ui, interaction: state.interaction, camera: state.camera, history: newHistory }
    }

    case 'toggleRulers':
      return { ...state, ui: { ...state.ui, showRulers: !state.ui.showRulers } }

    case 'resetSelection':
      return { ...state, ui: { ...state.ui, selection: [] } }

    case 'setLocked': {
      const node = findNode(state.document.nodes, action.nodeId)
      if (!node) return state
      const newGeom = { ...node.geometry, locked: action.locked }
      const newNodes = updateNode(state.document.nodes, action.nodeId, n => applyNodeDomain(n, newGeom))
      return { ...state, document: { nodes: newNodes } }
    }

    case 'setVisible': {
      const node = findNode(state.document.nodes, action.nodeId)
      if (!node) return state
      const newGeom = { ...node.geometry, visible: action.visible }
      const newNodes = updateNode(state.document.nodes, action.nodeId, n => applyNodeDomain(n, newGeom))
      let newSelection = state.ui.selection
      if (!action.visible && newSelection.includes(action.nodeId)) {
        newSelection = newSelection.filter(id => id !== action.nodeId)
      }
      return { ...state, document: { nodes: newNodes }, ui: { ...state.ui, selection: newSelection } }
    }

    case 'setLockedBatch': {
      const ids = new Set(action.nodeIds)
      const newNodes = state.document.nodes.map(node => {
        if (!ids.has(node.geometry.id)) return node
        return applyNodeDomain(node, { ...node.geometry, locked: action.locked })
      })
      return { ...state, document: { nodes: newNodes } }
    }

    case 'setVisibleBatch': {
      const ids = new Set(action.nodeIds)
      const newNodes = state.document.nodes.map(node => {
        if (!ids.has(node.geometry.id)) return node
        return applyNodeDomain(node, { ...node.geometry, visible: action.visible })
      })
      let newSelection = state.ui.selection
      if (!action.visible) {
        newSelection = newSelection.filter(id => !ids.has(id))
      }
      return { ...state, document: { nodes: newNodes }, ui: { ...state.ui, selection: newSelection } }
    }

    case 'setCamera':
      return { ...state, camera: action.camera }

    case 'scrubProps': {
      const nodeId = action.rect.id
      const node = findNode(state.document.nodes, nodeId)
      if (!node || isNodeGeoLocked(node)) return state
      const newNodes = updateNode(state.document.nodes, nodeId, n => applyNodeDomain(n, action.rect))
      return { ...state, document: { nodes: newNodes } }
    }

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
      return { document: previous, ui: state.ui, interaction: { previewRects: {}, mode: 'idle' }, camera: state.camera, history: { past: newPast, future: newFuture } }
    }

    case 'redo': {
      if (history.future.length === 0) return state
      const next = history.future[0]
      const newFuture = history.future.slice(1)
      const newPast = [...history.past, state.document]
      return { document: next, ui: state.ui, interaction: { previewRects: {}, mode: 'idle' }, camera: state.camera, history: { past: newPast, future: newFuture } }
    }

    case 'changeDomain': {
      const newDomain = getDomain(action.domainType)
      if (!newDomain) return state
      const selIds = new Set(state.ui.selection)
      const newNodes = state.document.nodes.map(node => {
        if (!selIds.has(node.geometry.id)) return node
        return {
          ...node,
          domainType: action.domainType,
          data: newDomain.defaults,
          computed: newDomain.process(node.geometry, newDomain.defaults),
        }
      })
      const newDoc: AnyDocumentState = { nodes: newNodes }
      const newHistory: History = { past: [...history.past, state.document].slice(-HISTORY_LIMIT), future: [] }
      return { ...state, document: newDoc, history: newHistory }
    }

    case 'updateDomainData': {
      const sel = state.ui.selection
      if (sel.length === 0) return state
      const nodeId = sel[0]
      const node = findNode(state.document.nodes, nodeId)
      if (!node) return state
      const domain = getDomain(node.domainType)
      if (!domain) return state
      const newNodes = updateNode(state.document.nodes, nodeId, n => ({
        ...n,
        data: action.data,
        computed: domain.process(n.geometry, action.data),
      }))
      const newDoc: AnyDocumentState = { nodes: newNodes }
      const newHistory: History = { past: [...history.past, state.document].slice(-HISTORY_LIMIT), future: [] }
      return { ...state, document: newDoc, history: newHistory }
    }

    case 'toggleChildLock': {
      const sel = state.ui.selection
      if (sel.length === 0) return state
      const nodeId = sel[0]
      const node = findNode(state.document.nodes, nodeId)
      if (!node) return state
      const domain = getDomain(node.domainType)
      if (!domain?.toggleChildLock) return state
      const newData = domain.toggleChildLock(action.childId, node.data)
      const newNodes = updateNode(state.document.nodes, nodeId, n => ({
        ...n,
        data: newData,
        computed: domain.process(n.geometry, newData),
      }))
      return { ...state, document: { nodes: newNodes } }
    }

    case 'addNode': {
      const newDoc: AnyDocumentState = { nodes: [...state.document.nodes, action.node] }
      const newHistory: History = { past: [...history.past, state.document].slice(-HISTORY_LIMIT), future: [] }
      return { ...state, document: newDoc, ui: { ...state.ui, selection: [action.node.geometry.id] }, history: newHistory }
    }

    case 'drawPreview':
      return { ...state, interaction: { previewRects: { [action.rect.id]: action.rect }, mode: 'drawing' } }

    case 'commitDraw': {
      const r = action.rect
      // Discard tiny accidental clicks (< 4px in either dimension)
      if (r.width < 4 || r.height < 4) {
        return { ...state, interaction: { previewRects: {}, mode: 'idle' }, ui: { ...state.ui, activeTool: 'select' } }
      }
      const node = createNode(r)
      const newDoc: AnyDocumentState = { nodes: [...state.document.nodes, node] }
      const newHistory: History = { past: [...history.past, state.document].slice(-HISTORY_LIMIT), future: [] }
      return {
        document: newDoc,
        ui: { ...state.ui, selection: [node.geometry.id], activeTool: 'select' },
        interaction: { previewRects: {}, mode: 'idle' },
        camera: state.camera,
        history: newHistory,
      }
    }

    case 'resizeGroupPreview':
      return { ...state, interaction: { previewRects: action.rects, mode: 'resizing' } }

    case 'duplicateSelection': {
      const sel = state.ui.selection
      if (sel.length === 0) return state
      const selSet = new Set(sel)
      const originals = state.document.nodes.filter(n => selSet.has(n.geometry.id))
      if (originals.length === 0) return state
      const clones = cloneNodes(originals, 20, 20)
      // Insert clones right after the last original in the array
      const lastOrigIdx = Math.max(...originals.map(o => state.document.nodes.indexOf(o)))
      const newNodes = [...state.document.nodes]
      newNodes.splice(lastOrigIdx + 1, 0, ...clones)
      const newDoc: AnyDocumentState = { nodes: newNodes }
      const newHistory: History = { past: [...history.past, state.document].slice(-HISTORY_LIMIT), future: [] }
      return {
        ...state,
        document: newDoc,
        ui: { ...state.ui, selection: clones.map(c => c.geometry.id) },
        history: newHistory,
      }
    }

    case 'pasteNodes': {
      if (action.nodes.length === 0) return state
      const newNodes = [...state.document.nodes, ...action.nodes]
      const newDoc: AnyDocumentState = { nodes: newNodes }
      const newHistory: History = { past: [...history.past, state.document].slice(-HISTORY_LIMIT), future: [] }
      return {
        ...state,
        document: newDoc,
        ui: { ...state.ui, selection: action.nodes.map(n => n.geometry.id) },
        history: newHistory,
      }
    }

    case 'deleteSelected': {
      const sel = state.ui.selection
      if (sel.length === 0) return state
      const selSet = new Set(sel)
      const newNodes = state.document.nodes.filter(n => !selSet.has(n.geometry.id))
      const newDoc: AnyDocumentState = { nodes: newNodes }
      const newHistory: History = { past: [...history.past, state.document].slice(-HISTORY_LIMIT), future: [] }
      return {
        ...state,
        document: newDoc,
        ui: { ...state.ui, selection: [] },
        interaction: { previewRects: {}, mode: 'idle' },
        history: newHistory,
      }
    }

    case 'reorderNode': {
      const { nodeId, toIndex } = action
      const fromIndex = state.document.nodes.findIndex(n => n.geometry.id === nodeId)
      if (fromIndex === -1 || fromIndex === toIndex) return state
      const newNodes = [...state.document.nodes]
      const [moved] = newNodes.splice(fromIndex, 1)
      newNodes.splice(toIndex, 0, moved)
      const newDoc: AnyDocumentState = { nodes: newNodes }
      const newHistory: History = { past: [...history.past, state.document].slice(-HISTORY_LIMIT), future: [] }
      return { ...state, document: newDoc, history: newHistory }
    }

    case 'groupSelection': {
      const sel = state.ui.selection
      if (sel.length < 2) return state
      const selSet = new Set(sel)
      const groupedNodes = state.document.nodes.filter(n => selSet.has(n.geometry.id))
      const bbox = rectsBoundingBox(groupedNodes.map(n => n.geometry))
      if (!bbox) return state
      // Convert children to local coordinates (relative to group origin)
      const localChildren = groupedNodes.map(n => ({
        ...n,
        geometry: {
          ...n.geometry,
          x: n.geometry.x - bbox.x,
          y: n.geometry.y - bbox.y,
        },
      }))
      const groupId = nextNodeId()
      const groupRect: Rect = {
        id: groupId,
        x: bbox.x,
        y: bbox.y,
        width: bbox.width,
        height: bbox.height,
        fill: { color: '#000000', opacity: 0, visible: false },
        stroke: { ...DEFAULT_STROKE },
        strokeWidth: 1,
        strokePosition: 'center',
        locked: false,
        visible: true,
      }
      const groupNode: SceneNode = {
        geometry: groupRect,
        domainType: 'group',
        data: { children: localChildren },
        computed: { children: localChildren },
      }
      // Replace grouped nodes with the group node at the position of the first grouped node
      const firstIdx = Math.min(...groupedNodes.map(n => state.document.nodes.indexOf(n)))
      const remainingNodes = state.document.nodes.filter(n => !selSet.has(n.geometry.id))
      const newNodes = [...remainingNodes]
      newNodes.splice(firstIdx, 0, groupNode)
      const newDoc: AnyDocumentState = { nodes: newNodes }
      const newHistory: History = { past: [...history.past, state.document].slice(-HISTORY_LIMIT), future: [] }
      return {
        ...state,
        document: newDoc,
        ui: { ...state.ui, selection: [groupId] },
        history: newHistory,
      }
    }

    case 'ungroupSelection': {
      const sel = state.ui.selection
      if (sel.length !== 1) return state
      const groupNode = findNode(state.document.nodes, sel[0])
      if (!groupNode || groupNode.domainType !== 'group') return state
      const groupData = groupNode.data as { children?: SceneNode[] }
      const localChildren = groupData?.children ?? []
      if (localChildren.length === 0) return state
      // Convert children back to world coordinates
      const worldChildren = localChildren.map(child => ({
        ...child,
        geometry: {
          ...child.geometry,
          x: child.geometry.x + groupNode.geometry.x,
          y: child.geometry.y + groupNode.geometry.y,
        },
      }))
      const groupIdx = state.document.nodes.indexOf(groupNode)
      const newNodes = [...state.document.nodes]
      newNodes.splice(groupIdx, 1, ...worldChildren)
      const newDoc: AnyDocumentState = { nodes: newNodes }
      const newHistory: History = { past: [...history.past, state.document].slice(-HISTORY_LIMIT), future: [] }
      return {
        ...state,
        document: newDoc,
        ui: { ...state.ui, selection: worldChildren.map(c => c.geometry.id) },
        history: newHistory,
      }
    }

    case 'updateStyles': {
      const ids = new Set(action.nodeIds)
      const newNodes = state.document.nodes.map(node => {
        if (!ids.has(node.geometry.id)) return node
        if (node.geometry.locked) return node
        const newGeom: Rect = { ...node.geometry, ...action.patch }
        return applyNodeDomain(node, newGeom)
      })
      const newDoc: AnyDocumentState = { nodes: newNodes }
      const newHistory: History = { past: [...history.past, state.document].slice(-HISTORY_LIMIT), future: [] }
      return { ...state, document: newDoc, history: newHistory }
    }

    case 'scrubStyles': {
      const sIds = new Set(action.nodeIds)
      const sNodes = state.document.nodes.map(node => {
        if (!sIds.has(node.geometry.id)) return node
        if (node.geometry.locked) return node
        const newGeom: Rect = { ...node.geometry, ...action.patch }
        return applyNodeDomain(node, newGeom)
      })
      return { ...state, document: { nodes: sNodes } }
    }

    case 'batchUpdateProps': {
      const updates = action.rects
      const newNodes = state.document.nodes.map(node => {
        const newGeom = updates[node.geometry.id]
        if (!newGeom || isNodeGeoLocked(node)) return node
        return applyNodeDomain(node, newGeom)
      })
      const newDoc: AnyDocumentState = { nodes: newNodes }
      const newHistory: History = { past: [...history.past, state.document].slice(-HISTORY_LIMIT), future: [] }
      return { ...state, document: newDoc, history: newHistory }
    }

    case 'batchScrubProps': {
      const updates = action.rects
      const newNodes = state.document.nodes.map(node => {
        const newGeom = updates[node.geometry.id]
        if (!newGeom || isNodeGeoLocked(node)) return node
        return applyNodeDomain(node, newGeom)
      })
      return { ...state, document: { nodes: newNodes } }
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
