/**
 * domain-ui-context.tsx
 *
 * Host-Plugin injection layer.
 *
 * DomainUIProvider reads the active domain type from the editor store and
 * makes the domain's UI contributions — toolbar tools and export templates —
 * available to any descendant via useDomainUI().
 *
 * Placement: must be mounted inside EditorProvider (uses useEditor).
 *
 *   <EditorProvider ...>
 *     <DomainUIProvider>
 *       <AppShell />
 *     </DomainUIProvider>
 *   </EditorProvider>
 *
 * Toolbar tools are resolved into ResolvedToolbarTool objects with a pre-bound
 * onClick handler.  The handler captures document data via a ref so that clicks
 * always operate on the latest payload without recreating on every edit.
 */
import React, { createContext, useContext, useMemo, useRef } from 'react'
import { useEditor } from './store'
import { getDomain } from './domain-contract'
import type { DomainModule, ToolbarTool, ExportTemplate } from './domain-contract'

// ── Types ─────────────────────────────────────────────────────────────────────

/** A ToolbarTool descriptor with an onClick already bound to the current state. */
export interface ResolvedToolbarTool extends ToolbarTool {
  onClick: () => void
}

export interface DomainUIContextValue {
  /** The active DomainModule, or null when not registered. */
  domain: DomainModule<any, any> | null
  /**
   * Domain toolbar buttons pre-bound to current document data.
   * Empty when the domain has no toolbarTools.
   */
  toolbarTools: ReadonlyArray<ResolvedToolbarTool>
  /**
   * Export templates declared by the active domain.
   * Empty when the domain has no exportTemplates.
   */
  exportTemplates: ReadonlyArray<ExportTemplate<any, any>>
}

// ── Context ───────────────────────────────────────────────────────────────────

const DomainUIContext = createContext<DomainUIContextValue>({
  domain: null,
  toolbarTools: [],
  exportTemplates: [],
})

// ── Provider ──────────────────────────────────────────────────────────────────

export const DomainUIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state, dispatch } = useEditor()

  // Resolve domain from the first selected node.
  const firstSelected = state.ui.selection.length > 0
    ? state.document.nodes.find(n => n.geometry.id === state.ui.selection[0])
    : null
  const domain = firstSelected ? (getDomain(firstSelected.domainType) ?? null) : null

  // Always-current ref so onClick closures never go stale without re-creating.
  const dataRef = useRef(firstSelected?.data)
  dataRef.current = firstSelected?.data

  // Resolved tool list — only regenerated when the domain type changes.
  // dispatch is from useReducer and is stable across renders.
  const toolbarTools = useMemo<ResolvedToolbarTool[]>(
    () =>
      (domain?.toolbarTools ?? []).map(tool => ({
        ...tool,
        onClick: () =>
          domain?.onToolActivate?.(
            tool.id,
            dataRef.current,
            newData => dispatch({ type: 'updateDomainData', data: newData })
          ),
      })),
    [domain, dispatch]
  )

  const value = useMemo<DomainUIContextValue>(
    () => ({
      domain,
      toolbarTools,
      exportTemplates: domain?.exportTemplates ?? [],
    }),
    [domain, toolbarTools]
  )

  return (
    <DomainUIContext.Provider value={value}>
      {children}
    </DomainUIContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/** Returns domain UI contributions. Must be called inside DomainUIProvider. */
export function useDomainUI(): DomainUIContextValue {
  return useContext(DomainUIContext)
}
