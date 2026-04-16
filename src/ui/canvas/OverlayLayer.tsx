import React from 'react'
import { Circle, Line, Text, Rect as KRect } from 'react-konva'
import { useEditor } from '../../core/store'
import { colors, semantic, component, fontSize as fontSizeTokens, fontFamily, radius } from '../../shared/tokens/design-tokens'
import { rectAdapter } from '../../core/interaction/shape-adapters/rect-adapter'
import { cursorForAffordance } from '../../core/interaction/cursor-map'
import { AffordanceDef, AffordanceKind } from '../../core/interaction/affordance-types'

interface OverlayLayerProps {
  /** Notify parent when pointer enters/leaves a handle, so CanvasRoot can suppress body hit-test cursor. */
  onHandleHoverChange?: (hovering: boolean) => void
}

export const OverlayLayer: React.FC<OverlayLayerProps> = ({ onHandleHoverChange }) => {
  const { state, dispatch } = useEditor()
  const base = state.document.rect
  const r = state.interaction.previewRect ?? base
  const selected = state.ui.selectedId === base.id
  const scale = state.camera.scale
  const isLocked = base.locked

  // Design system: overlayStrokeWidth=1px, overlayHandleSize=8px (diameter → radius=4)
  // All divided by scale so they remain screen-space constant at any zoom level.
  const strokeW = component.overlayStrokeWidth / scale
  const handleR = (component.overlayHandleSize / 2) / scale
  const dashLen = 4 / scale
  const dashGap = 3 / scale

  const moving = state.interaction.mode === 'moving'

  const labelText = `${r.width} × ${r.height}`
  const labelFontSize = fontSizeTokens.xs / scale
  const labelPadX = 6 / scale
  const labelPadY = 3 / scale
  const labelWidth = labelText.length * (labelFontSize * 0.55) + labelPadX * 2
  const labelHeight = labelFontSize + labelPadY * 2
  const labelX = r.x + r.width / 2 - labelWidth / 2
  const labelY = r.y + r.height + 10 / scale

  /**
   * Starts a resize interaction session for the given affordance key.
   * Geometry update math is delegated to rectAdapter.applyManipulation.
   * Lifecycle (pointer capture, preview, commit) is owned here per the
   * interaction model: overlay performs hit-testing and initiates sessions.
   */
  const startInteraction = (affordanceKey: string, e: any) => {
    e.cancelBubble = true
    const stage = e.target.getStage()
    const baseRect = { ...state.document.rect }
    // Capture camera once so all world conversions during this session are consistent.
    const capturedCamera = { ...state.camera }

    const toWorld = (ev: MouseEvent) => {
      const stageBounds = stage.container().getBoundingClientRect()
      const sx = ev.clientX - stageBounds.left
      const sy = ev.clientY - stageBounds.top
      return {
        x: (sx - capturedCamera.x) / capturedCamera.scale,
        y: (sy - capturedCamera.y) / capturedCamera.scale,
      }
    }

    // startWorld is captured but unused for resize (adapter uses absolute position).
    const startWorld = toWorld(e.evt as MouseEvent)
    let latestRect = { ...baseRect }

    const onMove = (ev: MouseEvent) => {
      const currentWorld = toWorld(ev)
      latestRect = rectAdapter.applyManipulation(baseRect, affordanceKey, startWorld, currentWorld)
      dispatch({ type: 'resizePreview', rect: latestRect })
    }

    const onUp = (_ev: MouseEvent) => {
      dispatch({ type: 'commitResize', rect: latestRect })
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // Affordance handles from the shape adapter — 8 handles (4 corners + 4 edges).
  const affordances: AffordanceDef[] = rectAdapter.getAffordances(r)

  return (
    <>
      {selected && !moving && (
        <>
          {/* Selection outline — locked: solid amber; unlocked: dashed accent */}
          <Line
            points={[r.x, r.y, r.x + r.width, r.y, r.x + r.width, r.y + r.height, r.x, r.y + r.height, r.x, r.y]}
            stroke={isLocked ? semantic.locked : colors.accent}
            strokeWidth={strokeW}
            dash={isLocked ? undefined : [dashLen, dashGap]}
          />

          {/* Resize handles — hidden when locked. Cursor is driven by affordance kind. */}
          {!isLocked && affordances.map((aff) => (
            <Circle
              key={aff.key}
              x={aff.worldX}
              y={aff.worldY}
              radius={handleR}
              fill={colors.panel}
              stroke={colors.accent}
              strokeWidth={strokeW}
              onMouseEnter={(e) => {
                const stage = (e.target as any).getStage()
                if (stage) stage.container().style.cursor = cursorForAffordance[aff.kind as AffordanceKind]
                onHandleHoverChange?.(true)
              }}
              onMouseLeave={(e) => {
                const stage = (e.target as any).getStage()
                if (stage) stage.container().style.cursor = 'default'
                onHandleHoverChange?.(false)
              }}
              onMouseDown={(e) => startInteraction(aff.key, e)}
            />
          ))}

          {/* Size label below bounding box */}
          <KRect
            x={labelX} y={labelY}
            width={labelWidth} height={labelHeight}
            fill={isLocked ? semantic.lockedBg.replace('0.12', '0.8') : colors.panel}
            cornerRadius={radius.sm / scale}
          />
          <Text
            x={labelX} y={labelY + labelPadY}
            width={labelWidth}
            text={labelText}
            fontSize={labelFontSize}
            fontFamily={fontFamily}
            fill={colors.textPrimary}
            align="center"
            listening={false}
          />
        </>
      )}
    </>
  )
}

export default OverlayLayer
