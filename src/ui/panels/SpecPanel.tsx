/**
 * SpecPanel.tsx
 *
 * Reusable panel — derived geometric specification for the selected document.
 * Container-agnostic: can be placed in a sidebar, drawer, or bottom sheet.
 * Collapsible: click the header to collapse/expand.
 */
import React, { useState } from 'react'
import { useEditor } from '../../core/store'
import { getDomain } from '../../core/domain-contract'
import { getNodeDisplayStyles } from '../../core/types'

export const SpecPanel: React.FC = () => {
  const { state } = useEditor()
  const [expanded, setExpanded] = useState(true)
  const selection = state.ui.selection

  // Single-selected node
  const singleNode = selection.length === 1
    ? state.document.nodes.find(n => n.geometry.id === selection[0])
    : undefined
  const r = singleNode?.geometry

  const geoRows = r
    ? (() => {
        const styles = getNodeDisplayStyles(singleNode!)
        return [
          { label: 'X',            value: `${r.x} px` },
          { label: 'Y',            value: `${r.y} px` },
          { label: 'Width',        value: `${r.width} px` },
          { label: 'Height',       value: `${r.height} px` },
          { label: 'Area',         value: `${Math.round(r.width * r.height).toLocaleString()} px²` },
          { label: 'Fill',         value: styles.fill.visible ? `${styles.fill.color} ${styles.fill.opacity}%` : 'hidden' },
          { label: 'Stroke',       value: styles.stroke.visible ? `${styles.stroke.color} ${styles.stroke.opacity}%` : 'none' },
          { label: 'Stroke Width', value: styles.stroke.visible ? `${styles.strokeWidth} px` : '—' },
          { label: 'Locked',       value: r.locked ? 'Yes' : 'No' },
        ]
      })()
    : null

  const domain = singleNode ? getDomain(singleNode.domainType) : undefined
  const domainRows = singleNode && domain?.specRows
    ? domain.specRows(singleNode.computed)
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
          {geoRows ? geoRows.map(({ label, value }) => (
            <div key={label} className="spec-row">
              <span className="spec-row__label">{label}</span>
              <span className="spec-row__value">{value}</span>
            </div>
          )) : (
            <div className="spec-row spec-row--empty">No object selected</div>
          )}
          {domainRows && domainRows.length > 0 && (
            <>
              <div className="spec-row spec-row--section">Domain</div>
              {domainRows.map(({ label, value }) => (
                <div key={label} className="spec-row">
                  <span className="spec-row__label">{label}</span>
                  <span className="spec-row__value">{value}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default SpecPanel

