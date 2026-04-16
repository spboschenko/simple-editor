import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useEditor } from '../../core/store'
import { useNav } from '../../app/nav-context'
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

// ── Main component ────────────────────────────────────────────────────────────

export const GlobalToolbar: React.FC = () => {
  const { state, dispatch } = useEditor()
  const { returnToDashboard } = useNav()
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const barRef = useRef<HTMLDivElement>(null)

  // Close on outside click
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

  // ── Menu definitions ──────────────────────────────────────────────────────

  const fileItems: MenuItemDef[] = [
    { kind: 'item', label: 'New',               action: stub('New') },
    { kind: 'sep' },
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
    { kind: 'item', label: 'Zoom to fit',      action: () => dispatch({ type: 'setCamera', camera: fitCamera(state.document.rect) }) },
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

      {/* ── Spacer ────────────────────────────────────────────────────── */}
      <div style={{ flex: 1 }} />
    </div>
  )
}

export default GlobalToolbar

