/**
 * URI Binding per NISTIR 7695 Section 6.1.
 * Handles cpe:/part:vendor:product:version:update:edition:language
 * with extended attributes packed into the edition component.
 */

import { ANY, NA, type AttributeValue, type WFN } from './types.js'
import { createWFN } from './wfn.js'
import { isAlphaNum } from './utils.js'

/**
 * Percent-encoding map for quoted non-alphanumeric characters (Table 6-1).
 */
const PCT_ENCODE_MAP: Record<string, string> = {
  '!': '%21', '"': '%22', '#': '%23', $: '%24', '%': '%25',
  '&': '%26', "'": '%27', '(': '%28', ')': '%29', '*': '%2a',
  '+': '%2b', ',': '%2c', '/': '%2f', ':': '%3a', ';': '%3b',
  '<': '%3c', '=': '%3d', '>': '%3e', '?': '%3f', '@': '%40',
  '[': '%5b', '\\': '%5c', ']': '%5d', '^': '%5e', '`': '%60',
  '{': '%7b', '|': '%7c', '}': '%7d', '~': '%7e',
}

// Inverse mapping: percent-encoded -> WFN quoted form
const PCT_DECODE_MAP: Record<string, string> = {}
for (const [char, pct] of Object.entries(PCT_ENCODE_MAP)) {
  PCT_DECODE_MAP[pct] = '\\' + char
}
// Special cases: hyphen and period are bound without encoding
PCT_ENCODE_MAP['-'] = '-'
PCT_ENCODE_MAP['.'] = '.'

/**
 * Bind a WFN to a CPE 2.2 URI.
 * Per NISTIR 7695 Section 6.1.2.
 */
export function bindToURI(wfn: WFN): string {
  let uri = 'cpe:/'
  const attrs = ['part', 'vendor', 'product', 'version', 'update', 'edition', 'language'] as const

  for (const a of attrs) {
    let v: string
    if (a === 'edition') {
      const ed = bindValueForURI(wfn.edition)
      const swEd = bindValueForURI(wfn.swEdition)
      const tSw = bindValueForURI(wfn.targetSw)
      const tHw = bindValueForURI(wfn.targetHw)
      const oth = bindValueForURI(wfn.other)
      v = pack(ed, swEd, tSw, tHw, oth)
    } else {
      v = bindValueForURI(wfn[a])
    }
    uri += v + ':'
  }

  // Trim trailing colons
  return uri.replace(/:+$/, '')
}

function bindValueForURI(v: AttributeValue): string {
  if (v === ANY) return ''
  if (v === NA) return '-'
  return transformForURI(v as string)
}

/**
 * Transform a WFN string value for URI binding.
 * - Alphanumerics pass through
 * - Quoted non-alphanumerics get percent-encoded
 * - Unquoted ? maps to %01, unquoted * maps to %02
 */
function transformForURI(s: string): string {
  let result = ''
  let idx = 0
  while (idx < s.length) {
    const c = s[idx]
    if (isAlphaNum(c)) {
      result += c
      idx++
      continue
    }
    if (c === '\\') {
      idx++
      if (idx >= s.length) {
        throw new Error('Invalid WFN value: trailing backslash')
      }
      const nxtChar = s[idx]
      const encoded = PCT_ENCODE_MAP[nxtChar]
      result += encoded !== undefined ? encoded : '%' + nxtChar.charCodeAt(0).toString(16)
      idx++
      continue
    }
    if (c === '?') {
      result += '%01'
    } else if (c === '*') {
      result += '%02'
    }
    idx++
  }
  return result
}

/**
 * Pack five values into the edition component of a URI.
 */
function pack(ed: string, swEd: string, tSw: string, tHw: string, oth: string): string {
  if (swEd === '' && tSw === '' && tHw === '' && oth === '') {
    return ed
  }
  return '~' + ed + '~' + swEd + '~' + tSw + '~' + tHw + '~' + oth
}

/**
 * Unbind a CPE 2.2 URI to a WFN.
 * Per NISTIR 7695 Section 6.1.3.
 */
export function unbindURI(uri: string): WFN {
  const lower = uri.toLowerCase()
  if (!lower.startsWith('cpe:/')) {
    throw new Error('Invalid URI: must start with "cpe:/"')
  }

  const result = createWFN()
  // Split URI into components (the part after "cpe:/")
  const body = uri.substring(5)
  const components = body.split(':')

  // Pad to 7 components
  while (components.length < 7) {
    components.push('')
  }

  const attrs = ['part', 'vendor', 'product', 'version', 'update'] as const

  for (let i = 0; i < 5; i++) {
    ;(result as unknown as Record<string, AttributeValue>)[attrs[i]] = decodeURIComponent_CPE(components[i])
  }

  // Component 6: edition (may be packed)
  const edComponent = components[5] || ''
  if (edComponent === '' || edComponent === '-' || !edComponent.startsWith('~')) {
    result.edition = decodeURIComponent_CPE(edComponent)
  } else {
    unpack(edComponent, result)
  }

  // Component 7: language
  result.language = decodeURIComponent_CPE(components[6] || '')

  return result
}

/**
 * Decode a URI component to a WFN attribute value.
 */
function decodeURIComponent_CPE(s: string): AttributeValue {
  if (s === '') return ANY
  if (s === '-') return NA

  // Lowercase and decode
  s = s.toLowerCase()
  let result = ''
  let idx = 0
  let embedded = false

  while (idx < s.length) {
    const c = s[idx]

    // Dot, hyphen, tilde: decode with quoting
    if (c === '.' || c === '-' || c === '~') {
      result += '\\' + c
      idx++
      embedded = true
      continue
    }

    if (c !== '%') {
      result += c
      idx++
      embedded = true
      continue
    }

    // Percent-encoded sequences
    const form = s.substring(idx, idx + 3)
    if (form === '%01') {
      // Decode %01 to unquoted ? (only valid at begin/end)
      result += '?'
      idx += 3
      continue
    }
    if (form === '%02') {
      // Decode %02 to unquoted * (only valid at begin/end)
      result += '*'
      idx += 3
      continue
    }

    const decoded = PCT_DECODE_MAP[form]
    if (decoded) {
      result += decoded
      idx += 3
      embedded = true
    } else {
      throw new Error(`Invalid percent-encoded form: ${form}`)
    }
  }

  return result
}

/**
 * Unpack a packed edition component into individual WFN attributes.
 */
function unpack(s: string, wfn: WFN): void {
  // Format: ~ed~sw_ed~t_sw~t_hw~oth
  // Skip leading ~
  const parts = s.substring(1).split('~')
  while (parts.length < 5) parts.push('')

  wfn.edition = decodeURIComponent_CPE(parts[0])
  wfn.swEdition = decodeURIComponent_CPE(parts[1])
  wfn.targetSw = decodeURIComponent_CPE(parts[2])
  wfn.targetHw = decodeURIComponent_CPE(parts[3])
  wfn.other = decodeURIComponent_CPE(parts[4])
}
