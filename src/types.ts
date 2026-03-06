/**
 * The two CPE logical values per NISTIR 7695 Section 5.3.1.
 */
export const ANY = Symbol.for('CPE_ANY')
export const NA = Symbol.for('CPE_NA')

export type LogicalValue = typeof ANY | typeof NA

/**
 * An attribute value is either a logical value (ANY, NA) or a string.
 * Strings are stored in their WFN internal form (with backslash quoting).
 */
export type AttributeValue = LogicalValue | string

/** The 11 WFN attribute names in canonical order. */
export const ATTRIBUTES = [
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

export type Attribute = (typeof ATTRIBUTES)[number]

/** Part type: application, operating system, or hardware. */
export type Part = 'a' | 'o' | 'h'

/**
 * Well-Formed CPE Name. The canonical internal representation.
 * All 11 attributes default to ANY when unspecified.
 */
export interface WFN {
  part: AttributeValue
  vendor: AttributeValue
  product: AttributeValue
  version: AttributeValue
  update: AttributeValue
  edition: AttributeValue
  language: AttributeValue
  swEdition: AttributeValue
  targetSw: AttributeValue
  targetHw: AttributeValue
  other: AttributeValue
}

/** Set relations per NISTIR 7696 Table 6-1. */
export enum Relation {
  SUPERSET = 'SUPERSET',
  SUBSET = 'SUBSET',
  EQUAL = 'EQUAL',
  DISJOINT = 'DISJOINT',
  UNDEFINED = 'UNDEFINED',
}

/** Structured validation error. */
export interface ValidationError {
  attribute: Attribute | 'format'
  value: string
  message: string
}
