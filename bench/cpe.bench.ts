import { bench, describe } from 'vitest';
import { parse, encode, encodeURI, validate, compare, isEqual, isSubset, matchesAny } from '../src/index.js';

const fs23 = 'cpe:2.3:a:microsoft:internet_explorer:8.0.6001:beta:*:*:*:*:*:*';
const uri = 'cpe:/a:microsoft:internet_explorer:8.0.6001:beta';
const wildcard = 'cpe:2.3:a:microsoft:*:*:*:*:*:*:*:*:*';

const wfn = parse(fs23);
const wfnWild = parse(wildcard);

describe('parse', () => {
  bench('formatted string (2.3)', () => { parse(fs23); });
  bench('URI binding', () => { parse(uri); });
  bench('with wildcards', () => { parse(wildcard); });
});

describe('encode', () => {
  bench('to formatted string', () => { encode(wfn); });
  bench('to URI', () => { encodeURI(wfn); });
});

describe('validate', () => {
  bench('valid CPE', () => { validate(fs23); });
  bench('invalid CPE', () => { validate('not-a-cpe'); });
});

describe('compare / match', () => {
  bench('compare (exact)', () => { compare(wfn, wfn); });
  bench('compare (wildcard)', () => { compare(wfnWild, wfn); });
  bench('isEqual', () => { isEqual(wfn, wfn); });
  bench('isSubset', () => { isSubset(wfn, wfnWild); });
  bench('matchesAny', () => { matchesAny(wfn, [wfnWild, wfn]); });
});
