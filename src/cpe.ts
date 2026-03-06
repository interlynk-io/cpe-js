/**
 * High-level CPE API. Provides parse(), encode(), and format auto-detection.
 */

import { ANY, NA, type AttributeValue, type Part, type WFN } from './types.js'
import { createWFN } from './wfn.js'
import { bindToFormattedString, unbindFormattedString } from './fs-binding.js'
import { bindToURI, unbindURI } from './uri-binding.js'

/**
 * Parse a CPE string (auto-detects formatted string vs URI).
 */
export function parse(s: string): WFN {
  const trimmed = s.trim()
  if (trimmed.startsWith('cpe:2.3:')) {
    return unbindFormattedString(trimmed)
  }
  if (trimmed.startsWith('cpe:/')) {
    return unbindURI(trimmed)
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
export function mustParse(s: string): WFN {
  return parse(s)
}
