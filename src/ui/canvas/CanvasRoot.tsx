import React, { useEffect, useRef, useState } from 'react'
import { Stage, Layer } from 'react-konva'
import { DocumentLayer } from './DocumentLayer'
import { DomainLayer } from './DomainLayer'
import { OverlayLayer } from './OverlayLayer'
import { useEditor, findNodeAt, nodesBoundingBox, getNodeRect, rectsBoundingBox, createNode } from '../../core/store'
import { clipboardCopy, clipboardPaste, cloneNodes } from '../../core/clipboard'
import { CanvasErrorBoundary } from '../../shared/error-boundary'
import { CameraState, Rect, DEFAULT_FILL, DEFAULT_STROKE } from '../../core/types'
import { ToolButton, ZoomLabel } from '../../shared/ui'
import { colors } from '../../shared/tokens/design-tokens'
import { cursorForAffordance, CursorSource } from '../../core/interaction/cursor-map'
import {
  STAGE_W, STAGE_H, RULER_SIZE, setStageSize,
  screenToWorld, fitCamera, zoomToward
} from '../../core/coord-transform'
import { HorizontalRuler } from './rulers/HorizontalRuler'
import { VerticalRuler } from './rulers/VerticalRuler'

type Point = { x: number; y: number }

export const CanvasRoot: React.FC = () => {
  const { state, dispatch } = useEditor()
  const stageRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [measured, setMeasured] = useState(false)

  // Measure container and update stage size used by coordinate transforms.
  useEffect(() => {
    const measure = () => {
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const stageW = Math.max(0, rect.width - RULER_SIZE)
      const stageH = Math.max(0, rect.height - RULER_SIZE)
      setStageSize(stageW, stageH)
      setMeasured(true)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // Move drag refs — now keyed by node id for multi-select moves
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<Point | null>(null)
  const baseRectsRef = useRef<Record<string, Rect> | null>(null)
  const latestPreviewRef = useRef<Record<string, Rect> | null>(null)

  // Draw-to-create refs (rectangle tool)
  const [isDrawing, setIsDrawing] = useState(false)
  const drawStartRef = useRef<Point | null>(null)
  const drawIdRef = useRef<string>('')

  // Alt+Drag: if true, the drag is operating on cloned nodes (originals stay)
  const isAltCloneRef = useRef(false)

  // Pan (space + LMB) refs
  const [spaceDown, setSpaceDown] = useState(false)
  const spaceDownRef = useRef(false)
  const isPanningRef = useRef(false)
  const panStartScreenRef = useRef<Point | null>(null)
  const panStartCameraRef = useRef<CameraState | null>(null)

  // Always-fresh state ref to avoid stale closures in global event handlers
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state }, [state])

  /** Tracks whether pointer is currently over an overlay handle. */
  const handleHoveredRef = useRef(false)

  /** ID of the node currently hovered (null if none). */
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)

  /** Applies a cursor to the Stage container imperatively. */
  const applyCursor = (source: CursorSource) => {
    const container = stageRef.current?.container()
    if (container) container.style.cursor = cursorForAffordance[source]
  }

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const notInput = (e.target as HTMLElement).tagName !== 'INPUT'
        && (e.target as HTMLElement).tagName !== 'TEXTAREA'

      if (e.code === 'Space' && notInput) {
        e.preventDefault()
        spaceDownRef.current = true
        setSpaceDown(true)
        applyCursor('pan')
        return
      }
      // Shift+R → toggle rulers
      if (e.shiftKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyR' && notInput) {
        e.preventDefault()
        dispatch({ type: 'toggleRulers' })
        return
      }
      // R (no modifiers) → toggle rectangle tool
      if (e.code === 'KeyR' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && notInput) {
        e.preventDefault()
        const current = stateRef.current.ui.activeTool
        dispatch({ type: 'setActiveTool', tool: current === 'rectangle' ? 'select' : 'rectangle' })
        return
      }
      // V → select tool
      if (e.code === 'KeyV' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && notInput) {
        e.preventDefault()
        dispatch({ type: 'setActiveTool', tool: 'select' })
        return
      }
      // Escape → back to select tool
      if (e.code === 'Escape' && stateRef.current.ui.activeTool !== 'select') {
        e.preventDefault()
        dispatch({ type: 'setActiveTool', tool: 'select' })
        return
      }
      // Delete / Backspace → delete selected
      if ((e.code === 'Delete' || e.code === 'Backspace') && notInput) {
        e.preventDefault()
        dispatch({ type: 'deleteSelected' })
        return
      }
      if (!e.ctrlKey && !e.metaKey) return
      // Ctrl+C → copy
      if (e.code === 'KeyC' && !e.shiftKey) {
        e.preventDefault()
        const sel = stateRef.current.ui.selection
        const nodes = stateRef.current.document.nodes.filter(n => sel.includes(n.geometry.id))
        if (nodes.length > 0) clipboardCopy(nodes)
        return
      }
      // Ctrl+V → paste
      if (e.code === 'KeyV' && !e.shiftKey) {
        e.preventDefault()
        const pasted = clipboardPaste()
        if (pasted.length > 0) dispatch({ type: 'pasteNodes', nodes: pasted })
        return
      }
      // Ctrl+D → duplicate
      if (e.code === 'KeyD') {
        e.preventDefault()
        dispatch({ type: 'duplicateSelection' })
        return
      }
      // Ctrl+G → group, Ctrl+Shift+G → ungroup
      if (e.code === 'KeyG') {
        e.preventDefault()
        if (e.shiftKey) {
          dispatch({ type: 'ungroupSelection' })
        } else {
          dispatch({ type: 'groupSelection' })
        }
        return
      }
      if (e.code === 'Digit0') {
        e.preventDefault()
        const bbox = nodesBoundingBox(stateRef.current.document.nodes)
        if (bbox) dispatch({ type: 'setCamera', camera: fitCamera(bbox) })
      } else if (e.code === 'Equal') {
        e.preventDefault()
        const cam = stateRef.current.camera
        dispatch({ type: 'setCamera', camera: zoomToward(cam, STAGE_W / 2, STAGE_H / 2, 1.1) })
      } else if (e.code === 'Minus') {
        e.preventDefault()
        const cam = stateRef.current.camera
        dispatch({ type: 'setCamera', camera: zoomToward(cam, STAGE_W / 2, STAGE_H / 2, 1 / 1.1) })
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceDownRef.current = false
        setSpaceDown(false)
        isPanningRef.current = false
        panStartScreenRef.current = null
        panStartCameraRef.current = null
        applyCursor('none')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [dispatch])

  // Prevent passive wheel scroll on the canvas container so we can zoom
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => e.preventDefault()
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const handleWheel = (e: any) => {
    const evt: WheelEvent = e.evt
    const rawPos = stageRef.current.getPointerPosition()
    const cam = stateRef.current.camera

    if (evt.ctrlKey) {
      const factor = evt.deltaY < 0 ? 1.1 : 1 / 1.1
      dispatch({ type: 'setCamera', camera: zoomToward(cam, rawPos.x, rawPos.y, factor) })
    } else if (evt.shiftKey) {
      dispatch({ type: 'setCamera', camera: { ...cam, x: cam.x - evt.deltaY } })
    } else {
      dispatch({ type: 'setCamera', camera: { ...cam, y: cam.y - evt.deltaY } })
    }
  }

  const handleMouseDown = (e: any) => {
    const rawPos = stageRef.current.getPointerPosition()
    const cam = state.camera
    const worldPos = screenToWorld(rawPos.x, rawPos.y, cam)

    // Space held → start panning
    if (spaceDownRef.current) {
      isPanningRef.current = true
      panStartScreenRef.current = rawPos
      panStartCameraRef.current = { ...cam }
      applyCursor('panning')
      return
    }

    // Rectangle tool → start drawing a new shape
    if (state.ui.activeTool === 'rectangle') {
      const id = `node-${Date.now()}-draw`
      drawIdRef.current = id
      drawStartRef.current = worldPos
      setIsDrawing(true)
      dispatch({ type: 'resetSelection' })
      applyCursor('none')
      return
    }

    // Multi-node hit test — topmost visible node under cursor
    const hitNode = findNodeAt(state.document.nodes, worldPos)

    if (hitNode) {
      const nodeId = hitNode.geometry.id
      const isCtrlClick = e.evt.ctrlKey || e.evt.metaKey

      if (isCtrlClick) {
        // Ctrl+click: toggle membership in selection
        dispatch({ type: 'addToSelection', id: nodeId })
      } else if (!state.ui.selection.includes(nodeId)) {
        // Click on unselected node: replace selection
        dispatch({ type: 'select', id: nodeId })
      }
      // else: clicking on already-selected node, keep selection as-is

      // Start drag for all selected (unlocked) nodes
      if (!isCtrlClick && !hitNode.geometry.locked) {
        const isAltDrag = e.evt.altKey

        dragStartRef.current = worldPos
        // Determine which nodes will actually move
        const selectedIds = state.ui.selection.includes(nodeId)
          ? state.ui.selection
          : [nodeId]

        if (isAltDrag) {
          // Alt+Drag: clone the selected nodes, then drag the clones
          const originals = selectedIds
            .map(id => state.document.nodes.find(n => n.geometry.id === id))
            .filter((n): n is typeof state.document.nodes[0] => n != null && !n.geometry.locked)
          const clones = cloneNodes(originals, 0, 0)
          // Add clones to the document and select them
          for (const clone of clones) {
            dispatch({ type: 'addNode', node: clone })
          }
          // Use clone rects as drag bases
          const bases: Record<string, Rect> = {}
          for (const clone of clones) {
            bases[clone.geometry.id] = { ...clone.geometry }
          }
          baseRectsRef.current = bases
          latestPreviewRef.current = { ...bases }
          isAltCloneRef.current = true
        } else {
          const bases: Record<string, Rect> = {}
          for (const id of selectedIds) {
            const node = state.document.nodes.find(n => n.geometry.id === id)
            if (node && !node.geometry.locked) {
              bases[id] = { ...node.geometry }
            }
          }
          baseRectsRef.current = bases
          latestPreviewRef.current = { ...bases }
          isAltCloneRef.current = false
        }

        setIsDragging(true)
        applyCursor('body')
      }
    } else {
      // Click on empty space: clear selection
      dispatch({ type: 'resetSelection' })
    }
  }

  const handleMouseMove = (e: any) => {
    const rawPos = stageRef.current.getPointerPosition()
    const cam = stateRef.current.camera

    // Pan mode
    if (isPanningRef.current && panStartScreenRef.current && panStartCameraRef.current) {
      const dx = rawPos.x - panStartScreenRef.current.x
      const dy = rawPos.y - panStartScreenRef.current.y
      dispatch({ type: 'setCamera', camera: { ...panStartCameraRef.current, x: panStartCameraRef.current.x + dx, y: panStartCameraRef.current.y + dy } })
      return
    }

    if (!isDragging && !isDrawing) {
      if (spaceDownRef.current) return
      // Rectangle tool: always show crosshair
      if (stateRef.current.ui.activeTool === 'rectangle') {
        applyCursor('draw')
        setHoveredNodeId(null)
        return
      }
      // Idle: update hover state
      if (!handleHoveredRef.current) {
        const worldPos = screenToWorld(rawPos.x, rawPos.y, cam)
        const hitNode = findNodeAt(stateRef.current.document.nodes, worldPos)
        const hitId = hitNode?.geometry.id ?? null
        setHoveredNodeId(hitId)
        if (hitId) {
          const isSelected = stateRef.current.ui.selection.includes(hitId)
          applyCursor(isSelected ? 'body' : 'none')
        } else {
          applyCursor('none')
        }
      }
      return
    }

    // Drawing — preview the new rectangle
    if (isDrawing) {
      const worldPos = screenToWorld(rawPos.x, rawPos.y, cam)
      const start = drawStartRef.current
      if (!start) return
      const x = Math.round(Math.min(start.x, worldPos.x))
      const y = Math.round(Math.min(start.y, worldPos.y))
      const w = Math.round(Math.abs(worldPos.x - start.x))
      const h = Math.round(Math.abs(worldPos.y - start.y))
      const previewRect: Rect = {
        id: drawIdRef.current, x, y, width: w, height: h,
        fill: { ...DEFAULT_FILL }, stroke: { ...DEFAULT_STROKE }, strokeWidth: 1, strokePosition: 'center', locked: false, visible: true,
      }
      dispatch({ type: 'drawPreview', rect: previewRect })
      return
    }

    // Dragging — move all base rects by the same delta
    const worldPos = screenToWorld(rawPos.x, rawPos.y, cam)
    const start = dragStartRef.current
    const bases = baseRectsRef.current
    if (!start || !bases) return
    const dx = worldPos.x - start.x
    const dy = worldPos.y - start.y
    const previews: Record<string, Rect> = {}
    for (const [id, base] of Object.entries(bases)) {
      previews[id] = { ...base, x: Math.round(base.x + dx), y: Math.round(base.y + dy) }
    }
    latestPreviewRef.current = previews
    dispatch({ type: 'movePreview', rects: previews })
  }

  const handleMouseUp = (_e: any) => {
    if (isPanningRef.current) {
      isPanningRef.current = false
      panStartScreenRef.current = null
      panStartCameraRef.current = null
      applyCursor(spaceDown ? 'pan' : 'none')
      return
    }

    // Finish drawing a new rectangle
    if (isDrawing) {
      setIsDrawing(false)
      const start = drawStartRef.current
      if (start) {
        const cam = stateRef.current.camera
        const rawPos = stageRef.current.getPointerPosition()
        const worldPos = screenToWorld(rawPos.x, rawPos.y, cam)
        const x = Math.round(Math.min(start.x, worldPos.x))
        const y = Math.round(Math.min(start.y, worldPos.y))
        const w = Math.round(Math.abs(worldPos.x - start.x))
        const h = Math.round(Math.abs(worldPos.y - start.y))
        const finalRect: Rect = {
          id: drawIdRef.current, x, y, width: w, height: h,
          fill: { ...DEFAULT_FILL }, stroke: { ...DEFAULT_STROKE }, strokeWidth: 1, strokePosition: 'center', locked: false, visible: true,
        }
        dispatch({ type: 'commitDraw', rect: finalRect })
      }
      drawStartRef.current = null
      drawIdRef.current = ''
      applyCursor('none')
      return
    }

    if (!isDragging) return
    setIsDragging(false)
    const rects = latestPreviewRef.current ?? baseRectsRef.current
    if (rects) dispatch({ type: 'commitMove', rects })
    dragStartRef.current = null
    baseRectsRef.current = null
    latestPreviewRef.current = null
    isAltCloneRef.current = false
    applyCursor('none')
  }

  const camera = state.camera
  const showRulers = state.ui.showRulers

  // For rulers: highlight the bounding box of all selected nodes
  const sel = state.ui.selection
  const selectedRect = sel.length > 0
    ? rectsBoundingBox(
        sel.map(id => getNodeRect(state, id)).filter((r): r is Rect => r !== null)
      ) as Rect | null
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="canvas-area" ref={containerRef}>
        <CanvasErrorBoundary>
          <div style={{ display: 'inline-block', lineHeight: 0 }}>
            {showRulers && (
              <div style={{ display: 'flex' }}>
                <div style={{
                  width: RULER_SIZE, height: RULER_SIZE, flexShrink: 0,
                  background: '#1a1a1a', borderRight: `1px solid ${colors.border}`, borderBottom: `1px solid ${colors.border}`,
                }} />
                <HorizontalRuler camera={camera} selectedRect={selectedRect} />
              </div>
            )}
            <div style={{ display: 'flex' }}>
              {showRulers && <VerticalRuler camera={camera} selectedRect={selectedRect} />}
              <Stage
                width={STAGE_W}
                height={STAGE_H}
                style={{
                  background: '#ffffff',
                  boxShadow: `0 0 0 1px ${colors.border}`,
                  display: 'block',
                }}
                ref={stageRef}
                scaleX={camera.scale}
                scaleY={camera.scale}
                x={camera.x}
                y={camera.y}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => setHoveredNodeId(null)}
              >
                <Layer>
                  <DocumentLayer />
                </Layer>
                <Layer>
                  <DomainLayer />
                </Layer>
                <Layer>
                  <OverlayLayer
                    onHandleHoverChange={(h) => { handleHoveredRef.current = h }}
                    panModeRef={spaceDownRef}
                    hoveredNodeId={hoveredNodeId}
                  />
                </Layer>
              </Stage>
            </div>
          </div>
        </CanvasErrorBoundary>
      </div>
    </div>
  )
}

export default CanvasRoot
