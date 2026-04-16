/**
 * useBreakpoint.ts
 *
 * Returns the current LayoutMode based on window width.
 * Updates reactively on resize using a ResizeObserver on document.body.
 *
 * Breakpoints (from design-tokens.ts / responsive-strategy.md):
 *   desktop  >= 1200px   — full 3-column editor
 *   compact  768–1199px  — panels collapse to drawers
 *   mobile   < 768px     — viewer-first, panels as sheets
 */
import { useState, useEffect } from 'react'
import { breakpoints, LayoutMode } from '../tokens/design-tokens'

function getMode(width: number): LayoutMode {
  if (width >= breakpoints.desktop) return 'desktop'
  if (width >= breakpoints.compact) return 'compact'
  return 'mobile'
}

export function useBreakpoint(): LayoutMode {
  const [mode, setMode] = useState<LayoutMode>(() => getMode(window.innerWidth))

  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setMode(getMode(entry.contentRect.width))
      }
    })
    observer.observe(document.documentElement)
    return () => observer.disconnect()
  }, [])

  return mode
}
