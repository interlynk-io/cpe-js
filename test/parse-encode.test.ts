import { describe, it, expect } from 'vitest'
import { parse, encode, encodeURI, fromParts, val, ANY, NA, createWFN } from '../src/index.js'

describe('parse formatted string', () => {
  it('parses a basic CPE 2.3 string', () => {
    const wfn = parse('cpe:2.3:a:microsoft:internet_explorer:8.0.6001:beta:*:*:*:*:*:*')
    expect(wfn.part).toBe('a')
    expect(wfn.vendor).toBe('microsoft')
    expect(wfn.product).toBe('internet_explorer')
    expect(wfn.version).toBe('8\\.0\\.6001')
    expect(wfn.update).toBe('beta')
    expect(wfn.edition).toBe(ANY)
    expect(wfn.language).toBe(ANY)
  })

  it('parses NA values', () => {
    const wfn = parse('cpe:2.3:a:microsoft:internet_explorer:8.0.6001:beta:-:*:*:*:*:*')
    expect(wfn.edition).toBe(NA)
  })

  it('parses wildcards in version', () => {
    const wfn = parse('cpe:2.3:a:microsoft:internet_explorer:8.*:sp?:*:*:*:*:*:*')
    expect(wfn.version).toBe('8\\.*')
    expect(wfn.update).toBe('sp?')
  })

  it('preserves escaped special characters', () => {
    const wfn = parse('cpe:2.3:a:foo\\\\bar:big\\$money_2010:*:*:*:*:*:*:*:*')
    expect(wfn.vendor).toBe('foo\\\\bar')
    expect(wfn.product).toBe('big\\$money_2010')
  })

  it('is case-insensitive', () => {
    const wfn = parse('cpe:2.3:A:Microsoft:Internet_Explorer:8.0:*:*:*:*:*:*:*')
    // part should be lowercased, but we store raw from the FS binding
    expect(wfn.part).toBe('a')
  })

  it('pads missing trailing fields with ANY', () => {
    const wfn = parse('cpe:2.3:a:lua:lua')
    expect(wfn.part).toBe('a')
    expect(wfn.vendor).toBe('lua')
    expect(wfn.product).toBe('lua')
    expect(wfn.version).toBe(ANY)
    expect(wfn.update).toBe(ANY)
    expect(wfn.edition).toBe(ANY)
    expect(wfn.language).toBe(ANY)
    expect(wfn.swEdition).toBe(ANY)
    expect(wfn.targetSw).toBe(ANY)
    expect(wfn.targetHw).toBe(ANY)
    expect(wfn.other).toBe(ANY)
  })

  it('pads partial CPE with version and update', () => {
    const wfn = parse('cpe:2.3:a:xmlsoft:libxml2:2.9.2:-')
    expect(wfn.part).toBe('a')
    expect(wfn.vendor).toBe('xmlsoft')
    expect(wfn.product).toBe('libxml2')
    expect(wfn.version).toBe('2\\.9\\.2')
    expect(wfn.update).toBe(NA)
    expect(wfn.edition).toBe(ANY)
  })

  it('round-trips partial CPE to full form', () => {
    const wfn = parse('cpe:2.3:a:vendor:product')
    expect(encode(wfn)).toBe('cpe:2.3:a:vendor:product:*:*:*:*:*:*:*:*')
  })

  it('throws on invalid format', () => {
    expect(() => parse('invalid')).toThrow()
  })

  it('throws on too many components', () => {
    expect(() => parse('cpe:2.3:a:v:p:1:2:3:4:5:6:7:8:extra')).toThrow()
  })
})

describe('parse URI', () => {
  it('parses a basic CPE 2.2 URI', () => {
    const wfn = parse('cpe:/a:microsoft:internet_explorer:8.0.6001:beta')
    expect(wfn.part).toBe('a')
    expect(wfn.vendor).toBe('microsoft')
    expect(wfn.product).toBe('internet_explorer')
    expect(wfn.version).toBe('8\\.0\\.6001')
    expect(wfn.update).toBe('beta')
  })

  it('parses URI with packed edition', () => {
    const wfn = parse('cpe:/a:hp:insight_diagnostics:7.4.0.1570:-:~~online~win2003~x64~')
    expect(wfn.part).toBe('a')
    expect(wfn.vendor).toBe('hp')
    expect(wfn.product).toBe('insight_diagnostics')
    expect(wfn.update).toBe(NA)
    expect(wfn.swEdition).toBe('online')
    expect(wfn.targetSw).toBe('win2003')
    expect(wfn.targetHw).toBe('x64')
  })

  it('treats empty components as ANY', () => {
    const wfn = parse('cpe:/a:microsoft:internet_explorer')
    expect(wfn.version).toBe(ANY)
    expect(wfn.update).toBe(ANY)
    expect(wfn.edition).toBe(ANY)
    expect(wfn.language).toBe(ANY)
  })

  it('treats hyphen as NA', () => {
    const wfn = parse('cpe:/a:hp:openview_network_manager:7.51:-')
    expect(wfn.update).toBe(NA)
  })
})

describe('encode formatted string', () => {
  it('encodes a basic WFN', () => {
    const wfn = fromParts('a', 'microsoft', 'internet_explorer')
    const fs = encode(wfn)
    expect(fs).toBe('cpe:2.3:a:microsoft:internet_explorer:*:*:*:*:*:*:*:*')
  })

  it('round-trips a formatted string', () => {
    const original = 'cpe:2.3:a:microsoft:internet_explorer:8.0.6001:beta:*:*:*:*:*:*'
    const wfn = parse(original)
    const result = encode(wfn)
    expect(result).toBe(original)
  })

  it('round-trips with NA', () => {
    const original = 'cpe:2.3:a:microsoft:internet_explorer:8.0.6001:beta:-:*:*:*:*:*'
    const wfn = parse(original)
    expect(encode(wfn)).toBe(original)
  })
})

describe('encode URI', () => {
  it('encodes a basic WFN as URI', () => {
    const wfn = parse('cpe:2.3:a:microsoft:internet_explorer:8.0.6001:beta:*:*:*:*:*:*')
    const uri = encodeURI(wfn)
    expect(uri).toBe('cpe:/a:microsoft:internet_explorer:8.0.6001:beta')
  })

  it('encodes NA as hyphen', () => {
    const wfn = createWFN()
    wfn.part = 'a'
    wfn.vendor = 'hp'
    wfn.product = 'openview_network_manager'
    wfn.version = '7\\.51'
    wfn.update = NA
    const uri = encodeURI(wfn)
    expect(uri).toBe('cpe:/a:hp:openview_network_manager:7.51:-')
  })
})

describe('val()', () => {
  it('converts * to ANY', () => {
    expect(val('*')).toBe(ANY)
  })

  it('converts - to NA', () => {
    expect(val('-')).toBe(NA)
  })

  it('passes strings through', () => {
    expect(val('microsoft')).toBe('microsoft')
  })
})
