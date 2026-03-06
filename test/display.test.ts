import { describe, it, expect } from 'vitest'
import { parse, partName, attributeLabel, displayName } from '../src/index.js'

describe('partName', () => {
  it('returns Application for part=a', () => {
    const wfn = parse('cpe:2.3:a:microsoft:ie:*:*:*:*:*:*:*:*')
    expect(partName(wfn)).toBe('Application')
  })

  it('returns Operating System for part=o', () => {
    const wfn = parse('cpe:2.3:o:linux:linux_kernel:*:*:*:*:*:*:*:*')
    expect(partName(wfn)).toBe('Operating System')
  })

  it('returns Hardware for part=h', () => {
    const wfn = parse('cpe:2.3:h:cisco:catalyst_6500:*:*:*:*:*:*:*:*')
    expect(partName(wfn)).toBe('Hardware')
  })
})

describe('attributeLabel', () => {
  it('returns human-readable labels', () => {
    expect(attributeLabel('swEdition')).toBe('Software Edition')
    expect(attributeLabel('targetSw')).toBe('Target Software')
    expect(attributeLabel('targetHw')).toBe('Target Hardware')
  })
})

describe('displayName', () => {
  it('creates a human-readable name', () => {
    const wfn = parse('cpe:2.3:a:microsoft:internet_explorer:8.0.6001:beta:*:*:*:*:*:*')
    const name = displayName(wfn)
    expect(name).toContain('Microsoft')
    expect(name).toContain('Internet Explorer')
    expect(name).toContain('8.0.6001')
    expect(name).toContain('Beta')
  })
})
