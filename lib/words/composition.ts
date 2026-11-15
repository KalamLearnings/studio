/**
 * Word letter compositions (content model 2.7, CM-B1, CM-S1, review F26).
 * Each element carries `letterId`, the canonical `letters.id` (so ه is `heh`
 * and ة is `ta_marbuta`), beside the old `letter_id`, which keeps its old
 * value until S7 removes it. Readers take `letterId` and fall back to
 * `letter_id` for rows the rebuild has not reached.
 */

export interface CompositionLetterRef {
  letterId?: string | null;
  letter_id?: string | null;
}

/** The element's letter id: `letterId` when present, else the old `letter_id`. */
export function compositionLetterId(comp: CompositionLetterRef): string {
  return comp.letterId || comp.letter_id || "";
}
