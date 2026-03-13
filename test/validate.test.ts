import { describe, it, expect } from 'vitest'
import { parse, validate, validateAsDict, validateString, ANY, NA, createWFN } from '../src/index.js'

describe('validate', () => {
  it('returns no errors for a valid WFN', () => {
    const wfn = parse('cpe:2.3:a:microsoft:internet_explorer:8.0.6001:beta:*:*:*:*:*:*')
    expect(validate(wfn)).toEqual([])
  })

  it('rejects invalid part', () => {
    const wfn = createWFN()
    wfn.part = 'x' as any
    const errors = validate(wfn)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0].attribute).toBe('part')
  })

  it('accepts language tags with hyphens (e.g. en-us)', () => {
    const wfn = parse('cpe:2.3:a:microsoft:office:2019:sp1:professional:en-us:*:windows:x64:*')
    expect(validate(wfn)).toEqual([])
  })

  it('allows logical values for all attributes', () => {
    const wfn = createWFN() // all ANY
    expect(validate(wfn)).toEqual([])
  })
})

describe('validateAsDict', () => {
  it('rejects ANY part', () => {
    const wfn = createWFN()
    const errors = validateAsDict(wfn)
    const partErrors = errors.filter((e) => e.attribute === 'part')
    expect(partErrors.length).toBeGreaterThan(0)
  })

  it('rejects ANY vendor', () => {
    const wfn = createWFN()
    wfn.part = 'a'
    const errors = validateAsDict(wfn)
    const vendorErrors = errors.filter((e) => e.attribute === 'vendor')
    expect(vendorErrors.length).toBeGreaterThan(0)
  })

  it('passes for a fully specified dictionary entry', () => {
    const wfn = parse('cpe:2.3:a:microsoft:internet_explorer:8.0.6001:beta:-:en:*:*:*:*')
    const errors = validateAsDict(wfn)
    expect(errors).toEqual([])
  })
})

describe('validateString', () => {
  it('validates a correct formatted string', () => {
    const errors = validateString('cpe:2.3:a:microsoft:internet_explorer:8.0.6001:beta:*:*:*:*:*:*')
    expect(errors).toEqual([])
  })

  it('rejects an obviously invalid string', () => {
    const errors = validateString('not-a-cpe')
    expect(errors.length).toBeGreaterThan(0)
  })
})
