import React, { useState } from 'react'
import { useEditor } from '../../core/store'
import { IconEyeOpen, IconEyeClosed, IconLockOpen, IconLockClosed } from '../../shared/icons'
import { PanelTitle, IconButton } from '../../shared/ui'
import { spacing, colors } from '../../shared/tokens/design-tokens'
import { getDomain } from '../../core/domain-contract'

// ── Structure section ────────────────────────────────────────────────────────

const StructureSection: React.FC = () => {
  const { state, dispatch } = useEditor()
  const selection = state.ui.selection
  const nodes = state.document.nodes
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  return (
    <div onClick={() => dispatch({ type: 'resetSelection' })}>
      <PanelTitle>Structure</PanelTitle>
      <div style={{ marginLeft: spacing[2] }}>
        {/* Document root */}
        <div
          className={'structure-item ' + (selection.length === 0 ? 'selected' : '')}
          onClick={e => { e.stopPropagation(); dispatch({ type: 'resetSelection' }) }}
        >
          Document
        </div>

        {/* All nodes */}
        {nodes.map(node => {
          const nodeId = node.geometry.id
          const rect = node.geometry
          const isSelected = selection.includes(nodeId)
          const isActive = isSelected || hoveredId === nodeId
          const domain = getDomain(node.domainType)

          const toggleLock = (e: React.MouseEvent) => {
            e.stopPropagation()
            dispatch({ type: 'setLocked', nodeId, locked: !rect.locked })
          }

          const toggleVisible = (e: React.MouseEvent) => {
            e.stopPropagation()
            dispatch({ type: 'setVisible', nodeId, visible: !rect.visible })
          }

          return (
            <div
              key={nodeId}
              className={'structure-item ' + (isSelected ? 'selected' : '')}
              style={{
                marginLeft: spacing[4],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                opacity: rect.visible ? 1 : 0.4,
              }}
              onClick={e => {
                e.stopPropagation()
                dispatch({ type: 'select', id: nodeId })
              }}
              onMouseEnter={() => setHoveredId(nodeId)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <span>└── {domain?.label ?? 'Rectangle'}</span>

              <span
                style={{
                  display: 'flex',
                  gap: spacing[1],
                  opacity: isActive || rect.locked || !rect.visible ? 1 : 0,
                  transition: 'opacity 0.1s',
                  pointerEvents: isActive || rect.locked || !rect.visible ? 'auto' : 'none',
                }}
              >
                <IconButton
                  title={rect.visible ? 'Hide' : 'Show'}
                  onClick={toggleVisible}
                  style={{ color: rect.visible ? colors.textSecondary : colors.textPrimary }}
                >
                  {rect.visible ? <IconEyeOpen /> : <IconEyeClosed />}
                </IconButton>

                <IconButton
                  title={rect.locked ? 'Unlock' : 'Lock'}
                  onClick={toggleLock}
                  style={{ color: rect.locked ? colors.textPrimary : colors.textSecondary }}
                >
                  {rect.locked ? <IconLockClosed /> : <IconLockOpen />}
                </IconButton>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Specification section ────────────────────────────────────────────────────

const SpecSection: React.FC = () => {
  const { state } = useEditor()
  const selection = state.ui.selection
  const singleNode = selection.length === 1
    ? state.document.nodes.find(n => n.geometry.id === selection[0])
    : undefined
  const r = singleNode?.geometry
  const area = r ? Math.round(r.width * r.height) : 0

  return (
    <div style={{ marginTop: spacing[4] }}>
      <PanelTitle>Specification</PanelTitle>
      {r ? (
        <div className="spec-item">Area: {area}</div>
      ) : (
        <div className="spec-item">
          {selection.length > 1 ? `${selection.length} objects selected` : 'No selection'}
        </div>
      )}
    </div>
  )
}

// ── Left panel ───────────────────────────────────────────────────────────────

export const LeftPanel: React.FC = () => {
  return (
    <div>
      <StructureSection />
      <SpecSection />
    </div>
  )
}

export default LeftPanel
