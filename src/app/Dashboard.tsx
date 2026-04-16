/**
 * Dashboard.tsx
 *
 * Application entry screen. Displays the project list and lets the user
 * create a new project or open an existing one.
 *
 * Each project card has:
 *   - Click → open project
 *   - ⋯ menu button → dropdown with Rename / Duplicate / Delete
 *   - Inline rename: clicking the name in the dropdown puts it in edit mode
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useProjects } from './projects-context'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { listDomains } from '../core/domain-contract'
import type { ProjectMeta } from '../core/project-types'

interface DashboardProps {
  onOpenProject: (id: string) => void
  onCreateProject: (domainType: string) => void
}

// ── Card menu state ───────────────────────────────────────────────────────────

type CardMenuState =
  | { mode: 'closed' }
  | { mode: 'open'; id: string }
  | { mode: 'renaming'; id: string }

// ── Individual project card ───────────────────────────────────────────────────

interface ProjectCardProps {
  project: ProjectMeta
  domainLabel?: string
  onOpen: () => void
  onRename: (newName: string) => void
  onDuplicate: () => void
  onDeleteRequest: () => void
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, domainLabel, onOpen, onRename, onDuplicate, onDeleteRequest }) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(project.name)
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync draft when name changes externally
  useEffect(() => { setDraft(project.name) }, [project.name])

  // Close on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  // Focus input on rename mode
  useEffect(() => {
    if (renaming) setTimeout(() => inputRef.current?.select(), 0)
  }, [renaming])

  const commitRename = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== project.name) onRename(trimmed)
    else setDraft(project.name)
    setRenaming(false)
  }

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) }
    catch { return iso }
  }

  return (
    <div className="project-card" onClick={renaming ? undefined : onOpen}>
      <div className="project-card__preview" />

      <div className="project-card__body">
        {renaming ? (
          <input
            ref={inputRef}
            className="project-card__rename-input"
            value={draft}
            onClick={e => e.stopPropagation()}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') { setDraft(project.name); setRenaming(false) }
              e.stopPropagation()
            }}
          />
        ) : (
          <span className="project-card__name">{project.name}</span>
        )}
        <span className="project-card__date">{formatDate(project.updatedAt)}</span>
        {domainLabel && <span className="domain-badge">{domainLabel}</span>}
      </div>

      {/* ⋯ menu button */}
      <div className="project-card__menu-wrap" ref={menuRef}>
        <button
          className="project-card__menu-btn"
          title="Options"
          onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
        >
          ⋯
        </button>

        {menuOpen && (
          <div className="card-dropdown">
            <button className="card-dropdown__item" onClick={e => {
              e.stopPropagation()
              setRenaming(true)
              setMenuOpen(false)
            }}>
              Rename
            </button>
            <button className="card-dropdown__item" onClick={e => {
              e.stopPropagation()
              onDuplicate()
              setMenuOpen(false)
            }}>
              Duplicate
            </button>
            <div className="card-dropdown__sep" />
            <button className="card-dropdown__item card-dropdown__item--danger" onClick={e => {
              e.stopPropagation()
              setMenuOpen(false)
              onDeleteRequest()
            }}>
              Delete…
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const Dashboard: React.FC<DashboardProps> = ({ onOpenProject, onCreateProject }) => {
  const { projects, renameProject, deleteProject, duplicateProject } = useProjects()
  const [pendingDelete, setPendingDelete] = useState<ProjectMeta | null>(null)

  const domains = useMemo(() => listDomains(), [])
  const domainLabelMap = useMemo(
    () => Object.fromEntries(domains.map(d => [d.type, d.label ?? d.type])),
    [domains]
  )

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <span className="dashboard__logo">✦</span>
        <span className="dashboard__title">Simple Editor</span>
      </header>

      <main className="dashboard__main">
        {/* ── New Project ────────────────────────────────────────────── */}
        <div className="dashboard__section-header">
          <h2 className="dashboard__section-title">New Project</h2>
        </div>
        <div className="new-project-grid">
          {domains.map(d => {
            const lbl = d.label ?? d.type
            const abbr = lbl.split(' ').map((w: string) => w[0] ?? '').join('').slice(0, 2).toUpperCase()
            return (
              <button key={d.type} className="new-project-card" onClick={() => onCreateProject(d.type)}>
                <span className="new-project-card__abbr">{abbr}</span>
                <span className="new-project-card__label">{lbl}</span>
              </button>
            )
          })}
        </div>

        {/* ── Recent Projects ─────────────────────────────────────────── */}
        {projects.length > 0 && (
          <>
            <div className="dashboard__section-header" style={{ marginTop: 'var(--sp-10)' }}>
              <h2 className="dashboard__section-title">Recent Projects</h2>
            </div>
            <div className="dashboard__grid">
              {projects.map(p => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  domainLabel={
                    p.domainType && p.domainType !== 'null'
                      ? (domainLabelMap[p.domainType] ?? p.domainType)
                      : undefined
                  }
                  onOpen={() => onOpenProject(p.id)}
                  onRename={name => renameProject(p.id, name)}
                  onDuplicate={() => duplicateProject(p.id)}
                  onDeleteRequest={() => setPendingDelete(p)}
                />
              ))}
            </div>
          </>
        )}
      </main>

      <ConfirmDialog
        open={!!pendingDelete}
        message={`Delete «${pendingDelete?.name}»? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (pendingDelete) deleteProject(pendingDelete.id)
          setPendingDelete(null)
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}

export default Dashboard


