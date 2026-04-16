import { useRef } from 'react'

interface ScrubCallbacks {
  /** Called once on mousedown — use to snapshot state to history before scrub. */
  onScrubStart?: () => void
  /** Called on every mousemove with the horizontal pixel delta since last call. */
  onScrub: (delta: number) => void
  /** Called on mouseup — use to finalise and optionally commit to history. */
  onScrubEnd?: () => void
}

/**
 * useScrub
 *
 * Returns an `onMouseDown` handler for a drag-handle element (e.g. an Inspector label).
 * Tracks horizontal movement and fires the provided callbacks.
 *
 * All callbacks are stored in refs so callers can safely pass inline functions
 * without causing the returned handler to re-create on each render.
 */
export function useScrub(callbacks: ScrubCallbacks): (e: React.MouseEvent) => void {
  const onScrubStartRef = useRef(callbacks.onScrubStart)
  const onScrubRef      = useRef(callbacks.onScrub)
  const onScrubEndRef   = useRef(callbacks.onScrubEnd)
  onScrubStartRef.current = callbacks.onScrubStart
  onScrubRef.current      = callbacks.onScrub
  onScrubEndRef.current   = callbacks.onScrubEnd

  const lastX = useRef(0)

  const handleMove = useRef((e: MouseEvent) => {
    const dx = e.clientX - lastX.current
    lastX.current = e.clientX
    if (dx !== 0) onScrubRef.current(dx)
  })

  const handleUp = useRef(() => {
    window.removeEventListener('mousemove', handleMove.current)
    window.removeEventListener('mouseup', handleUp.current)
    document.body.style.cursor    = ''
    document.body.style.userSelect = ''
    onScrubEndRef.current?.()
  })

  return (e: React.MouseEvent) => {
    e.preventDefault()
    lastX.current = e.clientX
    onScrubStartRef.current?.()
    document.body.style.cursor    = 'ew-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', handleMove.current)
    window.addEventListener('mouseup', handleUp.current)
  }
}
