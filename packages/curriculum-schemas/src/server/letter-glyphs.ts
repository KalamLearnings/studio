/**
 * Arabic letter glyphs and their `letters.id` (content model D1).
 *
 * One table for every reader: the word analyser (`core/domain/words/
 * letter-analysis.ts`) and the activity read schemas, which resolve the
 * legacy glyph fields (`trace_letter.letterForm`, `pop_balloons_with_letter.
 * correctLetter`, a glyph `targetLetter`) to a `LetterReference`. The file
 * imports nothing.
 */

/**
 * Arabic letter to `letters.id`. Every hamza seat has its own row, and so do
 * ta marbuta and alif maqsura (CM-D1a).
 */
export const LETTER_IDS: Readonly<Record<string, string>> = {
  'ا': 'alif',
  'أ': 'alif_hamza_above',
  'إ': 'alif_hamza_below',
  'آ': 'alif_madda',
  'ء': 'hamza',
  'ؤ': 'waw_hamza',
  'ئ': 'yaa_hamza',
  'ب': 'ba',
  'ت': 'ta',
  'ث': 'tha',
  'ج': 'jeem',
  'ح': 'haa',
  'خ': 'khaa',
  'د': 'dal',
  'ذ': 'thal',
  'ر': 'ra',
  'ز': 'zay',
  'س': 'seen',
  'ش': 'sheen',
  'ص': 'sad',
  'ض': 'dad',
  'ط': 'taa',
  'ظ': 'thaa',
  'ع': 'ayn',
  'غ': 'ghayn',
  'ف': 'faa',
  'ق': 'qaf',
  'ك': 'kaf',
  'ل': 'lam',
  'م': 'meem',
  'ن': 'noon',
  'ه': 'heh',
  'ة': 'ta_marbuta',
  'و': 'waw',
  'ي': 'yaa',
  'ى': 'alif_maqsura',
};

/** The `letters.id` of one base letter glyph, or null when it is not a letter. */
export function letterIdOfGlyph(char: string): string | null {
  return Object.hasOwn(LETTER_IDS, char) ? LETTER_IDS[char] : null;
}
