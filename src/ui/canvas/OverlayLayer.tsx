import React from 'react'
import { Circle, Line, Text, Rect as KRect } from 'react-konva'
import { useEditor, rectsBoundingBox, scaleRectsInBBox } from '../../core/store'
import { colors, semantic, component, fontSize as fontSizeTokens, fontFamily, radius } from '../../shared/tokens/design-tokens'
import { rectAdapter } from '../../core/interaction/shape-adapters/rect-adapter'
import { cursorForAffordance } from '../../core/interaction/cursor-map'
import { AffordanceDef, AffordanceKind } from '../../core/interaction/affordance-types'
import { screenToWorld, worldToKonvaY } from '../../core/coord-transform'
import type { Rect, SceneNode, Paint } from '../../core/types'
import { getDomain } from '../../core/domain-contract'

interface OverlayLayerProps {
  onHandleHoverChange?: (hovering: boolean) => void
  panModeRef?: React.RefObject<boolean>
  /** ID of the node currently hovered (null if none). */
  hoveredNodeId?: string | null
}

/** Returns true when a node is locked for geometry changes. */
function isNodeGeoLocked(node: SceneNode): boolean {
  if (node.geometry.locked) return true
  const domain = getDomain(node.domainType)
  return domain?.isGeometryLocked?.(node.data) ?? false
}

export const OverlayLayer: React.FC<OverlayLayerProps> = ({ onHandleHoverChange, panModeRef, hoveredNodeId }) => {
  const { state, dispatch } = useEditor()
  const selection = state.ui.selection
  const scale = state.camera.scale

  const strokeW = component.overlayStrokeWidth / scale
  const handleR = (component.overlayHandleSize / 2) / scale
  const dashLen = 4 / scale
  const dashGap = 3 / scale

  const interacting = state.interaction.mode === 'moving' || state.interaction.mode === 'resizing'

  // ── Resolve selected nodes and their effective rects ───────────────────
  const selectedNodes: SceneNode[] = selection
    .map(id => state.document.nodes.find(n => n.geometry.id === id))
    .filter((n): n is SceneNode => n != null)

  const selectedRects: Rect[] = selectedNodes.map(
    n => state.interaction.previewRects[n.geometry.id] ?? n.geometry
  )

  const isMulti = selectedNodes.length >= 2
  const isSingle = selectedNodes.length === 1

  // ── Single-selection helpers ──────────────────────────────────────────
  const singleNode = isSingle ? selectedNodes[0] : undefined
  const singleRect = isSingle ? selectedRects[0] : null
  const singleLocked = singleNode ? isNodeGeoLocked(singleNode) : false

  // ── Multi-selection bounding box ──────────────────────────────────────
  const multiBBox = isMulti ? rectsBoundingBox(selectedRects) : null
  const anyLocked = isMulti && selectedNodes.some(n => isNodeGeoLocked(n))

  // ── Bounding rect used for handles & label (single node or multi bbox) ─
  const containerRect: Rect | null = isMulti && multiBBox
    ? { id: '__group__', x: multiBBox.x, y: multiBBox.y, width: multiBBox.width, height: multiBBox.height, fill: { color: '#000000', opacity: 0, visible: false } as Paint, stroke: { color: '#000000', opacity: 0, visible: false } as Paint, strokeWidth: 0, strokePosition: 'center' as const, locked: anyLocked, visible: true }
    : singleRect

  const containerLocked = isMulti ? anyLocked : singleLocked

  // ── Resize interaction (works for both single and multi) ──────────────
  const startInteraction = (affordanceKey: string, e: any) => {
    e.cancelBubble = true
    const stage = e.target.getStage()
    const capturedCamera = { ...state.camera }

    const toWorld = (ev: MouseEvent) => {
      const stageBounds = stage.container().getBoundingClientRect()
      const sx = ev.clientX - stageBounds.left
      const sy = ev.clientY - stageBounds.top
      return screenToWorld(sx, sy, capturedCamera)
    }

    const startWorld = toWorld(e.evt as MouseEvent)

    if (isSingle && singleNode) {
      // ── Single-node resize ──────────────────────────────────────────
      const baseRect = { ...singleNode.geometry }
      let latestRect = { ...baseRect }

      const onMove = (ev: MouseEvent) => {
        const currentWorld = toWorld(ev)
        latestRect = rectAdapter.applyManipulation(baseRect, affordanceKey, startWorld, currentWorld)
        dispatch({ type: 'resizePreview', rect: latestRect })
      }
      const onUp = () => {
        dispatch({ type: 'commitResize', rect: latestRect })
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)

    } else if (isMulti && multiBBox) {
      // ── Multi-node (group) resize ───────────────────────────────────
      // Capture base rects and bbox at interaction start
      const baseBBoxRect: Rect = {
        id: '__group__', x: multiBBox.x, y: multiBBox.y,
        width: multiBBox.width, height: multiBBox.height,
        fill: { color: '#000000', opacity: 0, visible: false } as Paint, stroke: { color: '#000000', opacity: 0, visible: false } as Paint, strokeWidth: 0, strokePosition: 'center' as const, locked: false, visible: true,
      }
      const baseRects: Record<string, Rect> = {}
      for (const node of selectedNodes) {
        if (!isNodeGeoLocked(node)) {
          baseRects[node.geometry.id] = { ...node.geometry }
        }
      }
      let latestRects = { ...baseRects }

      const onMove = (ev: MouseEvent) => {
        const currentWorld = toWorld(ev)
        const newBBoxRect = rectAdapter.applyManipulation(baseBBoxRect, affordanceKey, startWorld, currentWorld)
        latestRects = scaleRectsInBBox(baseRects, baseBBoxRect, newBBoxRect)
        dispatch({ type: 'resizeGroupPreview', rects: latestRects })
      }
      const onUp = () => {
        dispatch({ type: 'commitMove', rects: latestRects })
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    }
  }

  // ── Size label helpers ────────────────────────────────────────────────
  const labelFontSize = fontSizeTokens.xs / scale
  const labelPadX = 6 / scale
  const labelPadY = 3 / scale

  /** Render an outline rect as a closed Line. */
  const renderOutline = (
    r: { x: number; y: number; width: number; height: number },
    key: string,
    stroke: string,
    dash?: number[],
    opacity = 1,
  ) => {
    const kyBottom = worldToKonvaY(r.y, scale)
    const kyTop = worldToKonvaY(r.y + r.height, scale)
    return (
      <Line
        key={key}
        points={[r.x, kyBottom, r.x + r.width, kyBottom, r.x + r.width, kyTop, r.x, kyTop, r.x, kyBottom]}
        stroke={stroke}
        strokeWidth={strokeW}
        dash={dash}
        opacity={opacity}
        listening={false}
      />
    )
  }

  return (
    <>
      {/* ── Hover outline for non-selected node ──────────────────────── */}
      {hoveredNodeId && !selection.includes(hoveredNodeId) && (() => {
        const node = state.document.nodes.find(n => n.geometry.id === hoveredNodeId)
        if (!node || !node.geometry.visible) return null
        const r = state.interaction.previewRects[hoveredNodeId] ?? node.geometry
        return renderOutline(r, 'hover', colors.accent, undefined, 0.45)
      })()}

      {/* ── Individual selection outlines ─────────────────────────────── */}
      {!interacting && selectedNodes.map((node, i) => {
        const r = selectedRects[i]
        const isLocked = isNodeGeoLocked(node)
        return renderOutline(
          r,
          `sel-${node.geometry.id}`,
          isLocked ? semantic.locked : colors.accent,
          isLocked ? undefined : [dashLen, dashGap],
          isMulti ? 0.4 : 1,
        )
      })}

      {/* ── Multi-select: group bounding box outline ─────────────────── */}
      {isMulti && multiBBox && !interacting &&
        renderOutline(multiBBox, 'group-bbox', anyLocked ? semantic.locked : colors.accent, [dashLen, dashGap])
      }

      {/* ── During resize: show updating outlines ────────────────────── */}
      {state.interaction.mode === 'resizing' && selectedNodes.map((node) => {
        const r = state.interaction.previewRects[node.geometry.id] ?? node.geometry
        return renderOutline(r, `resize-${node.geometry.id}`, colors.accent, [dashLen, dashGap], 0.5)
      })}
      {state.interaction.mode === 'resizing' && isMulti && (() => {
        const previewRects = selectedNodes.map(n => state.interaction.previewRects[n.geometry.id] ?? n.geometry)
        const bbox = rectsBoundingBox(previewRects)
        return bbox ? renderOutline(bbox, 'resize-group-bbox', colors.accent, [dashLen, dashGap]) : null
      })()}

      {/* ── Resize handles on container rect (single or multi bbox) ─── */}
      {containerRect && !interacting && !containerLocked && (() => {
        const affordances: AffordanceDef[] = rectAdapter.getAffordances(containerRect)
        return affordances.map((aff) => (
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
        ))
      })()}

      {/* ── Size label (container dimensions) ────────────────────────── */}
      {containerRect && !interacting && (() => {
        const r = containerRect
        const labelText = `${r.width} × ${r.height}`
        const labelWidth = labelText.length * (labelFontSize * 0.55) + labelPadX * 2
        const labelHeight = labelFontSize + labelPadY * 2
        const labelX = r.x + r.width / 2 - labelWidth / 2
        const kyBottom = worldToKonvaY(r.y, scale)
        const labelBgKy = kyBottom + 10 / scale
        const labelTextKy = labelBgKy + labelPadY
        return (
          <>
            <KRect
              x={labelX} y={labelBgKy}
              width={labelWidth} height={labelHeight}
              fill={containerLocked ? semantic.lockedBg.replace('0.12', '0.8') : colors.panel}
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
        )
      })()}
    </>
  )
}

export default OverlayLayer
