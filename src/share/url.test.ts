import { describe, expect, it } from 'vitest';

import { buildShareUrl, parseShareInput } from './url';

const CODE = 'AQABCdef-_9';

describe('parseShareInput', () => {
  it.each([
    ['a bare code', CODE],
    ['a bare code with surrounding whitespace', `  ${CODE}\n`],
    ['a full link', `https://flyffbuilds.example/?b=${CODE}#/results`],
    ['a link whose route precedes the query', `https://host/app/#/results?b=${CODE}`],
    ['a link with other parameters', `https://host/?x=1&b=${CODE}&y=2`],
    ['a query fragment', `?b=${CODE}`],
    ['a hash fragment', `#b=${CODE}`],
    ['a bare parameter', `b=${CODE}`],
  ])('accepts %s', (_label, input) => {
    expect(parseShareInput(input)).toBe(CODE);
  });

  it.each([
    ['an empty string', ''],
    ['whitespace', '   \n'],
    ['junk with spaces', 'hello world!'],
    ['padded base64', 'AQAB=='],
    ['a link with a different parameter', `https://host/?ab=${CODE}`],
    ['a link with an empty parameter', 'https://host/?b='],
    ['a link with an invalid code', 'https://host/?b=AQ+B'],
  ])('rejects %s', (_label, input) => {
    expect(parseShareInput(input)).toBeUndefined();
  });

  it('returns exactly what buildShareUrl embedded', () => {
    expect(parseShareInput(buildShareUrl('https://host/', CODE))).toBe(CODE);
  });
});

describe('buildShareUrl', () => {
  it('puts the code in the query and the results route in the hash', () => {
    expect(buildShareUrl('https://host/', 'abc')).toBe('https://host/?b=abc#/results');
  });
});
