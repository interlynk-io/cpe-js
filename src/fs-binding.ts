/**
 * Formatted String Binding per NISTIR 7695 Section 6.2.
 * Handles cpe:2.3:part:vendor:product:version:update:edition:language:sw_edition:target_sw:target_hw:other
 */

import { ANY, NA, type AttributeValue, type WFN } from './types.js'
import { createWFN } from './wfn.js'
import { isLogical } from './utils.js'

// Attribute order in formatted string binding
const FS_ATTR_ORDER = [
  'part',
  'vendor',
  'product',
  'version',
  'update',
  'edition',
  'language',
  'swEdition',
  'targetSw',
  'targetHw',
  'other',
] as const

/**
 * Bind a WFN to a CPE 2.3 formatted string.
 * Per NISTIR 7695 Section 6.2.2.
 */
export function bindToFormattedString(wfn: WFN): string {
  let fs = 'cpe:2.3:'
  for (let i = 0; i < FS_ATTR_ORDER.length; i++) {
    const attr = FS_ATTR_ORDER[i]
    fs += bindValueForFS(wfn[attr])
    if (i < FS_ATTR_ORDER.length - 1) fs += ':'
  }
  return fs
}

/**
 * Convert a WFN attribute value to its formatted string representation.
 */
function bindValueForFS(v: AttributeValue): string {
  if (v === ANY) return '*'
  if (v === NA) return '-'
  return processQuotedChars(v)
}

/**
 * Inspect each character in WFN string s. In the FS binding:
 * - Period, hyphen, underscore pass through unescaped
 * - All other quoted non-alphanumerics retain their escaping
 * - Unquoted characters pass through as-is
 */
function processQuotedChars(s: string): string {
  let result = ''
  let idx = 0
  while (idx < s.length) {
    const c = s[idx]
    if (c !== '\\') {
      // unquoted character passes through
      result += c
      idx++
    } else {
      // escaped character
      if (idx + 1 >= s.length) {
        throw new Error('Invalid WFN value: trailing backslash')
      }
      const nextchr = s[idx + 1]
      if (nextchr === '.' || nextchr === '-' || nextchr === '_') {
        // period, hyphen and underscore pass through unharmed
        result += nextchr
        idx += 2
      } else {
        // all others retain escaping
        result += '\\' + nextchr
        idx += 2
      }
    }
  }
  return result
}

/**
 * Unbind a CPE 2.3 formatted string to a WFN.
 * Per NISTIR 7695 Section 6.2.3.
 */
export function unbindFormattedString(fs: string): WFN {
  const lower = fs.toLowerCase()
  if (!lower.startsWith('cpe:2.3:')) {
    throw new Error(`Invalid formatted string: must start with "cpe:2.3:"`)
  }

  // Reject null bytes and control characters (except printable ASCII)
  if (/[\x00-\x1f\x7f]/.test(lower)) {
    throw new Error('Invalid formatted string: contains control characters')
  }

  // Split off the "cpe:2.3:" prefix, then split remaining by ":"
  // CPE 2.3 spec requires exactly 11 components, but real-world CPEs are
  // often truncated. Pad missing trailing fields with "*" (ANY).
  const components = splitFormattedString(lower.substring(8))
  if (components.length < 1 || components.length > 11) {
    throw new Error(
      `Invalid formatted string: expected 1-11 components after "cpe:2.3:", got ${components.length}`
    )
  }
  while (components.length < 11) {
    components.push('*')
  }

  const wfn = createWFN()
  const attrs = FS_ATTR_ORDER
  for (let i = 0; i < 11; i++) {
    ;(wfn as unknown as Record<string, AttributeValue>)[attrs[i]] = unbindValueForFS(components[i])
  }
  return wfn
}

/**
 * Split the component portion of a formatted string by unescaped colons.
 */
function splitFormattedString(s: string): string[] {
  const result: string[] = []
  let current = ''
  let i = 0
  while (i < s.length) {
    if (s[i] === '\\' && i + 1 < s.length) {
      current += s[i] + s[i + 1]
      i += 2
    } else if (s[i] === ':') {
      result.push(current)
      current = ''
      i++
    } else {
      current += s[i]
      i++
    }
  }
  result.push(current)
  return result
}

/**
 * Convert a formatted string component value to a WFN attribute value.
 */
function unbindValueForFS(s: string): AttributeValue {
  if (s === '*') return ANY
  if (s === '-') return NA

  // Convert to WFN internal form: add quoting as needed
  return addQuoting(s)
}

/**
 * Add quoting to convert a formatted string value to WFN internal form.
 * In the FS binding, unescaped non-alphanumeric characters (except
 * wildcards * and ?) need to be quoted with backslash in the WFN.
 * Characters that are already escaped stay escaped.
 */
function addQuoting(s: string): string {
  let result = ''
  let idx = 0
  while (idx < s.length) {
    const c = s[idx]
    if (c === '\\') {
      // already escaped - keep it
      if (idx + 1 >= s.length) {
        throw new Error('Invalid WFN value: trailing backslash')
      }
      result += c + s[idx + 1]
      idx += 2
    } else if (c === '*' || c === '?') {
      // unquoted special characters stay unquoted in WFN
      result += c
      idx++
    } else if (/^[A-Za-z0-9_]$/.test(c)) {
      // alphanumerics and underscore pass through
      result += c
      idx++
    } else {
      // non-alphanumeric characters need quoting in WFN
      result += '\\' + c
      idx++
    }
  }
  return result
}
