import { AffordanceDef, AffordanceKind, ShapeAdapter } from '../affordance-types'
import { Rect } from '../../types'

const MIN_SIZE = 8

/**
 * Shape adapter for Rect.
 *
 * Provides:
 *  - 4 corner affordances  (corner-nw/ne/sw/se)
 *  - 4 edge affordances    (edge-n/s/e/w at midpoints)
 *  - 1 body affordance     (body — used for hit-test only, no rendered handle)
 *
 * All geometry update math is in applyManipulation; no interaction lifecycle lives here.
 */
export const rectAdapter: ShapeAdapter<Rect> = {
  getAffordances(r: Rect): AffordanceDef[] {
    const cx = r.x + r.width / 2
    const cy = r.y + r.height / 2
    return [
      { key: 'corner-nw', kind: 'corner-nw', worldX: r.x,             worldY: r.y            },
      { key: 'corner-ne', kind: 'corner-ne', worldX: r.x + r.width,   worldY: r.y            },
      { key: 'corner-sw', kind: 'corner-sw', worldX: r.x,             worldY: r.y + r.height },
      { key: 'corner-se', kind: 'corner-se', worldX: r.x + r.width,   worldY: r.y + r.height },
      { key: 'edge-n',    kind: 'edge-n',    worldX: cx,              worldY: r.y            },
      { key: 'edge-s',    kind: 'edge-s',    worldX: cx,              worldY: r.y + r.height },
      { key: 'edge-e',    kind: 'edge-e',    worldX: r.x + r.width,   worldY: cy             },
      { key: 'edge-w',    kind: 'edge-w',    worldX: r.x,             worldY: cy             },
    ]
  },

  hitTest(r: Rect, world: { x: number; y: number }): AffordanceKind | null {
    if (
      world.x >= r.x && world.x <= r.x + r.width &&
      world.y >= r.y && world.y <= r.y + r.height
    ) {
      return 'body'
    }
    return null
  },

  applyManipulation(
    base: Rect,
    key: string,
    _start: { x: number; y: number },
    current: { x: number; y: number }
  ): Rect {
    const pos = current
    let { x, y, width, height } = base

    switch (key) {
      case 'corner-se':
        width  = Math.max(MIN_SIZE, Math.round(pos.x - base.x))
        height = Math.max(MIN_SIZE, Math.round(pos.y - base.y))
        break
      case 'corner-nw':
        x      = Math.round(pos.x)
        y      = Math.round(pos.y)
        width  = Math.max(MIN_SIZE, Math.round(base.x + base.width  - x))
        height = Math.max(MIN_SIZE, Math.round(base.y + base.height - y))
        break
      case 'corner-ne':
        y      = Math.round(pos.y)
        width  = Math.max(MIN_SIZE, Math.round(pos.x - base.x))
        height = Math.max(MIN_SIZE, Math.round(base.y + base.height - y))
        break
      case 'corner-sw':
        x      = Math.round(pos.x)
        width  = Math.max(MIN_SIZE, Math.round(base.x + base.width - x))
        height = Math.max(MIN_SIZE, Math.round(pos.y - base.y))
        break
      case 'edge-n':
        y      = Math.round(pos.y)
        height = Math.max(MIN_SIZE, Math.round(base.y + base.height - y))
        break
      case 'edge-s':
        height = Math.max(MIN_SIZE, Math.round(pos.y - base.y))
        break
      case 'edge-e':
        width  = Math.max(MIN_SIZE, Math.round(pos.x - base.x))
        break
      case 'edge-w':
        x      = Math.round(pos.x)
        width  = Math.max(MIN_SIZE, Math.round(base.x + base.width - x))
        break
      case 'body':
        // Body dragging is handled by CanvasRoot via move session, not here.
        break
    }

    return { ...base, x, y, width, height }
  },
}
