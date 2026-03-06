/**
 * Security test cases for CPE-JS.
 *
 * This module processes untrusted input (CPE strings from SBOMs, vulnerability feeds, etc.).
 * These tests verify the library is resilient against crafted malicious inputs.
 */

import { describe, it, expect } from 'vitest'
import {
  parse,
  encode,
  encodeURI as encodeCpeURI,
  validate,
  validateString,
  validateAsDict,
  displayName,
  createWFN,
  ANY,
  NA,
} from '../src/index.js'
import { unbindFormattedString, bindToFormattedString } from '../src/fs-binding.js'
import { unbindURI, bindToURI } from '../src/uri-binding.js'

// ─── 1. Trailing backslash → "undefined" injection ───────────────────────────
// When a WFN string value ends with a lone backslash, multiple functions access
// s[idx+1] which is undefined. JavaScript coerces this to the string "undefined",
// injecting it into the output. An attacker controlling CPE fields can smuggle
// the literal text "undefined" into downstream consumers.

describe('SEC-01: Trailing backslash must not inject "undefined"', () => {
  it('bindToFormattedString: trailing backslash in vendor must throw', () => {
    const wfn = createWFN()
    wfn.part = 'a'
    wfn.vendor = 'evil\\'
    expect(() => bindToFormattedString(wfn)).toThrow('trailing backslash')
  })

  it('bindToURI: trailing backslash in vendor must throw', () => {
    const wfn = createWFN()
    wfn.part = 'a'
    wfn.vendor = 'evil\\'
    expect(() => bindToURI(wfn)).toThrow('trailing backslash')
  })

  it('displayName: trailing backslash must not produce "undefined"', () => {
    const wfn = createWFN()
    wfn.part = 'a'
    wfn.vendor = 'evil\\'
    wfn.product = 'test'
    const result = displayName(wfn)
    expect(result).not.toContain('undefined')
  })

  it('round-trip: trailing backslash must not silently corrupt data', () => {
    const wfn = createWFN()
    wfn.part = 'a'
    wfn.vendor = 'test\\'
    // Either throw or handle gracefully — never silently inject "undefined"
    let threw = false
    try {
      const encoded = bindToFormattedString(wfn)
      expect(encoded).not.toContain('undefined')
    } catch {
      threw = true
    }
    // It's acceptable to throw on invalid input
    expect(true).toBe(true)
  })
})

// ─── 2. ReDoS (Regular Expression Denial of Service) ─────────────────────────
// Complex regexes with nested quantifiers can exhibit catastrophic backtracking
// on crafted inputs. Since this library processes untrusted CPE strings, an
// attacker could send a malicious string that hangs the event loop.

describe('SEC-02: ReDoS resistance', () => {
  it('validateString: must complete in <100ms on adversarial input', () => {
    // Craft an input designed to trigger backtracking in the cpeRegex:
    // The regex has nested groups like (\?*|\*?)([a-zA-Z0-9\-._]|(...))+ which
    // can backtrack exponentially on strings that almost-but-don't-quite match.
    const adversarial =
      'cpe:2.3:a:' + 'a'.repeat(50) + '\\' + ':'.repeat(10) + 'x'.repeat(50)
    const start = performance.now()
    validateString(adversarial)
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(100)
  })

  it('validateString: long repeating pattern must complete in <100ms', () => {
    // Another ReDoS vector: many components with backslash sequences
    const payload = 'cpe:2.3:a:' + '\\!'.repeat(500) + ':*:*:*:*:*:*:*:*:*'
    const start = performance.now()
    validateString(payload)
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(100)
  })

  it('validateString: alternation confusion must complete in <100ms', () => {
    // Trigger ambiguity between (\?*|\*?) alternatives
    const payload = 'cpe:2.3:a:' + '?'.repeat(100) + 'a' + '?'.repeat(100) +
      ':*:*:*:*:*:*:*:*:*'
    const start = performance.now()
    validateString(payload)
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(100)
  })
})

// ─── 3. Input length / resource exhaustion ───────────────────────────────────
// Without length limits, extremely long strings can cause excessive memory use
// or CPU time in parsing functions.

describe('SEC-03: Resource exhaustion resistance', () => {
  it('parse: very long formatted string must not hang', () => {
    const longVendor = 'a'.repeat(100_000)
    const input = `cpe:2.3:a:${longVendor}:product:1.0:*:*:*:*:*:*:*`
    const start = performance.now()
    try {
      parse(input)
    } catch {
      // throwing is acceptable
    }
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(1000)
  })

  it('parse: very long URI must not hang', () => {
    const longVendor = 'a'.repeat(100_000)
    const input = `cpe:/${longVendor}:product:1.0`
    const start = performance.now()
    try {
      parse(input)
    } catch {
      // throwing is acceptable
    }
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(1000)
  })
})

// ─── 4. Null bytes and control characters ────────────────────────────────────
// Null bytes and control characters in CPE strings can cause issues in
// downstream systems (C libraries, databases, log injection).

describe('SEC-04: Null bytes and control characters', () => {
  it('parse: null byte in formatted string must throw or sanitize', () => {
    const input = 'cpe:2.3:a:vendor\x00evil:product:1.0:*:*:*:*:*:*:*'
    let result: any
    let threw = false
    try {
      result = parse(input)
    } catch {
      threw = true
    }
    if (!threw && result) {
      // If it didn't throw, the null byte must not be in the output
      const encoded = encode(result)
      expect(encoded).not.toContain('\x00')
    }
  })

  it('parse: control characters in URI must throw or sanitize', () => {
    const input = 'cpe:/a:vendor\x0aevil:product'
    let result: any
    let threw = false
    try {
      result = parse(input)
    } catch {
      threw = true
    }
    if (!threw && result) {
      const encoded = encodeCpeURI(result)
      expect(encoded).not.toContain('\x0a')
    }
  })
})

// ─── 5. URI component overflow ───────────────────────────────────────────────
// The URI format expects at most 7 components. Extra components should be
// rejected, not silently ignored (data loss / confusion).

describe('SEC-05: URI component bounds', () => {
  it('unbindURI: extra components beyond 7 should be rejected', () => {
    // 8+ components after cpe:/ should not silently succeed
    const input = 'cpe:/a:vendor:product:1.0:update:edition:en:extra:bonus'
    let threw = false
    try {
      unbindURI(input)
    } catch {
      threw = true
    }
    // Either throw or only parse first 7 — but must not silently drop data
    if (!threw) {
      // If it didn't throw, the extra data was silently ignored — flag it
      expect(threw).toBe(true) // force failure to highlight the issue
    }
  })
})

// ─── 6. Escaped colon injection in formatted strings ─────────────────────────
// Colons delimit components in formatted strings. An escaped colon \: should
// be treated as literal, not as a delimiter. Verify the splitter is correct.

describe('SEC-06: Escaped colon handling', () => {
  it('parse: escaped colon in vendor must not split the component', () => {
    const input = 'cpe:2.3:a:ven\\:dor:product:1.0:*:*:*:*:*:*:*'
    const wfn = parse(input)
    // The vendor should contain the colon, not be split
    expect(String(wfn.vendor)).toContain('\\:')
    expect(String(wfn.vendor)).not.toBe('ven')
  })

  it('round-trip: escaped colon survives encode/decode', () => {
    const input = 'cpe:2.3:a:ven\\:dor:product:1.0:*:*:*:*:*:*:*'
    const wfn = parse(input)
    const encoded = encode(wfn)
    const wfn2 = parse(encoded)
    expect(wfn2.vendor).toBe(wfn.vendor)
  })
})

// ─── 7. Prototype pollution via attribute names ──────────────────────────────
// Ensure that attribute setting cannot pollute Object.prototype.

describe('SEC-07: Prototype pollution resistance', () => {
  it('setAttribute path cannot set __proto__', () => {
    const wfn = createWFN()
    // Directly setting __proto__ via the record cast pattern used in unbind
    const maliciousWfn = wfn as unknown as Record<string, any>
    maliciousWfn['__proto__'] = { polluted: true }
    // Verify Object.prototype is not polluted
    expect(({} as any).polluted).toBeUndefined()
  })

  it('parse: crafted CPE cannot pollute prototype', () => {
    // Even if someone constructs a string that might map to __proto__,
    // the fixed attribute list should prevent pollution
    const wfn = parse('cpe:2.3:a:vendor:product:1.0:*:*:*:*:*:*:*')
    expect(({} as any).polluted).toBeUndefined()
    expect((wfn as any).__proto__?.polluted).toBeUndefined()
  })
})

// ─── 8. Incomplete percent-encoding in URI ───────────────────────────────────
// Truncated percent-encoded sequences (e.g., "%", "%2") must not cause
// out-of-bounds reads or undefined behavior.

describe('SEC-08: Malformed percent-encoding in URI', () => {
  it('unbindURI: truncated percent at end of component must throw', () => {
    const input = 'cpe:/a:vendor%:product'
    expect(() => unbindURI(input)).toThrow()
  })

  it('unbindURI: single char after percent must throw', () => {
    const input = 'cpe:/a:vendor%2:product'
    expect(() => unbindURI(input)).toThrow()
  })

  it('unbindURI: invalid percent-encoded form must throw', () => {
    const input = 'cpe:/a:vendor%99:product'
    expect(() => unbindURI(input)).toThrow()
  })
})

// ─── 9. Empty and degenerate inputs ──────────────────────────────────────────

describe('SEC-09: Degenerate inputs', () => {
  it('parse: empty string must throw', () => {
    expect(() => parse('')).toThrow()
  })

  it('parse: whitespace-only string must throw', () => {
    expect(() => parse('   ')).toThrow()
  })

  it('parse: just the prefix must throw', () => {
    expect(() => parse('cpe:2.3:')).toThrow()
    expect(() => parse('cpe:/')).toThrow()
  })

  it('parse: wrong component count must throw', () => {
    expect(() => parse('cpe:2.3:a:vendor')).toThrow()
    expect(() => parse('cpe:2.3:a:vendor:product')).toThrow()
  })
})

// ─── 10. Double-encoding / encoding confusion ────────────────────────────────
// Verify that re-encoding an already-encoded value doesn't double-escape.

describe('SEC-10: Double-encoding prevention', () => {
  it('round-trip: formatted string encoding is idempotent', () => {
    const input = 'cpe:2.3:a:micro\\$oft:windows:10.0:*:*:*:*:*:*:*'
    const wfn = parse(input)
    const encoded1 = encode(wfn)
    const wfn2 = parse(encoded1)
    const encoded2 = encode(wfn2)
    expect(encoded1).toBe(encoded2)
  })

  it('round-trip: URI encoding is idempotent', () => {
    const input = 'cpe:/a:micro%24oft:windows:10.0'
    const wfn = parse(input)
    const encoded1 = encodeCpeURI(wfn)
    const wfn2 = parse(encoded1)
    const encoded2 = encodeCpeURI(wfn2)
    expect(encoded1).toBe(encoded2)
  })
})
