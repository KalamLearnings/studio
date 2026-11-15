/**
 * Madd in the letter picker (content model D7, CM-S2).
 *
 * A reference with `madd: true` is a long vowel: `{ letterId: 'ba', haraka:
 * 'fatha', madd: true }` is بَا. Madd is valid only with fatha, damma or kasra
 * (`isValidMadd` in @kalam/curriculum-schemas); these helpers keep the picker's
 * references valid and draw the long vowel for previews. Pure, no React.
 */

import { isMaddHaraka, MADD_CARRIER_BY_HARAKA } from '@kalam/curriculum-schemas';

type MaddRef = { letterId: string; form: string; haraka?: string; madd?: boolean };

/** Glyph of each carrier letter id in MADD_CARRIER_BY_HARAKA. */
const CARRIER_GLYPH: Record<string, string> = { alif: 'ا', waw: 'و', yaa: 'ي' };

/** True when the reference asks for madd and its haraka allows it. */
export function hasMadd(ref: { haraka?: string; madd?: boolean } | null | undefined): boolean {
  return ref?.madd === true && isMaddHaraka(ref.haraka);
}

/** The glyph with its carrier letter appended when the reference has madd (بَ -> بَا). */
export function withMaddGlyph(glyph: string, ref: { haraka?: string; madd?: boolean } | null | undefined): string {
  if (!ref || !hasMadd(ref)) return glyph;
  return glyph + CARRIER_GLYPH[MADD_CARRIER_BY_HARAKA[ref.haraka as keyof typeof MADD_CARRIER_BY_HARAKA]];
}

/** Whether the madd switch applies to this letter form, and whether it is on. */
export function maddState(
  refs: MaddRef[],
  letterId: string,
  form: string,
): { available: boolean; on: boolean } {
  const eligible = refs.filter((r) => r.letterId === letterId && r.form === form && isMaddHaraka(r.haraka));
  return { available: eligible.length > 0, on: eligible.length > 0 && eligible.every((r) => r.madd === true) };
}

/**
 * Set or clear madd on this letter form's short-vowel references. Other
 * references are returned unchanged; madd is never set on a reference whose
 * haraka cannot carry it.
 */
export function setMadd<R extends MaddRef>(refs: R[], letterId: string, form: string, on: boolean): R[] {
  return refs.map((r) => {
    if (r.letterId !== letterId || r.form !== form || !isMaddHaraka(r.haraka)) return r;
    if (on) return { ...r, madd: true };
    const rest = { ...r };
    delete rest.madd;
    return rest;
  });
}

/** `{ madd: true }` to spread into a new reference when madd carries over to `haraka`, else `{}`. */
export function carryMadd(previous: { madd?: boolean } | undefined, haraka: string | undefined): { madd?: true } {
  return previous?.madd === true && isMaddHaraka(haraka) ? { madd: true } : {};
}
