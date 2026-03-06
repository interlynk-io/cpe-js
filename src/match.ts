/**
 * CPE Name Matching per NISTIR 7696.
 * Implements attribute comparison (Table 6-2), name comparison (Table 6-4),
 * and wildcard matching (Section 6.3).
 */

import { ANY, NA, ATTRIBUTES, type Attribute, type AttributeValue, type WFN, Relation } from './types.js'
import { isString, containsWildcards, countEscapeCharacters, isEvenWildcards } from './utils.js'

/**
 * Compare each attribute of source WFN to target WFN.
 * Returns a map of attribute -> Relation.
 * Per NISTIR 7696 Section 7.2 (Compare_WFNs).
 */
export function compareWFNs(source: WFN, target: WFN): Record<Attribute, Relation> {
  const result = {} as Record<Attribute, Relation>
  for (const attr of ATTRIBUTES) {
    result[attr] = compareAttribute(source[attr], target[attr])
  }
  return result
}

/**
 * Compare two WFNs and return the overall name relation.
 */
export function compare(source: WFN, target: WFN): Relation {
  const results = compareWFNs(source, target)
  const values = Object.values(results)

  // Table 6-4, Row 1: any DISJOINT -> DISJOINT
  if (values.some((r) => r === Relation.DISJOINT)) return Relation.DISJOINT

  // Row 2: all EQUAL -> EQUAL
  if (values.every((r) => r === Relation.EQUAL)) return Relation.EQUAL

  // Row 3: all SUBSET or EQUAL -> SUBSET
  if (values.every((r) => r === Relation.SUBSET || r === Relation.EQUAL)) return Relation.SUBSET

  // Row 4: all SUPERSET or EQUAL -> SUPERSET
  if (values.every((r) => r === Relation.SUPERSET || r === Relation.EQUAL)) return Relation.SUPERSET

  // Mixed results with UNDEFINED
  return Relation.UNDEFINED
}

/**
 * Returns true if source and target are DISJOINT.
 * Per NISTIR 7696 Section 7.2 (CPE_DISJOINT).
 */
export function isDisjoint(source: WFN, target: WFN): boolean {
  const results = compareWFNs(source, target)
  return Object.values(results).some((r) => r === Relation.DISJOINT)
}

/**
 * Returns true if source and target are EQUAL.
 * Per NISTIR 7696 Section 7.2 (CPE_EQUAL).
 */
export function isEqual(source: WFN, target: WFN): boolean {
  const results = compareWFNs(source, target)
  return Object.values(results).every((r) => r === Relation.EQUAL)
}

/**
 * Returns true if source is a SUBSET of target (non-proper).
 * Per NISTIR 7696 Section 7.2 (CPE_SUBSET).
 */
export function isSubset(source: WFN, target: WFN): boolean {
  const results = compareWFNs(source, target)
  return Object.values(results).every((r) => r === Relation.SUBSET || r === Relation.EQUAL)
}

/**
 * Returns true if source is a SUPERSET of target (non-proper).
 * Per NISTIR 7696 Section 7.2 (CPE_SUPERSET).
 */
export function isSuperset(source: WFN, target: WFN): boolean {
  const results = compareWFNs(source, target)
  return Object.values(results).every((r) => r === Relation.SUPERSET || r === Relation.EQUAL)
}

/**
 * Returns true if wfn matches any of the targets (is superset of or equal to at least one).
 */
export function matchesAny(wfn: WFN, targets: WFN[]): boolean {
  return targets.some((t) => isSuperset(wfn, t) || isEqual(wfn, t))
}

/**
 * Compare two attribute values per NISTIR 7696 Table 6-2 and Section 7.3.
 */
function compareAttribute(source: AttributeValue, target: AttributeValue): Relation {
  // Normalize strings to lowercase
  if (isString(source)) source = source.toLowerCase()
  if (isString(target)) target = target.toLowerCase()

  // Wildcards in target yield UNDEFINED (lines 4, 8, 11, 17)
  if (isString(target) && containsWildcards(target)) {
    return Relation.UNDEFINED
  }

  // Line 1: ANY == ANY; Line 9: i == i; Line 6: NA == NA
  if (source === target) return Relation.EQUAL

  // Lines 2, 3: source=ANY -> SUPERSET
  if (source === ANY) return Relation.SUPERSET

  // Lines 5, 13, 15: target=ANY -> SUBSET
  if (target === ANY) return Relation.SUBSET

  // Lines 7, 12, 16: either is NA (and they're not equal) -> DISJOINT
  if (source === NA || target === NA) return Relation.DISJOINT

  // Both are strings at this point
  // Line 10: i != k -> DISJOINT (no wildcards in source)
  // Line 14: m + wildcards vs m2 -> SUPERSET or DISJOINT
  if (isString(source) && isString(target)) {
    if (!containsWildcards(source)) {
      // Simple string comparison (line 9 already handled equality)
      return Relation.DISJOINT // line 10
    }
    // Source has wildcards - do wildcard comparison (line 14)
    return compareStrings(source, target)
  }

  return Relation.UNDEFINED
}

/**
 * Compare source string (with wildcards) to target string.
 * Per NISTIR 7696 Section 7.3 (compareStrings).
 * Returns SUPERSET if source pattern matches target, DISJOINT otherwise.
 */
function compareStrings(source: string, target: string): Relation {
  let start = 0
  let end = source.length
  let begins = 0
  let ends = 0

  // Handle leading wildcards
  if (source[0] === '*') {
    start = 1
    begins = -1
  } else {
    while (start < source.length && source[start] === '?' && isEvenWildcards(source, start)) {
      start++
      begins++
    }
  }

  // Handle trailing wildcards
  if (source[end - 1] === '*' && isEvenWildcards(source, end - 1)) {
    end = end - 1
    ends = -1
  } else {
    while (end > 0 && source[end - 1] === '?' && isEvenWildcards(source, end - 1)) {
      end--
      ends++
    }
  }

  source = source.substring(start, end)

  let index = -1
  let leftover = target.length

  while (leftover > 0) {
    index = target.indexOf(source, index + 1)
    if (index === -1) break

    const escapes = countEscapeCharacters(target, 0, index)

    if (
      index > 0 &&
      begins !== -1 &&
      begins < index - escapes
    ) {
      break
    }

    const trailingEscapes = countEscapeCharacters(target, index + 1, target.length)
    leftover = target.length - index - trailingEscapes - source.length

    if (leftover > 0 && ends !== -1 && leftover > ends) {
      continue
    }

    return Relation.SUPERSET
  }

  return Relation.DISJOINT
}
