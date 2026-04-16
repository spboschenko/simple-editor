/**
 * Affordance types — the canonical vocabulary for all interactive handles.
 *
 * Cursor is derived from AffordanceKind; see cursor-map.ts.
 * Shape-specific geometry lives in shape-adapters/.
 */

export type AffordanceKind =
  | 'body'
  | 'corner-nw'
  | 'corner-ne'
  | 'corner-sw'
  | 'corner-se'
  | 'edge-n'
  | 'edge-s'
  | 'edge-e'
  | 'edge-w'

/** One interactive handle attached to an object. */
export interface AffordanceDef {
  /** Unique key within the object (used to identify which handle is active). */
  key: string
  /** Semantic kind — drives cursor and interaction type. */
  kind: AffordanceKind
  /** World-space position of the handle centre. */
  worldX: number
  worldY: number
}

/**
 * Adapts a geometry type to the shared interaction lifecycle.
 *
 * TGeom is the plain geometry shape (e.g. Rect).
 * Shape adapters must NOT import lifecycle or cursor logic.
 */
export interface ShapeAdapter<TGeom> {
  /**
   * Returns all affordances for the current geometry.
   * Called by the overlay to place handles and detect hover targets.
   */
  getAffordances(geom: TGeom): AffordanceDef[]

  /**
   * Hit-tests a world-space point against the object body (not handles).
   * Returns the affordance kind if inside, null otherwise.
   * Handles are hit-tested separately by the overlay.
   */
  hitTest(geom: TGeom, world: { x: number; y: number }): AffordanceKind | null

  /**
   * Applies a manipulation delta and returns updated geometry.
   * Called on every pointermove during an active interaction session.
   *
   * @param base     - geometry captured at the start of the drag
   * @param key      - affordance key that initiated the session
   * @param start    - world-space pointer position at drag start
   * @param current  - current world-space pointer position
   */
  applyManipulation(
    base: TGeom,
    key: string,
    start: { x: number; y: number },
    current: { x: number; y: number }
  ): TGeom
}
