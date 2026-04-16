import React, { useState, useRef, useEffect } from 'react'
import { useEditor } from '../../core/store'
import { ToolButton, ToolbarSeparator } from '../../shared/ui'
import { colors, spacing, radius } from '../../shared/tokens/design-tokens'

export const GlobalToolbar: React.FC = () => {
  const { state, dispatch } = useEditor()
  const [viewMenuOpen, setViewMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close the View menu when clicking outside
  useEffect(() => {
    if (!viewMenuOpen) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setViewMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [viewMenuOpen])

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <ToolButton active={state.ui.activeTool === 'select'} onClick={() => dispatch({ type: 'setActiveTool', tool: 'select' })}>Select</ToolButton>
      <ToolButton active={state.ui.activeTool === 'rectangle'} onClick={() => dispatch({ type: 'setActiveTool', tool: 'rectangle' })}>Rectangle</ToolButton>
      <ToolbarSeparator />
      <ToolButton onClick={() => dispatch({ type: 'undo' })}>Undo</ToolButton>
      <ToolButton onClick={() => dispatch({ type: 'redo' })}>Redo</ToolButton>
      <ToolbarSeparator />
      <ToolButton onClick={() => dispatch({ type: 'resetSelection' })}>Reset Selection</ToolButton>

      {/* View menu */}
      <div ref={menuRef} style={{ position: 'relative' }}>
        <ToolButton onClick={() => setViewMenuOpen(o => !o)}>View ▾</ToolButton>
        {viewMenuOpen && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 2,
            background: colors.panel,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.md,
            padding: `${spacing[1]}px 0`,
            zIndex: 200,
            minWidth: 160,
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          }}>
            <button
              onClick={() => { dispatch({ type: 'toggleRulers' }); setViewMenuOpen(false) }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing[2],
                width: '100%',
                padding: `${spacing[1]}px ${spacing[3]}px`,
                background: 'none',
                border: 'none',
                color: 'var(--color-text)',
                fontSize: 'var(--fs-sm)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <span style={{ width: 12, display: 'inline-block', opacity: state.ui.showRulers ? 1 : 0 }}>✓</span>
              Rulers
              <span style={{ marginLeft: 'auto', color: 'var(--color-muted)', fontSize: 'var(--fs-xs)' }}>Shift+R</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default GlobalToolbar
