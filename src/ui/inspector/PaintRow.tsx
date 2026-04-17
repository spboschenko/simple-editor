/**
 * PaintRow.tsx
 *
 * Figma-like inline paint editor row:
 * [Swatch] [HEX input] [Opacity %] [Eye toggle] [Remove btn]
 *
 * Used for both Fill and Stroke sections in the Inspector.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { ColorPicker } from './ColorPicker'
import { IconEyeOpen, IconEyeClosed } from '../../shared/icons'
import type { Paint, SceneNode } from '../../core/types'

interface PaintRowProps {
  paint: Paint
  disabled?: boolean
  onChange: (paint: Paint) => void
  onScrubStart?: () => void
  onScrubChange?: (paint: Paint) => void
  onRemove?: () => void
  label?: string
  documentNodes?: SceneNode[]
}

export const PaintRow: React.FC<PaintRowProps> = ({ paint, disabled, onChange, onScrubStart, onScrubChange, onRemove, label, documentNodes }) => {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [hexText, setHexText] = useState(paint.color.replace('#', ''))
  const [opacityText, setOpacityText] = useState(String(paint.opacity))
  const [isScrubbing, setIsScrubbing] = useState(false)
  const swatchRef = useRef<HTMLButtonElement>(null)
  const opacityInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setHexText(paint.color.replace('#', ''))
    setOpacityText(String(paint.opacity))
  }, [paint.color, paint.opacity])

  const handlePickerChange = useCallback((p: Paint) => {
    onChange(p)
  }, [onChange])

  const commitHex = () => {
    let h = hexText.trim()
    if (h.length === 3) h = h.split('').map(c => c + c).join('')
    if (/^[0-9a-fA-F]{6}$/.test(h)) {
      onChange({ ...paint, color: '#' + h.toLowerCase() })
    } else {
      setHexText(paint.color.replace('#', ''))
    }
  }

  const commitOpacity = () => {
    const v = parseInt(opacityText)
    if (!isNaN(v) && v >= 0 && v <= 100) {
      onChange({ ...paint, opacity: v })
    } else {
      setOpacityText(String(paint.opacity))
    }
  }

  const toggleVisible = () => {
    onChange({ ...paint, visible: !paint.visible })
  }

  // ── Opacity scrub logic ─────────────────────────────────────────────────
  const scrubState = useRef({ startX: 0, startOpacity: 0, didDrag: false })
  const paintRef = useRef(paint)
  paintRef.current = paint

  const onScrubStartRef = useRef(onScrubStart)
  const onScrubChangeRef = useRef(onScrubChange)
  onScrubStartRef.current = onScrubStart
  onScrubChangeRef.current = onScrubChange

  const handleOpacityPointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled) return
    // If clicking directly on the focused input, let normal editing happen
    if (document.activeElement === opacityInputRef.current) return

    e.preventDefault()
    scrubState.current = { startX: e.clientX, startOpacity: paintRef.current.opacity, didDrag: false }

    const handleMove = (ev: PointerEvent) => {
      const dx = ev.clientX - scrubState.current.startX
      if (!scrubState.current.didDrag && Math.abs(dx) < 3) return
      if (!scrubState.current.didDrag) {
        scrubState.current.didDrag = true
        onScrubStartRef.current?.()
        document.body.style.cursor = 'ew-resize'
        document.body.style.userSelect = 'none'
      }
      const step = ev.shiftKey ? 10 : 1
      const raw = scrubState.current.startOpacity + Math.round(dx / step) * step
      const clamped = Math.max(0, Math.min(100, raw))
      if (onScrubChangeRef.current) {
        onScrubChangeRef.current({ ...paintRef.current, opacity: clamped })
      } else {
        onChange({ ...paintRef.current, opacity: clamped })
      }
    }

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      if (scrubState.current.didDrag) {
        // Commit final value through onChange so it lands in undo history
        onChange({ ...paintRef.current, opacity: paintRef.current.opacity })
        setIsScrubbing(false)
      } else {
        // It was a click — focus the input for manual editing
        opacityInputRef.current?.focus()
        opacityInputRef.current?.select()
      }
    }

    setIsScrubbing(true)
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }, [disabled, onChange])

  return (
    <div className="paint-row">
      {/* Compound container: swatch | hex | opacity */}
      <div className="paint-row__container">
        {/* Color swatch — opens picker */}
        <button
          ref={swatchRef}
          className="paint-row__swatch"
          disabled={disabled}
          onClick={() => !disabled && setPickerOpen(v => !v)}
        >
          <span
            className="paint-row__swatch-color"
            style={{
              backgroundColor: paint.visible
                ? paint.color
                : 'transparent',
              opacity: paint.visible ? paint.opacity / 100 : 0.3,
            }}
          />
        </button>

        <span className="paint-row__divider" />

        {/* HEX input */}
        <input
          className="paint-row__hex"
          value={hexText}
          disabled={disabled}
          maxLength={6}
          onChange={e => setHexText(e.target.value)}
          onBlur={commitHex}
          onKeyDown={e => {
            if (e.key === 'Enter') commitHex()
            if (e.key === 'Escape') { setHexText(paint.color.replace('#', '')); (e.target as HTMLInputElement).blur() }
          }}
        />

        <span className="paint-row__divider" />

        {/* Opacity — scrubbable zone */}
        <div
          className="paint-row__opacity-zone"
          onPointerDown={handleOpacityPointerDown}
        >
          <input
            ref={opacityInputRef}
            className="paint-row__opacity"
            value={opacityText}
            disabled={disabled}
            onChange={e => setOpacityText(e.target.value)}
            onBlur={commitOpacity}
            onKeyDown={e => {
              if (e.key === 'Enter') commitOpacity()
              if (e.key === 'Escape') { setOpacityText(String(paint.opacity)); (e.target as HTMLInputElement).blur() }
            }}
          />
          <span className="paint-row__pct">%</span>
        </div>
      </div>

      {/* Visibility toggle — outside the container, right-aligned */}
      <button className="paint-row__icon-btn" onClick={toggleVisible} disabled={disabled} title="Toggle visibility">
        {paint.visible ? <IconEyeOpen size={14} /> : <IconEyeClosed size={14} />}
      </button>

      {/* Color picker popup */}
      {pickerOpen && (
        <div className="paint-row__picker-anchor">
          <ColorPicker
            paint={paint}
            onChange={handlePickerChange}
            onClose={() => setPickerOpen(false)}
            documentNodes={documentNodes}
          />
        </div>
      )}
    </div>
  )
}

export default PaintRow
