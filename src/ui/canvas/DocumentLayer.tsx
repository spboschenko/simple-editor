import React from 'react'
import { Rect as KRect } from 'react-konva'
import { useEditor } from '../../core/store'

export const DocumentLayer: React.FC = () => {
  const { state } = useEditor()
  const r = state.interaction.previewRect ?? state.document.rect

  // Hidden objects are not rendered at all — they don't exist visually.
  if (!r.visible) return null

  return (
    <>
      <KRect x={r.x} y={r.y} width={r.width} height={r.height} fill={r.fill} draggable={false} />
    </>
  )
}

export default DocumentLayer
