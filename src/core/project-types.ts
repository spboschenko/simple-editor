/**
 * project-types.ts
 *
 * Universal "Project" abstraction. A project is a container with:
 *   - metadata: id, name, timestamps, optional preview thumbnail
 *   - payload:  full serializable snapshot of the editor state (DocumentState + CameraState)
 *
 * The payload shape is intentionally coupled to the current editor state so that
 * loading a project directly hydrates the store. If the editor evolves, a
 * migration step can be added to the storage layer.
 */
import type { AnyDocumentState, CameraState } from './types'

/** Metadata shown on the Dashboard — lightweight, loaded as a list. */
export interface ProjectMeta {
  id: string
  name: string
  createdAt: string   // ISO-8601
  updatedAt: string   // ISO-8601
  /** Domain type of the document. Populated by listMeta() from payload.document.domainType. */
  domainType?: string
}

/** Full project payload persisted alongside metadata. */
export interface ProjectPayload {
  document: AnyDocumentState
  camera: CameraState
}

/** A complete project record (metadata + data). */
export interface Project extends ProjectMeta {
  payload: ProjectPayload
}
