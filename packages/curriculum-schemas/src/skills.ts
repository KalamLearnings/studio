/**
 * skills: skill kinds, strands, response types and the activity type map
 * (CM-B19, CONTENT_MODEL_DESIGN.md 2.2, 2.9; decisions N5, N6, D6).
 *
 * A skill is a kind applied to a unit key: `<kind>@<unit key>`
 * (`decode@sound:kaf:kasra`, `write@form:ba:initial`). Skills are keys, not
 * rows. Each kind belongs to one strand, and strands are reported separately:
 * meaning is never folded into decoding. Kind and response type are separate
 * axes: `recognize` can be answered by a `select` (tap one of 3) or a
 * `construct` (trace it) response.
 *
 * There is no `say` kind and no `say` response type. Speech practice works
 * exactly as in v1 (decision R11): the app records the child, the backend
 * speech endpoint scores it, and v2 keeps the same `activity_progress` and
 * `speech_assessments` rows; the content model adds no speech evidence to
 * mastery on top of that, so `speech_practice` is exposure here.
 *
 * CURRICULUM REVIEW. The curriculum lead reviews the kinds and the activity
 * type map (CM-C7). Change them only by pull request, with the curriculum
 * lead's review. Never rename or remove a kind or a response type: index rows,
 * attempts and mastery store these strings. A new activity type must be added
 * to `ACTIVITY_SKILL_MAP` in the same change that adds it to the curriculum
 * schemas; `content-model.test.ts` fails otherwise.
 * Review done 2026-11-15 (CM-C7, decision R12; answers in
 * `content-model-audit/12-curriculum-review-answers.md`): C4 `tap_dot_position`
 * is recognising the letter's shape (its dots) by choosing, not writing; C5
 * `drive_to_sukoon` / `drive_to_shadda` are recognising the mark (on the
 * sukoon or shadda rule), not finding the parts of a word; B1 and B3 add the
 * `sukoon` and `shadda` contrasts to `DISCRIMINATE_CONTRASTS`; C3 is settled by
 * R11 (above). C1, C2, C6 to C13 agree with the map as it was.
 *
 * READING STRANDS (ADR 0002, CM-B32; ADR status Proposed): `identify` and
 * `comprehend` are built kinds now (`pa:`/`listen:` and `comp:`), and
 * `decode` applies to `read:`. No activity type uses them yet (the reading
 * set types come with CM-B33); `read_fluently` stays reserved.
 *
 * IDENTICAL COPIES of this file live in:
 *   kalam-readers-backend/supabase/functions/_shared/core/domain/content-model/skills.ts
 *   studio/packages/curriculum-schemas/src/skills.ts
 * `scripts/sync-content-model.ts` copies it; `content-model-drift.test.ts` (both
 * repos) fails when the copies differ. The file therefore imports nothing and
 * targets ES2020.
 */

// ---------------------------------------------------------------------------
// Strands and kinds
// ---------------------------------------------------------------------------

export const STRANDS = ['decoding', 'meaning', 'phonological', 'comprehension', 'fluency'] as const;

export type Strand = (typeof STRANDS)[number];

export const SKILL_KINDS = [
  'recognize',
  'discriminate',
  'decode',
  'write',
  'blend',
  'segment',
  'encode',
  'meaning',
  'identify',
  'comprehend',
  'read_fluently',
] as const;

export type SkillKind = (typeof SKILL_KINDS)[number];

export interface SkillKindMeta {
  id: SkillKind;
  strand: Strand;
  /** The child can ... */
  canDo: string;
  /** The unit key namespaces the kind applies to. */
  units: readonly string[];
  /** Name fixed now, nothing built yet (N6). */
  reserved: boolean;
}

export const SKILL_KIND_META: Record<SkillKind, SkillKindMeta> = {
  recognize: {
    id: 'recognize',
    strand: 'decoding',
    canDo: 'Find or identify a shape',
    units: ['letter', 'form', 'joined'],
    reserved: false,
  },
  discriminate: {
    id: 'discriminate',
    strand: 'decoding',
    canDo: 'Tell a unit from a confusable one',
    units: ['letter', 'sound'],
    reserved: false,
  },
  decode: {
    id: 'decode',
    strand: 'decoding',
    canDo: 'Map a written unit to its sound',
    // `read:phrase`, `read:sentence`: reading connected vowelled text (ADR 0002)
    units: ['sound', 'haraka', 'rule', 'read'],
    reserved: false,
  },
  write: {
    id: 'write',
    strand: 'decoding',
    canDo: 'Form the shape',
    units: ['letter', 'form'],
    reserved: false,
  },
  blend: {
    id: 'blend',
    strand: 'decoding',
    canDo: 'Join syllables into a word',
    units: ['word', 'rule'],
    reserved: false,
  },
  segment: {
    id: 'segment',
    strand: 'decoding',
    canDo: 'Find the units inside a word',
    units: ['letter', 'form', 'sound', 'rule'],
    reserved: false,
  },
  encode: {
    id: 'encode',
    strand: 'decoding',
    canDo: 'Build a word from parts after hearing it',
    units: ['word'],
    reserved: false,
  },
  meaning: {
    id: 'meaning',
    strand: 'meaning',
    canDo: 'Link a word to its meaning',
    units: ['family', 'concept', 'word'],
    reserved: false,
  },
  identify: {
    id: 'identify',
    strand: 'phonological',
    canDo: 'Hear a sound unit with no letters',
    // `pa:first_sound`, `listen:contrast:<a>:<b>` (ADR 0002)
    units: ['pa', 'listen'],
    reserved: false,
  },
  comprehend: {
    id: 'comprehend',
    strand: 'comprehension',
    canDo: 'Understand what a phrase, sentence or story says, read or heard',
    // `comp:literal` (ADR 0002); `comp:inference` stays a reserved name
    units: ['comp'],
    reserved: false,
  },
  read_fluently: {
    id: 'read_fluently',
    strand: 'fluency',
    canDo: 'Read connected text with ease',
    units: ['fluency'],
    reserved: true,
  },
};

export function isSkillKind(value: unknown): value is SkillKind {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(SKILL_KIND_META, value);
}

/**
 * The strand of each unit key namespace, for a key reported without a skill
 * kind. With a kind, the kind's strand decides (`strandOfSkill`). The
 * namespaces of one strand are never reported with another's (N6, ADR 0002
 * item 8): `read:` is decoding, `comp:` comprehension, `pa:` and `listen:`
 * phonological.
 */
export const NAMESPACE_STRANDS: Readonly<Record<string, Strand>> = {
  letter: 'decoding',
  form: 'decoding',
  sound: 'decoding',
  haraka: 'decoding',
  rule: 'decoding',
  joined: 'decoding',
  word: 'decoding',
  read: 'decoding',
  family: 'meaning',
  concept: 'meaning',
  comp: 'comprehension',
  pa: 'phonological',
  listen: 'phonological',
  fluency: 'fluency',
};

/** The strand of a unit key from its namespace; decoding for an unknown one. */
export function strandOfUnitKey(unitKey: string): Strand {
  const namespace = unitKey.split(':')[0] ?? '';
  return Object.prototype.hasOwnProperty.call(NAMESPACE_STRANDS, namespace)
    ? NAMESPACE_STRANDS[namespace] ?? 'decoding'
    : 'decoding';
}

/** The strand a target or KC is reported in: its kind's, else its namespace's. */
export function strandOfSkill(kind: string | null, unitKey: string): Strand {
  return isSkillKind(kind) ? SKILL_KIND_META[kind].strand : strandOfUnitKey(unitKey);
}

/** `<kind>@<unit key>`. */
export function skillKey(kind: SkillKind, unitKey: string): string {
  return kind + '@' + unitKey;
}

/** Split `<kind>@<unit key>`; null when the kind is unknown or the key is empty. */
export function parseSkillKey(key: string): { kind: SkillKind; unitKey: string } | null {
  const at = key.indexOf('@');
  if (at <= 0) return null;
  const kind = key.slice(0, at);
  const unitKey = key.slice(at + 1);
  if (!isSkillKind(kind) || unitKey === '') return null;
  return { kind, unitKey };
}

// ---------------------------------------------------------------------------
// Response types (N5)
// ---------------------------------------------------------------------------

/**
 * What the child does to answer. `select`: tap or choose among 2 to 4 options,
 * or find a target in a scene (weaker: a child can guess). `construct`: trace,
 * build or drag into place (stronger). `blend_unaided`: the sound_blend
 * `alone` (and `fade`) slide, joining the sounds with no model (stronger).
 */
export const RESPONSE_TYPES = ['select', 'construct', 'blend_unaided'] as const;

export type ResponseType = (typeof RESPONSE_TYPES)[number];

export function isResponseType(value: unknown): value is ResponseType {
  return typeof value === 'string' && (RESPONSE_TYPES as readonly string[]).indexOf(value) >= 0;
}

// ---------------------------------------------------------------------------
// Activity type -> default kinds and response type
// ---------------------------------------------------------------------------

/**
 * - `graded`: target rows carry the kinds and the response type;
 * - `exposure`: the child sees or hears the content but gives no answer
 *   (modelled stages, display cards); no evidence;
 * - `none`: no teaching content (breaks, narration, placeholders).
 */
export type ActivityEvidence = 'graded' | 'exposure' | 'none';

export interface ActivitySkillEntry {
  evidence: ActivityEvidence;
  /** The default kinds of the target rows. */
  kinds: readonly SkillKind[];
  /** Null unless graded, and for staged types (see `stages`). */
  response: ResponseType | null;
  /** MCQ and match pairs: the kind comes from the structured prompt (3.1); `kinds` is the fallback. */
  kindFromPrompt?: boolean;
  /** sound_blend: the response type per stage; null stages are modelled exposure. */
  stages?: Readonly<Record<string, ResponseType | null>>;
  /**
   * The unit key namespaces the `kinds` apply to for this type, in place of
   * each kind's own `units`. The other target units of an item carry no skill
   * (they are coverage): drive_to_* gives `recognize` on the rule only, not on
   * the letter that carries the mark.
   */
  units?: readonly string[];
}

const graded = (kinds: readonly SkillKind[], response: ResponseType): ActivitySkillEntry => ({
  evidence: 'graded',
  kinds,
  response,
});

const exposure = (kinds: readonly SkillKind[]): ActivitySkillEntry => ({
  evidence: 'exposure',
  kinds,
  response: null,
});

const NONE: ActivitySkillEntry = { evidence: 'none', kinds: [], response: null };

/** Letter hunts: find the target letter among distractors in a scene. */
const HUNT = graded(['recognize'], 'select');

/**
 * Every activity type of the curriculum schemas (`ActivityTypeSchema`), with
 * its default kinds and response type. A hunt whose distractors differ only by
 * dots or marks also gives `discriminate` evidence; the extractor adds it from
 * the distractor's contrast (`DISCRIMINATE_CONTRASTS`), not from this map.
 */
export const ACTIVITY_SKILL_MAP: Readonly<Record<string, ActivitySkillEntry>> = {
  // letters: find, tap, catch
  pop_balloons_with_letter: HUNT,
  catch_fish_with_letter: HUNT,
  add_pizza_toppings_with_letter: HUNT,
  letter_rain: HUNT,
  i_spy: HUNT,
  slingshot: HUNT,
  grid_tap: HUNT,
  pick_from_tree: HUNT,
  pick_flowers: HUNT,
  tap_crescent_moons: HUNT,
  drag_to_animal_mouth: HUNT,
  feed_rabbit: HUNT,
  feed_baby: HUNT,
  piggy_bank: HUNT,
  snowflakes: HUNT,
  bear_honey: HUNT,
  fly_on_flowers: HUNT,
  deliver_envelope: HUNT,
  plant_seeds: HUNT,
  balance_scale: HUNT,
  ice_cream_stacking: HUNT,
  drag_items_to_target: HUNT,
  memory_card_match: graded(['recognize'], 'select'),
  letter_discrimination: graded(['recognize'], 'select'),
  // letters: inside a word
  tap_letter_in_word: graded(['segment'], 'select'),
  drag_haraka_to_word: graded(['segment'], 'construct'),
  // marks: find the letter with the mark (C5). Recognising the mark, on its rule.
  // A sound prompt ("drive to ab") would make it `decode`; the configs have none today.
  drive_to_sukoon: { ...graded(['recognize'], 'select'), units: ['rule'] },
  drive_to_shadda: { ...graded(['recognize'], 'select'), units: ['rule'] },
  // sounds
  audio_letter_match: graded(['decode'], 'select'),
  drag_haraka_to_letter: graded(['decode'], 'construct'),
  // writing
  trace_letter: graded(['write'], 'construct'),
  drag_dots_to_letter: graded(['write'], 'construct'),
  drag_hamza_to_letter: graded(['write'], 'construct'),
  // dots: choosing where the dots go forms nothing (C4)
  tap_dot_position: graded(['recognize'], 'select'),
  // words
  build_word_from_letters: graded(['encode'], 'construct'),
  sound_blend: {
    evidence: 'graded',
    kinds: ['blend'],
    response: 'blend_unaided',
    stages: {
      model: null,
      together: null,
      togetherFast: null,
      alone: 'blend_unaided',
      fade: 'blend_unaided',
    },
  },
  word_split_blend: exposure(['blend']),
  // structured prompts
  multiple_choice_question: { ...graded(['recognize'], 'select'), kindFromPrompt: true },
  match_pairs: { ...graded(['recognize'], 'select'), kindFromPrompt: true },
  // shown, not answered
  show_letter_or_word: exposure(['recognize']),
  color_letter: exposure(['recognize']),
  content_with_cards: exposure(['recognize']),
  speech_practice: exposure(['decode']),
  // no teaching content
  animation_intro: NONE,
  break_time_minigame: NONE,
  camel_narration: NONE,
  activity_request: NONE,
};

/** Distractor contrasts that make a target row `discriminate` evidence as well. */
export const DISCRIMINATE_CONTRASTS: readonly string[] = [
  'dots',
  'form',
  'short_long',
  'haraka',
  'tanween_haraka',
  'sun_moon',
  'sukoon',
  'shadda',
];

/** The entry for an activity type, or null for an unknown type. */
export function activitySkills(type: string): ActivitySkillEntry | null {
  return Object.prototype.hasOwnProperty.call(ACTIVITY_SKILL_MAP, type)
    ? ACTIVITY_SKILL_MAP[type] ?? null
    : null;
}
