/**
 * shared/ui.tsx
 *
 * Atomic UI primitives — thin typed wrappers around CSS class names.
 * All sizing / spacing values reference design-tokens.ts.
 * Adding a variant means editing this file and tokens — not individual feature files.
 */
import React from 'react'
import { spacing, fontSize, colors } from './tokens/design-tokens'
import { useScrub } from './hooks/useScrub'

// ── PanelTitle ───────────────────────────────────────────────────────────────

export const PanelTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="panel-title">{children}</div>
)

// ── Separator ────────────────────────────────────────────────────────────────
// Horizontal spacer between toolbar button groups. Uses spacing[3] = 12px.

export const ToolbarSeparator: React.FC = () => (
  <div
    style={{
      width: 1,
      height: 16,
      background: colors.border,
      margin: `0 ${spacing[2]}px`,
    }}
  />
)

// ── ToolButton ───────────────────────────────────────────────────────────────
// Standard bordered button. Pass `active` to apply the accent fill.

interface ToolButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
}

export const ToolButton: React.FC<ToolButtonProps> = ({ active, className, children, ...rest }) => (
  <button
    className={['tool-btn', active && 'active', className].filter(Boolean).join(' ')}
    {...rest}
  >
    {children}
  </button>
)

// ── IconButton ───────────────────────────────────────────────────────────────
// Borderless icon-sized button. Inherit colour via the `style` or `color` prop.

export const IconButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  children,
  ...rest
}) => (
  <button className="icon-btn" {...rest}>
    {children}
  </button>
)

// ── Field ────────────────────────────────────────────────────────────────────
// Label + input pair used in the Inspector.

interface FieldProps {
  label: string
  value: string | number
  disabled?: boolean
  /** When true the input border turns red to signal an invalid expression. */
  invalid?: boolean
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
}

export const Field: React.FC<FieldProps> = ({ label, value, disabled, invalid, onChange, onKeyDown, onBlur }) => (
  <div className="inspector-field">
    <label>{label}</label>
    <input
      value={value}
      disabled={disabled}
      data-invalid={invalid ? 'true' : undefined}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
    />
  </div>
)

// ── ZoomLabel ────────────────────────────────────────────────────────────────
// Read-only zoom percentage shown in the canvas toolbar.

export const ZoomLabel: React.FC<{ scale: number }> = ({ scale }) => (
  <span
    className="canvas-toolbar-zoom"
    style={{ fontSize: fontSize.sm, color: colors.textSecondary }}
  >
    {Math.round(scale * 100)}%
  </span>
)

// ── InspectorField ───────────────────────────────────────────────────────────
// Figma-style inline label + input. The label becomes an ew-resize scrub handle
// when onScrub is provided, allowing values to be changed by dragging.

interface InspectorFieldProps {
  label: React.ReactNode
  value: string | number
  disabled?: boolean
  invalid?: boolean
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
  /** Called once at drag start — use to snapshot history. */
  onScrubStart?: () => void
  /** Called on each horizontal pixel delta during drag. */
  onScrub?: (delta: number) => void
  /** Called once on drag end. */
  onScrubEnd?: () => void
}

export const InspectorField: React.FC<InspectorFieldProps> = ({
  label, value, disabled, invalid,
  onChange, onKeyDown, onBlur,
  onScrubStart, onScrub, onScrubEnd,
}) => {
  const scrubDown = useScrub({
    onScrubStart,
    onScrub: onScrub ?? (() => {}),
    onScrubEnd,
  })

  return (
    <div className="figma-field" data-invalid={invalid ? 'true' : undefined}>
      <span
        className="figma-field__label"
        data-scrub={!disabled && onScrub ? 'true' : undefined}
        onMouseDown={!disabled && onScrub ? scrubDown : undefined}
      >
        {label}
      </span>
      <input
        className="figma-field__input"
        value={value}
        disabled={disabled}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
      />
    </div>
  )
}
