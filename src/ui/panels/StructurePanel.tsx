/**
 * StructurePanel.tsx
 *
 * Figma-style layers panel with:
 * - Single click → replace selection
 * - Ctrl/Cmd + Click → toggle membership
 * - Shift + Click → range select (anchor = last element in selection)
 * - Alt + eye/lock icon → batch toggle for entire selection
 * - Context menu → delete / duplicate / group
 * - Focus highlight on the last-clicked (anchor) node
 * - Drag-and-drop reordering
 */
import React, { useState, useRef, useCallback } from 'react'
import { useEditor } from '../../core/store'
import { getDomain } from '../../core/domain-contract'
import { IconEyeOpen, IconEyeClosed, IconLockOpen, IconLockClosed } from '../../shared/icons'
import { IconButton } from '../../shared/ui'

// ── Icons ─────────────────────────────────────────────────────────────────────
const IconChevron: React.FC<{ open: boolean }> = ({ open }) => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
    stroke="currentColor" strokeWidth="1.5" aria-hidden="true"
    style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}
  >
    <path d="M3 2l4 3-4 3" />
  </svg>
)

const IconRect: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
    stroke="currentColor" strokeWidth="1.4" aria-hidden="true" style={{ flexShrink: 0 }}>
    <rect x="1.5" y="2.5" width="9" height="7" rx="1" />
  </svg>
)

const IconGroup: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
    stroke="currentColor" strokeWidth="1.2" aria-hidden="true" style={{ flexShrink: 0 }}>
    <rect x="1" y="1" width="10" height="10" rx="1.5" strokeDasharray="2 1.5" />
  </svg>
)

export const StructurePanel: React.FC = () => {
  const { state, dispatch } = useEditor()
  const selection = state.ui.selection
  const nodes = state.document.nodes
  const [docExpanded, setDocExpanded] = useState(true)
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({})
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Anchor: the last directly-clicked node (for focus highlight & Shift range)
  const [anchorId, setAnchorId] = useState<string | null>(null)

  // Context menu
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null)

  // ── Drag-and-drop reorder state ───────────────────────────────────────
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const dragNodeIdRef = useRef<string | null>(null)

  const handleDragStart = useCallback((nodeId: string) => {
    dragNodeIdRef.current = nodeId
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIdx(idx)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, toIdx: number) => {
    e.preventDefault()
    setDragOverIdx(null)
    const nodeId = dragNodeIdRef.current
    if (nodeId) {
      dispatch({ type: 'reorderNode', nodeId, toIndex: toIdx })
    }
    dragNodeIdRef.current = null
  }, [dispatch])

  const handleDragEnd = useCallback(() => {
    setDragOverIdx(null)
    dragNodeIdRef.current = null
  }, [])

  const toggleNodeExpanded = (id: string) =>
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }))

  // ── Selection handler (single / Ctrl / Shift) ────────────────────────
  const handleNodeClick = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    const isCtrl = e.ctrlKey || e.metaKey
    const isShift = e.shiftKey

    if (isShift) {
      dispatch({ type: 'rangeSelect', id: nodeId })
      // Don't move anchor on shift-click — keep the range start stable
    } else if (isCtrl) {
      dispatch({ type: 'addToSelection', id: nodeId })
      setAnchorId(nodeId)
    } else {
      dispatch({ type: 'select', id: nodeId })
      setAnchorId(nodeId)
    }
  }, [dispatch])

  // ── Context menu ──────────────────────────────────────────────────────
  const handleContextMenu = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.preventDefault()
    e.stopPropagation()
    // If right-clicking outside selection, select the node first
    if (!selection.includes(nodeId)) {
      dispatch({ type: 'select', id: nodeId })
      setAnchorId(nodeId)
    }
    setCtxMenu({ x: e.clientX, y: e.clientY })
  }, [dispatch, selection])

  const closeCtxMenu = useCallback(() => setCtxMenu(null), [])

  const ctxDelete = useCallback(() => {
    dispatch({ type: 'deleteSelected' })
    setCtxMenu(null)
  }, [dispatch])

  const ctxDuplicate = useCallback(() => {
    dispatch({ type: 'duplicateSelection' })
    setCtxMenu(null)
  }, [dispatch])

  const ctxGroup = useCallback(() => {
    dispatch({ type: 'groupSelection' })
    setCtxMenu(null)
  }, [dispatch])

  const ctxUngroup = useCallback(() => {
    dispatch({ type: 'ungroupSelection' })
    setCtxMenu(null)
  }, [dispatch])

  // ── Batch visibility / lock (Alt + click on icon) ─────────────────────
  const handleVisibilityClick = useCallback((e: React.MouseEvent, nodeId: string, currentVisible: boolean) => {
    e.stopPropagation()
    const newVisible = !currentVisible
    if (e.altKey && selection.length > 1 && selection.includes(nodeId)) {
      dispatch({ type: 'setVisibleBatch', nodeIds: [...selection], visible: newVisible })
    } else {
      dispatch({ type: 'setVisible', nodeId, visible: newVisible })
    }
  }, [dispatch, selection])

  const handleLockClick = useCallback((e: React.MouseEvent, nodeId: string, currentLocked: boolean) => {
    e.stopPropagation()
    const newLocked = !currentLocked
    if (e.altKey && selection.length > 1 && selection.includes(nodeId)) {
      dispatch({ type: 'setLockedBatch', nodeIds: [...selection], locked: newLocked })
    } else {
      dispatch({ type: 'setLocked', nodeId, locked: newLocked })
    }
  }, [dispatch, selection])

  // Close context menu on any outside click
  const panelRef = useRef<HTMLDivElement>(null)

  return (
    <div className="layers-panel" ref={panelRef} onClick={closeCtxMenu}>
      <div className="layers-panel__header">Layers</div>
      <div className="layers-panel__tree">

        {/* Document root */}
        <div
          className={`layer-row ${selection.length === 0 ? 'layer-row--selected' : ''}`}
          onClick={e => { e.stopPropagation(); dispatch({ type: 'resetSelection' }); setAnchorId(null) }}
        >
          <button
            className="layer-row__chevron"
            onClick={e => { e.stopPropagation(); setDocExpanded(v => !v) }}
          >
            <IconChevron open={docExpanded} />
          </button>
          <span className="layer-row__name">Document</span>
        </div>

        {/* Nodes */}
        {docExpanded && nodes.map((node, idx) => {
          const nodeId = node.geometry.id
          const rect = node.geometry
          const isSelected = selection.includes(nodeId)
          const isFocused = isSelected && nodeId === anchorId && selection.length > 1
          const isGroup = node.domainType === 'group'
          const domain = getDomain(node.domainType)
          const isDomainLocked = domain?.isGeometryLocked?.(node.data) ?? false

          // For groups, children come from data.children
          const groupChildren = isGroup
            ? ((node.data as any)?.children as Array<{ geometry: { id: string; locked: boolean; visible: boolean }; domainType: string }>) ?? []
            : []

          // For domain children (e.g. grid cells)
          const domainChildren = domain?.getChildren
            ? domain.getChildren(node.computed, node.data)
            : []
          const children = isGroup ? groupChildren : domainChildren
          const isExpanded = expandedNodes[nodeId] ?? true
          const showActions = hoveredId === nodeId || isSelected || rect.locked || !rect.visible || isDomainLocked

          const toggleCellLock = (e: React.MouseEvent, childId: string) => {
            e.stopPropagation()
            if (!isSelected) dispatch({ type: 'select', id: nodeId })
            dispatch({ type: 'toggleChildLock', childId })
          }

          return (
            <React.Fragment key={nodeId}>
              {/* Drop zone indicator */}
              {dragOverIdx === idx && (
                <div className="layer-row__drop-indicator" />
              )}

              <div
                className={[
                  'layer-row layer-row--child',
                  isSelected ? 'layer-row--selected' : '',
                  isFocused ? 'layer-row--focused' : '',
                  !rect.visible ? 'layer-row--hidden' : '',
                ].join(' ').trim()}
                draggable
                onDragStart={() => handleDragStart(nodeId)}
                onDragOver={e => handleDragOver(e, idx)}
                onDrop={e => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                onClick={e => handleNodeClick(e, nodeId)}
                onContextMenu={e => handleContextMenu(e, nodeId)}
                onMouseEnter={() => setHoveredId(nodeId)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {children.length > 0 ? (
                  <button
                    className="layer-row__chevron"
                    onClick={e => { e.stopPropagation(); toggleNodeExpanded(nodeId) }}
                  >
                    <IconChevron open={isExpanded} />
                  </button>
                ) : (
                  <span className="layer-row__indent" />
                )}
                <span className="layer-row__type-icon">{isGroup ? <IconGroup /> : <IconRect />}</span>
                <span className="layer-row__name">{isGroup ? 'Group' : (domain?.label ?? 'Rectangle')}</span>
                <span className={`layer-row__actions ${showActions ? 'layer-row__actions--visible' : ''}`}>
                  <IconButton
                    title={`${rect.visible ? 'Hide' : 'Show'}${selection.length > 1 ? ' (Alt: all selected)' : ''}`}
                    onClick={e => handleVisibilityClick(e, nodeId, rect.visible)}
                    style={{ color: rect.visible ? undefined : 'var(--color-text)' }}
                  >
                    {rect.visible ? <IconEyeOpen size={12} /> : <IconEyeClosed size={12} />}
                  </IconButton>
                  <IconButton
                    title={`${rect.locked ? 'Unlock' : isDomainLocked ? 'Locked by cells' : 'Lock'}${selection.length > 1 ? ' (Alt: all selected)' : ''}`}
                    onClick={e => handleLockClick(e, nodeId, rect.locked)}
                    style={{ color: (rect.locked || isDomainLocked) ? 'var(--color-text)' : undefined }}
                  >
                    {(rect.locked || isDomainLocked) ? <IconLockClosed size={12} /> : <IconLockOpen size={12} />}
                  </IconButton>
                </span>
              </div>

              {/* Group children (static display — local coords) */}
              {isGroup && isExpanded && groupChildren.map((child: any) => (
                <div
                  key={child.geometry.id}
                  className="layer-row layer-row--cell"
                  onMouseEnter={() => setHoveredId(child.geometry.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <span className="layer-row__indent" />
                  <span className="layer-row__indent" />
                  <span className="layer-row__type-icon"><IconRect /></span>
                  <span className="layer-row__name">{getDomain(child.domainType)?.label ?? 'Rectangle'}</span>
                </div>
              ))}

              {/* Domain child cells (e.g. grid) */}
              {!isGroup && isExpanded && domainChildren.map(child => {
                const showChildActions = hoveredId === child.id || child.locked
                return (
                  <div
                    key={child.id}
                    className={[
                      'layer-row layer-row--cell',
                      child.locked ? 'layer-row--cell-locked' : '',
                    ].join(' ').trim()}
                    onMouseEnter={() => setHoveredId(child.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <span className="layer-row__indent" />
                    <span className="layer-row__indent" />
                    <span className="layer-row__type-icon"><IconRect /></span>
                    <span className="layer-row__name">{child.name}</span>
                    <span className={`layer-row__actions ${showChildActions ? 'layer-row__actions--visible' : ''}`}>
                      <IconButton
                        title={child.locked ? 'Unlock cell' : 'Lock cell'}
                        onClick={e => toggleCellLock(e, child.id)}
                        style={{ color: child.locked ? '#f87171' : undefined }}
                      >
                        {child.locked ? <IconLockClosed size={12} /> : <IconLockOpen size={12} />}
                      </IconButton>
                    </span>
                  </div>
                )
              })}
            </React.Fragment>
          )
        })}

        {/* Drop zone at the end */}
        {docExpanded && dragOverIdx === nodes.length && (
          <div className="layer-row__drop-indicator" />
        )}
        {docExpanded && (
          <div
            style={{ height: 8 }}
            onDragOver={e => handleDragOver(e, nodes.length)}
            onDrop={e => handleDrop(e, nodes.length)}
          />
        )}

      </div>

      {/* Context menu */}
      {ctxMenu && (
        <div
          className="layer-ctx-menu"
          style={{ top: ctxMenu.y, left: ctxMenu.x }}
          onClick={e => e.stopPropagation()}
        >
          <button className="layer-ctx-menu__item" onClick={ctxDuplicate}>
            Duplicate{selection.length > 1 ? ` (${selection.length})` : ''}
          </button>
          {selection.length >= 2 && (
            <button className="layer-ctx-menu__item" onClick={ctxGroup}>Group</button>
          )}
          {selection.length === 1 && nodes.find(n => n.geometry.id === selection[0])?.domainType === 'group' && (
            <button className="layer-ctx-menu__item" onClick={ctxUngroup}>Ungroup</button>
          )}
          <div className="layer-ctx-menu__sep" />
          <button className="layer-ctx-menu__item layer-ctx-menu__item--danger" onClick={ctxDelete}>
            Delete{selection.length > 1 ? ` (${selection.length})` : ''}
          </button>
        </div>
      )}
    </div>
  )
}

export default StructurePanel

