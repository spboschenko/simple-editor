/**
 * Dashboard.tsx
 *
 * Application entry screen. Displays the project list and lets the user
 * create a new project or open an existing one.
 * Projects are persisted in localStorage via project-storage.
 */
import React, { useState, useEffect, useCallback } from 'react'
import type { ProjectMeta } from '../core/project-types'
import * as storage from '../core/project-storage'

interface DashboardProps {
  onOpenProject: (id: string) => void
  onCreateProject: () => void
}

export const Dashboard: React.FC<DashboardProps> = ({ onOpenProject, onCreateProject }) => {
  const [projects, setProjects] = useState<ProjectMeta[]>([])

  const refresh = useCallback(() => setProjects(storage.listMeta()), [])

  useEffect(() => { refresh() }, [refresh])

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    storage.remove(id)
    refresh()
  }

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) }
    catch { return iso }
  }

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <span className="dashboard__logo">✦</span>
        <span className="dashboard__title">Simple Editor</span>
      </header>

      <main className="dashboard__main">
        <div className="dashboard__section-header">
          <h2 className="dashboard__section-title">Projects</h2>
          <button className="dashboard__create-btn" onClick={onCreateProject}>
            + Create New Project
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="dashboard__empty">
            <p>No projects yet.</p>
            <p className="dashboard__empty-hint">
              Click <strong>Create New Project</strong> to get started.
            </p>
          </div>
        ) : (
          <div className="dashboard__grid">
            {projects.map(p => (
              <div key={p.id} className="project-card" onClick={() => onOpenProject(p.id)}>
                <div className="project-card__preview" />
                <div className="project-card__body">
                  <span className="project-card__name">{p.name}</span>
                  <span className="project-card__date">{formatDate(p.updatedAt)}</span>
                </div>
                <button
                  className="project-card__delete"
                  title="Delete project"
                  onClick={e => handleDelete(e, p.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default Dashboard

