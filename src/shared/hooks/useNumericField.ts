import { useState, useEffect, ChangeEvent } from 'react'
import { parseAndValidate, NumericConstraints } from '../numeric'

/**
 * useNumericField
 *
 * Manages the three-level state of a numeric inspector field:
 *   raw text  (what the user types)
 *   → parsed & rounded integer (on tryCommit / tryBlur)
 *   → committed model value   (via onParsed callback)
 *
 * Lifecycle:
 *   onChange    — updates rawText only; does not touch the model
 *   tryBlur()   — parses expression on focus-out; updates rawText to result
 *                 if valid; silently resets to committedValue if not
 *   tryCommit() — same as tryBlur but also calls onParsed if valid;
 *                 returns true on success (caller may dispatch)
 *   reset()     — restores rawText to the last committedValue
 *
 * Invalid expressions never produce an error state — the field simply reverts.
 * The caller is responsible for dispatching after a successful tryCommit().
 */
export interface UseNumericFieldReturn {
  /** Current raw text — bind directly to input value. */
  rawText: string
  onChange:  (e: ChangeEvent<HTMLInputElement>) => void
  /**
   * Call on blur. Evaluates the expression without dispatching.
   * If invalid, rawText silently reverts to the committed value.
   */
  tryBlur:   () => void
  /**
   * Call on Enter. Returns true if the expression was valid and onParsed was called.
   * If invalid, rawText silently reverts to the committed value.
   * The caller should dispatch when this returns true.
   */
  tryCommit: () => boolean
  /** Reset rawText to the current committedValue. */
  reset:     () => void
}

export function useNumericField(
  committedValue: number,
  constraints: NumericConstraints,
  onParsed: (value: number) => void
): UseNumericFieldReturn {
  const [rawText, setRawText] = useState(String(committedValue))

  // Sync when the committed model value changes externally (e.g. undo, selection change).
  useEffect(() => {
    setRawText(String(committedValue))
  }, [committedValue])

  const parse = (): number | null =>
    parseAndValidate(rawText, constraints)

  const tryBlur = () => {
    const value = parse()
    if (value === null) { setRawText(String(committedValue)); return }
    setRawText(String(value))
    onParsed(value)
  }

  const tryCommit = (): boolean => {
    const value = parse()
    if (value === null) { setRawText(String(committedValue)); return false }
    setRawText(String(value))
    onParsed(value)
    return true
  }

  const reset = () => setRawText(String(committedValue))

  const onChange = (e: ChangeEvent<HTMLInputElement>) => setRawText(e.target.value)

  return { rawText, onChange, tryBlur, tryCommit, reset }
}
