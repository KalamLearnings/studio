/**
 * heart_words: the approved heart-word list (CM-B34; ADR 0002 section 3,
 * open questions 1 and 2; decision D6).
 *
 * A heart word is a very common word a child learns whole, by heart, because
 * phrases and sentences need it before its spelling can be sounded out with
 * what has been taught. The decodability check
 * (`teaching-targets/decodability.ts`) excuses a word on this list, and only:
 * - after the lesson that teaches it: the point has reached the entry's
 *   `lessonStage` in the curriculum's active teaching sequence, AND a node or
 *   topic at or before the point declares the word (`word:<id>` of its word
 *   row) as a `focus` target (the heart-word card lesson). Before that it
 *   fails like any other word (ADR rule 4). The second half is read from the
 *   content, so it follows each curriculum's own order;
 * - while it is not decodable on its own. An `early` word stops needing the
 *   excuse once the rules in `decodableWith` are taught: it then passes the
 *   normal check (ADR rule 5). An `irregular` word never does, and stays.
 *
 * Kinds:
 * - `early`: the spelling follows a rule Kalam teaches, but the rule comes
 *   later than the child needs the word (هٰذا before the small upright alif);
 * - `irregular`: the spelling matches the sound by no rule Kalam teaches
 *   (أُولٰئِكَ). None is listed yet.
 *
 * A word is matched by its exact vowelled spelling (D3; compared after the
 * CM-B2 spelling normaliser: NFC, no tatweel). `spellings` lists the spelling
 * the ADR names first, then the other standard vowellings of the same word
 * (هَٰذَا with the fatha before the upright alif). Each must be a reviewed
 * word row before a phrase can use it (ADR rule 2; the phrase save checks
 * that).
 *
 * Rules for this list (ADR 0002):
 * - at most `HEART_WORD_CAP` (15) words at one time (open question 2);
 * - no Quran or religious words (open question 1): no الله, no basmala, no
 *   Quranic phrase, until a separate religious-content rule exists;
 * - words that are already decodable where they are used (فِي after kasra and
 *   ya madd, وَ after fatha) are not listed;
 * - AI never adds a word: the list changes only by the review below.
 *
 * CURRICULUM REVIEW. The curriculum lead reviews this file (CM-C7, CM-C12).
 * Change it only by pull request, with the curriculum lead's review: the
 * pull request is the approval record (who, when). Never rename or reuse an
 * `id`. Seeded 2026-11-15 from ADR 0002 open question 2 (the recommended
 * five, all `early`); `lessonStage` is a proposal awaiting that review.
 * The ADR proposed a table for this list; the ticket (CM-B34) made it a
 * reviewed code vocabulary like the other files here, keyed by spelling.
 *
 * IDENTICAL COPIES of this file live in:
 *   kalam-readers-backend/supabase/functions/_shared/core/domain/content-model/heart_words.ts
 *   studio/packages/curriculum-schemas/src/heart_words.ts
 * `scripts/sync-content-model.ts` copies it; `content-model-drift.test.ts` (both
 * repos) fails when the copies differ. The file therefore imports nothing and
 * targets ES2020.
 */

export const HEART_WORD_KINDS = ['early', 'irregular'] as const;
export type HeartWordKind = (typeof HEART_WORD_KINDS)[number];

/** The most heart words on the list at one time (ADR 0002, open question 2). */
export const HEART_WORD_CAP = 15;

export interface HeartWord {
  /** Stable slug; never renamed or reused. */
  id: string;
  /** The exact vowelled spellings of the word, the ADR's first (NFC). */
  spellings: readonly string[];
  kind: HeartWordKind;
  /** English meaning, for Studio's list screen. */
  gloss: string;
  /**
   * The stage (a `teaching_sequences.ts` label) whose levels hold the word's
   * heart-word lesson: never excused before the point reaches it.
   */
  lessonStage: string;
  /**
   * `early` only: the unit keys whose teaching makes the word decodable by
   * itself, after which the excuse is no longer used. Empty for `irregular`.
   */
  decodableWith: readonly string[];
  note: string;
}

export const HEART_WORDS: readonly HeartWord[] = [
  {
    id: 'hadha',
    spellings: ['هٰذَا', 'هَٰذَا'],
    kind: 'early',
    gloss: 'this (masculine)',
    lessonStage: 'fatha',
    decodableWith: ['rule:madd_dagger', 'rule:madd_alif'],
    note: 'The small upright alif over ه is taught at the madd stage (ADR 0002)',
  },
  {
    id: 'hadhihi',
    spellings: ['هٰذِهِ', 'هَٰذِهِ'],
    kind: 'early',
    gloss: 'this (feminine)',
    lessonStage: 'fatha',
    decodableWith: ['rule:madd_dagger'],
    note: 'The small upright alif over ه is taught at the madd stage (ADR 0002)',
  },
  {
    id: 'dhalika',
    spellings: ['ذٰلِكَ', 'ذَٰلِكَ'],
    kind: 'early',
    gloss: 'that (masculine)',
    lessonStage: 'fatha',
    decodableWith: ['rule:madd_dagger'],
    note: 'The small upright alif over ذ is taught at the madd stage (ADR 0002)',
  },
  {
    id: 'ala',
    spellings: ['عَلَى'],
    kind: 'early',
    gloss: 'on',
    lessonStage: 'fatha',
    decodableWith: ['rule:madd_alif', 'rule:alif_maqsura'],
    note: 'The final ى read as a long a is taught at the madd stage (ADR 0002)',
  },
  {
    id: 'ila',
    spellings: ['إِلَى'],
    kind: 'early',
    gloss: 'to',
    lessonStage: 'fatha',
    decodableWith: [
      'rule:madd_alif',
      'rule:alif_maqsura',
      'rule:hamza_seat',
      'letter:alif_hamza_below',
    ],
    note:
      'The final ى is taught at the madd stage (ADR 0002); the hamza seat of إ in the hamza stage',
  },
];

export function isHeartWordKind(value: unknown): value is HeartWordKind {
  return typeof value === 'string' && (HEART_WORD_KINDS as readonly string[]).indexOf(value) >= 0;
}
