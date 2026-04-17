/**
 * clipboard.ts
 *
 * Internal clipboard for SceneNode copy/paste operations.
 * Stores deep copies — mutations to original nodes do not affect the clipboard.
 */
import type { SceneNode, Rect } from './types'
import { getDomain, nullDomain } from './domain-contract'

// ── ID generation ─────────────────────────────────────────────────────────────

let _counter = 0
function nextId(): string {
  return `node-${Date.now()}-${++_counter}`
}

// ── Clipboard storage ─────────────────────────────────────────────────────────

let _buffer: SceneNode[] = []

/** Copy nodes into the internal clipboard (deep clone). */
export function clipboardCopy(nodes: SceneNode[]): void {
  _buffer = structuredClone(nodes)
}

/** Returns true if clipboard has content. */
export function clipboardHasContent(): boolean {
  return _buffer.length > 0
}

// ── Clone helpers ─────────────────────────────────────────────────────────────

const DUPLICATE_OFFSET = 20

/**
 * Deep-clone an array of SceneNode.
 * Each clone gets a fresh unique id and domain.process() is re-run.
 * @param offsetX  pixel offset on X axis (default 20)
 * @param offsetY  pixel offset on Y axis (default 20, positive = up in world)
 */
export function cloneNodes(
  nodes: SceneNode[],
  offsetX = DUPLICATE_OFFSET,
  offsetY = DUPLICATE_OFFSET,
): SceneNode[] {
  return nodes.map(node => {
    const newId = nextId()
    const geometry: Rect = {
      ...node.geometry,
      id: newId,
      x: node.geometry.x + offsetX,
      y: node.geometry.y + offsetY,
    }
    const domain = getDomain(node.domainType) ?? nullDomain
    return {
      geometry,
      domainType: node.domainType,
      data: structuredClone(node.data),
      computed: (domain as any).process(geometry, node.data),
    }
  })
}

/**
 * Paste: clone whatever is in the internal clipboard.
 * Returns empty array if clipboard is empty.
 */
export function clipboardPaste(offsetX = DUPLICATE_OFFSET, offsetY = DUPLICATE_OFFSET): SceneNode[] {
  if (_buffer.length === 0) return []
  return cloneNodes(_buffer, offsetX, offsetY)
}
