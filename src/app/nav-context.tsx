/**
 * nav-context.tsx
 *
 * Minimal navigation context. Provides callbacks that feature components
 * (e.g. GlobalToolbar) can call without prop drilling through every layout.
 *
 * Exposes:
 *   returnToDashboard()   — saves the active project and navigates back
 *   activeProjectId       — id of the currently open project (or null)
 */
import React, { createContext, useContext } from 'react'

interface NavContextValue {
  returnToDashboard: () => void
  activeProjectId: string | null
}

const NavContext = createContext<NavContextValue>({
  returnToDashboard: () => {},
  activeProjectId: null,
})

export const NavProvider: React.FC<{
  onReturnToDashboard: () => void
  activeProjectId: string | null
  children: React.ReactNode
}> = ({ onReturnToDashboard, activeProjectId, children }) => (
  <NavContext.Provider value={{ returnToDashboard: onReturnToDashboard, activeProjectId }}>
    {children}
  </NavContext.Provider>
)

export const useNav = () => useContext(NavContext)
