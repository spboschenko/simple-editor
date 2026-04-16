import React from 'react'
import { Circle, Line, Text, Rect as KRect } from 'react-konva'
import { useEditor } from '../../core/store'
import { colors, semantic, component, fontSize as fontSizeTokens, fontFamily, radius } from '../../shared/tokens/design-tokens'
import { rectAdapter } from '../../core/interaction/shape-adapters/rect-adapter'
import { cursorForAffordance } from '../../core/interaction/cursor-map'
import { AffordanceDef, AffordanceKind } from '../../core/interaction/affordance-types'
import { screenToWorld, worldToKonvaY } from '../../core/coord-transform'

interface OverlayLayerProps {
  /** Notify parent when pointer enters/leaves a handle, so CanvasRoot can suppress body hit-test cursor. */
  onHandleHoverChange?: (hovering: boolean) => void
  /** When true (Space held), handle hover should not change the cursor. */
  panModeRef?: React.RefObject<boolean>
  /** True when pointer is hovering over the object body but it is not yet selected. */
  hovered?: boolean
}

export const OverlayLayer: React.FC<OverlayLayerProps> = ({ onHandleHoverChange, panModeRef, hovered }) => {
  const { state, dispatch } = useEditor()
  const base = state.document.geometry
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

  // ── Size label ────────────────────────────────────────────────────────────
  // Positioned using Konva y-coords (kyBottom/kyTop from worldToKonvaY).
  const labelText = `${r.width} × ${r.height}`
  const labelFontSize = fontSizeTokens.xs / scale
  const labelPadX = 6 / scale
  const labelPadY = 3 / scale
  const labelWidth = labelText.length * (labelFontSize * 0.55) + labelPadX * 2
  const labelHeight = labelFontSize + labelPadY * 2
  const labelX = r.x + r.width / 2 - labelWidth / 2

  // Konva y-coordinates for the rect edges (Konva y increases downward).
  // World bottom edge: r.y  → kyBottom = STAGE_H/scale - r.y
  // World top edge:    r.y+r.height → kyTop = STAGE_H/scale - (r.y+r.height)
  const kyBottom = worldToKonvaY(r.y, scale)
  const kyTop    = worldToKonvaY(r.y + r.height, scale)

  // Label sits below the visual bottom of the rect in screen space,
  // i.e. at a larger Konva y than kyBottom.
  const labelBgKy   = kyBottom + 10 / scale
  const labelTextKy = labelBgKy + labelPadY

  /**
   * Starts a resize interaction session for the given affordance key.
   * Geometry update math is delegated to rectAdapter.applyManipulation.
   * Lifecycle (pointer capture, preview, commit) is owned here per the
   * interaction model: overlay performs hit-testing and initiates sessions.
   */
  const startInteraction = (affordanceKey: string, e: any) => {
    e.cancelBubble = true
    const stage = e.target.getStage()
    const baseRect = { ...state.document.geometry }
    // Capture camera once so all world conversions during this session are consistent.
    const capturedCamera = { ...state.camera }

    const toWorld = (ev: MouseEvent) => {
      const stageBounds = stage.container().getBoundingClientRect()
      const sx = ev.clientX - stageBounds.left
      const sy = ev.clientY - stageBounds.top
      return screenToWorld(sx, sy, capturedCamera)
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
      {/* Hover outline — shown when pointer is over an unselected, visible object. */}
      {!selected && hovered && base.visible && (
        <Line
          points={[r.x, kyBottom, r.x + r.width, kyBottom, r.x + r.width, kyTop, r.x, kyTop, r.x, kyBottom]}
          stroke={colors.accent}
          strokeWidth={strokeW}
          opacity={0.45}
          listening={false}
        />
      )}
      {selected && !moving && (
        <>
          {/* Selection outline — locked: solid amber; unlocked: dashed accent.
              Points trace the bounding box in Konva coords (y-down):
              bottom-left → bottom-right → top-right → top-left → close. */}
          <Line
            points={[r.x, kyBottom, r.x + r.width, kyBottom, r.x + r.width, kyTop, r.x, kyTop, r.x, kyBottom]}
            stroke={isLocked ? semantic.locked : colors.accent}
            strokeWidth={strokeW}
            dash={isLocked ? undefined : [dashLen, dashGap]}
          />

          {/* Resize handles — hidden when locked. Cursor is driven by affordance kind. */}
          {!isLocked && affordances.map((aff) => (
            <Circle
              key={aff.key}
              x={aff.worldX}
              y={worldToKonvaY(aff.worldY, scale)}
              radius={handleR}
              fill={colors.panel}
              stroke={colors.accent}
              strokeWidth={strokeW}
              onMouseEnter={(e) => {
                if (panModeRef?.current) return
                const stage = (e.target as any).getStage()
                if (stage) stage.container().style.cursor = cursorForAffordance[aff.kind as AffordanceKind]
                onHandleHoverChange?.(true)
              }}
              onMouseLeave={(e) => {
                if (panModeRef?.current) return
                const stage = (e.target as any).getStage()
                if (stage) stage.container().style.cursor = 'default'
                onHandleHoverChange?.(false)
              }}
              onMouseDown={(e) => startInteraction(aff.key, e)}
            />
          ))}

          {/* Size label below the visual bottom of the bounding box.
              labelBgKy and labelTextKy are Konva y-coords (y-down, larger = lower on screen). */}
          <KRect
            x={labelX} y={labelBgKy}
            width={labelWidth} height={labelHeight}
            fill={isLocked ? semantic.lockedBg.replace('0.12', '0.8') : colors.panel}
            cornerRadius={radius.sm / scale}
          />
          <Text
            x={labelX} y={labelTextKy}
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
