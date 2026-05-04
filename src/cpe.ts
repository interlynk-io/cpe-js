/**
 * High-level CPE API. Provides parse(), encode(), and format auto-detection.
 */

import { ANY, NA, type AttributeValue, type Part, type WFN } from './types.js'
import { createWFN } from './wfn.js'
import { bindToFormattedString, unbindFormattedString, type UnbindOptions } from './fs-binding.js'
import { bindToURI, unbindURI } from './uri-binding.js'

/** Options for {@link parse} and {@link mustParse}. */
export type ParseOptions = UnbindOptions

/**
 * Parse a CPE string (auto-detects formatted string vs URI).
 *
 * By default, attribute values keep their original case. The `part`
 * attribute is always normalized to lowercase since it is enum-valued
 * ('a', 'o', 'h'). Pass `{ preserveCase: false }` for the legacy
 * lowercase-everything behavior. Matching is case-insensitive regardless
 * (see compareAttribute in match.ts).
 */
export function parse(s: string, opts: ParseOptions = {}): WFN {
  const trimmed = s.trim()
  if (trimmed.startsWith('cpe:2.3:')) {
    return unbindFormattedString(trimmed, opts)
  }
  if (trimmed.startsWith('cpe:/')) {
    return unbindURI(trimmed, opts)
  }
  throw new Error(`Unrecognized CPE format: "${trimmed}"`)
}

/**
 * Encode a WFN as a CPE 2.3 formatted string.
 */
export function encode(wfn: WFN): string {
  return bindToFormattedString(wfn)
}

/**
 * Encode a WFN as a CPE 2.2 URI.
 */
export function encodeURI(wfn: WFN): string {
  return bindToURI(wfn)
}

/**
 * Create a WFN from the three core fields. All others default to ANY.
 */
export function fromParts(part: Part, vendor: string, product: string): WFN {
  const wfn = createWFN()
  wfn.part = part
  wfn.vendor = vendor
  wfn.product = product
  return wfn
}

/**
 * Create an AttributeValue from a user-facing string.
 * "*" becomes ANY, "-" becomes NA, everything else is a string value.
 */
export function val(s: string): AttributeValue {
  if (s === '*') return ANY
  if (s === '-') return NA
  return s
}

/**
 * Like parse() but throws on error. Use for known-good compile-time constants.
 */
export function mustParse(s: string, opts: ParseOptions = {}): WFN {
  return parse(s, opts)
}
