<!-- entities: useNumericField, parseAndValidate, parseNumericExpression, NumericConstraints, InspectorField, numeric.ts, Inspector.tsx, DomainContract.InspectorSection -->

# Numeric Input Rules

Applies to **all** numeric fields in the editor — both geometry fields (`x`, `y`, `width`, `height`) and any domain-specific fields (e.g. Gap X/Y in grid-layout).

## Three-level model

```
User types raw text
       ↓  (on commit: Enter / blur / Commit button)
parseNumericExpression()   →  parsed number  |  null (invalid)
       ↓
Math.round() + min/max check  →  integer  |  null (out of range)
       ↓
dispatch({ type: 'updateProps', rect: { ...rect, fieldName: integer } })
```

The document state only ever receives a clean validated integer.

## Raw text

- What the user is currently typing.
- May contain a math expression (`1000+200`) or partial input (`1000+`).
- Managed by `useNumericField` in component-local state.
- **Never written to `document.rect`** unless it survives parsing + validation.

## Expression syntax

Supported operators (in order of precedence, highest first):

| Operator | Meaning |
|---|---|
| `^` | Exponentiation (right-associative) |
| `*` `/` | Multiplication / division |
| `+` `-` | Addition / subtraction |
| `( )` | Grouping |

Examples:

| Input | Result |
|---|---|
| `1000+200` | 1200 |
| `3000-150` | 2850 |
| `50*4` | 200 |
| `1200/3` | 400 |
| `2^8` | 256 |
| `(100+50)*2` | 300 |

`eval` is **not used**. The parser (`src/shared/numeric.ts`) is a
minimal recursive-descent implementation covering only the operators above.

## Invalid inputs — rejected examples

| Input | Reason |
|---|---|
| `abc` | not a number |
| `1000+` | incomplete expression |
| `/20` | no left operand |
| `NaN` | not a valid token |
| `Infinity` | not a valid token |
| value below `min` | constraint violation |
| division by zero | evaluates to ±Infinity |

When input is invalid:
- The field border turns **red** (`data-invalid="true"`).
- Raw text remains in the field so the user can correct it.
- **No value is dispatched** to the document.
- The previous committed value is preserved in `numericRef`.

## Commit triggers

| Trigger | Effect |
|---|---|
| **Enter** in a numeric field | Evaluate; if valid → dispatch `updateProps` (or `onUpdateData` in domain fields) |
| **Tab / blur** from a numeric field | Evaluate; if valid → format field, call `onParsed`; no additional side effect |
| **Escape** | Reset all fields to current document values; no dispatch |

## Per-field constraints

| Field | `min` | `max` |
|---|---|---|
| X | 0 | — |
| Y | 0 | — |
| Width | 1 | — |
| Height | 1 | — |

## Implementation files

| File | Role |
|---|---|
| `src/shared/numeric.ts` | `parseNumericExpression`, `validateAndRound`, `parseAndValidate` |
| `src/shared/hooks/useNumericField.ts` | React hook: rawText, tryCommit, tryBlur, reset |
| `src/shared/ui.tsx` | `InspectorField` component — bind `rawText`, `onChange`, `tryBlur`, `onKeyDown` to this |
| `src/ui/inspector/Inspector.tsx` | Wires geometry fields to the hook and dispatch |

---

## Domain-specific numeric fields

The three-level model and the `useNumericField` + `<InspectorField>` contract is **not limited to geometry fields**. Every domain `InspectorSection` that exposes numeric inputs must follow the identical pattern:

- Use `useNumericField(committedValue, constraints, onParsed)` for state management.
- Bind `rawText` / `onChange` / `tryBlur` to `<InspectorField>`.
- Keyboard handler: `Enter` → blur (which triggers `tryBlur`), `Escape` → `field.reset()` + blur.
- The `onParsed` callback receives a clean integer and calls `onUpdateData(newData)` with a new domain data payload.
- Invalid expressions revert silently to the last committed value — no partial write to `data`.

### Enforced rule

`parseFloat()`, raw `useState` + `useEffect` pairs, or bespoke `commitX / commitY` functions inside a domain `InspectorSection` are **forbidden**. They bypass arithmetic expression parsing and break the uniform input contract that users expect across all fields.

Reference implementation: `src/domains/grid-layout.tsx` → `GridInspectorSection` (Gap X/Y fields).
