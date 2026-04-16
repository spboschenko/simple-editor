import { AffordanceDef, AffordanceKind, ShapeAdapter } from '../affordance-types'
import { Rect } from '../../types'

const MIN_SIZE = 8

/**
 * Shape adapter for Rect — y-up world coordinate system.
 *
 * In world coords: r.y is the BOTTOM edge, r.y + r.height is the TOP edge.
 *
 * Provides:
 *  - 4 corner affordances  (corner-nw/ne/sw/se at their correct world positions)
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
      // Corners: nw/ne are at the TOP (y + height), sw/se are at the BOTTOM (y)
      { key: 'corner-nw', kind: 'corner-nw', worldX: r.x,           worldY: r.y + r.height },
      { key: 'corner-ne', kind: 'corner-ne', worldX: r.x + r.width, worldY: r.y + r.height },
      { key: 'corner-sw', kind: 'corner-sw', worldX: r.x,           worldY: r.y            },
      { key: 'corner-se', kind: 'corner-se', worldX: r.x + r.width, worldY: r.y            },
      // Edges: n = top-center, s = bottom-center, e = right-center, w = left-center
      { key: 'edge-n',    kind: 'edge-n',    worldX: cx,            worldY: r.y + r.height },
      { key: 'edge-s',    kind: 'edge-s',    worldX: cx,            worldY: r.y            },
      { key: 'edge-e',    kind: 'edge-e',    worldX: r.x + r.width, worldY: cy             },
      { key: 'edge-w',    kind: 'edge-w',    worldX: r.x,           worldY: cy             },
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

  /**
   * Apply a resize manipulation in world (y-up) coordinates.
   *
   * Each affordance moves a specific edge:
   *   nw  → LEFT + TOP (top-left corner)
   *   ne  → RIGHT + TOP
   *   sw  → LEFT + BOTTOM
   *   se  → RIGHT + BOTTOM
   *   n   → TOP only
   *   s   → BOTTOM only
   *   e   → RIGHT only
   *   w   → LEFT only
   *
   * In y-up: r.y is BOTTOM, r.y+r.height is TOP.
   */
  applyManipulation(
    base: Rect,
    key: string,
    _start: { x: number; y: number },
    current: { x: number; y: number }
  ): Rect {
    const pos = current
    let { x, y, width, height } = base

    switch (key) {
      // ── Corners ─────────────────────────────────────────────────────────
      case 'corner-nw':   // top-left: moves LEFT and TOP
        x      = Math.round(pos.x)
        width  = Math.max(MIN_SIZE, Math.round(base.x + base.width  - x))
        height = Math.max(MIN_SIZE, Math.round(pos.y - base.y))
        break
      case 'corner-ne':   // top-right: moves RIGHT and TOP
        width  = Math.max(MIN_SIZE, Math.round(pos.x - base.x))
        height = Math.max(MIN_SIZE, Math.round(pos.y - base.y))
        break
      case 'corner-sw':   // bottom-left: moves LEFT and BOTTOM
        x      = Math.round(pos.x)
        width  = Math.max(MIN_SIZE, Math.round(base.x + base.width - x))
        y      = Math.round(pos.y)
        height = Math.max(MIN_SIZE, Math.round(base.y + base.height - y))
        break
      case 'corner-se':   // bottom-right: moves RIGHT and BOTTOM
        width  = Math.max(MIN_SIZE, Math.round(pos.x - base.x))
        y      = Math.round(pos.y)
        height = Math.max(MIN_SIZE, Math.round(base.y + base.height - y))
        break
      // ── Edges ────────────────────────────────────────────────────────────
      case 'edge-n':      // top edge: moves TOP only
        height = Math.max(MIN_SIZE, Math.round(pos.y - base.y))
        break
      case 'edge-s':      // bottom edge: moves BOTTOM only
        y      = Math.round(pos.y)
        height = Math.max(MIN_SIZE, Math.round(base.y + base.height - y))
        break
      case 'edge-e':      // right edge: moves RIGHT only
        width  = Math.max(MIN_SIZE, Math.round(pos.x - base.x))
        break
      case 'edge-w':      // left edge: moves LEFT only
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
