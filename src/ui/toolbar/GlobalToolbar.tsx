import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useEditor, nodesBoundingBox } from '../../core/store'
import { useNav } from '../../app/nav-context'
import { useProjects } from '../../app/projects-context'
import { useDomainUI } from '../../core/domain-ui-context'
import { ConfirmDialog } from '../../shared/ConfirmDialog'
import { ChangeDomainDialog } from '../../shared/ChangeDomainDialog'
import { fitCamera, MIN_SCALE, MAX_SCALE } from '../../core/coord-transform'

// ── Types ─────────────────────────────────────────────────────────────────────

type MenuItemDef =
  | { kind: 'sep' }
  | { kind: 'item'; label: string; shortcut?: string; checked?: boolean; action: () => void }

// ── Dropdown component ────────────────────────────────────────────────────────

interface DropdownProps {
  items: MenuItemDef[]
  onClose: () => void
}

const Dropdown: React.FC<DropdownProps> = ({ items, onClose }) => (
  <div className="menu-dropdown">
    {items.map((item, i) => {
      if (item.kind === 'sep') return <div key={i} className="menu-dropdown__sep" />
      return (
        <button
          key={i}
          className="menu-dropdown__item"
          onClick={() => { item.action(); onClose() }}
        >
          <span className="menu-dropdown__check">{item.checked ? '✓' : ''}</span>
          <span className="menu-dropdown__label">{item.label}</span>
          {item.shortcut && <span className="menu-dropdown__shortcut">{item.shortcut}</span>}
        </button>
      )
    })}
  </div>
)

// ── ProjectName — inline-editable project title ───────────────────────────────

const ProjectName: React.FC = () => {
  const { activeProjectId, activeProjectName, renameActiveProject } = useNav()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(activeProjectName)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync draft when external name changes (e.g. duplicate from another session)
  useEffect(() => { setDraft(activeProjectName) }, [activeProjectName])

  const startEditing = () => {
    if (!activeProjectId) return
    setDraft(activeProjectName)
    setEditing(true)
    // Focus after React flushes the render
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const commit = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== activeProjectName) renameActiveProject(trimmed)
    else setDraft(activeProjectName) // revert if empty or unchanged
    setEditing(false)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') { setDraft(activeProjectName); setEditing(false) }
  }

  if (!activeProjectId) return null

  return editing ? (
    <input
      ref={inputRef}
      className="project-name-input"
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={onKeyDown}
    />
  ) : (
    <span className="project-name-label" title="Click to rename" onClick={startEditing}>
      {activeProjectName || 'Untitled Project'}
    </span>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export const GlobalToolbar: React.FC = () => {
  const { state, dispatch } = useEditor()
  const { returnToDashboard, activeProjectId } = useNav()
  const { duplicateProject, deleteProject } = useProjects()
  const { toolbarTools } = useDomainUI()
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [changeDomainOpen, setChangeDomainOpen] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!openMenu) return
    const onDown = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenMenu(null)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [openMenu])

  const toggle = useCallback((name: string) =>
    setOpenMenu(prev => (prev === name ? null : name)), [])

  const close = useCallback(() => setOpenMenu(null), [])

  const stub = (name: string) => () => console.log(`Feature "${name}" is not implemented yet`)

  // ── Camera helpers ────────────────────────────────────────────────────────
  const cam = state.camera
  const setCamera = (scale: number) =>
    dispatch({ type: 'setCamera', camera: { ...cam, scale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale)) } })

  // ── File menu ─────────────────────────────────────────────────────────────
  const fileItems: MenuItemDef[] = [
    { kind: 'item', label: 'New Project', action: stub('New Project') },
    { kind: 'sep' },
    ...(activeProjectId ? [
      { kind: 'item' as const, label: 'Duplicate', action: () => duplicateProject(activeProjectId) },
      { kind: 'item' as const, label: 'Delete…', action: () => setConfirmDelete(true) },
      { kind: 'item' as const, label: 'Change Type…', action: () => setChangeDomainOpen(true) },
      { kind: 'sep' as const },
    ] : []),
    { kind: 'item', label: 'Import local copy', action: stub('Import local copy') },
    { kind: 'sep' },
    { kind: 'item', label: 'Export local copy', action: stub('Export local copy') },
    { kind: 'item', label: 'Export PDF',        action: stub('Export PDF') },
    { kind: 'sep' },
    { kind: 'item', label: '← Back to Dashboard', action: returnToDashboard },
  ]

  const editItems: MenuItemDef[] = [
    { kind: 'item', label: 'Undo',            shortcut: 'Ctrl Z', action: () => dispatch({ type: 'undo' }) },
    { kind: 'item', label: 'Redo',            shortcut: 'Ctrl Y', action: () => dispatch({ type: 'redo' }) },
    { kind: 'sep' },
    { kind: 'item', label: 'Reset selection', action: () => dispatch({ type: 'resetSelection' }) },
  ]

  const viewItems: MenuItemDef[] = [
    { kind: 'item', label: 'Rulers',           shortcut: 'Shift R', checked: state.ui.showRulers, action: () => dispatch({ type: 'toggleRulers' }) },
    { kind: 'item', label: 'Show outlines',    action: stub('Show outlines') },
    { kind: 'sep' },
    { kind: 'item', label: 'Zoom In',          shortcut: 'Ctrl +', action: () => setCamera(cam.scale * 1.25) },
    { kind: 'item', label: 'Zoom Out',         shortcut: 'Ctrl −', action: () => setCamera(cam.scale / 1.25) },
    { kind: 'item', label: 'Zoom to 100%',     shortcut: 'Ctrl 0', action: () => setCamera(1) },
    { kind: 'item', label: 'Zoom to fit',      action: () => { const bbox = nodesBoundingBox(state.document.nodes); if (bbox) dispatch({ type: 'setCamera', camera: fitCamera(bbox) }) } },
    { kind: 'item', label: 'Zoom to selection', action: stub('Zoom to selection') },
  ]

  const settingsItems: MenuItemDef[] = [
    { kind: 'item', label: 'Theme', action: stub('Theme') },
  ]

  const menus: Array<{ id: string; label: string; items: MenuItemDef[] }> = [
    { id: 'file',     label: 'File',     items: fileItems },
    { id: 'edit',     label: 'Edit',     items: editItems },
    { id: 'view',     label: 'View',     items: viewItems },
    { id: 'settings', label: 'Settings', items: settingsItems },
  ]

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        {/* ── Menu bar ──────────────────────────────────────────────────── */}
        <div className="menu-bar" ref={barRef}>
          {menus.map(({ id, label, items }) => (
            <div key={id} className="menu-bar__entry">
              <button
                className={['menu-bar__item', openMenu === id ? 'active' : ''].join(' ').trim()}
                onClick={() => toggle(id)}
              >
                {label}
              </button>
              {openMenu === id && <Dropdown items={items} onClose={close} />}
            </div>
          ))}
        </div>

        {/* ── Domain toolbar tools ───────────────────────────────────────── */}
        {toolbarTools.length > 0 && (
          <div className="toolbar-domain-tools">
            {toolbarTools.map(tool => (
              <button
                key={tool.id}
                className="toolbar-tool-btn"
                title={tool.shortcut ? `${tool.label}  ${tool.shortcut}` : tool.label}
                aria-label={tool.label}
                onClick={tool.onClick}
              >
                {tool.icon}
              </button>
            ))}
          </div>
        )}

        {/* ── Project name (centre) ──────────────────────────────────────── */}
        <div className="toolbar-project-name">
          <ProjectName />
        </div>

        {/* ── Spacer ────────────────────────────────────────────────────── */}
        <div style={{ flex: 1 }} />
      </div>

      {/* ── Confirmation dialog ────────────────────────────────────────── */}
      <ConfirmDialog
        open={confirmDelete}
        message="Delete this project? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          if (activeProjectId) deleteProject(activeProjectId)
          setConfirmDelete(false)
          returnToDashboard()
        }}
        onCancel={() => setConfirmDelete(false)}
      />
      <ChangeDomainDialog
        open={changeDomainOpen}
        currentDomainType={(() => {
          const sel = state.ui.selection
          if (sel.length === 0) return 'null'
          const node = state.document.nodes.find(n => n.geometry.id === sel[0])
          return node?.domainType ?? 'null'
        })()}
        onSelect={domainType => {
          dispatch({ type: 'changeDomain', domainType })
          setChangeDomainOpen(false)
        }}
        onCancel={() => setChangeDomainOpen(false)}
      />
    </>
  )
}

export default GlobalToolbar


