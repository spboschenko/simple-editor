/**
 * domain-contract.ts
 *
 * The DomainContract interface is the integration boundary between the generic
 * editor UI and a pluggable subject-matter domain (e.g. architectural openings,
 * structural elements, HVAC components).
 *
 * Architecture:
 *   ┌────────────────────────────────────────────────────────────┐
 *   │  UI layer (Canvas, Inspector)  ← geometry: Rect only       │
 *   ├────────────────────────────────────────────────────────────┤
 *   │  DomainLayer (canvas)          ← calls renderOverlay()     │
 *   ├────────────────────────────────────────────────────────────┤
 *   │  Store event bridge            ← calls process() on change │
 *   ├────────────────────────────────────────────────────────────┤
 *   │  DomainContract (registered)   ← process(geometry, data)   │
 *   └────────────────────────────────────────────────────────────┘
 *
 * Each domain is registered once at app startup via registerDomain().
 * The store identifies which domain owns a document via DocumentState.domainType.
 */
import type { Rect, DocumentState } from './types'
import type React from 'react'

// ── Contract ──────────────────────────────────────────────────────────────────

/**
 * A pluggable domain module that encapsulates subject-matter business logic.
 *
 * TData    — raw domain input data stored in DocumentState.data.
 * TComputed — derived output stored in DocumentState.computed.
 */
export interface DomainContract<TData = unknown, TComputed = unknown> {
  /** Unique string identifier — stored in DocumentState.domainType. */
  readonly type: string

  /** Human-readable label shown in the Dashboard and domain selectors. */
  readonly label?: string

  /** Initial value for DocumentState.data when a new document is created. */
  readonly defaults: TData

  /**
   * Default geometry for new documents of this domain type.
   * If omitted the standard 240×160 rect is used.
   */
  readonly defaultGeometry?: Partial<Rect>

  /**
   * Pure Processor function.
   * Transforms geometry + domain data into a Computed result.
   * Called by the store's event bridge after every geometry change.
   *
   * Constraints:
   *   • Must be pure: same inputs → same output, no side effects.
   *   • Must not import or reference any React/store internals.
   *   • The UI layer never calls this directly — only the store does.
   */
  process(geometry: Rect, data: TData): TComputed

  /**
   * Optional Konva overlay renderer.
   * Returns a React element (Konva Group / Shapes) rendered inside a dedicated
   * <Layer> that sits between DocumentLayer and OverlayLayer.
   *
   * Receives:
   *   geometry — the current geometry Rect (y-up world coords)
   *   computed  — the output of process()
   *   scale     — current camera scale (use for screen-constant sizes)
   *
   * The element must only contain react-konva primitives.
   * worldToKonvaY() must be used for all y coordinates.
   */
  renderOverlay?(
    geometry: Rect,
    computed: TComputed,
    scale: number
  ): React.ReactElement | null

  /**
   * Optional spec rows rendered in the SpecPanel below the geometry section.
   * Each entry is { label, value } — pure data, no React.
   */
  specRows?(computed: TComputed): Array<{ label: string; value: string }>

  /**
   * Optional domain-specific inspector section rendered below geometry fields
   * in the right-side Inspector panel. Must be a stable React component type
   * so that hooks work correctly inside it (no anonymous components).
   */
  InspectorSection?: React.ComponentType<{
    data: TData
    onUpdateData: (data: TData) => void
    isLocked: boolean
  }>

  /**
   * Returns tree entries for child objects owned by this domain.
   * Used by StructurePanel to show cells/elements inside the base rect.
   */
  getChildren?(computed: TComputed, data: TData): Array<{
    id: string
    name: string
    locked: boolean
  }>

  /**
   * Returns true when the domain payload contains locked children.
   * When true the store blocks all geometry-mutating actions on the base rect.
   */
  isGeometryLocked?(data: TData): boolean

  /**
   * Toggle the locked state of a child identified by id.
   * Returns a new TData value with the toggle applied.
   * Called by the store's toggleChildLock action.
   */
  toggleChildLock?(childId: string, data: TData): TData
}

// ── ToolbarTool ───────────────────────────────────────────────────────────────

/**
 * Descriptor for a single domain-specific toolbar button.
 * Rendered by DomainUIProvider in the toolbar after the built-in tools.
 */
export interface ToolbarTool {
  /** Stable unique id across all domains. */
  readonly id: string
  /** Tooltip / accessible label. */
  readonly label: string
  /** Icon element — use currentColor SVG so it inherits toolbar text colour. */
  readonly icon: React.ReactNode
  /** Keyboard shortcut display string shown in tooltip, e.g. 'G'. */
  readonly shortcut?: string
}

// ── ExportTemplate ────────────────────────────────────────────────────────────

/**
 * Descriptor for a domain-specific export format.
 * Shown in the File › Export submenu when the active domain registers templates.
 */
export interface ExportTemplate<TData = unknown, TComputed = unknown> {
  readonly id: string
  readonly label: string
  readonly mimeType: string
  readonly fileExtension: string
  /** Serialise the current document to a string for download. */
  serialize(geometry: Rect, data: TData, computed: TComputed): string
}

// ── DomainModule ──────────────────────────────────────────────────────────────

/**
 * Extended domain contract that adds Host-Plugin infrastructure hooks:
 * toolbar tools and export templates.
 *
 * DomainModule is a strict superset of DomainContract — every DomainContract
 * value is structurally assignable to DomainModule because the extra fields
 * are optional. Prefer DomainModule for all new domains.
 */
export interface DomainModule<TData = unknown, TComputed = unknown>
  extends DomainContract<TData, TComputed> {
  /**
   * Domain-specific toolbar buttons rendered after the built-in tools.
   * Each `id` must be unique across all registered domains.
   */
  readonly toolbarTools?: ReadonlyArray<ToolbarTool>

  /**
   * Export formats this domain supports.
   * Surfaced in File › Export by DomainUIProvider.
   */
  readonly exportTemplates?: ReadonlyArray<ExportTemplate<TData, TComputed>>

  /**
   * Handle a toolbar-tool button click.
   * Called by DomainUIProvider with the current domain data and a pre-bound
   * onUpdateData callback that dispatches updateDomainData to the store.
   * The domain must not import or reference the store directly.
   */
  onToolActivate?(
    toolId: string,
    data: TData,
    onUpdateData: (newData: TData) => void
  ): void
}

// ── TypedDocumentState ────────────────────────────────────────────────────────

/**
 * Infers DocumentState<TData, TComputed> from a DomainContract or DomainModule.
 * Lets domain files declare their typed document without repeating type params:
 *
 *   type GridDocument = TypedDocumentState<typeof gridLayoutDomain>
 *   // resolves to: DocumentState<GridPayload, GridResults>
 */
export type TypedDocumentState<D extends DomainContract<any, any>> =
  D extends DomainContract<infer TData, infer TComputed>
    ? DocumentState<TData, TComputed>
    : never

// ── Global registry ───────────────────────────────────────────────────────────

const _registry = new Map<string, DomainModule<any, any>>()

/**
 * Register a domain module. Call once at app startup (see src/domains/index.ts).
 * Accepts both DomainContract and DomainModule — every DomainContract is
 * structurally assignable to DomainModule since the extra fields are optional.
 */
export function registerDomain(domain: DomainModule<any, any>): void {
  _registry.set(domain.type, domain)
}

/**
 * Look up a domain by its type string.
 * Returns undefined if no domain with that type is registered.
 * The store event bridge falls back to the previous computed value when missing.
 */
export function getDomain(type: string): DomainModule<any, any> | undefined {
  return _registry.get(type)
}

/**
 * Return all registered domains in insertion order.
 * Used by Dashboard domain-card grid and domain-type selectors.
 */
export function listDomains(): ReadonlyArray<DomainModule<any, any>> {
  return Array.from(_registry.values())
}

// ── Built-in: null domain ─────────────────────────────────────────────────────

/**
 * The null domain — default for documents that carry no business logic.
 * data and computed are both empty objects; process() is a no-op identity.
 * Every new project is created with domainType = 'null'.
 */
export const nullDomain: DomainModule<Record<string, never>, Record<string, never>> = {
  type: 'null',
  label: 'Empty Drawing',
  defaults: {} as Record<string, never>,
  process: (_geometry, _data) => ({} as Record<string, never>),
}

registerDomain(nullDomain)

