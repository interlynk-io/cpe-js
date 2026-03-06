# @interlynk/cpe-js

A spec-compliant [Common Platform Enumeration (CPE)](https://nvd.nist.gov/products/cpe) parser, encoder, validator, and matcher for JavaScript/TypeScript.

## Features

- **NIST spec-compliant** — implements NISTIR 7695 (Naming), NISTIR 7696 (Matching), and NISTIR 7697 (Dictionary) specifications
- **Dual format support** — parse and encode both CPE 2.3 formatted strings and CPE 2.2 URIs
- **Full matching engine** — all 17 attribute comparison cases from Table 6-2, wildcard support, four name comparison relations
- **Three validation tiers** — quick string check, full WFN validation, strict dictionary acceptance criteria
- **Zero runtime dependencies** — only `typescript`, `tsup`, and `vitest` as dev dependencies
- **Type-safe** — full TypeScript types with `ANY`/`NA` as Symbols (not strings)
- **Dual output** — ESM + CJS bundles with `.d.ts` declarations

## Installation

```bash
npm install @interlynk/cpe-js
```

## Quick Start

```typescript
import { parse, encode, validate, isSuperset, ANY, NA } from '@interlynk/cpe-js';

// Parse a CPE 2.3 formatted string
const wfn = parse('cpe:2.3:a:microsoft:internet_explorer:8.0.6001:beta:*:*:*:*:*:*');
console.log(wfn.part);    // "a"
console.log(wfn.vendor);  // "microsoft"
console.log(wfn.product); // "internet_explorer"
console.log(wfn.version); // "8\\.0\\.6001"
console.log(wfn.update);  // "beta"
console.log(wfn.edition); // Symbol(CPE_ANY)

// Parse a CPE 2.2 URI (auto-detected)
const wfn2 = parse('cpe:/a:microsoft:internet_explorer:8.0.6001:beta');

// Encode back to formatted string
console.log(encode(wfn));
// "cpe:2.3:a:microsoft:internet_explorer:8.0.6001:beta:*:*:*:*:*:*"

// Check if one CPE is a superset of another
const query = parse('cpe:2.3:a:microsoft:internet_explorer:8.*:*:*:*:*:*:*:*');
const target = parse('cpe:2.3:a:microsoft:internet_explorer:8.0.6001:-:-:en\\-us:*:*:*:*');
console.log(isSuperset(query, target)); // true
```

## Use Cases

### Parse CPEs from vulnerability feeds

```typescript
import { parse, partName, displayName } from '@interlynk/cpe-js';

const cpe = parse(nvdEntry.cpe23Uri);
console.log(partName(cpe));    // "Application"
console.log(displayName(cpe)); // "Microsoft Internet Explorer 8.0.6001 Beta"
```

### Validate user input

```typescript
import { parse, validate, validateString } from '@interlynk/cpe-js';

// Quick string-level validation (no full parse)
const errors = validateString(userInput);
if (errors.length > 0) {
  return { valid: false, errors: errors.map(e => e.message) };
}

// Full WFN validation after parsing
const wfn = parse(userInput);
const wfnErrors = validate(wfn);
// Returns per-attribute errors: [{ attribute: "language", value: "xyz", message: "..." }]
```

### Check dictionary acceptance criteria

```typescript
import { parse, validateAsDict } from '@interlynk/cpe-js';

// Stricter validation: part, vendor, product must not be ANY or NA; no wildcards
const wfn = parse('cpe:2.3:a:microsoft:internet_explorer:8.0.6001:beta:-:en:*:*:*:*');
const errors = validateAsDict(wfn);
// [] (valid dictionary entry)
```

### Match CPEs against vulnerability advisories

```typescript
import { parse, isSuperset, isSubset, isEqual, matchesAny, compare, Relation } from '@interlynk/cpe-js';

// Does this advisory apply to this product?
const advisory = parse('cpe:2.3:a:apache:log4j:2.*:*:*:*:*:*:*:*');
const installed = parse('cpe:2.3:a:apache:log4j:2.14.1:*:*:*:*:*:*:*');
console.log(isSuperset(advisory, installed)); // true — advisory covers this version

// Full relation
console.log(compare(advisory, installed)); // Relation.SUPERSET

// Check against a list of known vulnerable CPEs
const vulnerableCpes = [
  parse('cpe:2.3:a:apache:log4j:2.14.1:*:*:*:*:*:*:*'),
  parse('cpe:2.3:a:apache:log4j:2.15.0:*:*:*:*:*:*:*'),
];
console.log(matchesAny(advisory, vulnerableCpes)); // true
```

### Build CPEs programmatically

```typescript
import { fromParts, setAttribute, encode, val, NA, createWFN } from '@interlynk/cpe-js';

// Quick: from the three core fields
const wfn = fromParts('a', 'apache', 'log4j');
console.log(encode(wfn));
// "cpe:2.3:a:apache:log4j:*:*:*:*:*:*:*:*"

// Set additional attributes (immutable — returns new WFN)
const specific = setAttribute(
  setAttribute(wfn, 'version', '2\\.14\\.1'),
  'update', NA
);
console.log(encode(specific));
// "cpe:2.3:a:apache:log4j:2.14.1:-:*:*:*:*:*:*"

// Using val() for convenient ANY/NA conversion
const wfn2 = createWFN();
wfn2.part = 'o';
wfn2.vendor = 'microsoft';
wfn2.product = 'windows_10';
wfn2.version = val('1903');
wfn2.update = val('-');  // NA
```

### Convert between CPE formats

```typescript
import { parse, encode, encodeURI } from '@interlynk/cpe-js';

// URI -> Formatted String
const wfn = parse('cpe:/a:microsoft:internet_explorer:8.0.6001:beta');
console.log(encode(wfn));
// "cpe:2.3:a:microsoft:internet_explorer:8.0.6001:beta:*:*:*:*:*:*"

// Formatted String -> URI
const wfn2 = parse('cpe:2.3:a:hp:insight_diagnostics:7.4.0.1570:-:*:*:online:win2003:x64:*');
console.log(encodeURI(wfn2));
// "cpe:/a:hp:insight_diagnostics:7.4.0.1570:-:~~online~win2003~x64~"
```

## API Reference

### Parse & Encode

| Function | Description |
| -------- | ----------- |
| `parse(s: string): WFN` | Parse a CPE string (auto-detects 2.3 formatted string vs 2.2 URI). Throws on invalid input. |
| `encode(wfn: WFN): string` | Encode a WFN as a CPE 2.3 formatted string. |
| `encodeURI(wfn: WFN): string` | Encode a WFN as a CPE 2.2 URI. |
| `fromParts(part, vendor, product): WFN` | Create a WFN from the three core fields. All others default to ANY. |
| `val(s: string): AttributeValue` | Convert `"*"` to ANY, `"-"` to NA, or return the string. |
| `mustParse(s: string): WFN` | Alias for `parse()`. Use for known-good constants. |

### WFN Operations

| Function | Description |
| -------- | ----------- |
| `createWFN(): WFN` | Create a new WFN with all attributes set to ANY. |
| `getAttribute(wfn, attr): AttributeValue` | Get the value of a specific attribute. |
| `setAttribute(wfn, attr, value): WFN` | Return a new WFN with the attribute changed (immutable). |
| `attributeEntries(wfn): Generator` | Iterate over all 11 `[attribute, value]` pairs in canonical order. |

### Validation

| Function | Description |
| -------- | ----------- |
| `validate(wfn: WFN): ValidationError[]` | Validate a WFN is well-formed per NISTIR 7695. Returns `[]` if valid. |
| `validateAsDict(wfn: WFN): ValidationError[]` | Stricter: dictionary acceptance criteria per NISTIR 7697 (no ANY/NA for part/vendor/product, no wildcards). |
| `validateString(s: string): ValidationError[]` | Quick regex check of a CPE 2.3 string without full parsing. |

### Matching

| Function | Description |
| -------- | ----------- |
| `compare(source, target): Relation` | Return the overall name relation (SUPERSET, SUBSET, EQUAL, DISJOINT, or UNDEFINED). |
| `compareWFNs(source, target): Record<Attribute, Relation>` | Return per-attribute comparison results. |
| `isSuperset(source, target): boolean` | True if source is a superset of target (non-proper). |
| `isSubset(source, target): boolean` | True if source is a subset of target (non-proper). |
| `isEqual(source, target): boolean` | True if source and target are equal. |
| `isDisjoint(source, target): boolean` | True if source and target are disjoint. |
| `matchesAny(wfn, targets): boolean` | True if wfn is a superset of or equal to any target in the list. |

### Display

| Function | Description |
| -------- | ----------- |
| `displayName(wfn: WFN): string` | Human-readable name (e.g., "Microsoft Internet Explorer 8.0.6001 Beta"). |
| `partName(wfn: WFN): string` | "Application", "Operating System", or "Hardware". |
| `attributeLabel(attr: Attribute): string` | Human-readable label (e.g., "swEdition" -> "Software Edition"). |

### Types

| Type | Description |
| ---- | ----------- |
| `WFN` | Well-Formed CPE Name with 11 attributes. |
| `AttributeValue` | `string \| typeof ANY \| typeof NA` |
| `Attribute` | One of the 11 attribute names. |
| `Part` | `"a" \| "o" \| "h"` |
| `Relation` | Enum: `SUPERSET`, `SUBSET`, `EQUAL`, `DISJOINT`, `UNDEFINED` |
| `ValidationError` | `{ attribute, value, message }` |
| `ANY` | Symbol representing "any value" logical value. |
| `NA` | Symbol representing "not applicable" logical value. |

### Constants

| Constant | Description |
| -------- | ----------- |
| `ANY` | The logical value ANY (`Symbol.for('CPE_ANY')`). |
| `NA` | The logical value NA (`Symbol.for('CPE_NA')`). |
| `ATTRIBUTES` | Array of all 11 attribute names in canonical order. |

## Spec Compliance

Implements the following NIST specifications:

- **[NISTIR 7695](https://csrc.nist.gov/publications/detail/nistir/7695/final)** — CPE Naming Specification v2.3
  - WFN data model (Section 5)
  - Formatted string binding/unbinding (Section 6.2)
  - URI binding/unbinding (Section 6.1)
  - Packed edition component for extended attributes
- **[NISTIR 7696](https://csrc.nist.gov/publications/detail/nistir/7696/final)** — CPE Name Matching Specification v2.3
  - All 17 attribute comparison cases (Table 6-2)
  - Four name comparison relations (Table 6-4)
  - Wildcard matching (`*` multi-character, `?` single-character)
  - `compareStrings()` with proper escape character handling
- **[NISTIR 7697](https://csrc.nist.gov/publications/detail/nistir/7697/final)** — CPE Dictionary Specification v2.3
  - Dictionary acceptance criteria (no ANY/NA for part/vendor/product)
  - No wildcard requirement for dictionary entries

## Design Decisions

- **`ANY`/`NA` as Symbols** — prevents confusion between the logical value ANY and the literal string `"*"`. `Symbol.for()` ensures cross-realm equality.
- **WFN is the canonical form** — all operations (validate, match, compare) work on WFNs. Bound forms are just serialization.
- **Immutable `setAttribute()`** — returns a new WFN copy, aligning with React/functional patterns.
- **`parse()` auto-detects format** — no need for callers to pre-classify CPE strings.
- **Structured validation errors** — `ValidationError[]` with per-attribute details maps directly to UI form validation patterns.
- **Case normalization on parse** — the spec requires case-insensitive matching (NISTIR 7696 Section 7.3), so we normalize to lowercase at parse time.

## Development

### Setup

```bash
npm install
```

### Tests

```bash
npm test              # Run all 40 tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage
```

### Build

```bash
npm run build  # Outputs ESM + CJS to ./dist
```

### Type Check

```bash
npm run lint  # tsc --noEmit
```

### Playground

Interactive browser-based playground for exploring CPE parsing, encoding, validation, and matching. No build step required — Vite serves TypeScript directly.

```bash
npx vite --open playground.html --port 5555
```

Four tabs:

- **Parse** — enter a CPE string (2.3 or 2.2), see parsed WFN attributes and canonical form. Quick-try buttons for common CPEs.
- **Build** — select part type, fill in attributes, see the encoded CPE string live.
- **Validate** — green/red validation with per-attribute error details. Toggle between basic and dictionary-strict modes.
- **Match** — enter two CPE strings, see per-attribute comparison results and the overall name relation.

## License

Apache-2.0
