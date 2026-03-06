// Types
export {
  ANY,
  NA,
  ATTRIBUTES,
  Relation,
  type LogicalValue,
  type AttributeValue,
  type Attribute,
  type Part,
  type WFN,
  type ValidationError,
} from './types.js'

// WFN operations
export { createWFN, getAttribute, setAttribute, attributeEntries } from './wfn.js'

// Parse & Encode
export { parse, encode, encodeURI, fromParts, val, mustParse } from './cpe.js'

// Bindings (low-level)
export { bindToFormattedString, unbindFormattedString } from './fs-binding.js'
export { bindToURI, unbindURI } from './uri-binding.js'

// Validation
export { validate, validateAsDict, validateString } from './validate.js'

// Matching
export {
  compare,
  compareWFNs,
  isDisjoint,
  isEqual,
  isSubset,
  isSuperset,
  matchesAny,
} from './match.js'

// Display
export { partName, attributeLabel, displayName } from './display.js'

// Utilities
export { isLogical, isString, containsWildcards } from './utils.js'
