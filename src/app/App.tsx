/**
 * App.tsx
 *
 * Root component. Owns the top-level view state:
 *   "dashboard"  — project list / landing screen (default)
 *   "editor"     — workspace for the active project
 *
 * Routing is intentionally local (useState) — no external router dependency.
 * On navigation to editor the active project's payload is loaded from
 * localStorage and passed to EditorProvider. On return the current editor
 * state is persisted back.
 */
import React, { useState, useCallback, useRef } from 'react'
import { AppShell } from './AppShell'
import { Dashboard } from './Dashboard'
import { EditorProvider } from '../core/store'
import { NavProvider } from './nav-context'
import type { Project } from '../core/project-types'
import type { ProjectPayload } from '../core/project-types'
import * as storage from '../core/project-storage'

type AppView = 'dashboard' | 'editor'

export const App: React.FC = () => {
  const [view, setView] = useState<AppView>('dashboard')
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [payload, setPayload] = useState<ProjectPayload | undefined>(undefined)

  // Ref to retrieve current editor state for auto-save on exit.
  // Set inside the EditorProvider/AppShell via the useAutoSave hook.
  const editorStateRef = useRef<(() => ProjectPayload) | null>(null)

  const openProject = useCallback((id: string) => {
    const project = storage.load(id)
    if (!project) return
    setActiveProjectId(id)
    setPayload(project.payload)
    setView('editor')
  }, [])

  const createProject = useCallback(() => {
    const project = storage.createDefault('Untitled Project')
    storage.save(project)
    setActiveProjectId(project.id)
    setPayload(project.payload)
    setView('editor')
  }, [])

  const returnToDashboard = useCallback(() => {
    // Auto-save current state
    if (activeProjectId && editorStateRef.current) {
      const existing = storage.load(activeProjectId)
      if (existing) {
        storage.save({ ...existing, payload: editorStateRef.current() })
      }
    }
    editorStateRef.current = null
    setActiveProjectId(null)
    setPayload(undefined)
    setView('dashboard')
  }, [activeProjectId])

  if (view === 'editor' && payload) {
    return (
      <NavProvider onReturnToDashboard={returnToDashboard} activeProjectId={activeProjectId}>
        <EditorProvider payload={payload} key={activeProjectId}>
          <AppShell editorStateRef={editorStateRef} />
        </EditorProvider>
      </NavProvider>
    )
  }

  return <Dashboard onOpenProject={openProject} onCreateProject={createProject} />
}

export default App


