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
import { CanvasShell } from '../../ui/canvas/CanvasShell'

export const DesktopLayout: React.FC = () => (
  <div className="app-shell app-shell--desktop">
    <div className="topbar">
      <GlobalToolbar />
    </div>

    <div className="left left--flex">
      <div className="left__layers">
        <StructurePanel />
      </div>
      <div className="left__spec">
        <SpecPanel />
      </div>
    </div>

    <div className="center">
      <CanvasShell />
    </div>

    <div className="right">
      <Inspector />
    </div>
  </div>
)

export default DesktopLayout
