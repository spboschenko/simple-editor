/**
 * VerticalRuler.tsx
 *
 * Renders a vertical ruler along the left edge of the canvas Stage.
 * Width = RULER_SIZE, Height = STAGE_H.
 *
 * Shows Y world-coordinates in the y-up system:
 *   Large world-Y values appear near the TOP of the ruler (small screen Y).
 *   World Y=0 is at the bottom (screen Y = STAGE_H + camera.y with default camera).
 *
 * Screen Y of world-Y `wy`:
 *   sy = STAGE_H + camera.y - wy * scale
 *
 * Selected-object top and bottom boundaries are highlighted in accent colour.
 * Regular tick labels are suppressed within LABEL_COLLISION_PX of a boundary.
 *
 * Labels are rotated 90° counter-clockwise so they align with the ruler axis.
 */

import React, { useRef, useEffect } from 'react'
import { Rect } from '../../../core/types'
import { Camera, STAGE_H, RULER_SIZE } from '../../../core/coord-transform'
import { chooseTickStep, LABEL_COLLISION_PX } from './rulerUtils'

const TICK_W     = 7          // tick mark width in px
const FONT       = 'Inter, system-ui, sans-serif'
const FONT_SIZE  = 10
const BG         = '#1a1a1a'
const BORDER     = '#3c3c3c'
const TICK_CLR   = '#666666'
const LABEL_CLR  = '#8e8e8e'
const BOUND_CLR  = '#4a90e2'

interface Props {
  camera: Camera
  selectedRect: Rect | null
}

export const VerticalRuler: React.FC<Props> = ({ camera, selectedRect }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { scale, y: camY } = camera
    const W = RULER_SIZE

    ctx.clearRect(0, 0, W, STAGE_H)

    // Background
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, W, STAGE_H)

    // Right border
    ctx.strokeStyle = BORDER
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(W - 0.5, 0)
    ctx.lineTo(W - 0.5, STAGE_H)
    ctx.stroke()

    const step = chooseTickStep(scale)

    // Visible world Y range (y-up: bottom = camY/scale, top = (STAGE_H+camY)/scale)
    const worldBottom = camY / scale
    const worldTop    = (STAGE_H + camY) / scale

    // Collect boundary screen Y positions from selected rect
    const boundaries: { sy: number; label: string; dir: 'top' | 'bottom' }[] = []
    if (selectedRect) {
      const bottomSy = STAGE_H + camY - selectedRect.y * scale
      const topSy    = STAGE_H + camY - (selectedRect.y + selectedRect.height) * scale
      boundaries.push(
        { sy: bottomSy, label: String(Math.round(selectedRect.y)),                         dir: 'bottom' },
        { sy: topSy,    label: String(Math.round(selectedRect.y + selectedRect.height)),    dir: 'top'    },
      )
    }

    ctx.font        = `${FONT_SIZE}px ${FONT}`
    ctx.textBaseline = 'middle'

    const firstTick = Math.floor(worldBottom / step) * step
    const lastTick  = Math.ceil(worldTop / step) * step

    for (let wy = firstTick; wy <= lastTick; wy += step) {
      // Screen Y of this world-Y tick (y-up)
      const sy = STAGE_H + camY - wy * scale
      if (sy < 0 || sy > STAGE_H) continue

      // Suppress if too close to a boundary label
      const suppressed = boundaries.some(b => Math.abs(sy - b.sy) < LABEL_COLLISION_PX)
      if (suppressed) continue

      // Tick line (from right edge toward left)
      ctx.strokeStyle = TICK_CLR
      ctx.lineWidth   = 1
      ctx.beginPath()
      ctx.moveTo(W - TICK_W, sy + 0.5)
      ctx.lineTo(W,          sy + 0.5)
      ctx.stroke()

      // Label: rotated −90°, centered in the tick-free zone (left part of ruler).
      // After rotate(-90°): new +x points UP on screen, so textAlign controls
      // whether text extends above (left-aligned at +offset) or below (right-aligned at −offset) sy.
      // For regular ticks we want centering on sy → textAlign 'center', fillText at x=0.
      const labelCx = Math.floor((W - TICK_W) / 2)   // horizontal center of label area
      ctx.save()
      ctx.translate(labelCx, sy)
      ctx.rotate(-Math.PI / 2)
      ctx.fillStyle   = LABEL_CLR
      ctx.textAlign   = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(Math.round(wy)), 0, 0)
      ctx.restore()
    }

    // Draw boundary markers (selected object bottom/top edges)
    for (const { sy, label, dir } of boundaries) {
      if (sy < 0 || sy > STAGE_H) continue

      // Full-width accent line
      ctx.strokeStyle = BOUND_CLR
      ctx.lineWidth   = 1
      ctx.beginPath()
      ctx.moveTo(0, sy + 0.5)
      ctx.lineTo(W, sy + 0.5)
      ctx.stroke()

      // Accent label placed OUTSIDE the boundary.
      // After rotate(-90°): new +x = screen UP, new −x = screen DOWN.
      //   top boundary    (small sy) → label above line → left-aligned at +gap
      //   bottom boundary (large sy) → label below line → right-aligned at −gap
      const BOUND_GAP = 4
      const labelCx = Math.floor((W - TICK_W) / 2)
      ctx.save()
      ctx.translate(labelCx, sy)
      ctx.rotate(-Math.PI / 2)
      ctx.fillStyle    = BOUND_CLR
      ctx.textBaseline = 'middle'
      if (dir === 'top') {
        ctx.textAlign = 'left'
        ctx.fillText(label, BOUND_GAP, 0)
      } else {
        ctx.textAlign = 'right'
        ctx.fillText(label, -BOUND_GAP, 0)
      }
      ctx.restore()
    }
  }, [camera, selectedRect])

  return (
    <canvas
      ref={canvasRef}
      width={RULER_SIZE}
      height={STAGE_H}
      style={{ display: 'block' }}
    />
  )
}

export default VerticalRuler
