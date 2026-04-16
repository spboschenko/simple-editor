/**
 * AppShell.tsx
 *
 * Top-level layout selector.
 * Reads the current LayoutMode from useBreakpoint and renders the appropriate
 * layout component. All feature panels are decoupled from layout — they are
 * composed inside each layout, not hardcoded here.
 *
 * desktop  >= 1200px  →  DesktopLayout  (full 3-column editor)
 * compact  768–1199px →  CompactLayout  (canvas + panel drawers)
 * mobile   < 768px    →  MobileLayout   (viewer-first + bottom sheets)
 */
import React from 'react'
import { useBreakpoint } from '../shared/hooks/useBreakpoint'
import { DesktopLayout } from './layout/DesktopLayout'
import { CompactLayout } from './layout/CompactLayout'
import { MobileLayout } from './layout/MobileLayout'

export const AppShell: React.FC = () => {
  const mode = useBreakpoint()

  if (mode === 'mobile')  return <MobileLayout />
  if (mode === 'compact') return <CompactLayout />
  return <DesktopLayout />
}

export default AppShell
