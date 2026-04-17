/**
 * ColorPicker.tsx
 *
 * Figma-like color picker popup with:
 * - Saturation/Value area (canvas-drawn)
 * - Hue slider (canvas-drawn)
 * - Alpha/opacity slider (canvas-drawn, checkerboard background)
 * - HEX + RGB manual inputs
 * - Document swatches (collected from all nodes)
 *
 * Uses canvas for smooth rendering without React re-render overhead on drag.
 * Uses colord for color conversions.
 */
import React, { useRef, useEffect, useState, useCallback } from 'react'
import { colord, HsvColor } from 'colord'
import type { Paint, SceneNode } from '../../core/types'

// ── Constants ────────────────────────────────────────────────────────────
const SV_SIZE = 200   // Sat/Val area width & height
const SLIDER_W = 200  // Hue & alpha slider width
const SLIDER_H = 12   // Hue & alpha slider height

// ── HSV helpers ──────────────────────────────────────────────────────────

function hexToHsv(hex: string): HsvColor {
  const c = colord(hex)
  return c.toHsv()
}

function hsvToHex(h: number, s: number, v: number): string {
  return colord({ h, s, v, a: 1 }).toHex().substring(0, 7)
}

// ── Canvas drawing helpers ───────────────────────────────────────────────

function drawSatValArea(canvas: HTMLCanvasElement, hue: number) {
  const ctx = canvas.getContext('2d')!
  const w = canvas.width
  const h = canvas.height

  // Base hue layer
  const hueColor = colord({ h: hue, s: 100, v: 100, a: 1 }).toHex()
  ctx.fillStyle = hueColor
  ctx.fillRect(0, 0, w, h)

  // Saturation gradient (white -> transparent) left to right
  const satGrad = ctx.createLinearGradient(0, 0, w, 0)
  satGrad.addColorStop(0, '#ffffff')
  satGrad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = satGrad
  ctx.fillRect(0, 0, w, h)

  // Value gradient (transparent -> black) top to bottom
  const valGrad = ctx.createLinearGradient(0, 0, 0, h)
  valGrad.addColorStop(0, 'rgba(0,0,0,0)')
  valGrad.addColorStop(1, '#000000')
  ctx.fillStyle = valGrad
  ctx.fillRect(0, 0, w, h)
}

function drawHueSlider(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!
  const w = canvas.width
  const h = canvas.height
  const grad = ctx.createLinearGradient(0, 0, w, 0)
  for (let i = 0; i <= 360; i += 60) {
    grad.addColorStop(i / 360, colord({ h: i, s: 100, v: 100, a: 1 }).toHex())
  }
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
}

function drawCheckerboard(ctx: CanvasRenderingContext2D, w: number, h: number, size: number = 4) {
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#cccccc'
  for (let y = 0; y < h; y += size) {
    for (let x = 0; x < w; x += size) {
      if ((Math.floor(x / size) + Math.floor(y / size)) % 2 === 0) {
        ctx.fillRect(x, y, size, size)
      }
    }
  }
}

function drawAlphaSlider(canvas: HTMLCanvasElement, hex: string) {
  const ctx = canvas.getContext('2d')!
  const w = canvas.width
  const h = canvas.height
  drawCheckerboard(ctx, w, h, 4)
  const grad = ctx.createLinearGradient(0, 0, w, 0)
  const c = colord(hex)
  grad.addColorStop(0, c.alpha(0).toRgbString())
  grad.addColorStop(1, c.alpha(1).toRgbString())
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
}

// ── Pointer drag utility ─────────────────────────────────────────────────

function useDrag(onDrag: (x: number, y: number) => void, onEnd?: () => void) {
  const dragging = useRef(false)
  const ref = useRef<HTMLCanvasElement>(null)

  const getPos = (e: PointerEvent | React.PointerEvent): [number, number] => {
    const rect = ref.current!.getBoundingClientRect()
    return [
      Math.max(0, Math.min(e.clientX - rect.left, rect.width)),
      Math.max(0, Math.min(e.clientY - rect.top, rect.height)),
    ]
  }

  const handleDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    const [x, y] = getPos(e)
    onDrag(x, y)
  }, [onDrag])

  const handleMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return
    const [x, y] = getPos(e)
    onDrag(x, y)
  }, [onDrag])

  const handleUp = useCallback(() => {
    dragging.current = false
    onEnd?.()
  }, [onEnd])

  return { ref, onPointerDown: handleDown, onPointerMove: handleMove, onPointerUp: handleUp }
}

// ── Props ────────────────────────────────────────────────────────────────

interface ColorPickerProps {
  paint: Paint
  onChange: (paint: Paint) => void
  onClose: () => void
  /** All document nodes for collecting swatches. */
  documentNodes?: SceneNode[]
}

// ── Component ────────────────────────────────────────────────────────────

export const ColorPicker: React.FC<ColorPickerProps> = ({ paint, onChange, onClose, documentNodes }) => {
  const [hsv, setHsv] = useState<HsvColor>(() => hexToHsv(paint.color))
  const [opacity, setOpacity] = useState(paint.opacity)
  const [hexInput, setHexInput] = useState(paint.color.replace('#', ''))
  const [rInput, setRInput] = useState('')
  const [gInput, setGInput] = useState('')
  const [bInput, setBInput] = useState('')

  const svCanvasRef = useRef<HTMLCanvasElement>(null)
  const hueCanvasRef = useRef<HTMLCanvasElement>(null)
  const alphaCanvasRef = useRef<HTMLCanvasElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const currentHex = hsvToHex(hsv.h, hsv.s, hsv.v)

  // Sync rgb inputs from HSV
  useEffect(() => {
    const c = colord(currentHex)
    const rgb = c.toRgb()
    setRInput(String(rgb.r))
    setGInput(String(rgb.g))
    setBInput(String(rgb.b))
    setHexInput(currentHex.replace('#', ''))
  }, [currentHex])

  // Draw canvases
  useEffect(() => {
    if (svCanvasRef.current) drawSatValArea(svCanvasRef.current, hsv.h)
  }, [hsv.h])

  useEffect(() => {
    if (hueCanvasRef.current) drawHueSlider(hueCanvasRef.current)
  }, [])

  useEffect(() => {
    if (alphaCanvasRef.current) drawAlphaSlider(alphaCanvasRef.current, currentHex)
  }, [currentHex])

  // Outside click / Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('pointerdown', handleClickOutside, true)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('pointerdown', handleClickOutside, true)
    }
  }, [onClose])

  // Emit onChange on any change
  const emitChange = useCallback((hex: string, op: number) => {
    onChange({ color: hex, opacity: op, visible: paint.visible })
  }, [onChange, paint.visible])

  // ── SV area drag ─────────────────────────────────
  const svDrag = useDrag(
    useCallback((x: number, y: number) => {
      const s = Math.round((x / SV_SIZE) * 100)
      const v = Math.round(100 - (y / SV_SIZE) * 100)
      const newHsv = { ...hsv, s: Math.max(0, Math.min(100, s)), v: Math.max(0, Math.min(100, v)) }
      setHsv(prev => ({ ...prev, s: newHsv.s, v: newHsv.v }))
      emitChange(hsvToHex(hsv.h, newHsv.s, newHsv.v), opacity)
    }, [hsv.h, opacity, emitChange]),
  )
  // Override ref since we already have svCanvasRef
  const svPointerProps = { onPointerDown: svDrag.onPointerDown, onPointerMove: svDrag.onPointerMove, onPointerUp: svDrag.onPointerUp }

  // ── Hue drag ─────────────────────────────────────
  const hueDrag = useDrag(
    useCallback((x: number) => {
      const h = Math.round((x / SLIDER_W) * 360) % 360
      setHsv(prev => ({ ...prev, h }))
      emitChange(hsvToHex(h, hsv.s, hsv.v), opacity)
    }, [hsv.s, hsv.v, opacity, emitChange]),
  )

  // ── Alpha drag ───────────────────────────────────
  const alphaDrag = useDrag(
    useCallback((x: number) => {
      const op = Math.round((x / SLIDER_W) * 100)
      setOpacity(op)
      emitChange(currentHex, op)
    }, [currentHex, emitChange]),
  )

  // ── Manual hex input ─────────────────────────────
  const commitHex = () => {
    let h = hexInput.trim()
    if (h.length === 3) h = h.split('').map(c => c + c).join('')
    if (/^[0-9a-fA-F]{6}$/.test(h)) {
      const newHex = '#' + h.toLowerCase()
      const newHsv = hexToHsv(newHex)
      setHsv(newHsv)
      emitChange(newHex, opacity)
    } else {
      setHexInput(currentHex.replace('#', ''))
    }
  }

  // ── Manual RGB input ─────────────────────────────
  const commitRgb = () => {
    const r = parseInt(rInput), g = parseInt(gInput), b = parseInt(bInput)
    if ([r, g, b].every(v => !isNaN(v) && v >= 0 && v <= 255)) {
      const newHex = colord({ r, g, b }).toHex().substring(0, 7)
      const newHsv = hexToHsv(newHex)
      setHsv(newHsv)
      emitChange(newHex, opacity)
    }
  }

  // ── Document swatches ────────────────────────────
  const swatches = React.useMemo(() => {
    if (!documentNodes) return []
    const colorSet = new Set<string>()
    for (const node of documentNodes) {
      const f = node.geometry.fill
      const s = node.geometry.stroke
      if (f && typeof f === 'object' && f.visible) colorSet.add(f.color)
      if (s && typeof s === 'object' && s.visible) colorSet.add(s.color)
    }
    return Array.from(colorSet)
  }, [documentNodes])

  // ── Cursor positions ─────────────────────────────
  const svCursorX = (hsv.s / 100) * SV_SIZE
  const svCursorY = (1 - hsv.v / 100) * SV_SIZE
  const hueCursorX = (hsv.h / 360) * SLIDER_W
  const alphaCursorX = (opacity / 100) * SLIDER_W

  return (
    <div className="color-picker" ref={rootRef} onPointerDown={e => e.stopPropagation()}>
      {/* Sat/Val area */}
      <div className="color-picker__sv-wrap" style={{ width: SV_SIZE, height: SV_SIZE }}>
        <canvas
          ref={(el) => { (svCanvasRef as any).current = el; (svDrag.ref as any).current = el }}
          width={SV_SIZE}
          height={SV_SIZE}
          className="color-picker__sv-canvas"
          {...svPointerProps}
        />
        <div
          className="color-picker__sv-cursor"
          style={{ left: svCursorX, top: svCursorY, backgroundColor: currentHex }}
        />
      </div>

      {/* Hue slider */}
      <div className="color-picker__slider-wrap" style={{ width: SLIDER_W, height: SLIDER_H }}>
        <canvas
          ref={(el) => { (hueCanvasRef as any).current = el; (hueDrag.ref as any).current = el }}
          width={SLIDER_W}
          height={SLIDER_H}
          className="color-picker__slider-canvas"
          onPointerDown={hueDrag.onPointerDown}
          onPointerMove={hueDrag.onPointerMove}
          onPointerUp={hueDrag.onPointerUp}
        />
        <div
          className="color-picker__slider-thumb"
          style={{ left: hueCursorX }}
        />
      </div>

      {/* Alpha slider */}
      <div className="color-picker__slider-wrap" style={{ width: SLIDER_W, height: SLIDER_H }}>
        <canvas
          ref={(el) => { (alphaCanvasRef as any).current = el; (alphaDrag.ref as any).current = el }}
          width={SLIDER_W}
          height={SLIDER_H}
          className="color-picker__slider-canvas"
          onPointerDown={alphaDrag.onPointerDown}
          onPointerMove={alphaDrag.onPointerMove}
          onPointerUp={alphaDrag.onPointerUp}
        />
        <div
          className="color-picker__slider-thumb"
          style={{ left: alphaCursorX }}
        />
      </div>

      {/* Inputs row */}
      <div className="color-picker__inputs">
        <div className="color-picker__input-group">
          <label>HEX</label>
          <input
            className="color-picker__hex-input"
            value={hexInput}
            maxLength={6}
            onChange={e => setHexInput(e.target.value)}
            onBlur={commitHex}
            onKeyDown={e => { if (e.key === 'Enter') commitHex() }}
          />
        </div>
        <div className="color-picker__input-group">
          <label>R</label>
          <input
            className="color-picker__rgb-input"
            value={rInput}
            onChange={e => setRInput(e.target.value)}
            onBlur={commitRgb}
            onKeyDown={e => { if (e.key === 'Enter') commitRgb() }}
          />
        </div>
        <div className="color-picker__input-group">
          <label>G</label>
          <input
            className="color-picker__rgb-input"
            value={gInput}
            onChange={e => setGInput(e.target.value)}
            onBlur={commitRgb}
            onKeyDown={e => { if (e.key === 'Enter') commitRgb() }}
          />
        </div>
        <div className="color-picker__input-group">
          <label>B</label>
          <input
            className="color-picker__rgb-input"
            value={bInput}
            onChange={e => setBInput(e.target.value)}
            onBlur={commitRgb}
            onKeyDown={e => { if (e.key === 'Enter') commitRgb() }}
          />
        </div>
        <div className="color-picker__input-group">
          <label>%</label>
          <input
            className="color-picker__rgb-input"
            value={opacity}
            onChange={e => {
              const v = Math.max(0, Math.min(100, parseInt(e.target.value) || 0))
              setOpacity(v)
              emitChange(currentHex, v)
            }}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          />
        </div>
      </div>

      {/* Document swatches */}
      {swatches.length > 0 && (
        <div className="color-picker__swatches">
          <div className="color-picker__swatches-label">Document colors</div>
          <div className="color-picker__swatches-grid">
            {swatches.map(c => (
              <button
                key={c}
                className="color-picker__swatch-btn"
                style={{ backgroundColor: c }}
                onClick={() => {
                  const newHsv = hexToHsv(c)
                  setHsv(newHsv)
                  emitChange(c, opacity)
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ColorPicker
