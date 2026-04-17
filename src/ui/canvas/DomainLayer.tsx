/**
 * DomainLayer.tsx
 *
 * Renders the optional visual overlay provided by the active document's domain.
 * Placed between DocumentLayer and OverlayLayer so domain graphics appear above
 * the base rect but below the interaction handles.
 *
 * Usage in CanvasRoot:
 *   <Layer><DomainLayer /></Layer>
 */
import React from 'react'
import { useEditor } from '../../core/store'
import { getDomain } from '../../core/domain-contract'

export const DomainLayer: React.FC = () => {
  const { state } = useEditor()
  const scale = state.camera.scale

  return (
    <>
      {state.document.nodes.map(node => {
        const domain = getDomain(node.domainType)
        if (!domain?.renderOverlay) return null
        return (
          <React.Fragment key={node.geometry.id}>
            {domain.renderOverlay(node.geometry, node.computed, scale)}
          </React.Fragment>
        )
      })}
    </>
  )
}

export default DomainLayer
