import React from 'react'
import { Rect as KRect } from 'react-konva'
import { useEditor } from '../../core/store'
import { worldToKonvaY } from '../../core/coord-transform'

export const DocumentLayer: React.FC = () => {
  const { state } = useEditor()
  const r = state.interaction.previewRect ?? state.document.geometry
  const scale = state.camera.scale

  // Hidden objects are not rendered at all — they don't exist visually.
  if (!r.visible) return null

  // Konva rect y = top of rect in Konva space = worldToKonvaY of the world top edge.
  // World top edge = r.y + r.height (y-up), so ky = STAGE_H/scale - (r.y + r.height).
  return (
    <>
      <KRect
        x={r.x}
        y={worldToKonvaY(r.y + r.height, scale)}
        width={r.width}
        height={r.height}
        fill={r.fill}
        draggable={false}
      />
    </>
  )
}

export default DocumentLayer
