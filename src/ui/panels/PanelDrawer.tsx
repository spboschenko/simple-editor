/**
 * PanelDrawer.tsx
 *
 * Lightweight presentation shell for panels in compact and mobile modes.
 * The actual panel content (StructurePanel, SpecPanel, Inspector) is passed
 * as children — fully decoupled from the layout container.
 *
 * Compact mode: slides in from the side (left or right)
 * Mobile mode: same component, rendered at the bottom (controlled via CSS class)
 */
import React from 'react'
import { spacing, colors, radius } from '../../shared/tokens/design-tokens'
import { IconButton } from '../../shared/ui'

interface PanelDrawerProps {
  open: boolean
  onClose: () => void
  side?: 'left' | 'right'
  label: string
  children: React.ReactNode
}

export const PanelDrawer: React.FC<PanelDrawerProps> = ({
  open, onClose, side = 'left', label, children,
}) => {
  if (!open) return null

  const isLeft = side === 'left'
  return (
    <>
      {/* Backdrop */}
      <div
        className="drawer-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={`drawer drawer--${side}`}
        role="dialog"
        aria-label={label}
      >
        <div className="drawer__header">
          <span className="drawer__title">{label}</span>
          <IconButton onClick={onClose} title="Close" aria-label="Close panel">
            {/* × close icon — minimal inline svg, not a recurring icon */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
              stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8"/>
            </svg>
          </IconButton>
        </div>
        <div className="drawer__body">{children}</div>
      </div>
    </>
  )
}

export default PanelDrawer
