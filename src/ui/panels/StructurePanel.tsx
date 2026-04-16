/**
 * StructurePanel.tsx
 *
 * Reusable panel — object structure tree.
 * Container-agnostic: can be placed in a sidebar, drawer, or bottom sheet.
 */
import React, { useState } from 'react'
import { useEditor } from '../../core/store'
import { getDomain } from '../../core/domain-contract'
import { IconEyeOpen, IconEyeClosed, IconLockOpen, IconLockClosed } from '../../shared/icons'
import { IconButton } from '../../shared/ui'

// ── Chevron icon ──────────────────────────────────────────────────────────────
const IconChevron: React.FC<{ open: boolean }> = ({ open }) => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
    stroke="currentColor" strokeWidth="1.5" aria-hidden="true"
    style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}
  >
    <path d="M3 2l4 3-4 3" />
  </svg>
)

// ── Layer icon (rectangle shape indicator) ────────────────────────────────────
const IconRect: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
    stroke="currentColor" strokeWidth="1.4" aria-hidden="true" style={{ flexShrink: 0 }}>
    <rect x="1.5" y="2.5" width="9" height="7" rx="1" />
  </svg>
)

export const StructurePanel: React.FC = () => {
  const { state, dispatch } = useEditor()
  const selected = state.ui.selectedId
  const rect = state.document.geometry
  const [docExpanded, setDocExpanded] = useState(true)
  const [baseExpanded, setBaseExpanded] = useState(true)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const domain = getDomain(state.document.domainType)
  const children = domain?.getChildren
    ? domain.getChildren(state.document.computed, state.document.data)
    : []
  const isDomainLocked = domain?.isGeometryLocked?.(state.document.data) ?? false

  const toggleLock = (e: React.MouseEvent) => {
    e.stopPropagation()
    dispatch({ type: 'setLocked', locked: !rect.locked })
  }

  const toggleVisible = (e: React.MouseEvent) => {
    e.stopPropagation()
    dispatch({ type: 'setVisible', visible: !rect.visible })
  }

  const toggleCellLock = (e: React.MouseEvent, childId: string) => {
    e.stopPropagation()
    dispatch({ type: 'toggleChildLock', childId })
  }

  const showRectActions = hoveredId === 'rect-1' || selected === 'rect-1' || rect.locked || !rect.visible || isDomainLocked

  return (
    <div className="layers-panel">
      <div className="layers-panel__header">Layers</div>
      <div className="layers-panel__tree">

        {/* Document root */}
        <div
          className={`layer-row ${selected === null ? 'layer-row--selected' : ''}`}
          onClick={e => { e.stopPropagation(); dispatch({ type: 'resetSelection' }) }}
        >
          <button
            className="layer-row__chevron"
            onClick={e => { e.stopPropagation(); setDocExpanded(v => !v) }}
          >
            <IconChevron open={docExpanded} />
          </button>
          <span className="layer-row__name">Document</span>
        </div>

        {/* Base rect */}
        {docExpanded && (
          <>
            <div
              className={[
                'layer-row layer-row--child',
                selected === 'rect-1' ? 'layer-row--selected' : '',
                !rect.visible ? 'layer-row--hidden' : '',
              ].join(' ').trim()}
              onClick={e => { e.stopPropagation(); dispatch({ type: 'select', id: 'rect-1' }) }}
              onMouseEnter={() => setHoveredId('rect-1')}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Chevron to expand/collapse cells */}
              {children.length > 0 ? (
                <button
                  className="layer-row__chevron"
                  onClick={e => { e.stopPropagation(); setBaseExpanded(v => !v) }}
                >
                  <IconChevron open={baseExpanded} />
                </button>
              ) : (
                <span className="layer-row__indent" />
              )}
              <span className="layer-row__type-icon"><IconRect /></span>
              <span className="layer-row__name">Base</span>
              <span className={`layer-row__actions ${showRectActions ? 'layer-row__actions--visible' : ''}`}>
                <IconButton title={rect.visible ? 'Hide' : 'Show'} onClick={toggleVisible}
                  style={{ color: rect.visible ? undefined : 'var(--color-text)' }}>
                  {rect.visible ? <IconEyeOpen size={12} /> : <IconEyeClosed size={12} />}
                </IconButton>
                <IconButton
                  title={rect.locked ? 'Unlock' : isDomainLocked ? 'Locked by cells' : 'Lock'}
                  onClick={toggleLock}
                  style={{ color: (rect.locked || isDomainLocked) ? 'var(--color-text)' : undefined }}
                >
                  {(rect.locked || isDomainLocked) ? <IconLockClosed size={12} /> : <IconLockOpen size={12} />}
                </IconButton>
              </span>
            </div>

            {/* Domain child cells */}
            {baseExpanded && children.map(child => {
              const showChildActions = hoveredId === child.id || child.locked
              return (
                <div
                  key={child.id}
                  className={[
                    'layer-row layer-row--cell',
                    child.locked ? 'layer-row--cell-locked' : '',
                  ].join(' ').trim()}
                  onMouseEnter={() => setHoveredId(child.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <span className="layer-row__indent" />
                  <span className="layer-row__indent" />
                  <span className="layer-row__type-icon"><IconRect /></span>
                  <span className="layer-row__name">{child.name}</span>
                  <span className={`layer-row__actions ${showChildActions ? 'layer-row__actions--visible' : ''}`}>
                    <IconButton
                      title={child.locked ? 'Unlock cell' : 'Lock cell'}
                      onClick={e => toggleCellLock(e, child.id)}
                      style={{ color: child.locked ? '#f87171' : undefined }}
                    >
                      {child.locked ? <IconLockClosed size={12} /> : <IconLockOpen size={12} />}
                    </IconButton>
                  </span>
                </div>
              )
            })}
          </>
        )}

      </div>
    </div>
  )
}

export default StructurePanel

