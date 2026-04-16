/**
 * rulerUtils.ts — shared constants and helpers for ruler rendering.
 *
 * Tick step selection:
 *   Pick the smallest step from TICK_STEPS where step * zoom >= TICK_MIN_PX.
 *   This keeps on-screen spacing in the readable range [TICK_MIN_PX, TICK_MAX_PX].
 */

/** Allowed tick intervals in world-unit pixels. */
export const TICK_STEPS = [1, 5, 10, 20, 50, 100, 500] as const

/** Minimum on-screen distance between ticks (px). */
export const TICK_MIN_PX = 50

/** Maximum on-screen distance between ticks (px). */
export const TICK_MAX_PX = 120

/**
 * Choose the appropriate tick interval for the given zoom scale.
 * Returns the first step in TICK_STEPS where `step * scale >= TICK_MIN_PX`.
 */
export function chooseTickStep(scale: number): number {
  for (const step of TICK_STEPS) {
    if (step * scale >= TICK_MIN_PX) return step
  }
  return TICK_STEPS[TICK_STEPS.length - 1]
}

/**
 * Minimum screen-space distance (px) at which a regular tick label is suppressed
 * to avoid collision with a selected-object boundary label.
 */
export const LABEL_COLLISION_PX = 50
