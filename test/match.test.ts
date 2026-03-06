import { describe, it, expect } from 'vitest'
import {
  parse,
  compare,
  compareWFNs,
  isDisjoint,
  isEqual,
  isSubset,
  isSuperset,
  matchesAny,
  Relation,
  ANY,
  NA,
  createWFN,
} from '../src/index.js'

describe('attribute comparison (Table 6-2)', () => {
  it('ANY vs ANY = EQUAL (line 1)', () => {
    const s = createWFN() // all ANY
    const t = createWFN()
    expect(isEqual(s, t)).toBe(true)
  })

  it('ANY vs specific value = SUPERSET (line 3)', () => {
    const s = createWFN()
    s.part = 'a'
    const t = createWFN()
    t.part = 'a'
    t.vendor = 'microsoft'
    expect(compare(s, t)).toBe(Relation.SUPERSET)
  })

  it('specific vs ANY = SUBSET (line 13)', () => {
    const s = createWFN()
    s.part = 'a'
    s.vendor = 'microsoft'
    const t = createWFN()
    t.part = 'a'
    expect(compare(s, t)).toBe(Relation.SUBSET)
  })

  it('different strings = DISJOINT (line 10)', () => {
    const s = parse('cpe:2.3:a:microsoft:ie:*:*:*:*:*:*:*:*')
    const t = parse('cpe:2.3:a:adobe:reader:*:*:*:*:*:*:*:*')
    expect(isDisjoint(s, t)).toBe(true)
  })

  it('NA vs specific = DISJOINT (line 7)', () => {
    const s = createWFN()
    s.part = 'a'
    s.vendor = 'microsoft'
    s.product = 'ie'
    s.update = NA
    const t = createWFN()
    t.part = 'a'
    t.vendor = 'microsoft'
    t.product = 'ie'
    t.update = 'sp1'
    expect(isDisjoint(s, t)).toBe(true)
  })
})

describe('name comparison (Table 6-4)', () => {
  it('all equal -> EQUAL', () => {
    const s = parse('cpe:2.3:a:microsoft:ie:8.0:*:*:*:*:*:*:*')
    const t = parse('cpe:2.3:a:microsoft:ie:8.0:*:*:*:*:*:*:*')
    expect(compare(s, t)).toBe(Relation.EQUAL)
  })

  it('NISTIR 7696 intro example: superset check', () => {
    // Source: any version 8.* of IE
    const source = parse('cpe:2.3:a:microsoft:internet_explorer:8.*:*:*:*:*:*:*:*')
    // Target: specific version 8.0.6001
    const target = parse('cpe:2.3:a:microsoft:internet_explorer:8.0.6001:-:-:en\\-us:*:*:*:*')
    expect(isSuperset(source, target)).toBe(true)
  })
})

describe('matchesAny', () => {
  it('finds a match in a list', () => {
    const source = parse('cpe:2.3:o:microsoft:windows_2000:*:*:*:*:*:*:*:*')
    const targets = [
      parse('cpe:2.3:o:microsoft:windows_2000:*:sp3:pro:*:*:*:*:*'),
      parse('cpe:2.3:a:microsoft:ie:5.5:*:*:*:*:*:*:*'),
    ]
    expect(matchesAny(source, targets)).toBe(true)
  })

  it('returns false when no match', () => {
    const source = parse('cpe:2.3:a:adobe:reader:*:*:*:*:*:*:*:*')
    const targets = [
      parse('cpe:2.3:a:microsoft:ie:8.0:*:*:*:*:*:*:*'),
    ]
    expect(matchesAny(source, targets)).toBe(false)
  })
})
