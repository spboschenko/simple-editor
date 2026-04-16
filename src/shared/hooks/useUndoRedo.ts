import { useEffect } from 'react'
import { useEditor } from '../../core/store'

/**
 * Attaches global keyboard shortcuts for Undo/Redo.
 *
 * Undo  : Ctrl+Z  / Cmd+Z
 * Redo  : Ctrl+Y  / Cmd+Y  / Cmd+Shift+Z  / Ctrl+Shift+Z
 *
 * Shortcuts are ignored when focus is inside an input or textarea so that
 * native browser undo still works in form fields.
 */
export function useUndoRedo(): void {
  const { dispatch } = useEditor()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      const mod = e.ctrlKey || e.metaKey

      const isUndo = mod && !e.shiftKey && e.key === 'z'
      const isRedo =
        (mod && (e.key === 'y' || e.key === 'Y')) ||
        (mod && e.shiftKey && (e.key === 'z' || e.key === 'Z'))

      if (isUndo) {
        e.preventDefault()
        dispatch({ type: 'undo' })
      } else if (isRedo) {
        e.preventDefault()
        dispatch({ type: 'redo' })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dispatch])
}
