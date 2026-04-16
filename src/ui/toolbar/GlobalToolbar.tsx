import React from 'react'
import { useEditor } from '../../core/store'
import { ToolButton, ToolbarSeparator } from '../../shared/ui'

export const GlobalToolbar: React.FC = () => {
  const { state, dispatch } = useEditor()

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <ToolButton active={state.ui.activeTool === 'select'} onClick={() => dispatch({ type: 'setActiveTool', tool: 'select' })}>Select</ToolButton>
      <ToolButton active={state.ui.activeTool === 'rectangle'} onClick={() => dispatch({ type: 'setActiveTool', tool: 'rectangle' })}>Rectangle</ToolButton>
      <ToolbarSeparator />
      <ToolButton onClick={() => dispatch({ type: 'undo' })}>Undo</ToolButton>
      <ToolButton onClick={() => dispatch({ type: 'redo' })}>Redo</ToolButton>
      <ToolbarSeparator />
      <ToolButton onClick={() => dispatch({ type: 'resetSelection' })}>Reset Selection</ToolButton>
      <ToolButton onClick={() => {/* reset view stub */}}>Reset View</ToolButton>
    </div>
  )
}

export default GlobalToolbar
