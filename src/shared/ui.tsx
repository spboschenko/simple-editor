/**
 * shared/ui.tsx
 *
 * Atomic UI primitives — thin typed wrappers around CSS class names.
 * All sizing / spacing values reference design-tokens.ts.
 * Adding a variant means editing this file and tokens — not individual feature files.
 */
import React from 'react'
import { spacing, fontSize, colors } from './tokens/design-tokens'

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
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

export const Field: React.FC<FieldProps> = ({ label, value, disabled, onChange, onKeyDown }) => (
  <div className="inspector-field">
    <label>{label}</label>
    <input value={value} disabled={disabled} onChange={onChange} onKeyDown={onKeyDown} />
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
