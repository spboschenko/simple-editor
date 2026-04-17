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
import type { AnyDocumentState, CameraState, Rect, SceneNode } from './types'
import { DEFAULT_FILL, DEFAULT_STROKE, migrateToPaint } from './types'
import { fitCamera } from './coord-transform'
import { nullDomain, getDomain } from './domain-contract'
import { nodesBoundingBox } from './store'

const STORAGE_KEY = 'projects'

// ── Internal helpers ──────────────────────────────────────────────────────────

function readAll(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const projects = JSON.parse(raw) as Project[]
    // Migrate old single-object format to multi-node format
    for (const p of projects) {
      const doc = p.payload?.document as any
      if (doc && !Array.isArray(doc.nodes)) {
        const geometry = doc.geometry as Rect | undefined
        if (geometry) {
          const domainType = doc.domainType ?? nullDomain.type
          const data = doc.data ?? nullDomain.defaults
          const domain = getDomain(domainType) ?? nullDomain
          const node: SceneNode = {
            geometry,
            domainType,
            data,
            computed: domain.process(geometry, data),
          }
          ;(p.payload.document as any) = { nodes: [node] }
        } else {
          ;(p.payload.document as any) = { nodes: [] }
        }
      }
      // Migrate legacy rects missing stroke/strokeWidth fields and string-based fill/stroke to Paint
      if (doc?.nodes) {
        for (const node of doc.nodes as SceneNode[]) {
          const g = node.geometry as any
          g.fill = migrateToPaint(g.fill, DEFAULT_FILL)
          g.stroke = migrateToPaint(g.stroke, DEFAULT_STROKE)
          if (g.strokeWidth === undefined) g.strokeWidth = 1
          if (g.strokePosition === undefined) g.strokePosition = 'center'
        }
      }
    }
    return projects
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
  const geometry: Rect = {
    id: 'rect-1',
    x: 120,
    y: 80,
    width: 240,
    height: 160,
    fill: { ...DEFAULT_FILL },
    stroke: { ...DEFAULT_STROKE },
    strokeWidth: 1,
    strokePosition: 'center',
    locked: false,
    visible: true,
  }
  const node: SceneNode = {
    geometry,
    domainType: nullDomain.type,
    data: nullDomain.defaults,
    computed: nullDomain.process(geometry, nullDomain.defaults),
  }
  const document: AnyDocumentState = {
    nodes: [node],
  }
  const bbox = nodesBoundingBox(document.nodes) ?? geometry
  const camera: CameraState = fitCamera(bbox)
  return { document, camera }
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Return lightweight metadata for every stored project (sorted newest-first). */
export function listMeta(): ProjectMeta[] {
  return readAll()
    .map(p => ({
      id: p.id,
      name: p.name,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      domainType: p.payload.document.nodes[0]?.domainType,
    }))
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

/**
 * Factory: create a fresh project whose document is initialised from a
 * registered domain's defaults rather than the hardcoded rect geometry.
 * If the domainType is not registered, falls back to createDefault().
 */
export function createFromDomain(name: string, domainType: string): Project {
  const domain = getDomain(domainType)
  if (!domain) return createDefault(name)

  const dg = domain.defaultGeometry ?? {}
  const geometry: Rect = {
    id: 'rect-1',
    x:      dg.x      ?? 120,
    y:      dg.y      ?? 80,
    width:  dg.width  ?? 240,
    height: dg.height ?? 160,
    fill:   migrateToPaint((dg as any).fill, DEFAULT_FILL),
    stroke: migrateToPaint((dg as any).stroke, DEFAULT_STROKE),
    strokeWidth: (dg as any).strokeWidth ?? 1,
    strokePosition: (dg as any).strokePosition ?? 'center',
    locked: dg.locked ?? false,
    visible: dg.visible ?? true,
  }
  const node: SceneNode = {
    geometry,
    domainType,
    data: domain.defaults,
    computed: domain.process(geometry, domain.defaults),
  }
  const document: AnyDocumentState = {
    nodes: [node],
  }
  const now = new Date().toISOString()
  return {
    id: generateId(),
    name,
    createdAt: now,
    updatedAt: now,
    payload: { document, camera: fitCamera(geometry) },
  }
}

/** Rename a project. No-op if the project does not exist. */
export function rename(id: string, newName: string): void {
  const all = readAll()
  const idx = all.findIndex(p => p.id === id)
  if (idx < 0) return
  all[idx] = { ...all[idx], name: newName, updatedAt: new Date().toISOString() }
  writeAll(all)
}

/**
 * Duplicate a project. Returns the new copy or null if the source is not found.
 * The copy gets a new id, " (copy)" appended to the name, and fresh timestamps.
 */
export function duplicate(id: string): Project | null {
  const source = load(id)
  if (!source) return null
  const copy: Project = {
    ...JSON.parse(JSON.stringify(source)) as Project, // deep clone
    id: generateId(),
    name: `${source.name} (copy)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  save(copy)
  return copy
}
