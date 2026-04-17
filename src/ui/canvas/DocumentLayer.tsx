import React from 'react'
import { Rect as KRect } from 'react-konva'
import { useEditor } from '../../core/store'
import { worldToKonvaY } from '../../core/coord-transform'
import type { SceneNode, Rect, NodeStyles } from '../../core/types'
import { getNodeDisplayStyles, paintToRgba } from '../../core/types'

/** Render a single rect (leaf node). */
const RenderRect: React.FC<{ r: Rect; styles: NodeStyles; scale: number; opacity?: number }> = ({ r, styles, scale, opacity }) => (
  <KRect
    x={r.x}
    y={worldToKonvaY(r.y + r.height, scale)}
    width={r.width}
    height={r.height}
    fill={paintToRgba(styles.fill)}
    stroke={paintToRgba(styles.stroke)}
    strokeWidth={styles.stroke.visible ? styles.strokeWidth : 0}
    opacity={opacity}
    draggable={false}
  />
)

/**
 * Recursively render a SceneNode.
 * For groups, children are stored in data.children with local coordinates
 * that need to be offset by the group origin.
 */
const RenderNode: React.FC<{
  node: SceneNode
  previewRects: Record<string, Rect>
  scale: number
  parentX?: number
  parentY?: number
}> = ({ node, previewRects, scale, parentX = 0, parentY = 0 }) => {
  const preview = previewRects[node.geometry.id]
  const r = preview ?? node.geometry
  if (!r.visible) return null

  const styles = getNodeDisplayStyles(node)

  // Effective world-space position (accounting for parent offset for group children)
  const worldX = r.x + parentX
  const worldY = r.y + parentY

  if (node.domainType === 'group') {
    const groupData = node.data as { children?: SceneNode[] }
    const children = groupData?.children ?? []
    return (
      <>
        {children.map(child => (
          <RenderNode
            key={child.geometry.id}
            node={child}
            previewRects={previewRects}
            scale={scale}
            parentX={worldX}
            parentY={worldY}
          />
        ))}
      </>
    )
  }

  // Leaf node — render rect at world position
  const worldRect: Rect = { ...r, x: worldX, y: worldY }
  return <RenderRect key={r.id} r={worldRect} styles={styles} scale={scale} />
}

export const DocumentLayer: React.FC = () => {
  const { state } = useEditor()
  const scale = state.camera.scale

  return (
    <>
      {state.document.nodes.map(node => (
        <RenderNode
          key={node.geometry.id}
          node={node}
          previewRects={state.interaction.previewRects}
          scale={scale}
        />
      ))}

      {/* Draw-preview for the rectangle tool (node not yet committed) */}
      {state.interaction.mode === 'drawing' && Object.values(state.interaction.previewRects).map(r => {
        // Skip if this rect belongs to an existing node (handled above)
        if (state.document.nodes.some(n => n.geometry.id === r.id)) return null
        const previewStyles = getNodeDisplayStyles({ geometry: r, domainType: '', data: null, computed: null })
        return (
          <RenderRect key={`draw-${r.id}`} r={r} styles={previewStyles} scale={scale} opacity={0.6} />
        )
      })}
    </>
  )
}

export default DocumentLayer
