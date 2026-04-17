import React, { useRef, useEffect, useCallback } from 'react'
import { useEditor, getSelectedNodes, rectsBoundingBox, scaleRectsInBBox } from '../../core/store'
import { getDomain } from '../../core/domain-contract'
import { getNodeDisplayStyles, DEFAULT_FILL, DEFAULT_STROKE, type StrokePosition } from '../../core/types'
import { IconLockClosed, IconLineWeight } from '../../shared/icons'
import { InspectorField } from '../../shared/ui'
import { useNumericField } from '../../shared/hooks/useNumericField'
import { PaintRow } from './PaintRow'
import type { SceneNode, NodeStyles, Paint, Rect } from '../../core/types'

/** Check if all selected nodes share the same Paint value. Returns the value if match, else null. */
function unifiedPaint(nodes: SceneNode[], key: 'fill' | 'stroke'): Paint | null {
  if (nodes.length === 0) return null
  const first = getNodeDisplayStyles(nodes[0])[key]
  for (let i = 1; i < nodes.length; i++) {
    const p = getNodeDisplayStyles(nodes[i])[key]
    if (p.color !== first.color || p.opacity !== first.opacity || p.visible !== first.visible) return null
  }
  return first
}

function unifiedStrokeWidth(nodes: SceneNode[]): number | null {
  if (nodes.length === 0) return null
  const first = getNodeDisplayStyles(nodes[0]).strokeWidth
  for (let i = 1; i < nodes.length; i++) {
    if (getNodeDisplayStyles(nodes[i]).strokeWidth !== first) return null
  }
  return first
}

function unifiedStrokePosition(nodes: SceneNode[]): StrokePosition | null {
  if (nodes.length === 0) return null
  const first = getNodeDisplayStyles(nodes[0]).strokePosition
  for (let i = 1; i < nodes.length; i++) {
    if (getNodeDisplayStyles(nodes[i]).strokePosition !== first) return null
  }
  return first
}

function isNodeLocked(node: SceneNode): boolean {
  if (node.geometry.locked) return true
  const d = getDomain(node.domainType)
  return d?.isGeometryLocked?.(node.data) ?? false
}

export const Inspector: React.FC = () => {
  const { state, dispatch } = useEditor()
  const selection = state.ui.selection
  const zoomPct = Math.round(state.camera.scale * 100)

  const selectedNodes = getSelectedNodes(state)
  const isMulti = selectedNodes.length > 1

  // Resolve single selected node
  const singleNode: SceneNode | undefined = selectedNodes.length === 1 ? selectedNodes[0] : undefined
  const rect = singleNode?.geometry

  const domain = singleNode ? getDomain(singleNode.domainType) : undefined
  const isDomainLocked = domain?.isGeometryLocked?.(singleNode?.data) ?? false
  const isLocked = (rect?.locked ?? false) || isDomainLocked
  // For multi-selection, all-locked means disabled
  const allLocked = selectedNodes.length > 0 && selectedNodes.every(n => n.geometry.locked)

  // Bounding box for multi-selection geometry editing
  const bounds = isMulti ? rectsBoundingBox(selectedNodes.map(n => n.geometry)) : null
  const boundsRef = useRef(bounds)
  useEffect(() => { boundsRef.current = bounds }, [bounds?.x, bounds?.y, bounds?.width, bounds?.height])

  // Effective geometry values (single rect or multi bounds)
  const geoX = isMulti ? (bounds?.x ?? 0) : (rect?.x ?? 0)
  const geoY = isMulti ? (bounds?.y ?? 0) : (rect?.y ?? 0)
  const geoW = isMulti ? (bounds?.width ?? 0) : (rect?.width ?? 0)
  const geoH = isMulti ? (bounds?.height ?? 0) : (rect?.height ?? 0)
  const geoDisabled = isMulti ? allLocked : isLocked

  // Stable ref to current rect
  const rectRef = useRef(rect)
  useEffect(() => { rectRef.current = rect }, [rect])

  // ── Unified style values (works for single + multi) ───────────────────────
  const uFill = unifiedPaint(selectedNodes, 'fill')
  const uStroke = unifiedPaint(selectedNodes, 'stroke')
  const uStrokeW = unifiedStrokeWidth(selectedNodes)
  const uStrokePos = unifiedStrokePosition(selectedNodes)

  // ── Style commit helper (batch, lock-aware) ───────────────────────────────
  const commitStyles = (patch: Partial<NodeStyles>) => {
    const ids = selectedNodes.filter(n => !n.geometry.locked).map(n => n.geometry.id)
    if (ids.length === 0) return
    dispatch({ type: 'updateStyles', nodeIds: ids, patch })
  }

  // ── Live-preview style update (no history push — used during scrub) ───────
  const scrubStyles = (patch: Partial<NodeStyles>) => {
    const ids = selectedNodes.filter(n => !n.geometry.locked).map(n => n.geometry.id)
    if (ids.length === 0) return
    dispatch({ type: 'scrubStyles', nodeIds: ids, patch })
  }

  // ── Immediate-commit helper (single node geometry) ────────────────────────
  const commitPatch = (patch: Partial<NonNullable<typeof rect>>) => {
    if (!rectRef.current) return
    dispatch({ type: 'updateProps', rect: { ...rectRef.current, ...patch } })
  }

  // ── Unified geometry commit (single or group transform) ──────────────────
  const commitGeo = (key: 'x' | 'y' | 'width' | 'height', value: number) => {
    if (isMulti) {
      const b = boundsRef.current
      if (!b) return
      const unlocked = selectedNodes.filter(n => !isNodeLocked(n))
      if (unlocked.length === 0) return
      if (key === 'x' || key === 'y') {
        const delta = value - b[key]
        const rects: Record<string, Rect> = {}
        for (const n of unlocked) rects[n.geometry.id] = { ...n.geometry, [key]: n.geometry[key] + delta }
        dispatch({ type: 'batchUpdateProps', rects })
      } else {
        const newBounds = { ...b, [key]: Math.max(1, value) }
        const bases: Record<string, Rect> = {}
        for (const n of unlocked) bases[n.geometry.id] = n.geometry
        const scaled = scaleRectsInBBox(bases, b, newBounds)
        dispatch({ type: 'batchUpdateProps', rects: scaled })
      }
    } else {
      commitPatch({ [key]: value } as Partial<Rect>)
    }
  }

  // ── Domain data updater ───────────────────────────────────────────────────
  const onUpdateData = useCallback(
    (data: unknown) => dispatch({ type: 'updateDomainData', data }),
    [dispatch]
  )

  // ── Numeric fields ────────────────────────────────────────────────────────
  const xField = useNumericField(geoX, { min: 0 }, (v) => commitGeo('x', v))
  const yField = useNumericField(geoY, { min: 0 }, (v) => commitGeo('y', v))
  const wField = useNumericField(geoW, { min: 1 }, (v) => commitGeo('width', v))
  const hField = useNumericField(geoH, { min: 1 }, (v) => commitGeo('height', v))
  const swField = useNumericField(uStrokeW ?? 0, { min: 0 }, (v) => commitStyles({ strokeWidth: v }))

  const makeNumericKeyDown = (field: ReturnType<typeof useNumericField>) =>
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') { field.reset(); (e.target as HTMLInputElement).blur(); return }
      if (e.key === 'Enter')  { (e.target as HTMLInputElement).blur() }
    }

  // ── Scrub helpers ─────────────────────────────────────────────────────────
  const numericRef = useRef({ x: geoX, y: geoY, width: geoW, height: geoH })
  useEffect(() => {
    numericRef.current = { x: geoX, y: geoY, width: geoW, height: geoH }
  }, [geoX, geoY, geoW, geoH])

  const multiInitBoundsRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null)
  const multiBasesRef = useRef<Record<string, Rect>>({})

  const makeScrub = (key: 'x' | 'y' | 'width' | 'height', min: number) => {
    if (geoDisabled) return {}
    return {
      onScrubStart: () => {
        dispatch({ type: 'snapshotHistory' })
        if (isMulti) {
          multiInitBoundsRef.current = bounds ? { ...bounds } : null
          const bases: Record<string, Rect> = {}
          for (const n of selectedNodes) {
            if (!isNodeLocked(n)) bases[n.geometry.id] = n.geometry
          }
          multiBasesRef.current = bases
        }
      },
      onScrub: (delta: number) => {
        const next = Math.max(min, Math.round(numericRef.current[key] + delta))
        numericRef.current[key] = next
        if (isMulti) {
          const ib = multiInitBoundsRef.current
          if (!ib) return
          if (key === 'x' || key === 'y') {
            const d = next - ib[key]
            const rects: Record<string, Rect> = {}
            for (const [id, base] of Object.entries(multiBasesRef.current)) {
              rects[id] = { ...base, [key]: base[key] + d }
            }
            dispatch({ type: 'batchScrubProps', rects })
          } else {
            const newBounds = { ...ib, [key]: next }
            const scaled = scaleRectsInBBox(multiBasesRef.current, ib, newBounds)
            dispatch({ type: 'batchScrubProps', rects: scaled })
          }
        } else {
          if (rectRef.current) dispatch({ type: 'scrubProps', rect: { ...rectRef.current, ...numericRef.current } })
        }
      },
    }
  }

  const stylesDisabled = isMulti ? allLocked : isLocked

  const strokeWidthScrubRef = useRef(uStrokeW ?? 0)
  useEffect(() => { strokeWidthScrubRef.current = uStrokeW ?? 0 }, [uStrokeW])

  const strokeWidthScrub = stylesDisabled ? {} : {
    onScrubStart: () => dispatch({ type: 'snapshotHistory' }),
    onScrub: (delta: number) => {
      const next = Math.max(0, Math.round(strokeWidthScrubRef.current + delta))
      strokeWidthScrubRef.current = next
      commitStyles({ strokeWidth: next })
    },
  }

  // ── Header ────────────────────────────────────────────────────────────────
  const inspectorHeader = (
    <div className="inspector-header">
      <span>Inspector</span>
      <span className="zoom-indicator">{zoomPct}%</span>
    </div>
  )

  // ── Geometry section (position + dimensions, single + multi) ──────────────
  const geometrySection = selectedNodes.length > 0 && (
    <>
      <div className="inspector-section">
        <div className="inspector-group-title">Position</div>
        <div className="inspector-grid">
          <InspectorField label="X" value={xField.rawText} disabled={geoDisabled}
            onChange={xField.onChange} onBlur={xField.tryBlur} onKeyDown={makeNumericKeyDown(xField)}
            {...makeScrub('x', 0)} />
          <InspectorField label="Y" value={yField.rawText} disabled={geoDisabled}
            onChange={yField.onChange} onBlur={yField.tryBlur} onKeyDown={makeNumericKeyDown(yField)}
            {...makeScrub('y', 0)} />
        </div>
      </div>
      <div className="inspector-section">
        <div className="inspector-group-title">Dimensions</div>
        <div className="inspector-grid">
          <InspectorField label="W" value={wField.rawText} disabled={geoDisabled}
            onChange={wField.onChange} onBlur={wField.tryBlur} onKeyDown={makeNumericKeyDown(wField)}
            {...makeScrub('width', 1)} />
          <InspectorField label="H" value={hField.rawText} disabled={geoDisabled}
            onChange={hField.onChange} onBlur={hField.tryBlur} onKeyDown={makeNumericKeyDown(hField)}
            {...makeScrub('height', 1)} />
        </div>
      </div>
    </>
  )

  // ── Shared styles section (shown for single + multi) ──────────────────────
  const stylesSection = selectedNodes.length > 0 && (
    <>
      <div className="inspector-section">
        <div className="inspector-group-title">Fill</div>
        <PaintRow
          paint={uFill ?? DEFAULT_FILL}
          disabled={stylesDisabled}
          onChange={p => commitStyles({ fill: p })}
          onScrubStart={() => dispatch({ type: 'snapshotHistory' })}
          onScrubChange={p => scrubStyles({ fill: p })}
          documentNodes={state.document.nodes}
          label={uFill === null ? 'Mixed' : undefined}
        />
      </div>

      <div className="inspector-section">
        <div className="inspector-group-title">Stroke</div>
        <PaintRow
          paint={uStroke ?? DEFAULT_STROKE}
          disabled={stylesDisabled}
          onChange={p => commitStyles({ stroke: p })}
          onScrubStart={() => dispatch({ type: 'snapshotHistory' })}
          onScrubChange={p => scrubStyles({ stroke: p })}
          documentNodes={state.document.nodes}
          label={uStroke === null ? 'Mixed' : undefined}
        />
        <div className="inspector-stroke-row">
          <InspectorField
            label={<IconLineWeight size={14} />}
            value={swField.rawText}
            disabled={stylesDisabled}
            onChange={swField.onChange}
            onBlur={swField.tryBlur}
            onKeyDown={makeNumericKeyDown(swField)}
            {...strokeWidthScrub}
          />
          <select
            className="inspector-stroke-position"
            value={uStrokePos ?? 'center'}
            disabled={stylesDisabled}
            onChange={e => commitStyles({ strokePosition: e.target.value as StrokePosition })}
          >
            <option value="center">Center</option>
            <option value="inside">Inside</option>
            <option value="outside">Outside</option>
          </select>
        </div>
      </div>
    </>
  )

  // ── No selection ──────────────────────────────────────────────────────────
  if (selection.length === 0) return (
    <div>
      {inspectorHeader}
      <div className="inspector-empty">No selection</div>
    </div>
  )

  // ── Multi-selection ───────────────────────────────────────────────────────
  if (isMulti) return (
    <div>
      {inspectorHeader}
      <div className="inspector-section">
        <div className="inspector-object-title">Multiple objects selected ({selection.length})</div>
      </div>
      {geometrySection}
      {stylesSection}
    </div>
  )

  // ── Single selection ──────────────────────────────────────────────────────
  if (!rect) return (
    <div>
      {inspectorHeader}
      <div className="inspector-empty">No selection</div>
    </div>
  )

  return (
    <div>
      {inspectorHeader}

      <div className="inspector-section">
        <div className="inspector-object-title">{domain?.label ?? 'Rectangle'}</div>
      </div>

      {isLocked && (
        <div className="inspector-lock-banner">
          <IconLockClosed size={12} />
          {rect.locked ? 'Locked — edit disabled' : 'Cell locked — geometry blocked'}
        </div>
      )}

      {geometrySection}

      {stylesSection}

      {/* Domain-specific inspector section */}
      {domain?.InspectorSection && singleNode && (
        <domain.InspectorSection
          data={singleNode.data}
          onUpdateData={onUpdateData}
          isLocked={rect.locked}
        />
      )}
    </div>
  )
}

export default Inspector
