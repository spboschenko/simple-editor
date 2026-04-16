/**
 * ChangeDomainDialog.tsx
 *
 * Modal dialog for switching the active document's domain type.
 * Lists all registered domains and highlights the current one.
 * Selecting a different domain calls onSelect() immediately — the caller
 * is responsible for dispatching the changeDomain store action.
 *
 * Warning text informs the user that domain-specific settings (data) are
 * reset, while geometry is preserved.
 */
import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { listDomains } from '../core/domain-contract'

interface ChangeDomainDialogProps {
  open: boolean
  currentDomainType: string
  onSelect: (domainType: string) => void
  onCancel: () => void
}

export const ChangeDomainDialog: React.FC<ChangeDomainDialogProps> = ({
  open,
  currentDomainType,
  onSelect,
  onCancel,
}) => {
  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onCancel])

  if (!open) return null

  const domains = listDomains()

  return createPortal(
    <div className="confirm-overlay" onClick={onCancel} role="dialog" aria-modal="true">
      <div className="change-domain-dialog" onClick={e => e.stopPropagation()}>
        <h3 className="change-domain-dialog__title">Change Project Type</h3>
        <p className="change-domain-dialog__warning">
          Changing the type resets domain-specific settings. Geometry is preserved.
        </p>

        <div className="change-domain-list">
          {domains.map(d => {
            const isCurrent = d.type === currentDomainType
            return (
              <button
                key={d.type}
                className={[
                  'change-domain-item',
                  isCurrent ? 'change-domain-item--current' : '',
                ].join(' ').trim()}
                disabled={isCurrent}
                onClick={() => onSelect(d.type)}
              >
                <span className="change-domain-item__label">{d.label ?? d.type}</span>
                {isCurrent && <span className="change-domain-item__tag">active</span>}
              </button>
            )
          })}
        </div>

        <div className="change-domain-dialog__actions">
          <button className="confirm-dialog__btn confirm-dialog__btn--cancel" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default ChangeDomainDialog
