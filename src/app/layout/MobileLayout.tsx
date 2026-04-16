/**
 * MobileLayout.tsx
 *
 * Viewer-first layout for screens < 768px.
 * Canvas occupies the full viewport. Panels are toggled via a bottom action bar.
 *
 * Capabilities per responsive-strategy.md §7:
 *   ✓  View canvas
 *   ✓  Select object (tap)
 *   ✓  View properties (sheet)
 *   ✓  View specification (sheet)
 *   ✗  Resize via handles  (overlay layer is read-only at this mode — future)
 *   ✗  Drag move            (drag not available — future)
 */
import React, { useState } from 'react'
import { StructurePanel } from '../../ui/panels/StructurePanel'
import { SpecPanel } from '../../ui/panels/SpecPanel'
import { Inspector } from '../../ui/inspector/Inspector'
import { CanvasRoot } from '../../ui/canvas/CanvasRoot'
import { PanelDrawer } from '../../ui/panels/PanelDrawer'
import { spacing } from '../../shared/tokens/design-tokens'

type Sheet = 'structure' | 'inspector' | null

export const MobileLayout: React.FC = () => {
  const [sheet, setSheet] = useState<Sheet>(null)

  const toggle = (target: Sheet) =>
    setSheet(prev => (prev === target ? null : target))

  return (
    <div className="app-shell app-shell--mobile">
      {/* Canvas fills screen */}
      <div className="mobile-canvas">
        <CanvasRoot />
      </div>

      {/* Bottom action bar — minimal, touch-friendly */}
      <div className="mobile-actionbar">
        <button
          className={'tool-btn' + (sheet === 'structure' ? ' active' : '')}
          onClick={() => toggle('structure')}
        >
          Structure
        </button>
        <button
          className={'tool-btn' + (sheet === 'inspector' ? ' active' : '')}
          onClick={() => toggle('inspector')}
        >
          Inspector
        </button>
      </div>

      {/* Panels as drawers (bottom sheet via CSS) */}
      <PanelDrawer
        open={sheet === 'structure'}
        onClose={() => setSheet(null)}
        side="left"
        label="Structure"
      >
        <StructurePanel />
        <div style={{ marginTop: spacing[4] }}>
          <SpecPanel />
        </div>
      </PanelDrawer>

      <PanelDrawer
        open={sheet === 'inspector'}
        onClose={() => setSheet(null)}
        side="right"
        label="Inspector"
      >
        <Inspector />
      </PanelDrawer>
    </div>
  )
}

export default MobileLayout
