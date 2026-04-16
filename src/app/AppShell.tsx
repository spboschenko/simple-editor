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
import React, { useEffect } from 'react'
import { useBreakpoint } from '../shared/hooks/useBreakpoint'
import { useUndoRedo } from '../shared/hooks/useUndoRedo'
import { useEditor } from '../core/store'
import { DesktopLayout } from './layout/DesktopLayout'
import { CompactLayout } from './layout/CompactLayout'
import { MobileLayout } from './layout/MobileLayout'
import type { ProjectPayload } from '../core/project-types'

interface AppShellProps {
  /** Mutable ref that App.tsx reads when returning to dashboard to auto-save. */
  editorStateRef?: React.MutableRefObject<(() => ProjectPayload) | null>
}

export const AppShell: React.FC<AppShellProps> = ({ editorStateRef }) => {
  const mode = useBreakpoint()
  useUndoRedo()

  const { state } = useEditor()

  // Keep the ref pointing to a function that returns the current payload.
  useEffect(() => {
    if (editorStateRef) {
      editorStateRef.current = () => ({
        document: state.document,
        camera: state.camera,
      })
    }
  })

  if (mode === 'mobile')  return <MobileLayout />
  if (mode === 'compact') return <CompactLayout />
  return <DesktopLayout />
}

export default AppShell
