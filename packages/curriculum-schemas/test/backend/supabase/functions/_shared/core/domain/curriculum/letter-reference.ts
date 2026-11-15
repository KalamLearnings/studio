/**
 * Letter references inside activity configs: the `{ letterId, form, haraka? }`
 * shape the dashboard writes, and the legacy string (an id or a glyph) it
 * replaced. Resolution turns either into the glyph the app renders.
 */

import { applyHaraka, type OptionalHaraka } from '../../contracts/curriculum-schemas/harakat.ts';

// Type for letter data used in enrichment
export interface LetterData {
  id: string;
  letter: string;
  forms?: {
    isolated?: string;
    initial?: string;
    medial?: string;
    final?: string;
  };
}

// New standardized letter reference format
export interface LetterReference {
  letterId: string;
  form: 'isolated' | 'initial' | 'medial' | 'final';
  haraka?: OptionalHaraka;
  /** Long vowel after fatha, damma or kasra (D7); absent means false. */
  madd?: boolean;
}

export type LetterForm = 'isolated' | 'initial' | 'medial' | 'final';

/**
 * Check if a value is a LetterReference object
 */
export function isLetterReference(value: unknown): value is LetterReference {
  return (
    typeof value === 'object' &&
    value !== null &&
    'letterId' in value &&
    'form' in value &&
    typeof (value as LetterReference).letterId === 'string' &&
    typeof (value as LetterReference).form === 'string'
  );
}

/**
 * Resolve a single letter reference to its character
 * Handles both old format (string) and new format ({ letterId, form })
 */
export function resolveLetterToCharacter(
  value: unknown,
  lettersMap: Record<string, LetterData>,
  defaultForm: LetterForm = 'isolated',
): string | null {
  // New format: { letterId, form }
  if (isLetterReference(value)) {
    const letterData = lettersMap[value.letterId];
    if (letterData) {
      const form = value.form || defaultForm;
      const baseChar = (letterData.forms && letterData.forms[form]) ||
        letterData.letter;
      return applyHaraka(baseChar, value.haraka);
    }
    return null;
  }

  // Old format: string (either letter ID or already a character)
  if (typeof value === 'string') {
    // First try: look up by ID
    const letterData = lettersMap[value];
    if (letterData) {
      // It's a letter ID, resolve it
      if (letterData.forms && letterData.forms[defaultForm]) {
        return letterData.forms[defaultForm]!;
      }
      return letterData.letter;
    }

    // Second try: look up by character (isolated form)
    // This handles cases where targetLetter is stored as a character like "ج" instead of an ID
    const letterByChar = Object.values(lettersMap).find((l) => l.letter === value);
    if (letterByChar) {
      if (letterByChar.forms && letterByChar.forms[defaultForm]) {
        return letterByChar.forms[defaultForm]!;
      }
      return letterByChar.letter;
    }

    // Not found in map - return as-is
    return value;
  }

  return null;
}
