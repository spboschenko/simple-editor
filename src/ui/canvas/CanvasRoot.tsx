import React, { useEffect, useRef, useState } from 'react'
import { Stage, Layer } from 'react-konva'
import { DocumentLayer } from './DocumentLayer'
import { DomainLayer } from './DomainLayer'
import { OverlayLayer } from './OverlayLayer'
import { useEditor } from '../../core/store'
import { CanvasErrorBoundary } from '../../shared/error-boundary'
import { CameraState } from '../../core/types'
import { ToolButton, ZoomLabel } from '../../shared/ui'
import { colors } from '../../shared/tokens/design-tokens'
import { rectAdapter } from '../../core/interaction/shape-adapters/rect-adapter'
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

  // Move drag refs
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<Point | null>(null)
  const baseRectRef = useRef<any>(null)
  const latestPreviewRef = useRef<any>(null)

  // Pan (space + LMB) refs
  const [spaceDown, setSpaceDown] = useState(false)
  // Ref counterpart so event handlers always read the current value without stale closures.
  const spaceDownRef = useRef(false)
  const isPanningRef = useRef(false)
  const panStartScreenRef = useRef<Point | null>(null)
  const panStartCameraRef = useRef<CameraState | null>(null)

  // Always-fresh state ref to avoid stale closures in global event handlers
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state }, [state])

  /** Tracks whether pointer is currently over an overlay handle (set via OverlayLayer callback). */
  const handleHoveredRef = useRef(false)

  /** Tracks whether pointer is hovering over the object body (for hover outline on unselected objects). */
  const [bodyHovered, setBodyHovered] = useState(false)

  /** Applies a cursor to the Stage container imperatively — no React re-render needed. */
  const applyCursor = (source: CursorSource) => {
    const container = stageRef.current?.container()
    if (container) container.style.cursor = cursorForAffordance[source]
  }

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Space → pan mode (ignore if typing in an input)
      if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'INPUT') {
        e.preventDefault()
        spaceDownRef.current = true
        setSpaceDown(true)
        applyCursor('pan')
        return
      }
      // Shift+R → toggle rulers
      if (e.shiftKey && e.key === 'R' && (e.target as HTMLElement).tagName !== 'INPUT') {
        e.preventDefault()
        dispatch({ type: 'toggleRulers' })
        return
      }
      if (!e.ctrlKey) return
      if (e.key === '0') {
        e.preventDefault()
        dispatch({ type: 'setCamera', camera: fitCamera(stateRef.current.document.geometry) })
      } else if (e.key === '=' || e.key === '+') {
        e.preventDefault()
        const cam = stateRef.current.camera
        dispatch({ type: 'setCamera', camera: zoomToward(cam, STAGE_W / 2, STAGE_H / 2, 1.1) })
      } else if (e.key === '-') {
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
      // Zoom toward pointer
      const factor = evt.deltaY < 0 ? 1.1 : 1 / 1.1
      dispatch({ type: 'setCamera', camera: zoomToward(cam, rawPos.x, rawPos.y, factor) })
    } else if (evt.shiftKey) {
      // Horizontal scroll
      dispatch({ type: 'setCamera', camera: { ...cam, x: cam.x - evt.deltaY } })
    } else {
      // Vertical scroll
      dispatch({ type: 'setCamera', camera: { ...cam, y: cam.y - evt.deltaY } })
    }
  }

  const handleMouseDown = (e: any) => {
    const rawPos = stageRef.current.getPointerPosition()
    const cam = state.camera
    // Convert screen → world coordinates (y-up)
    const worldPos = screenToWorld(rawPos.x, rawPos.y, cam)

    // Space held → start panning, ignore object interactions
    if (spaceDownRef.current) {
      isPanningRef.current = true
      panStartScreenRef.current = rawPos
      panStartCameraRef.current = { ...cam }
      applyCursor('panning')
      return
    }

    const rect = state.document.geometry
    const hit = rect.visible ? rectAdapter.hitTest(rect, worldPos) !== null : false

    if (hit && rect.visible) {
      dispatch({ type: 'select', id: rect.id })
      // Locked objects can be selected but not moved via canvas drag
      if (!rect.locked) {
        dragStartRef.current = worldPos
        baseRectRef.current = { ...rect }
        latestPreviewRef.current = { ...rect }
        setIsDragging(true)
        applyCursor('body')
      }
    } else if (!hit) {
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

    if (!isDragging) {
      // Space pan mode: cursor is managed by keydown/keyup — don't touch it here.
      if (spaceDownRef.current) return
      // Idle: update body hover cursor (unless pointer is over an overlay handle)
      if (!handleHoveredRef.current) {
        const worldPos = screenToWorld(rawPos.x, rawPos.y, cam)
        const rect = stateRef.current.document.geometry
        const hit = rect.visible && !rect.locked ? rectAdapter.hitTest(rect, worldPos) : null
        const isSelected = stateRef.current.ui.selectedId === rect.id
        setBodyHovered(hit === 'body')
        // 'move' cursor only when the object is already selected; unselected hover keeps default
        applyCursor(hit === 'body' && !isSelected ? 'none' : (hit ?? 'none'))
      }
      return
    }
    const worldPos = screenToWorld(rawPos.x, rawPos.y, cam)
    const start = dragStartRef.current
    const base = baseRectRef.current
    if (!start || !base) return
    const preview = { ...base, x: Math.round(base.x + worldPos.x - start.x), y: Math.round(base.y + worldPos.y - start.y) }
    latestPreviewRef.current = preview
    dispatch({ type: 'movePreview', rect: preview })
  }

  const handleMouseUp = (_e: any) => {
    if (isPanningRef.current) {
      isPanningRef.current = false
      panStartScreenRef.current = null
      panStartCameraRef.current = null
      applyCursor(spaceDown ? 'pan' : 'none')
      return
    }
    if (!isDragging) return
    setIsDragging(false)
    const rect = latestPreviewRef.current ?? baseRectRef.current
    dispatch({ type: 'commitMove', rect })
    dragStartRef.current = null
    baseRectRef.current = null
    latestPreviewRef.current = null
    applyCursor('none')
  }

  const camera = state.camera
  const showRulers = state.ui.showRulers
  const selectedRect = state.ui.selectedId === state.document.geometry.id
    ? (state.interaction.previewRect ?? state.document.geometry)
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="canvas-area" ref={containerRef}>
        <CanvasErrorBoundary>
          {/* ruler + stage block — centered in canvas-area */}
          <div style={{ display: 'inline-block', lineHeight: 0 }}>
            {showRulers && (
              <div style={{ display: 'flex' }}>
                {/* top-left corner square */}
                <div style={{
                  width: RULER_SIZE, height: RULER_SIZE, flexShrink: 0,
                  background: '#1a1a1a', borderRight: `1px solid ${colors.border}`, borderBottom: `1px solid ${colors.border}`,
                }} />
                <HorizontalRuler camera={camera} selectedRect={selectedRect} />
              </div>
            )}
            <div style={{ display: 'flex' }}>
              {showRulers && <VerticalRuler camera={camera} selectedRect={selectedRect} />}
              {/* Stage uses standard positive scaleY — the y-axis is NOT flipped here.
                  Elements receive Konva y-coords via worldToKonvaY() from coord-transform.ts.
                  Pan, zoom, and pointer math all assume a normal Stage transform. */}
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
                onMouseLeave={() => setBodyHovered(false)}
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
                    hovered={bodyHovered}
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
