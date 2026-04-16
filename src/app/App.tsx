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
import { DomainUIProvider } from '../core/domain-ui-context'
import { NavProvider } from './nav-context'
import { ProjectsProvider, useProjects } from './projects-context'
import type { ProjectPayload } from '../core/project-types'
import * as storage from '../core/project-storage'

type AppView = 'dashboard' | 'editor'

// ── Inner component has access to ProjectsContext ─────────────────────────────
const AppInner: React.FC = () => {
  const { renameProject, projects, createNewProject } = useProjects()

  const [view, setView] = useState<AppView>('dashboard')
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [payload, setPayload] = useState<ProjectPayload | undefined>(undefined)

  // Ref to retrieve current editor state for auto-save on exit.
  const editorStateRef = useRef<(() => ProjectPayload) | null>(null)

  const activeProjectName =
    projects.find(p => p.id === activeProjectId)?.name ?? ''

  const openProject = useCallback((id: string) => {
    const project = storage.load(id)
    if (!project) return
    setActiveProjectId(id)
    setPayload(project.payload)
    setView('editor')
  }, [])

  const handleCreateNewProject = useCallback((domainType = 'null') => {
    const meta = createNewProject('Untitled Project', domainType)
    const project = storage.load(meta.id)
    if (!project) return
    setActiveProjectId(meta.id)
    setPayload(project.payload)
    setView('editor')
  }, [createNewProject])

  const returnToDashboard = useCallback(() => {
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

  const handleRenameActive = useCallback((name: string) => {
    if (activeProjectId) renameProject(activeProjectId, name)
  }, [activeProjectId, renameProject])

  if (view === 'editor' && payload) {
    return (
      <NavProvider
        onReturnToDashboard={returnToDashboard}
        activeProjectId={activeProjectId}
        activeProjectName={activeProjectName}
        onRenameActiveProject={handleRenameActive}
      >
        <EditorProvider payload={payload} key={activeProjectId}>
          <DomainUIProvider>
            <AppShell editorStateRef={editorStateRef} />
          </DomainUIProvider>
        </EditorProvider>
      </NavProvider>
    )
  }

  return <Dashboard onOpenProject={openProject} onCreateProject={handleCreateNewProject} />
}

// ── Root: ProjectsProvider wraps everything ───────────────────────────────────
export const App: React.FC = () => {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)

  return (
    <ProjectsProvider
      activeProjectId={activeProjectId}
      onDeleteActive={() => setActiveProjectId(null)}
    >
      <AppInner />
    </ProjectsProvider>
  )
}

export default App



