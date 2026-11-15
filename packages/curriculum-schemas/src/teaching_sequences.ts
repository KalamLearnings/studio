/**
 * teaching_sequences: named orders of stage labels (CM-B19,
 * CONTENT_MODEL_DESIGN.md 2.5, 2.15; decisions N3, D13).
 *
 * The stage label of a level says what the level is about, not when it comes:
 * the labels are unordered. The order lives here, apart from the prerequisite
 * links of `skill_graph.ts`, because experts disagree on it (PROD, the Noorani
 * Qaida and phonics logic all differ) while all of them respect the firm links.
 * A sequence is one author's choice, not a law; a placement or adaptive policy
 * may reorder only within the `prerequisite` links.
 *
 * `default` is the current PROD order, recorded as a deliberate choice (N3):
 * letters_isolated, letter_forms, fatha, kasra, damma, sukoon, shadda, madd.
 * The tail (tanween, al, hamza) is the plan for levels not built yet and may be
 * reordered before they are.
 *
 * CURRICULUM REVIEW. The curriculum lead reviews this file (CM-C7). Change it
 * only by pull request, with the curriculum lead's review. Never rename a stage
 * label or a sequence id; add a new sequence for a new order. The test
 * `content-model.test.ts` fails when a sequence breaks a prerequisite link.
 * Review done 2026-11-15 (CM-C7, decision R12; answers in
 * `content-model-audit/12-curriculum-review-answers.md`): A9 keeps the built
 * order; tanween stays planned, and moving it earlier (right after damma, or
 * with sukoon, as most Qaidas do) would break no link as long as tanween comes
 * after all three short vowels (A15, a link in `skill_graph.ts`). A2 and A7
 * put the reading of ة in `tanween` and the connecting hamza outside al- in
 * `hamza`; no stage label or order changed.
 *
 * IDENTICAL COPIES of this file live in:
 *   kalam-readers-backend/supabase/functions/_shared/core/domain/content-model/teaching_sequences.ts
 *   studio/packages/curriculum-schemas/src/teaching_sequences.ts
 * `scripts/sync-content-model.ts` copies it; `content-model-drift.test.ts` (both
 * repos) fails when the copies differ. The file therefore imports nothing and
 * targets ES2020.
 */

/** The stage labels a level can declare (`curricula.stage`). Unordered. */
export const STAGE_LABELS = [
  'letters_isolated',
  'letter_forms',
  'fatha',
  'kasra',
  'damma',
  'sukoon',
  'shadda',
  'madd',
  'tanween',
  'al',
  'hamza',
] as const;

export type StageLabel = (typeof STAGE_LABELS)[number];

export function isStageLabel(value: unknown): value is StageLabel {
  return typeof value === 'string' && (STAGE_LABELS as readonly string[]).indexOf(value) >= 0;
}

export interface TeachingSequence {
  id: string;
  /** Every stage label, each once, in teaching order. */
  stages: readonly StageLabel[];
  /** The first stage whose levels are planned, not built; null when all are built. */
  firstPlannedStage: StageLabel | null;
  note: string;
}

export const DEFAULT_SEQUENCE_ID = 'default';

export const TEACHING_SEQUENCES: Readonly<Record<string, TeachingSequence>> = {
  default: {
    id: 'default',
    stages: [
      'letters_isolated',
      'letter_forms',
      'fatha',
      'kasra',
      'damma',
      'sukoon',
      'shadda',
      'madd',
      'tanween',
      'al',
      'hamza',
    ],
    firstPlannedStage: 'tanween',
    note: 'The current PROD order (madd is draft level 8); tanween, al and hamza are planned',
  },
};

/** The position of a stage in a sequence, or -1 when the sequence or stage is unknown. */
export function stagePosition(sequenceId: string, stage: string): number {
  if (!Object.prototype.hasOwnProperty.call(TEACHING_SEQUENCES, sequenceId)) return -1;
  const sequence = TEACHING_SEQUENCES[sequenceId];
  return sequence ? (sequence.stages as readonly string[]).indexOf(stage) : -1;
}
