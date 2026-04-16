import React from 'react'
import { CanvasRoot } from './CanvasRoot'
import { ToolButton } from '../../shared/ui'
import { useEditor } from '../../core/store'
import { fitCamera } from '../../core/coord-transform'
import { spacing } from '../../shared/tokens/design-tokens'

export const CanvasShell: React.FC = () => {
  const { state, dispatch } = useEditor()
  const camera = state.camera

  return (
    <div className="canvas-shell">
      <div className="canvas-shell__background" />

      <div className="canvas-shell__content">
        <CanvasRoot />
      </div>

      <div className="floating-toolbar" role="toolbar" aria-label="Canvas tools">
        <div style={{ display: 'flex', gap: spacing[2], alignItems: 'center' }}>
          <ToolButton active> Select </ToolButton>
          <ToolButton> Hand </ToolButton>
        </div>
        <div style={{ display: 'flex', gap: spacing[2], alignItems: 'center' }}>
          <ToolButton onClick={() => dispatch({ type: 'setCamera', camera: { ...camera, x: 0, y: 0, scale: 1 } })}>1:1</ToolButton>
          <ToolButton onClick={() => dispatch({ type: 'setCamera', camera: fitCamera(state.document.geometry) })}>Fit</ToolButton>
        </div>
      </div>
    </div>
  )
}

export default CanvasShell
