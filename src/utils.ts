import { ANY, NA, type AttributeValue } from './types.js'

export function isLogical(v: AttributeValue): v is typeof ANY | typeof NA {
  return v === ANY || v === NA
}

export function isString(v: AttributeValue): v is string {
  return typeof v === 'string'
}

export function isAlphaNum(c: string): boolean {
  return /^[A-Za-z0-9_]$/.test(c)
}

/**
 * Check if a WFN attribute-value string contains unquoted wildcards.
 * An unquoted wildcard is * or ? not preceded by a backslash.
 */
export function containsWildcards(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\') {
      i++ // skip escaped char
      continue
    }
    if (s[i] === '*' || s[i] === '?') return true
  }
  return false
}

/**
 * Count escape (backslash) characters in str from start up to (not including) end.
 */
export function countEscapeCharacters(str: string, start: number, end: number): number {
  let result = 0
  let active = false
  for (let i = 0; i < end; i++) {
    active = !active && str[i] === '\\'
    if (active && i >= start) result++
  }
  return result
}

/**
 * Returns true if an even number of backslashes precede the character at idx.
 * "Even" means the character at idx is NOT escaped.
 */
export function isEvenWildcards(str: string, idx: number): boolean {
  let result = 0
  let i = idx - 1
  while (i >= 0 && str[i] === '\\') {
    i--
    result++
  }
  return result % 2 === 0
}
