import { describe, it, expect } from 'vitest';
import { compositionLetterId } from './composition';

describe('compositionLetterId', () => {
  it('reads the canonical letterId when present', () => {
    // CM-B1: ه is heh on letters.id, while the old analyser key stays haa
    expect(compositionLetterId({ letterId: 'heh', letter_id: 'haa' })).toBe('heh');
  });

  it('falls back to letter_id for rows the rebuild has not reached', () => {
    expect(compositionLetterId({ letter_id: 'baa' })).toBe('baa');
    expect(compositionLetterId({ letterId: null, letter_id: 'baa' })).toBe('baa');
    expect(compositionLetterId({ letterId: '', letter_id: 'baa' })).toBe('baa');
    expect(compositionLetterId({})).toBe('');
  });
});
