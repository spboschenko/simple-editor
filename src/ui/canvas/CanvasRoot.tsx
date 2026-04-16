import React, { useEffect, useRef, useState } from 'react'
import { Stage, Layer } from 'react-konva'
import { DocumentLayer } from './DocumentLayer'
import { OverlayLayer } from './OverlayLayer'
import { useEditor } from '../../core/store'
import { CanvasErrorBoundary } from '../../shared/error-boundary'
import { CameraState } from '../../core/types'
import { ToolButton, ZoomLabel } from '../../shared/ui'
import { colors, spacing } from '../../shared/tokens/design-tokens'
import { rectAdapter } from '../../core/interaction/shape-adapters/rect-adapter'
import { cursorForAffordance, CursorSource } from '../../core/interaction/cursor-map'

type Point = { x: number; y: number }

const STAGE_W = 800
const STAGE_H = 480
const MIN_SCALE = 0.05
const MAX_SCALE = 20

/** Compute a camera that fits the given rect into the stage with padding. */
function fitCamera(rect: { x: number; y: number; width: number; height: number }): CameraState {
  const pad = 60
  const scale = Math.min(
    (STAGE_W - pad * 2) / rect.width,
    (STAGE_H - pad * 2) / rect.height,
    2
  )
  return {
    scale,
    x: (STAGE_W - rect.width * scale) / 2 - rect.x * scale,
    y: (STAGE_H - rect.height * scale) / 2 - rect.y * scale,
  }
}

/** Zoom camera toward a focal point in screen coords. */
function zoomToward(camera: CameraState, focalX: number, focalY: number, factor: number): CameraState {
  const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, camera.scale * factor))
  const ratio = newScale / camera.scale
  return {
    scale: newScale,
    x: focalX - (focalX - camera.x) * ratio,
    y: focalY - (focalY - camera.y) * ratio,
  }
}

export const CanvasRoot: React.FC = () => {
  const { state, dispatch } = useEditor()
  const stageRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Move drag refs
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<Point | null>(null)
  const baseRectRef = useRef<any>(null)
  const latestPreviewRef = useRef<any>(null)

  // Pan (space + LMB) refs
  const [spaceDown, setSpaceDown] = useState(false)
  const isPanningRef = useRef(false)
  const panStartScreenRef = useRef<Point | null>(null)
  const panStartCameraRef = useRef<CameraState | null>(null)

  // Always-fresh state ref to avoid stale closures in global event handlers
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state }, [state])

  /** Tracks whether pointer is currently over an overlay handle (set via OverlayLayer callback). */
  const handleHoveredRef = useRef(false)

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
        setSpaceDown(true)
        applyCursor('pan')
        return
      }
      if (!e.ctrlKey) return
      if (e.key === '0') {
        e.preventDefault()
        dispatch({ type: 'setCamera', camera: fitCamera(stateRef.current.document.rect) })
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

  const camera = state.camera

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
    // Convert screen → world coordinates
    const worldPos = { x: (rawPos.x - cam.x) / cam.scale, y: (rawPos.y - cam.y) / cam.scale }

    // Space held → start panning, ignore object interactions
    if (spaceDown) {
      isPanningRef.current = true
      panStartScreenRef.current = rawPos
      panStartCameraRef.current = { ...cam }
      applyCursor('panning')
      return
    }

    const rect = state.document.rect
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
      // Idle: update body hover cursor (unless pointer is over an overlay handle)
      if (!handleHoveredRef.current) {
        const worldPos = { x: (rawPos.x - cam.x) / cam.scale, y: (rawPos.y - cam.y) / cam.scale }
        const rect = stateRef.current.document.rect
        const hit = rect.visible && !rect.locked ? rectAdapter.hitTest(rect, worldPos) : null
        applyCursor(hit ?? 'none')
      }
      return
    }
    const worldPos = { x: (rawPos.x - cam.x) / cam.scale, y: (rawPos.y - cam.y) / cam.scale }
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="canvas-area" ref={containerRef}>
        <div className="canvas-toolbar">
          <ToolButton onClick={() => dispatch({ type: 'setCamera', camera: fitCamera(state.document.rect) })}>Fit</ToolButton>
          <ToolButton onClick={() => dispatch({ type: 'setCamera', camera: { x: 0, y: 0, scale: 1 } })}>1:1</ToolButton>
          <ZoomLabel scale={camera.scale} />
        </div>
        <CanvasErrorBoundary>
          <Stage
            width={STAGE_W}
            height={STAGE_H}
            style={{
              background: '#ffffff',
              boxShadow: `0 0 0 1px ${colors.border}`,
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
          >
            <Layer>
              <DocumentLayer />
            </Layer>
            <Layer>
              <OverlayLayer onHandleHoverChange={(h) => { handleHoveredRef.current = h }} />
            </Layer>
          </Stage>
        </CanvasErrorBoundary>
      </div>
    </div>
  )
}

export default CanvasRoot
