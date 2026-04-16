/**
 * nav-context.tsx
 *
 * Minimal navigation context. Provides callbacks that feature components
 * (e.g. GlobalToolbar) can call without prop drilling through every layout.
 *
 * Exposes:
 *   returnToDashboard()       — saves the active project and navigates back
 *   activeProjectId           — id of the currently open project (or null)
 *   activeProjectName         — display name of the current project
 *   renameActiveProject(name) — persists a new name for the active project
 */
import React, { createContext, useContext } from 'react'

interface NavContextValue {
  returnToDashboard: () => void
  activeProjectId: string | null
  activeProjectName: string
  renameActiveProject: (name: string) => void
}

const NavContext = createContext<NavContextValue>({
  returnToDashboard: () => {},
  activeProjectId: null,
  activeProjectName: '',
  renameActiveProject: () => {},
})

export const NavProvider: React.FC<{
  onReturnToDashboard: () => void
  activeProjectId: string | null
  activeProjectName: string
  onRenameActiveProject: (name: string) => void
  children: React.ReactNode
}> = ({ onReturnToDashboard, activeProjectId, activeProjectName, onRenameActiveProject, children }) => (
  <NavContext.Provider value={{
    returnToDashboard: onReturnToDashboard,
    activeProjectId,
    activeProjectName,
    renameActiveProject: onRenameActiveProject,
  }}>
    {children}
  </NavContext.Provider>
)

export const useNav = () => useContext(NavContext)

