import React, { useRef, useEffect, useState } from 'react'
import { useEditor } from '../../core/store'
import { IconLockClosed } from '../../shared/icons'
import { InspectorField } from '../../shared/ui'
import { useNumericField } from '../../shared/hooks/useNumericField'

export const Inspector: React.FC = () => {
  const { state, dispatch } = useEditor()
  const rect = state.document.rect
  const selected = state.ui.selectedId === rect.id
  const zoomPct = Math.round(state.camera.scale * 100)
  const isLocked = rect.locked

  // Stable ref to current rect — avoids stale closures inside onParsed callbacks.
  const rectRef = useRef(rect)
  useEffect(() => { rectRef.current = rect }, [rect])

  // ── Fill ──────────────────────────────────────────────────────────────────
  const [fillText, setFillText] = useState(rect.fill)
  useEffect(() => { setFillText(rect.fill) }, [rect.fill])

  // ── Immediate-commit helper ───────────────────────────────────────────────
  const commitPatch = (patch: Partial<typeof rect>) =>
    dispatch({ type: 'updateProps', rect: { ...rectRef.current, ...patch } })

  // ── Numeric fields — onParsed dispatches immediately on blur / Enter ──────
  const xField = useNumericField(rect.x,      { min: 0 }, (v) => commitPatch({ x: v }))
  const yField = useNumericField(rect.y,      { min: 0 }, (v) => commitPatch({ y: v }))
  const wField = useNumericField(rect.width,  { min: 1 }, (v) => commitPatch({ width: v }))
  const hField = useNumericField(rect.height, { min: 1 }, (v) => commitPatch({ height: v }))

  // ── Keyboard handlers ─────────────────────────────────────────────────────
  // Enter → blur (the onBlur handler calls tryBlur which dispatches).
  // Escape → revert text without dispatching, then blur.
  const makeNumericKeyDown = (field: ReturnType<typeof useNumericField>) =>
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') { field.reset(); (e.target as HTMLInputElement).blur(); return }
      if (e.key === 'Enter')  { (e.target as HTMLInputElement).blur() }
    }

  const onFillKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { setFillText(rect.fill); (e.target as HTMLInputElement).blur(); return }
    if (e.key === 'Enter')  { commitPatch({ fill: fillText }); (e.target as HTMLInputElement).blur() }
  }

  // ── Scrub helpers ─────────────────────────────────────────────────────────
  // numericRef accumulates delta during a single drag gesture.
  const numericRef = useRef({ x: rect.x, y: rect.y, width: rect.width, height: rect.height })
  useEffect(() => {
    numericRef.current = { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
  }, [rect.x, rect.y, rect.width, rect.height])

  const makeScrub = (key: 'x' | 'y' | 'width' | 'height', min: number) => {
    if (isLocked) return {}
    return {
      onScrubStart: () => dispatch({ type: 'snapshotHistory' }),
      onScrub: (delta: number) => {
        const next = Math.max(min, Math.round(numericRef.current[key] + delta))
        numericRef.current[key] = next
        dispatch({ type: 'scrubProps', rect: { ...rectRef.current, ...numericRef.current } })
      },
    }
  }

  // ── Header ────────────────────────────────────────────────────────────────
  const inspectorHeader = (
    <div className="inspector-header">
      <span>Inspector</span>
      <span className="zoom-indicator">{zoomPct}%</span>
    </div>
  )

  if (!selected) return (
    <div>
      {inspectorHeader}
      <div className="inspector-empty">No selection</div>
    </div>
  )

  return (
    <div>
      {inspectorHeader}

      <div className="inspector-section">
        <div className="inspector-object-title">Rectangle</div>
      </div>

      {isLocked && (
        <div className="inspector-lock-banner">
          <IconLockClosed size={12} />
          Locked — edit disabled
        </div>
      )}

      <div className="inspector-section">
        <div className="inspector-group-title">Position</div>
        <div className="inspector-grid">
          <InspectorField label="X" value={xField.rawText} disabled={isLocked}
            onChange={xField.onChange} onBlur={xField.tryBlur} onKeyDown={makeNumericKeyDown(xField)}
            {...makeScrub('x', 0)} />
          <InspectorField label="Y" value={yField.rawText} disabled={isLocked}
            onChange={yField.onChange} onBlur={yField.tryBlur} onKeyDown={makeNumericKeyDown(yField)}
            {...makeScrub('y', 0)} />
        </div>
      </div>

      <div className="inspector-section">
        <div className="inspector-group-title">Dimensions</div>
        <div className="inspector-grid">
          <InspectorField label="W" value={wField.rawText} disabled={isLocked}
            onChange={wField.onChange} onBlur={wField.tryBlur} onKeyDown={makeNumericKeyDown(wField)}
            {...makeScrub('width', 1)} />
          <InspectorField label="H" value={hField.rawText} disabled={isLocked}
            onChange={hField.onChange} onBlur={hField.tryBlur} onKeyDown={makeNumericKeyDown(hField)}
            {...makeScrub('height', 1)} />
        </div>
      </div>

      <div className="inspector-section">
        <div className="inspector-group-title">Fill</div>
        <div className="figma-field">
          <span className="figma-field__swatch" style={{ backgroundColor: fillText }} />
          <input
            className="figma-field__input"
            value={fillText}
            disabled={isLocked}
            onChange={e => setFillText(e.target.value)}
            onBlur={() => commitPatch({ fill: fillText })}
            onKeyDown={onFillKeyDown}
          />
        </div>
      </div>
    </div>
  )
}

export default Inspector

