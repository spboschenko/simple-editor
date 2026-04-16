/**
 * domains/grid-layout.ts
 *
 * Grid Layout domain — fills a base rectangle with a uniform grid of smaller
 * rectangles according to a maximum cell size, gap, and layout strategy.
 *
 * Types:
 *   GridPayload  — input parameters (data stored in DocumentState.data)
 *   GridResults  — computed output  (stored in DocumentState.computed)
 *
 * Two layout strategies:
 *   equal-share       — divides available space into equal columns/rows
 *                       whose size does not exceed maxCellSize
 *   max-plus-remainder — packs as many full maxCellSize cells as possible,
 *                        adding a smaller remainder cell when space is left over
 */
import React from 'react'
import { Circle, Rect as KRect, Group } from 'react-konva'
import type { DomainModule } from '../core/domain-contract'
import type { Rect } from '../core/types'
import { worldToKonvaY } from '../core/coord-transform'
import { useNumericField } from '../shared/hooks/useNumericField'
import { InspectorField } from '../shared/ui'

// ── Types ─────────────────────────────────────────────────────────────────────

/** Allowed discrete cell sizes. */
export type CellSizePreset = '50x50' | '100x200' | '75x300'

const CELL_SIZE_MAP: Record<CellSizePreset, { w: number; h: number }> = {
  '50x50':   { w: 50,  h: 50 },
  '100x200': { w: 100, h: 200 },
  '75x300':  { w: 75,  h: 300 },
}

export interface GridPayload {
  /** Maximum cell size preset. */
  maxCellSize: CellSizePreset
  /** Gap between cells. */
  gap: { x: number; y: number }
  /** Strategy for distributing available space. */
  layoutStrategy: 'equal-share' | 'max-plus-remainder'
  /** Ids of cells that are individually locked (blocks Base geometry edits). */
  lockedCells: string[]
}

/** One computed cell in world (y-up) coordinates. */
export interface GridCell {
  /** Stable id: 'cell-r{row}-c{col}' (1-based). */
  id: string
  /** 1-based row index. */
  row: number
  /** 1-based column index. */
  col: number
  /** Top-left corner of the cell in world coords. */
  x: number
  y: number
  w: number
  h: number
  /** Center point (for circle marker). */
  cx: number
  cy: number
  /** Whether this cell is individually locked. */
  locked: boolean
}

export interface GridResults {
  cells: GridCell[]
  /** Sum of perimeters of all generated cells. */
  totalPerimeter: number
  /** Number of generated cells (= circle count). */
  circleCount: number
}

// ── Layout maths (pure) ───────────────────────────────────────────────────────

/**
 * Compute 1-D column/row sizes for the available space.
 *
 * equal-share:
 *   n = ceil(available / (maxSize + gap))   — minimum columns that fit
 *   cell_size = (available - (n-1)*gap) / n — equal size, ≤ maxSize
 *
 * max-plus-remainder:
 *   n_full = floor((available + gap) / (maxSize + gap))
 *   remainder = available - n_full * maxSize - max(0, n_full - 1) * gap
 *   if remainder > 0: n = n_full + 1, last cell = remainder
 *   else:             n = n_full, all cells = maxSize
 *
 * Returns an array of cell sizes (widths or heights) for one axis.
 */
function computeSizes(available: number, maxSize: number, gap: number): number[] {
  if (available <= 0 || maxSize <= 0) return []

  if (available <= maxSize) return [available]

  const totalWithGap = available + gap
  const cellWithGap = maxSize + gap

  const nFull = Math.max(1, Math.floor(totalWithGap / cellWithGap))
  const usedByFull = nFull * maxSize + Math.max(0, nFull - 1) * gap
  const remainder = available - usedByFull

  return remainder > 1
    ? [...Array(nFull).fill(maxSize), remainder]
    : Array(nFull).fill(maxSize)
}

function computeSizesEqual(available: number, maxSize: number, gap: number): number[] {
  if (available <= 0 || maxSize <= 0) return []

  if (available <= maxSize) return [available]

  const totalWithGap = available + gap
  const cellWithGap = maxSize + gap

  const n = Math.max(1, Math.ceil(totalWithGap / cellWithGap))
  const cellSize = (available - Math.max(0, n - 1) * gap) / n

  return Array(n).fill(Math.round(cellSize * 100) / 100)
}

// ── Core process function ─────────────────────────────────────────────────────

function process(geometry: Rect, data: GridPayload): GridResults {
  const { maxCellSize, gap, layoutStrategy } = data
  // Defensive: lockedCells may be missing in projects saved before this field was added
  const lockedCells: string[] = data.lockedCells ?? []
  const cellMax = CELL_SIZE_MAP[maxCellSize]

  const getSizes = (available: number, maxSize: number, axisGap: number): number[] =>
    layoutStrategy === 'equal-share'
      ? computeSizesEqual(available, maxSize, axisGap)
      : computeSizes(available, maxSize, axisGap)

  const colWidths = getSizes(geometry.width,  cellMax.w, gap.x)
  const rowHeights = getSizes(geometry.height, cellMax.h, gap.y)

  const cells: GridCell[] = []

  // World origin of the base rect (y-up: geometry.y = BOTTOM edge of rect)
  let worldY = geometry.y  // we'll step upward row by row

  for (let r = 0; r < rowHeights.length; r++) {
    const h = rowHeights[r]
    let worldX = geometry.x

    for (let c = 0; c < colWidths.length; c++) {
      const w = colWidths[c]
      const id = `cell-r${r + 1}-c${c + 1}`
      cells.push({
        id,
        row: r + 1,
        col: c + 1,
        x: worldX, y: worldY, w, h,
        cx: worldX + w / 2,
        cy: worldY + h / 2,
        locked: lockedCells.includes(id),
      })
      worldX += w + gap.x
    }
    worldY += h + gap.y
  }

  const totalPerimeter = cells.reduce((sum, cell) => sum + 2 * (cell.w + cell.h), 0)

  return {
    cells,
    totalPerimeter: Math.round(totalPerimeter),
    circleCount: cells.length,
  }
}

// ── renderOverlay (react-konva) ───────────────────────────────────────────────

const CIRCLE_RADIUS = 4
const GRID_STROKE        = '#6366f1'
const GRID_STROKE_LOCKED = '#ef4444'
const CIRCLE_FILL        = '#818cf8'
const CIRCLE_FILL_LOCKED = '#f87171'

function renderOverlay(
  _geometry: Rect,
  computed: GridResults,
  scale: number
): React.ReactElement | null {
  if (computed.cells.length === 0) return null

  const strokeWidth = 1 / scale
  const circleR     = CIRCLE_RADIUS / scale

  return React.createElement(
    Group,
    { key: 'grid-layer' },
    ...computed.cells.map((cell, i) =>
      React.createElement(
        React.Fragment,
        { key: i },
        // Cell outline
        React.createElement(KRect, {
          key: `cell-${i}`,
          x: cell.x,
          y: worldToKonvaY(cell.y + cell.h, scale),
          width: cell.w,
          height: cell.h,
          stroke: cell.locked ? GRID_STROKE_LOCKED : GRID_STROKE,
          strokeWidth,
          fill: cell.locked ? 'rgba(239,68,68,0.08)' : 'rgba(99,102,241,0.06)',
        }),
        // Centre circle
        React.createElement(Circle, {
          key: `dot-${i}`,
          x: cell.cx,
          y: worldToKonvaY(cell.cy, scale),
          radius: circleR,
          fill: cell.locked ? CIRCLE_FILL_LOCKED : CIRCLE_FILL,
        })
      )
    )
  )
}

// ── specRows helper ───────────────────────────────────────────────────────────

function specRows(computed: GridResults): Array<{ label: string; value: string }> {
  return [
    { label: 'Cells',      value: String(computed.circleCount) },
    { label: 'Perimeter',  value: `${computed.totalPerimeter.toLocaleString()} px` },
  ]
}

// ── InspectorSection (domain-specific controls) ───────────────────────────────

const CELL_SIZE_OPTIONS: Array<{ value: CellSizePreset; label: string }> = [
  { value: '50x50',   label: '50 × 50 px' },
  { value: '100x200', label: '100 × 200 px' },
  { value: '75x300',  label: '75 × 300 px' },
]

const GridInspectorSection: React.FC<{
  data: GridPayload
  onUpdateData: (data: GridPayload) => void
  isLocked: boolean
}> = ({ data, onUpdateData, isLocked }) => {
  // Stable ref so onParsed callbacks never close over a stale payload.
  // Pattern mirrors Inspector.tsx rectRef usage.
  const dataRef = React.useRef(data)
  React.useEffect(() => { dataRef.current = data }, [data])

  // ── Gap fields — use canonical useNumericField for arithmetic expression support ──

  const gapXField = useNumericField(
    data.gap.x,
    { min: 0 },
    (v) => onUpdateData({ ...dataRef.current, gap: { ...dataRef.current.gap, x: v } })
  )
  const gapYField = useNumericField(
    data.gap.y,
    { min: 0 },
    (v) => onUpdateData({ ...dataRef.current, gap: { ...dataRef.current.gap, y: v } })
  )

  // Same keyboard contract as Inspector geometry fields:
  //   Enter  → blur (triggers onBlur → tryBlur → onParsed if valid)
  //   Escape → revert text, blur without committing
  const makeNumericKeyDown =
    (field: ReturnType<typeof useNumericField>) =>
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') { field.reset(); (e.target as HTMLInputElement).blur(); return }
      if (e.key === 'Enter')  { (e.target as HTMLInputElement).blur() }
    }

  return (
    <>
      {/* ── Cell size ────────────────────────────────────────────── */}
      <div className="inspector-section">
        <div className="inspector-group-title">Cell Size</div>
        <div className="inspector-field-row">
          <select
            className="inspector-select"
            value={data.maxCellSize}
            disabled={isLocked}
            onChange={e => onUpdateData({ ...data, maxCellSize: e.target.value as CellSizePreset })}
          >
            {CELL_SIZE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Layout strategy ──────────────────────────────────────── */}
      <div className="inspector-section">
        <div className="inspector-group-title">Layout</div>
        <div className="strategy-toggle">
          {(['equal-share', 'max-plus-remainder'] as const).map(s => (
            <button
              key={s}
              className={[
                'strategy-toggle__btn',
                data.layoutStrategy === s ? 'strategy-toggle__btn--active' : '',
              ].join(' ').trim()}
              disabled={isLocked}
              onClick={() => onUpdateData({ ...data, layoutStrategy: s })}
            >
              {s === 'equal-share' ? 'Equal' : 'Max + Rest'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Gap ──────────────────────────────────────────────────── */}
      <div className="inspector-section">
        <div className="inspector-group-title">Gap</div>
        <div className="inspector-grid">
          <InspectorField
            label="X"
            value={gapXField.rawText}
            disabled={isLocked}
            onChange={gapXField.onChange}
            onBlur={gapXField.tryBlur}
            onKeyDown={makeNumericKeyDown(gapXField)}
          />
          <InspectorField
            label="Y"
            value={gapYField.rawText}
            disabled={isLocked}
            onChange={gapYField.onChange}
            onBlur={gapYField.tryBlur}
            onKeyDown={makeNumericKeyDown(gapYField)}
          />
        </div>
      </div>
    </>
  )
}

// ── Domain children (for StructurePanel) ──────────────────────────────────────

function getChildren(
  computed: GridResults,
  _data: GridPayload
): Array<{ id: string; name: string; locked: boolean }> {
  return (computed.cells ?? []).map(cell => ({
    id: cell.id,
    name: `Cell-${cell.row}-${cell.col}`,
    locked: cell.locked,
  }))
}

function isGeometryLocked(data: GridPayload): boolean {
  return (data.lockedCells?.length ?? 0) > 0
}

function toggleChildLock(childId: string, data: GridPayload): GridPayload {
  const current: string[] = data.lockedCells ?? []
  const lockedCells = current.includes(childId)
    ? current.filter(id => id !== childId)
    : [...current, childId]
  return { ...data, lockedCells }
}

// ── Domain module ─────────────────────────────────────────────────────────────

export const gridLayoutDomain: DomainModule<GridPayload, GridResults> = {
  type: 'grid-layout',
  label: 'Grid System',

  defaults: {
    maxCellSize: '100x200',
    gap: { x: 10, y: 10 },
    layoutStrategy: 'equal-share',
    lockedCells: [],
  },

  // 500×500 base for new grid projects
  defaultGeometry: { width: 500, height: 500 },

  process,
  renderOverlay,
  specRows,
  InspectorSection: GridInspectorSection,
  getChildren,
  isGeometryLocked,
  toggleChildLock,

  // ── Toolbar tools ──────────────────────────────────────────────────────────

  toolbarTools: [
    {
      id: 'grid-reset-gaps',
      label: 'Reset Gaps',
      shortcut: 'G',
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
          stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <rect x="1" y="1" width="6" height="6" rx="1"/>
          <rect x="9" y="1" width="6" height="6" rx="1"/>
          <rect x="1" y="9" width="6" height="6" rx="1"/>
          <rect x="9" y="9" width="6" height="6" rx="1"/>
        </svg>
      ),
    },
  ],

  onToolActivate(toolId, data, onUpdateData) {
    if (toolId === 'grid-reset-gaps') {
      onUpdateData({ ...data, gap: { x: 10, y: 10 } })
    }
  },

  // ── Export templates ───────────────────────────────────────────────────────

  exportTemplates: [
    {
      id: 'grid-cells-json',
      label: 'Export Cells (JSON)',
      mimeType: 'application/json',
      fileExtension: 'json',
      serialize(_geometry, _data, computed) {
        return JSON.stringify(computed.cells, null, 2)
      },
    },
  ],
}
