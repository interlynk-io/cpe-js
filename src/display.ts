/**
 * Display and formatting utilities for CPE names.
 */

import { ANY, NA, ATTRIBUTES, type Attribute, type AttributeValue, type WFN } from './types.js'
import { isLogical } from './utils.js'

const PART_NAMES: Record<string, string> = {
  a: 'Application',
  o: 'Operating System',
  h: 'Hardware',
}

const ATTRIBUTE_LABELS: Record<Attribute, string> = {
  part: 'Part',
  vendor: 'Vendor',
  product: 'Product',
  version: 'Version',
  update: 'Update',
  edition: 'Edition',
  language: 'Language',
  swEdition: 'Software Edition',
  targetSw: 'Target Software',
  targetHw: 'Target Hardware',
  other: 'Other',
}

/**
 * Return a human-readable part name.
 * "a" -> "Application", "o" -> "Operating System", "h" -> "Hardware"
 */
export function partName(wfn: WFN): string {
  if (isLogical(wfn.part)) return wfn.part === ANY ? 'Any' : 'N/A'
  return PART_NAMES[wfn.part] || wfn.part
}

/**
 * Return the human-readable label for an attribute.
 */
export function attributeLabel(attr: Attribute): string {
  return ATTRIBUTE_LABELS[attr]
}

/**
 * Return a human-readable display name for a WFN.
 * Strips quoting from values and joins with spaces.
 */
export function displayName(wfn: WFN): string {
  const parts: string[] = []

  // Add vendor
  const vendor = formatValue(wfn.vendor)
  if (vendor) parts.push(titleCase(vendor))

  // Add product
  const product = formatValue(wfn.product)
  if (product) parts.push(titleCase(product))

  // Add version
  const version = formatValue(wfn.version)
  if (version) parts.push(version)

  // Add update
  const update = formatValue(wfn.update)
  if (update) parts.push(titleCase(update))

  return parts.join(' ')
}

/**
 * Convert an attribute value to a display string.
 * Strips backslash quoting and converts underscores to spaces.
 */
function formatValue(v: AttributeValue): string | null {
  if (v === ANY || v === NA) return null
  // Strip quoting
  let result = ''
  for (let i = 0; i < (v as string).length; i++) {
    const c = (v as string)[i]
    if (c === '\\') {
      i++
      result += (v as string)[i]
    } else {
      result += c
    }
  }
  return result.replace(/_/g, ' ')
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}
