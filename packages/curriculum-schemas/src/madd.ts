/**
 * Madd on a letter reference (content model D7, CM-B4).
 *
 * `{ letterId: 'ba', form: 'isolated', haraka: 'fatha', madd: true }` is بَا:
 * the letter with a short vowel, lengthened by the matching carrier letter.
 * Madd is valid only with a short vowel. An absent `madd` means `false`, so
 * every reference stored before this field reads as it did.
 *
 * IDENTICAL COPIES of this file live in:
 *   kalam-readers-backend/supabase/functions/_shared/core/contracts/curriculum-schemas/madd.ts
 *   studio/packages/curriculum-schemas/src/madd.ts
 * Edit both together (Studio's `test/madd-drift.test.ts` compares them). The
 * file imports nothing, so the same source runs under Deno and Node.
 */

/** The short vowels that can carry madd, in display order. */
export const MADD_HARAKA_IDS = ['fatha', 'damma', 'kasra'] as const;

export type MaddHaraka = (typeof MADD_HARAKA_IDS)[number];

/** The rule a madd reference teaches (rule ids of the design, section 2.5). */
export const MADD_RULE_BY_HARAKA: Record<MaddHaraka, 'madd_alif' | 'madd_waw' | 'madd_ya'> = {
  fatha: 'madd_alif',
  damma: 'madd_waw',
  kasra: 'madd_ya',
};

/** The carrier letter (`letters.id`) that lengthens the vowel. */
export const MADD_CARRIER_BY_HARAKA: Record<MaddHaraka, 'alif' | 'waw' | 'yaa'> = {
  fatha: 'alif',
  damma: 'waw',
  kasra: 'yaa',
};

/** The letter `sound` take variant that plays the long vowel (timed audio design 5.1). */
export const MADD_VARIANT_BY_HARAKA: Record<MaddHaraka, 'madd_a' | 'madd_u' | 'madd_i'> = {
  fatha: 'madd_a',
  damma: 'madd_u',
  kasra: 'madd_i',
};

export const MADD_NEEDS_SHORT_VOWEL = 'madd is only valid with haraka fatha, damma or kasra';

export function isMaddHaraka(value: unknown): value is MaddHaraka {
  return typeof value === 'string' && (MADD_HARAKA_IDS as readonly string[]).includes(value);
}

/**
 * True when a reference's `madd` and `haraka` agree: no madd (absent or
 * false), or madd with a short vowel.
 */
export function isValidMadd(ref: { haraka?: string; madd?: boolean }): boolean {
  return ref.madd !== true || isMaddHaraka(ref.haraka);
}
