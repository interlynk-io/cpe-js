/**
 * CPE validation per NISTIR 7695 Section 5 and NISTIR 7697 dictionary criteria.
 */

import { ANY, NA, ATTRIBUTES, type Attribute, type ValidationError, type WFN } from './types.js'
import { isLogical, isString, containsWildcards } from './utils.js'

/**
 * ABNF regex for a WFN attribute-value string (Figure 5-1).
 * Matches the internal WFN form with backslash-quoted non-alphanumerics.
 */
const AV_STRING_RE =
  /^(?:(?:\?+|\*)?(?:[A-Za-z0-9_]|\\[^\x00-\x1f])+(?:\?+|\*)?|\?+|\*)$/

/**
 * Language tag regex per RFC 5646 (simplified: 2-3 letter language, optional region).
 */
const LANGUAGE_RE = /^[a-zA-Z]{2,3}(-([a-zA-Z]{2}|[0-9]{3}))?$/

/**
 * Validate a WFN is well-formed per NISTIR 7695 Section 5.
 * Returns empty array if valid.
 */
export function validate(wfn: WFN): ValidationError[] {
  const errors: ValidationError[] = []

  for (const attr of ATTRIBUTES) {
    const v = wfn[attr]
    if (isLogical(v)) continue

    // Part must be "a", "o", or "h"
    if (attr === 'part') {
      if (v !== 'a' && v !== 'o' && v !== 'h') {
        errors.push({
          attribute: attr,
          value: v,
          message: 'Part must be "a" (application), "o" (operating system), or "h" (hardware)',
        })
      }
      continue
    }

    // Language has special validation
    if (attr === 'language') {
      if (!LANGUAGE_RE.test(v)) {
        errors.push({
          attribute: attr,
          value: v,
          message: 'Language must be a valid RFC 5646 language tag',
        })
      }
      continue
    }

    // All other string attributes must match the avstring ABNF
    if (!AV_STRING_RE.test(v)) {
      errors.push({
        attribute: attr,
        value: v,
        message: `Invalid attribute-value string`,
      })
    }
  }

  return errors
}

/**
 * Validate a WFN against CPE Dictionary acceptance criteria (NISTIR 7697).
 * Stricter than validate(): part, vendor, product must not be ANY or NA.
 */
export function validateAsDict(wfn: WFN): ValidationError[] {
  const errors = validate(wfn)

  const requiredAttrs: Attribute[] = ['part', 'vendor', 'product']
  for (const attr of requiredAttrs) {
    const v = wfn[attr]
    if (v === ANY) {
      errors.push({
        attribute: attr,
        value: '*',
        message: `${attr} must not be ANY for dictionary entries`,
      })
    }
    if (v === NA) {
      errors.push({
        attribute: attr,
        value: '-',
        message: `${attr} must not be NA for dictionary entries`,
      })
    }
  }

  // Dictionary entries should not contain wildcards
  for (const attr of ATTRIBUTES) {
    const v = wfn[attr]
    if (isString(v) && containsWildcards(v)) {
      errors.push({
        attribute: attr,
        value: v,
        message: `${attr} must not contain wildcards for dictionary entries`,
      })
    }
  }

  return errors
}

/**
 * Quick validation of a CPE 2.3 formatted string without full parsing.
 * Uses the official ABNF regex from NISTIR 7695 Figure 6-3.
 */
export function validateString(s: string): ValidationError[] {
  const errors: ValidationError[] = []

  // Basic format check
  const cpeRegex =
    /^cpe:2\.3:[aho*\-](:(((\?*|\*?)([a-zA-Z0-9\-._]|(\\[\\*?!"#$%&'()+,/:;<=>@[\]^`{|}~]))+(\?*|\*?))|[*\-])){5}(:(([a-zA-Z]{2,3}(-([a-zA-Z]{2}|[0-9]{3}))?)|[*\-]))(:((\?*|\*?)([a-zA-Z0-9\-._]|(\\[\\*?!"#$%&'()+,/:;<=>@[\]^`{|}~]))+(\?*|\*?)|[*\-])){4}$/

  if (!cpeRegex.test(s)) {
    errors.push({
      attribute: 'format',
      value: s,
      message: 'Invalid CPE 2.3 formatted string',
    })
  }

  return errors
}
