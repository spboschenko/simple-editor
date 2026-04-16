/**
 * CompactLayout.tsx
 *
 * Canvas-first layout for screens 768–1199px (tablet / narrow desktop).
 * Side panels are hidden by default and toggled via drawer buttons in the toolbar.
 *
 * Capabilities preserved:
 *   - Full canvas interaction (select, move, resize)
 *   - Inspector via left-drawer toggle
 *   - Structure + Spec via right-drawer toggle
 *   - Undo / Redo (in toolbar)
 */
import React, { useState } from 'react'
import { GlobalToolbar } from '../../ui/toolbar/GlobalToolbar'
import { StructurePanel } from '../../ui/panels/StructurePanel'
import { SpecPanel } from '../../ui/panels/SpecPanel'
import { Inspector } from '../../ui/inspector/Inspector'
import { CanvasShell } from '../../ui/canvas/CanvasShell'
import { PanelDrawer } from '../../ui/panels/PanelDrawer'
import { ToolButton } from '../../shared/ui'
import { spacing } from '../../shared/tokens/design-tokens'

export const CompactLayout: React.FC = () => {
  const [structureOpen, setStructureOpen] = useState(false)
  const [inspectorOpen, setInspectorOpen] = useState(false)

  return (
    <div className="app-shell app-shell--compact">
      <div className="topbar">
        {/* Panel toggle buttons placed before toolbar items */}
        <ToolButton
          active={structureOpen}
          onClick={() => setStructureOpen(v => !v)}
          title="Toggle Structure panel"
        >
          Structure
        </ToolButton>
        <ToolButton
          active={inspectorOpen}
          onClick={() => setInspectorOpen(v => !v)}
          title="Toggle Inspector panel"
        >
          Inspector
        </ToolButton>

        <div style={{ width: 1 }} /> {/* visual gap before toolbar actions */}
        <GlobalToolbar />
      </div>

      {/* Canvas always fills the body */}
      <div className="compact-canvas">
        <CanvasShell />
      </div>

      {/* Drawers — rendered on top of canvas */}
      <PanelDrawer
        open={structureOpen}
        onClose={() => setStructureOpen(false)}
        side="left"
        label="Structure"
      >
        <StructurePanel />
        <div style={{ marginTop: spacing[4] }}>
          <SpecPanel />
        </div>
      </PanelDrawer>

      <PanelDrawer
        open={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        side="right"
        label="Inspector"
      >
        <Inspector />
      </PanelDrawer>
    </div>
  )
}

export default CompactLayout
