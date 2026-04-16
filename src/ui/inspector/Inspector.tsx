import React, { useState, useEffect } from 'react'
import { useEditor } from '../../core/store'
import { IconLockClosed } from '../../shared/icons'
import { PanelTitle, ToolButton, Field } from '../../shared/ui'
import { spacing, semantic } from '../../shared/tokens/design-tokens'

export const Inspector: React.FC = () => {
  const { state, dispatch } = useEditor()
  const rect = state.document.rect
  const selected = state.ui.selectedId === rect.id
  const isLocked = rect.locked

  const [local, setLocal] = useState({ x: rect.x, y: rect.y, width: rect.width, height: rect.height, fill: rect.fill })

  useEffect(() => {
    setLocal({ x: rect.x, y: rect.y, width: rect.width, height: rect.height, fill: rect.fill })
  }, [rect.x, rect.y, rect.width, rect.height, rect.fill])

  const commit = () => dispatch({ type: 'updateProps', rect: { ...rect, ...local } })
  const reset = () => setLocal({ x: rect.x, y: rect.y, width: rect.width, height: rect.height, fill: rect.fill })

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') reset()
  }

  if (!selected) return (
    <div>
      <PanelTitle>Inspector</PanelTitle>
      <div style={{ color: '#666' }}>No selection</div>
    </div>
  )

  return (
    <div>
      <PanelTitle>Inspector</PanelTitle>
      {isLocked && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing[2],
          marginTop: spacing[1],
          marginBottom: spacing[2],
          padding: `${spacing[1]}px ${spacing[2]}px`,
          background: semantic.lockedBg,
          borderRadius: spacing[1],
          fontSize: 'var(--fs-sm)',
          color: semantic.lockedText,
        }}>
          <IconLockClosed size={12} />
          Locked — edit disabled
        </div>
      )}
      <div style={{ marginTop: spacing[2] }}>
        <Field label="X"      value={local.x}      disabled={isLocked} onChange={e => setLocal({ ...local, x: Number(e.target.value) })}      onKeyDown={handleKeyDown} />
        <Field label="Y"      value={local.y}      disabled={isLocked} onChange={e => setLocal({ ...local, y: Number(e.target.value) })}      onKeyDown={handleKeyDown} />
        <Field label="Width"  value={local.width}  disabled={isLocked} onChange={e => setLocal({ ...local, width: Number(e.target.value) })}  onKeyDown={handleKeyDown} />
        <Field label="Height" value={local.height} disabled={isLocked} onChange={e => setLocal({ ...local, height: Number(e.target.value) })} onKeyDown={handleKeyDown} />
        <Field label="Fill"   value={local.fill}   disabled={isLocked} onChange={e => setLocal({ ...local, fill: e.target.value })}           onKeyDown={handleKeyDown} />
        <div style={{ display: 'flex', gap: spacing[2] }}>
          <ToolButton onClick={commit} disabled={isLocked}>Commit</ToolButton>
          <ToolButton onClick={reset}>Cancel</ToolButton>
        </div>
      </div>
    </div>
  )
}

export default Inspector
