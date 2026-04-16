/**
 * ConfirmDialog.tsx
 *
 * Generic confirmation modal rendered via React portal into document.body.
 * Blocks interaction with the background (pointer-events: none on overlay).
 *
 * Usage:
 *   <ConfirmDialog
 *     open={pending}
 *     message="Delete «My Project»? This cannot be undone."
 *     confirmLabel="Delete"
 *     onConfirm={() => { doDelete(); setPending(false) }}
 *     onCancel={() => setPending(false)}
 *   />
 */
import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'

interface ConfirmDialogProps {
  open: boolean
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  return createPortal(
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
        <p className="confirm-dialog__message">{message}</p>
        <div className="confirm-dialog__actions">
          <button className="confirm-dialog__btn confirm-dialog__btn--cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className="confirm-dialog__btn confirm-dialog__btn--confirm" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default ConfirmDialog
