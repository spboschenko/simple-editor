/**
 * SpecPanel.tsx
 *
 * Reusable panel — derived geometric specification for the selected document.
 * Container-agnostic: can be placed in a sidebar, drawer, or bottom sheet.
 * Collapsible: click the header to collapse/expand.
 */
import React, { useState } from 'react'
import { useEditor } from '../../core/store'

export const SpecPanel: React.FC = () => {
  const { state } = useEditor()
  const [expanded, setExpanded] = useState(true)
  const selected = state.ui.selectedId
  const r = state.document.rect

  const rows = selected
    ? [
        { label: 'X',      value: `${r.x} px` },
        { label: 'Y',      value: `${r.y} px` },
        { label: 'Width',  value: `${r.width} px` },
        { label: 'Height', value: `${r.height} px` },
        { label: 'Area',   value: `${Math.round(r.width * r.height).toLocaleString()} px²` },
        { label: 'Fill',   value: r.fill },
        { label: 'Locked', value: r.locked ? 'Yes' : 'No' },
      ]
    : null

  return (
    <div className="spec-panel">
      <button className="spec-panel__header" onClick={() => setExpanded(v => !v)}>
        <span>Specification</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
          stroke="currentColor" strokeWidth="1.5" aria-hidden="true"
          style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
          <path d="M3 2l4 3-4 3" />
        </svg>
      </button>
      {expanded && (
        <div className="spec-panel__body">
          {rows ? rows.map(({ label, value }) => (
            <div key={label} className="spec-row">
              <span className="spec-row__label">{label}</span>
              <span className="spec-row__value">{value}</span>
            </div>
          )) : (
            <div className="spec-row spec-row--empty">No object selected</div>
          )}
        </div>
      )}
    </div>
  )
}

export default SpecPanel

