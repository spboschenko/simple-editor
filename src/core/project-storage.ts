/**
 * project-storage.ts
 *
 * Persistent Storage layer for projects. Uses localStorage as primary backend.
 *
 * Data layout in localStorage:
 *   key: "projects"  →  JSON array of Project records
 *
 * Public API:
 *   listMeta()           → ProjectMeta[]          (lightweight list for dashboard)
 *   load(id)             → Project | null          (full record with payload)
 *   save(project)        → void                    (upsert: create or update)
 *   remove(id)           → void
 *   createDefault(name)  → Project                 (factory with default payload)
 */
import type { Project, ProjectMeta, ProjectPayload } from './project-types'
import type { DocumentState, CameraState } from './types'
import { fitCamera } from './coord-transform'

const STORAGE_KEY = 'projects'

// ── Internal helpers ──────────────────────────────────────────────────────────

function readAll(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Project[]
  } catch {
    return []
  }
}

function writeAll(projects: Project[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
}

function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// ── Default payload factory ───────────────────────────────────────────────────

function defaultPayload(): ProjectPayload {
  const rect = {
    id: 'rect-1',
    x: 120,
    y: 80,
    width: 240,
    height: 160,
    fill: '#60a5fa',
    locked: false,
    visible: true,
  }
  const document: DocumentState = { rect }
  const camera: CameraState = fitCamera(rect)
  return { document, camera }
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Return lightweight metadata for every stored project (sorted newest-first). */
export function listMeta(): ProjectMeta[] {
  return readAll()
    .map(({ id, name, createdAt, updatedAt }) => ({ id, name, createdAt, updatedAt }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

/** Load a complete project by id. Returns null if not found. */
export function load(id: string): Project | null {
  return readAll().find(p => p.id === id) ?? null
}

/** Upsert: save a project (create if new id, update if existing). */
export function save(project: Project): void {
  const all = readAll()
  const idx = all.findIndex(p => p.id === project.id)
  const updated: Project = { ...project, updatedAt: new Date().toISOString() }
  if (idx >= 0) {
    all[idx] = updated
  } else {
    all.push(updated)
  }
  writeAll(all)
}

/** Remove a project by id. No-op if not found. */
export function remove(id: string): void {
  writeAll(readAll().filter(p => p.id !== id))
}

/** Factory: create a brand-new project with the given name and default payload. */
export function createDefault(name: string): Project {
  const now = new Date().toISOString()
  return {
    id: generateId(),
    name,
    createdAt: now,
    updatedAt: now,
    payload: defaultPayload(),
  }
}
