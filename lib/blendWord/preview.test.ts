import { describe, it, expect } from 'vitest';
import { buildWordPreview, checkFullForm, hasTanween, inferEndingFromText, plainIssue } from './preview';
import { splitBlendWord } from '@kalam/curriculum-schemas';

const texts = (units: { text: string }[]) => units.map((u) => u.text);

describe('buildWordPreview: both forms side by side', () => {
  it('كِتَابٌ: pausal كِ | تَابْ, full كِ | تَا | بٌ', () => {
    const p = buildWordPreview('كِتَابٌ');
    expect(texts(p.pausal.units)).toEqual(['كِ', 'تَابْ']);
    expect(texts(p.full.units)).toEqual(['كِ', 'تَا', 'بٌ']);
    expect(p.fullKnown).toBe(true);
    expect(p.sameText).toBe(false);
    expect(hasTanween(p)).toBe(true);
  });

  it('labels the rule tags in plain words', () => {
    const p = buildWordPreview('كِتَابٌ');
    const labels = p.pausal.units[1]!.tags.map((t) => t.label);
    expect(labels).toEqual(['sukoon join', 'madd', 'qalqala']);
    expect(p.full.units[2]!.tags.map((t) => t.label)).toEqual(['tanween (vowel + n)']);
    const shams = buildWordPreview('الشَّمْسُ').full.units[0]!.tags.map((t) => t.label);
    expect(shams).toEqual(['shadda split (1st half)', 'al- (wasl alif)', 'al- (silent lam)']);
  });

  it('a pausal-only word does not know its full form', () => {
    const p = buildWordPreview('كِتَابْ');
    expect(p.fullKnown).toBe(false);
    expect(p.sameText).toBe(true);
  });

  it('checks a full form offered for a pausal-only word', () => {
    expect(checkFullForm('كِتَابْ', 'كِتَابٌ')).toEqual([]);
    expect(checkFullForm('كِتَابْ', '')).toEqual([]);
    expect(checkFullForm('كِتَابْ', 'قَمَرٌ')[0]!.message).toMatch(/same word/);
    expect(checkFullForm('كِتَابْ', 'كِتَابْ')[0]!.message).toMatch(/case ending or tanween/);
  });

  it('shows the splitter issues in plain words', () => {
    const p = buildWordPreview('كتب');
    expect(p.pausal.ok).toBe(false);
    const messages = p.pausal.issues.map((i) => i.message).join('\n');
    expect(messages).toMatch(/has no haraka/);
    expect(messages).not.toMatch(/missing_haraka/);
  });

  it('checks an override with the hard rules and marks it', () => {
    const good = buildWordPreview('كِتَابٌ', {
      override: { pausal: [{ text: 'كِتَا', tags: ['madd'] }, { text: 'بْ', tags: ['sukoon'] }] },
    });
    expect(good.pausal.overridden).toBe(true);
    expect(texts(good.pausal.units)).toEqual(['كِتَا', 'بْ']);
    // بْ alone has no vowel
    expect(good.pausal.ok).toBe(false);
    expect(good.pausal.issues[0]!.message).toMatch(/"بْ" has no vowel/);

    const valid = buildWordPreview('كِتَابٌ', {
      override: { pausal: [{ text: 'كِتَابْ', tags: ['madd', 'sukoon'] }] },
    });
    expect(valid.pausal.ok).toBe(true);
    expect(valid.pausal.overridden).toBe(true);
    expect(valid.full.overridden).toBe(false);
  });
});

describe('inferEndingFromText', () => {
  it.each([
    ['كَتَبَ', 'full'],
    ['كِتَابٌ', 'full'],
    ['كِتَابْ', 'pausal'],
    ['قَمَرْ', 'pausal'],
    ['', 'pausal'],
  ])('%s → %s', (text, ending) => {
    expect(inferEndingFromText(text)).toBe(ending);
  });
});

describe('plainIssue', () => {
  it('words the server-only unit_not_syllable', () => {
    const split = splitBlendWord('كِتَابْ', 'pausal');
    const out = plainIssue({ code: 'unit_not_syllable', severity: 'error', unit: 0, message: 'x' }, split, [{ text: 'كِتَابْ' }]);
    expect(out.message).toMatch(/"كِتَابْ" is not one syllable/);
  });

  it('names the letter', () => {
    const split = splitBlendWord('كَتب', 'full');
    const missing = split.issues.find((i) => i.code === 'missing_haraka')!;
    expect(plainIssue(missing, split).message).toMatch(/"ت" \(letter 2\)/);
  });
});
