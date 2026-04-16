/**
 * shared/numeric.ts
 *
 * Pure numeric expression parsing and validation utilities.
 *
 * Supported operators:  +  -  *  /  ^  (and parentheses)
 * NOT using eval — uses a minimal recursive-descent parser.
 *
 * Three-level model for numeric fields:
 *   raw text  → parseNumericExpression → parsed value
 *   parsed value → validateAndRound → committed model value
 */

// ── Constraints ──────────────────────────────────────────────────────────────

export interface NumericConstraints {
  min?: number
  max?: number
}

// Safety caps to avoid pathological inputs (very large exponents, extremely long expressions)
const MAX_INPUT_LENGTH = 128
const MAX_TOKENS = 256
const MAX_LITERAL = 1e12 // largest numeric literal allowed
const MAX_RESULT = 1e9   // largest absolute result allowed from any sub-expression

// ── Tokenizer ────────────────────────────────────────────────────────────────

type TokenType =
  | 'NUM' | 'PLUS' | 'MINUS' | 'STAR' | 'SLASH' | 'CARET'
  | 'LPAREN' | 'RPAREN' | 'EOF'

type NumToken  = { type: 'NUM'; value: number }
type OtherToken = { type: Exclude<TokenType, 'NUM'> }
type Token = NumToken | OtherToken

function tokenize(input: string): Token[] | null {
  const tokens: Token[] = []
  const s = input.trim()
  if (s.length === 0 || s.length > MAX_INPUT_LENGTH) return null
  let i = 0

  while (i < s.length) {
    const ch = s[i]
    if (ch === ' ') { i++; continue }
    if (ch === '+') { tokens.push({ type: 'PLUS' });   i++; continue }
    if (ch === '-') { tokens.push({ type: 'MINUS' });  i++; continue }
    if (ch === '*') { tokens.push({ type: 'STAR' });   i++; continue }
    if (ch === '/') { tokens.push({ type: 'SLASH' });  i++; continue }
    if (ch === '^') { tokens.push({ type: 'CARET' });  i++; continue }
    if (ch === '(') { tokens.push({ type: 'LPAREN' }); i++; continue }
    if (ch === ')') { tokens.push({ type: 'RPAREN' }); i++; continue }

    if (/[0-9]/.test(ch)) {
      let num = ''
      while (i < s.length && /[0-9.]/.test(s[i])) { num += s[i++] }
      const val = parseFloat(num)
      if (!isFinite(val) || isNaN(val)) return null
      if (Math.abs(val) > MAX_LITERAL) return null
      tokens.push({ type: 'NUM', value: val })
      continue
    }

    return null // unknown character — reject
  }

  tokens.push({ type: 'EOF' })
  if (tokens.length > MAX_TOKENS) return null
  return tokens
}

// ── Recursive-descent parser ─────────────────────────────────────────────────
//
//   expr    := term  (('+' | '-') term)*
//   term    := power (('*' | '/') power)*
//   power   := unary ('^' power)*            ← right-associative
//   unary   := '-' unary | primary
//   primary := NUMBER | '(' expr ')'

class Parser {
  private tokens: Token[]
  private pos = 0

  constructor(tokens: Token[]) { this.tokens = tokens }

  private peek(): Token { return this.tokens[this.pos] }
  private consume(): Token { return this.tokens[this.pos++] }

  private checkVal(v: number): number {
    if (!isFinite(v) || isNaN(v)) throw new Error('invalid numeric result')
    if (Math.abs(v) > MAX_RESULT) throw new Error('result out of bounds')
    return v
  }

  parse(): number {
    const val = this.expr()
    if (this.peek().type !== 'EOF') throw new Error('unexpected token')
    return val
  }

  private expr(): number {
    let left = this.term()
    while (this.peek().type === 'PLUS' || this.peek().type === 'MINUS') {
      const op = this.consume().type
      const right = this.term()
      left = op === 'PLUS' ? left + right : left - right
      left = this.checkVal(left)
    }
    return left
  }

  private term(): number {
    let left = this.power()
    while (this.peek().type === 'STAR' || this.peek().type === 'SLASH') {
      const op = this.consume().type
      const right = this.power()
      if (op === 'SLASH' && right === 0) throw new Error('division by zero')
      left = op === 'STAR' ? left * right : left / right
      left = this.checkVal(left)
    }
    return left
  }

  private power(): number {
    const base = this.unary()
    if (this.peek().type === 'CARET') {
      this.consume()
      const exp = this.power() // right-associative
      const res = Math.pow(base, exp)
      return this.checkVal(res)
    }
    return base
  }

  private unary(): number {
    if (this.peek().type === 'MINUS') {
      this.consume()
      return -this.unary()
    }
    return this.primary()
  }

  private primary(): number {
    const tok = this.peek()
    if (tok.type === 'NUM') {
      this.consume()
      return (tok as NumToken).value
    }
    if (tok.type === 'LPAREN') {
      this.consume()
      const val = this.expr()
      if (this.peek().type !== 'RPAREN') throw new Error('expected )')
      this.consume()
      return val
    }
    throw new Error('expected number or (')
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Safely parses a numeric expression (no eval).
 *
 * Supports: +  -  *  /  ^  ( )
 * Returns the numeric result, or null if the expression is invalid.
 *
 * Examples:
 *   "1000+200"  → 1200
 *   "3000/4"    → 750
 *   "2^8"       → 256
 *   "abc"       → null
 *   "1000+"     → null
 */
export function parseNumericExpression(input: string): number | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  try {
    const tokens = tokenize(trimmed)
    if (!tokens) return null
    const result = new Parser(tokens).parse()
    if (!isFinite(result) || isNaN(result)) return null
    return result
  } catch {
    return null
  }
}

/**
 * Rounds value to nearest integer and validates against constraints.
 * Returns the rounded value if it passes all constraints, null otherwise.
 */
export function validateAndRound(
  value: number,
  constraints: NumericConstraints
): number | null {
  const rounded = Math.round(value)
  if (constraints.min !== undefined && rounded < constraints.min) return null
  if (constraints.max !== undefined && rounded > constraints.max) return null
  return rounded
}

/**
 * Convenience: parse expression then validate. Returns null on any failure.
 */
export function parseAndValidate(
  input: string,
  constraints: NumericConstraints
): number | null {
  const parsed = parseNumericExpression(input)
  if (parsed === null) return null
  return validateAndRound(parsed, constraints)
}
