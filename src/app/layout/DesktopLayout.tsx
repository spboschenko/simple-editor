/**
 * DesktopLayout.tsx
 *
 * Full 3-column editor layout for screens >= 1200px.
 * All panels are visible as permanent sidebars.
 *
 * Structure:
 *   ┌─────────────────────────────────┐
 *   │         GlobalToolbar           │
 *   ├──────────┬──────────────┬───────┤
 *   │  Left    │    Canvas    │ Right │
 *   │ (struct  │              │ (insp │
 *   │  +spec)  │              │  ector│
 *   └──────────┴──────────────┴───────┘
 */
import React from 'react'
import { GlobalToolbar } from '../../ui/toolbar/GlobalToolbar'
import { StructurePanel } from '../../ui/panels/StructurePanel'
import { SpecPanel } from '../../ui/panels/SpecPanel'
import { Inspector } from '../../ui/inspector/Inspector'
import { CanvasRoot } from '../../ui/canvas/CanvasRoot'
import { spacing } from '../../shared/tokens/design-tokens'

export const DesktopLayout: React.FC = () => (
  <div className="app-shell app-shell--desktop">
    <div className="topbar">
      <GlobalToolbar />
    </div>

    <div className="left">
      <StructurePanel />
      <div style={{ marginTop: spacing[4] }}>
        <SpecPanel />
      </div>
    </div>

    <div className="center">
      <CanvasRoot />
    </div>

    <div className="right">
      <Inspector />
    </div>
  </div>
)

export default DesktopLayout
