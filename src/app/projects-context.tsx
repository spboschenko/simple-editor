/**
 * projects-context.tsx
 *
 * Global project management context.  Provides:
 *   - The full list of project metadata (optimistic, in-memory)
 *   - CRUD operations that immediately update local state AND persist to storage
 *   - Active project name for the toolbar
 *
 * This context sits above <NavProvider> and <EditorProvider> in the tree so
 * that both the Dashboard and the editor toolbar share the same state.
 */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ProjectMeta } from '../core/project-types'
import * as storage from '../core/project-storage'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProjectsContextValue {
  /** All project metadata, sorted newest-first (optimistically updated). */
  projects: ProjectMeta[]

  /** Refresh from localStorage (call after external mutations). */
  refresh: () => void

  renameProject: (id: string, newName: string) => void
  deleteProject: (id: string) => void
  duplicateProject: (id: string) => ProjectMeta | null
  createNewProject: (name?: string, domainType?: string) => ProjectMeta
}

const ProjectsContext = createContext<ProjectsContextValue>({
  projects: [],
  refresh: () => {},
  renameProject: () => {},
  deleteProject: () => {},
  duplicateProject: () => null,
  createNewProject: () => { throw new Error('ProjectsProvider missing') },
})

// ── Provider ──────────────────────────────────────────────────────────────────

interface ProjectsProviderProps {
  /** Called when deleteProject removes the currently-open project. */
  onDeleteActive?: () => void
  /** The id of the project currently open in the editor (or null). */
  activeProjectId: string | null
  children: React.ReactNode
}

export const ProjectsProvider: React.FC<ProjectsProviderProps> = ({
  onDeleteActive,
  activeProjectId,
  children,
}) => {
  const [projects, setProjects] = useState<ProjectMeta[]>(() => storage.listMeta())

  const refresh = useCallback(() => setProjects(storage.listMeta()), [])

  // Keep local state in sync when returning from editor (auto-save may change updatedAt)
  useEffect(() => { refresh() }, [activeProjectId, refresh])

  const renameProject = useCallback((id: string, newName: string) => {
    // Optimistic update
    setProjects(prev => prev.map(p =>
      p.id === id ? { ...p, name: newName, updatedAt: new Date().toISOString() } : p
    ))
    storage.rename(id, newName)
  }, [])

  const deleteProject = useCallback((id: string) => {
    // Optimistic update
    setProjects(prev => prev.filter(p => p.id !== id))
    storage.remove(id)
    if (id === activeProjectId) onDeleteActive?.()
  }, [activeProjectId, onDeleteActive])

  const duplicateProject = useCallback((id: string): ProjectMeta | null => {
    const copy = storage.duplicate(id)
    if (!copy) return null
    const meta: ProjectMeta = {
      id: copy.id,
      name: copy.name,
      createdAt: copy.createdAt,
      updatedAt: copy.updatedAt,
      domainType: copy.payload.document.domainType,
    }
    // Add to top of list (optimistic)
    setProjects(prev => [meta, ...prev])
    return meta
  }, [])

  const createNewProject = useCallback((name = 'Untitled Project', domainType = 'null'): ProjectMeta => {
    const project = storage.createFromDomain(name, domainType)
    storage.save(project)
    const meta: ProjectMeta = {
      id: project.id,
      name: project.name,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      domainType: project.payload.document.domainType,
    }
    setProjects(prev => [meta, ...prev])
    return meta
  }, [])

  return (
    <ProjectsContext.Provider value={{ projects, refresh, renameProject, deleteProject, duplicateProject, createNewProject }}>
      {children}
    </ProjectsContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useProjects = () => useContext(ProjectsContext)
