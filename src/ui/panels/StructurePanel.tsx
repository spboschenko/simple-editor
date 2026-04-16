/**
 * StructurePanel.tsx
 *
 * Reusable panel — object structure tree.
 * Container-agnostic: can be placed in a sidebar, drawer, or bottom sheet.
 */
import React, { useState } from 'react'
import { useEditor } from '../../core/store'
import { IconEyeOpen, IconEyeClosed, IconLockOpen, IconLockClosed } from '../../shared/icons'
import { PanelTitle, IconButton } from '../../shared/ui'
import { spacing, colors } from '../../shared/tokens/design-tokens'

export const StructurePanel: React.FC = () => {
  const { state, dispatch } = useEditor()
  const selected = state.ui.selectedId
  const rect = state.document.rect
  const [hovered, setHovered] = useState(false)

  const isRectActive = selected === 'rect-1' || hovered
  const showActions = isRectActive

  const toggleLock = (e: React.MouseEvent) => {
    e.stopPropagation()
    dispatch({ type: 'setLocked', locked: !rect.locked })
  }

  const toggleVisible = (e: React.MouseEvent) => {
    e.stopPropagation()
    dispatch({ type: 'setVisible', visible: !rect.visible })
  }

  return (
    <div onClick={() => dispatch({ type: 'resetSelection' })}>
      <PanelTitle>Structure</PanelTitle>
      <div style={{ marginLeft: spacing[2] }}>
        {/* Document root — click deselects canvas object */}
        <div
          className={'structure-item ' + (selected === null ? 'selected' : '')}
          onClick={e => { e.stopPropagation(); dispatch({ type: 'resetSelection' }) }}
        >
          Document
        </div>

        {/* Rectangle #1 row */}
        <div
          className={'structure-item ' + (selected === 'rect-1' ? 'selected' : '')}
          style={{
            marginLeft: spacing[4],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            opacity: rect.visible ? 1 : 0.4,
          }}
          onClick={e => { e.stopPropagation(); dispatch({ type: 'select', id: 'rect-1' }) }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <span>└── Rectangle #1</span>

          <span
            style={{
              display: 'flex',
              gap: spacing[1],
              opacity: showActions ? 1 : 0,
              transition: 'opacity 0.1s',
              pointerEvents: showActions ? 'auto' : 'none',
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
      </div>
    </div>
  )
}

export default StructurePanel
