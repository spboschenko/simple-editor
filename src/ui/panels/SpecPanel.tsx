/**
 * SpecPanel.tsx
 *
 * Reusable panel — derived geometric specification for the selected document.
 * Container-agnostic: can be placed in a sidebar, drawer, or bottom sheet.
 */
import React from 'react'
import { useEditor } from '../../core/store'
import { PanelTitle } from '../../shared/ui'

export const SpecPanel: React.FC = () => {
  const { state } = useEditor()
  const r = state.document.rect
  const area = Math.round(r.width * r.height)

  return (
    <div>
      <PanelTitle>Specification</PanelTitle>
      <div className="spec-item">Area: {area}</div>
    </div>
  )
}

export default SpecPanel
