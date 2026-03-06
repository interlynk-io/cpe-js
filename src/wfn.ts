import { ANY, ATTRIBUTES, type Attribute, type AttributeValue, type WFN } from './types.js'

/**
 * Create a new WFN with all attributes set to ANY.
 */
export function createWFN(): WFN {
  return {
    part: ANY,
    vendor: ANY,
    product: ANY,
    version: ANY,
    update: ANY,
    edition: ANY,
    language: ANY,
    swEdition: ANY,
    targetSw: ANY,
    targetHw: ANY,
    other: ANY,
  }
}

/**
 * Get the value of an attribute from a WFN.
 */
export function getAttribute(wfn: WFN, attr: Attribute): AttributeValue {
  return wfn[attr]
}

/**
 * Return a new WFN with the specified attribute changed. WFNs are immutable.
 */
export function setAttribute(wfn: WFN, attr: Attribute, value: AttributeValue): WFN {
  return { ...wfn, [attr]: value }
}

/**
 * Iterate over all 11 attributes in canonical order.
 */
export function* attributeEntries(wfn: WFN): Generator<[Attribute, AttributeValue]> {
  for (const attr of ATTRIBUTES) {
    yield [attr, wfn[attr]]
  }
}
