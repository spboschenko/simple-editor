/**
 * coord-transform.ts
 *
 * Centralized world ↔ screen / Konva coordinate conversions.
 *
 * World (document) coordinate system:
 *   - Origin: bottom-left
 *   - X: increases to the right
 *   - Y: increases upward
 *
 * Screen / Konva Stage convention:
 *   - Origin: top-left
 *   - X: increases to the right
 *   - Y: increases downward
 *
 * The Konva Stage uses STANDARD positive scaleX and scaleY — it is NOT flipped.
 * The y-transform is applied element-by-element when passing document coordinates
 * to Konva props, using worldToKonvaY().
 *
 * Architectural rule: no component may define its own y-axis inversion.
 * All world ↔ Konva and world ↔ screen conversions go through this file.
 */

// Stage dimensions are mutable so the UI can resize the canvas area at runtime.
export let STAGE_W = 800
export let STAGE_H = 480
export const RULER_SIZE = 24    // px — width of vertical ruler / height of horizontal ruler

export const MIN_SCALE = 0.05
export const MAX_SCALE = 20

export type Camera = { x: number; y: number; scale: number }

/**
 * Convert a world Y coordinate (y-up) to a Konva Stage local Y coordinate (y-down).
 * Use this for every y prop passed to a Konva element.
 *
 * Formula:  ky = STAGE_H / scale - wy
 *
 * For a Rect whose bottom world-edge is at wy and height is h:
 *   konva y (top of rect in Konva) = worldToKonvaY(wy + h, scale)
 *   konva height = h  (unchanged)
 */
export function worldToKonvaY(wy: number, scale: number): number {
  return STAGE_H / scale - wy
}

/**
 * World point → absolute screen pixel position (for ruler HTML Canvas, not Konva).
 *   sx = wx * scale + cam.x
 *   sy = STAGE_H + cam.y - wy * scale
 */
export function worldToScreen(wx: number, wy: number, camera: Camera): { x: number; y: number } {
  return {
    x: wx * camera.scale + camera.x,
    y: STAGE_H + camera.y - wy * camera.scale,
  }
}

/**
 * Absolute screen pixel → world coordinates.
 *   wx = (sx - cam.x) / scale
 *   wy = (STAGE_H + cam.y - sy) / scale
 */
export function screenToWorld(sx: number, sy: number, camera: Camera): { x: number; y: number } {
  return {
    x: (sx - camera.x) / camera.scale,
    y: (STAGE_H + camera.y - sy) / camera.scale,
  }
}

/**
 * Compute a camera that centres a world-space rect in the Stage with padding.
 *
 * cam.x = (STAGE_W - w * scale) / 2 - rect.x * scale
 * cam.y = rect.y * scale - (STAGE_H - rect.height * scale) / 2
 *
 * Derivation of camY: world rect centre should appear at screen centre (STAGE_H/2).
 *   screen_y_centre = STAGE_H + cam.y - (rect.y + rect.height/2) * scale = STAGE_H / 2
 *   → cam.y = rect.y * scale + rect.height/2 * scale - STAGE_H/2
 *           = rect.y * scale - (STAGE_H - rect.height * scale) / 2
 */
export function fitCamera(
  rect: { x: number; y: number; width: number; height: number }
): Camera {
  const pad = 60
  const scale = Math.min(
    (STAGE_W - pad * 2) / rect.width,
    (STAGE_H - pad * 2) / rect.height,
    2
  )
  return {
    scale,
    x: (STAGE_W - rect.width * scale) / 2 - rect.x * scale,
    y: rect.y * scale - (STAGE_H - rect.height * scale) / 2,
  }
}

/**
 * Zoom the camera toward a screen-space focal point by factor.
 * The focal point remains visually fixed during the zoom.
 *
 * Derivation of camY: keep world point at focalY on screen unchanged.
 *   Pre:  STAGE_H + camY_old - wy * scale_old = focalY
 *   Post: STAGE_H + camY_new - wy * scale_new = focalY
 *   → camY_new = focalY - STAGE_H + (STAGE_H + camY_old - focalY) * ratio
 */
export function zoomToward(
  camera: Camera,
  focalX: number,
  focalY: number,
  factor: number
): Camera {
  const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, camera.scale * factor))
  const ratio = newScale / camera.scale
  return {
    scale: newScale,
    x: focalX - (focalX - camera.x) * ratio,
    y: focalY - STAGE_H + (STAGE_H + camera.y - focalY) * ratio,
  }
}

/**
 * Update the stage size used by coordinate transforms (call when container resizes).
 */
export function setStageSize(w: number, h: number) {
  STAGE_W = Math.max(0, Math.round(w))
  STAGE_H = Math.max(0, Math.round(h))
}
