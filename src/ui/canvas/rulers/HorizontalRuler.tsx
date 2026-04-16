/**
 * HorizontalRuler.tsx
 *
 * Renders a horizontal ruler along the top edge of the canvas Stage.
 * Width = STAGE_W, Height = RULER_SIZE.
 *
 * Shows X world-coordinates. Since X is not flipped, world X maps to screen X
 * via the standard formula: sx = wx * scale + camera.x.
 *
 * Selected-object left and right boundaries are highlighted in accent colour.
 * If a regular tick label falls within LABEL_COLLISION_PX of a boundary label,
 * the regular label (and its tick line) is suppressed.
 */

import React, { useRef, useEffect } from 'react'
import { Rect } from '../../../core/types'
import { Camera, STAGE_W, RULER_SIZE, worldToScreen } from '../../../core/coord-transform'
import { chooseTickStep, LABEL_COLLISION_PX } from './rulerUtils'

const TICK_H = 7          // tick mark height in px
const FONT = 'Inter, system-ui, sans-serif'
const FONT_SIZE = 10      // px
const BG       = '#1a1a1a'
const BORDER   = '#3c3c3c'
const TICK_CLR = '#666666'
const LABEL_CLR = '#8e8e8e'
const BOUND_CLR = '#4a90e2'  // accent

interface Props {
  camera: Camera
  selectedRect: Rect | null
}

export const HorizontalRuler: React.FC<Props> = ({ camera, selectedRect }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { scale, x: camX } = camera
    const H = RULER_SIZE

    ctx.clearRect(0, 0, STAGE_W, H)

    // Background
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, STAGE_W, H)

    // Bottom border
    ctx.strokeStyle = BORDER
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, H - 0.5)
    ctx.lineTo(STAGE_W, H - 0.5)
    ctx.stroke()

    const step = chooseTickStep(scale)
    const worldLeft  = (0 - camX) / scale
    const worldRight = (STAGE_W - camX) / scale

    // Collect boundary screen X positions from selected rect
    const boundaries: { sx: number; label: string; dir: 'left' | 'right' }[] = []
    if (selectedRect) {
      const leftSx  = worldToScreen(selectedRect.x, 0, camera).x
      const rightSx = worldToScreen(selectedRect.x + selectedRect.width, 0, camera).x
      boundaries.push(
        { sx: leftSx,  label: String(Math.round(selectedRect.x)), dir: 'left' },
        { sx: rightSx, label: String(Math.round(selectedRect.x + selectedRect.width)), dir: 'right' },
      )
    }

    // Draw regular ticks and labels
    ctx.font = `${FONT_SIZE}px ${FONT}`
    ctx.textBaseline = 'top'
    ctx.textAlign = 'center'

    const firstTick = Math.floor(worldLeft / step) * step
    const lastTick  = Math.ceil(worldRight / step) * step

    for (let wx = firstTick; wx <= lastTick; wx += step) {
      const sx = wx * scale + camX
      if (sx < 0 || sx > STAGE_W) continue

      // Suppress if too close to a boundary label
      const suppressed = boundaries.some(b => Math.abs(sx - b.sx) < LABEL_COLLISION_PX)
      if (suppressed) continue

      // Tick line (from bottom edge upward)
      ctx.strokeStyle = TICK_CLR
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(sx + 0.5, H - TICK_H)
      ctx.lineTo(sx + 0.5, H)
      ctx.stroke()

      // Label centered on the tick
      ctx.fillStyle = LABEL_CLR
      ctx.fillText(String(Math.round(wx)), sx, 2)
    }

    // Boundary gap between tick line and label edge
    const BOUND_GAP = 4

    // Draw boundary markers (selected object left/right edges)
    for (const { sx, label, dir } of boundaries) {
      if (sx < 0 || sx > STAGE_W) continue

      // Full-height accent line
      ctx.strokeStyle = BOUND_CLR
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(sx + 0.5, 0)
      ctx.lineTo(sx + 0.5, H)
      ctx.stroke()

      // Accent label placed OUTSIDE the boundary:
      //   left edge  → label to the left  (right-aligned, ending before the line)
      //   right edge → label to the right (left-aligned,  starting after the line)
      ctx.fillStyle = BOUND_CLR
      ctx.textBaseline = 'top'
      if (dir === 'left') {
        ctx.textAlign = 'right'
        ctx.fillText(label, sx - BOUND_GAP, 2)
      } else {
        ctx.textAlign = 'left'
        ctx.fillText(label, sx + BOUND_GAP, 2)
      }
    }
  }, [camera, selectedRect])

  return (
    <canvas
      ref={canvasRef}
      width={STAGE_W}
      height={RULER_SIZE}
      style={{ display: 'block' }}
    />
  )
}

export default HorizontalRuler
