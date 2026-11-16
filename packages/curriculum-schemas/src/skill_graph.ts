/**
 * skill_graph: typed links between teaching units (CM-B19,
 * CONTENT_MODEL_DESIGN.md 2.2, 2.14; decisions N2, D6).
 *
 * The shape is borrowed from CASE (1EdTech Competencies and Academic Standards
 * Exchange), not its wire format: items with stable ids (the unit keys of 2.2)
 * and one list of associations `(origin, destination, type)`. Two types, kept
 * in one list and never confused:
 * - `prerequisite`: learn the origin before the destination is fair game;
 * - `child_of`: taxonomy, the origin sits under the destination. Every unit
 *   that belongs to a stage reaches exactly one `stage:<label>` through
 *   `child_of` links; that is how a teaching sequence is checked against the
 *   prerequisites.
 * (The names are Kalam's own; the exact CASE tokens were not verified.)
 *
 * Links are written at rule and kind level with patterns, so the file stays a
 * few dozen lines: `*` matches any one key segment, and `$name` matches one
 * segment and must match the same value on both ends of the link
 * (`letter:$l` -> `sound:$l:*`: a letter before its own sounds). Only firm links
 * go in. Tanween comes after all three short vowels (a firm link, review A15);
 * its place relative to madd and sukoon is disputed, so that is an order choice
 * in `teaching_sequences.ts`, not a link. Node-level assumptions stay in
 * `teaching_targets` with role `prerequisite`.
 *
 * A `child_of` link whose origin is one concrete key (no `*` or `$name`) takes
 * the place of the pattern links for that key: `letter:ta_marbuta` sits in
 * `letter_forms`, not with every other `letter:*` in `letters_isolated`.
 *
 * CURRICULUM REVIEW. The curriculum lead reviews these links (CM-C7). Change
 * them only by pull request, with the curriculum lead's review. An AI may
 * propose a link, but it enters only through that review. The test
 * `content-model.test.ts` fails on a prerequisite cycle, an invalid key pattern,
 * a unit with no stage or two, and a sequence that breaks a prerequisite.
 * Review done 2026-11-15 (CM-C7, decision R12; answers in
 * `content-model-audit/12-curriculum-review-answers.md`): A2 ة is shown as a
 * shape in `letter_forms` and its reading (`rule:ta_marbuta`) is taught with
 * tanween; A7 the connecting hamza is introduced with al- and its other words
 * (`rule:hamzat_wasl_other`) are a later step in `hamza`; A15 tanween after all
 * three short vowels. A1, A3 to A6, A8 to A14 and A16 to A18 agree with the
 * links as they were.
 *
 * READING STRANDS (ADR 0002, CM-B32; ADR status Proposed). The keys
 * `read:phrase`, `read:sentence`, `comp:literal`, `listen:contrast:<a>:<b>`
 * and `pa:first_sound` and four links (`word:*` and `joined:any` before
 * `read:phrase` and `read:sentence`) await the curriculum lead's review like
 * the links above. They have no stage: like words, they sit at nodes, and
 * whether a phrase is fair at a node is the decodability check (CM-B34). Not
 * linked on purpose: `read:sentence` before `comp:literal`, because
 * `comp:literal` is also heard comprehension, which needs no reading; and
 * `meaning@family` per content word, which is a skill per word, not a key
 * pattern.
 *
 * IDENTICAL COPIES of this file live in:
 *   kalam-readers-backend/supabase/functions/_shared/core/domain/content-model/skill_graph.ts
 *   studio/packages/curriculum-schemas/src/skill_graph.ts
 * `scripts/sync-content-model.ts` copies it; `content-model-drift.test.ts` (both
 * repos) fails when the copies differ. The file therefore imports nothing and
 * targets ES2020.
 */

// ---------------------------------------------------------------------------
// Unit keys (design 2.2)
// ---------------------------------------------------------------------------

const LETTER_ID = /^[a-z][a-z_]*$/;
const FORM = /^(isolated|initial|medial|final)$/;
const SOUND_HARAKA = /^(fatha|damma|kasra|sukoon)$/;
const MADD = /^madd$/;
const HARAKA_ID =
  /^(fatha|damma|kasra|sukoon|fathatan|dammatan|kasratan|shadda|shadda_fatha|shadda_damma|shadda_kasra|shadda_fathatan|shadda_dammatan|shadda_kasratan)$/;
const VOCAB_ID = /^[a-z][a-z_]*$/;
const SLUG = /^[a-z0-9][a-z0-9_-]*$/;
const ROW_ID = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

interface KeyForm {
  /** Required segments after the namespace. */
  segments: readonly RegExp[];
  /** One optional trailing segment. */
  optional?: RegExp;
  /** Name fixed now, nothing built yet (N6, ADR 0002). */
  reserved?: boolean;
}

interface NamespaceSpec extends KeyForm {
  /** Used only inside this graph (as a `child_of` destination), never in the index. */
  graphOnly?: boolean;
  /**
   * Alternative shapes, in place of `segments`/`optional`: the key matches
   * when one form matches. Each form can be reserved on its own
   * (`read:sentence` is built, `read:unvowelled` is reserved).
   */
  forms?: readonly KeyForm[];
}

const NONE: readonly RegExp[] = [];

/**
 * Every key namespace and the shape of its segments. The reading strands
 * (ADR 0002, CM-B32) are listed form by form: `read:phrase` and
 * `read:sentence` (decoding), `comp:literal` (comprehension),
 * `listen:contrast:<a>:<b>` and `pa:first_sound` (phonological awareness).
 * The reserved names keep their place and are not built: `read:unvowelled`,
 * `comp:inference`, `pa:syllable_count`, `pa:rhyme`, `fluency:text`. The
 * earlier reserved `listen:sentence`, `listen:story` (now `comp:literal` with
 * input `heard`) and `pa:initial_sound` (now `pa:first_sound`) are gone: one
 * name for each thing.
 */
export const UNIT_KEY_NAMESPACES = {
  letter: { segments: [LETTER_ID] },
  form: { segments: [LETTER_ID, FORM] },
  sound: { segments: [LETTER_ID, SOUND_HARAKA], optional: MADD },
  haraka: { segments: [HARAKA_ID] },
  rule: { segments: [VOCAB_ID] },
  joined: { segments: [LETTER_ID] },
  word: { segments: [ROW_ID] },
  family: { segments: [SLUG] },
  concept: { segments: [SLUG] },
  read: {
    segments: NONE,
    forms: [
      { segments: [/^(phrase|sentence)$/] },
      { segments: [/^unvowelled$/], reserved: true },
    ],
  },
  comp: {
    segments: NONE,
    forms: [
      { segments: [/^literal$/] },
      { segments: [/^inference$/], reserved: true },
    ],
  },
  listen: {
    segments: NONE,
    // the two letter ids in alphabetical order, never the same (checked below)
    forms: [{ segments: [/^contrast$/, LETTER_ID, LETTER_ID] }],
  },
  pa: {
    segments: NONE,
    forms: [
      { segments: [/^first_sound$/] },
      { segments: [/^(syllable_count|rhyme)$/], reserved: true },
    ],
  },
  fluency: { segments: NONE, forms: [{ segments: [/^text$/], reserved: true }], reserved: true },
  stage: { segments: [VOCAB_ID], graphOnly: true },
} as const satisfies Record<string, NamespaceSpec>;

export type UnitKeyNamespace = keyof typeof UNIT_KEY_NAMESPACES;

function specOf(namespace: string): NamespaceSpec | null {
  return Object.prototype.hasOwnProperty.call(UNIT_KEY_NAMESPACES, namespace)
    ? (UNIT_KEY_NAMESPACES as Record<string, NamespaceSpec>)[namespace] ?? null
    : null;
}

function isWildcard(segment: string): boolean {
  return segment === '*' || /^\$[a-z][a-z0-9_]*$/.test(segment);
}

function formMatches(form: KeyForm, rest: readonly string[], allowWildcards: boolean): boolean {
  const required = form.segments.length;
  if (rest.length !== required && !(form.optional && rest.length === required + 1)) return false;
  for (let i = 0; i < rest.length; i++) {
    const segment = rest[i] ?? '';
    if (allowWildcards && isWildcard(segment)) continue;
    const re = i < required ? form.segments[i] : form.optional;
    if (!re || !re.test(segment)) return false;
  }
  return true;
}

/** The form of the namespace spec that `rest` matches, or null. */
function matchingForm(spec: NamespaceSpec, rest: readonly string[], allowWildcards: boolean) {
  const forms: readonly KeyForm[] = spec.forms ?? [spec];
  for (const form of forms) if (formMatches(form, rest, allowWildcards)) return form;
  return null;
}

function checkShape(key: string, allowWildcards: boolean): boolean {
  const parts = key.split(':');
  const namespace = parts[0] ?? '';
  const rest = parts.slice(1);
  const spec = specOf(namespace);
  if (!spec || !matchingForm(spec, rest, allowWildcards)) return false;
  // madd only with a short vowel: never `sound:<letter>:sukoon:madd`
  if (namespace === 'sound' && rest.length === 3 && rest[1] === 'sukoon') return false;
  // a sound pair has one key: `listen:contrast:<a>:<b>` with a before b
  if (namespace === 'listen' && rest[0] === 'contrast') {
    const a = rest[1] ?? '';
    const b = rest[2] ?? '';
    if (!(allowWildcards && (isWildcard(a) || isWildcard(b))) && !(a < b)) return false;
  }
  return true;
}

/** Whether `key` is a concrete unit key of a known namespace (`sound:kaf:kasra`). */
export function isValidUnitKey(key: string): boolean {
  return checkShape(key, false);
}

/** Whether `pattern` is a valid key pattern: a unit key whose segments may be `*` or `$name`. */
export function isValidKeyPattern(pattern: string): boolean {
  return checkShape(pattern, true);
}

/** `<namespace>:...` -> the namespace, or null. */
export function namespaceOf(key: string): UnitKeyNamespace | null {
  const namespace = key.split(':')[0] ?? '';
  return specOf(namespace) ? (namespace as UnitKeyNamespace) : null;
}

/**
 * Whether a valid unit key is a reserved name: fixed now so nothing else takes
 * it, nothing built for it (N6, ADR 0002): `read:unvowelled`,
 * `comp:inference`, `pa:syllable_count`, `pa:rhyme`, `fluency:text`. False for
 * an invalid key.
 */
export function isReservedUnitKey(key: string): boolean {
  const parts = key.split(':');
  const spec = specOf(parts[0] ?? '');
  if (!spec || !isValidUnitKey(key)) return false;
  return !!spec.reserved || !!matchingForm(spec, parts.slice(1), false)?.reserved;
}

// ---------------------------------------------------------------------------
// Reading-strand keys (ADR 0002 section 1, CM-B32)
// ---------------------------------------------------------------------------

/** Reads a short group of 2 to 4 words that is not a full sentence. Decoding strand. */
export const READ_PHRASE_KEY = 'read:phrase';
/** Reads a whole sentence of 2 to 6 words. Decoding strand. */
export const READ_SENTENCE_KEY = 'read:sentence';
/** Understands what a phrase, sentence or story plainly says, read or heard. Comprehension strand. */
export const COMP_LITERAL_KEY = 'comp:literal';
/** Hears a word and picks the sound it starts with. Phonological strand. */
export const PA_FIRST_SOUND_KEY = 'pa:first_sound';

/** The names ADR 0002 keeps reserved; each needs its own record before it is built. */
export const RESERVED_READING_KEYS: readonly string[] = [
  'read:unvowelled',
  'comp:inference',
  'pa:syllable_count',
  'pa:rhyme',
  'fluency:text',
];

/**
 * The key of a heard sound pair, `listen:contrast:<a>:<b>`: the two
 * `letters.id` values in alphabetical order, so a pair has one key whichever
 * way it is given. Null when the ids are the same or not letter ids.
 */
export function listenContrastKey(letterA: string, letterB: string): string | null {
  if (letterA === letterB || !LETTER_ID.test(letterA) || !LETTER_ID.test(letterB)) return null;
  const [a, b] = letterA < letterB ? [letterA, letterB] : [letterB, letterA];
  return `listen:contrast:${a}:${b}`;
}

/** The two letter ids of a `listen:contrast:<a>:<b>` key, or null. */
export function listenContrastLetters(key: string): [string, string] | null {
  const parts = key.split(':');
  if (parts[0] !== 'listen' || parts[1] !== 'contrast' || !isValidUnitKey(key)) return null;
  return [parts[2] as string, parts[3] as string];
}

/**
 * Connected text: the unit keys a whole phrase, sentence or story answer
 * credits (ADR 0002, "How evidence is counted"). An item that targets one of
 * them gives no evidence to the units of each word inside it.
 */
export function isConnectedTextKey(key: string): boolean {
  return key === READ_PHRASE_KEY || key === READ_SENTENCE_KEY || key === COMP_LITERAL_KEY;
}

export type KeyBindings = Readonly<Record<string, string>>;

/**
 * Match a concrete key against a pattern. Returns the variable bindings (empty
 * when the pattern has no `$name`), or null when it does not match.
 */
export function matchKeyPattern(
  pattern: string,
  key: string,
  bindings: KeyBindings = {},
): KeyBindings | null {
  const p = pattern.split(':');
  const k = key.split(':');
  if (p.length !== k.length) return null;
  const out: Record<string, string> = { ...bindings };
  for (let i = 0; i < p.length; i++) {
    const ps = p[i] ?? '';
    const ks = k[i] ?? '';
    if (ps === '*') continue;
    if (ps.charAt(0) === '$') {
      const bound = out[ps];
      if (bound === undefined) out[ps] = ks;
      else if (bound !== ks) return null;
      continue;
    }
    if (ps !== ks) return null;
  }
  return out;
}

/** Replace the bound `$name` segments of a pattern; unbound wildcards stay. */
export function substituteKeyPattern(pattern: string, bindings: KeyBindings): string {
  return pattern
    .split(':')
    .map((s) => (s.charAt(0) === '$' && bindings[s] !== undefined ? bindings[s] : s))
    .join(':');
}

// ---------------------------------------------------------------------------
// The links
// ---------------------------------------------------------------------------

export const SKILL_LINK_TYPES = ['prerequisite', 'child_of'] as const;

export type SkillLinkType = (typeof SKILL_LINK_TYPES)[number];

export interface SkillLink {
  /** A key pattern. */
  origin: string;
  /** A key pattern. For `child_of`, concrete once the origin's `$name`s are bound. */
  destination: string;
  type: SkillLinkType;
}

function prerequisite(origin: string, destination: string): SkillLink {
  return { origin, destination, type: 'prerequisite' };
}

function childOf(origin: string, destination: string): SkillLink {
  return { origin, destination, type: 'child_of' };
}

const SHORT_VOWEL_HARAKAT = ['haraka:fatha', 'haraka:kasra', 'haraka:damma'];
const TANWEEN_RULES = ['rule:tanween_fath', 'rule:tanween_damm', 'rule:tanween_kasr'];

export const SKILL_LINKS: readonly SkillLink[] = [
  // --- prerequisites (design 2.14, CM-B19 seed) ---------------------------
  prerequisite('rule:sukoon', 'rule:shadda'),
  prerequisite('rule:sukoon', 'rule:al_qamariyya'),
  prerequisite('rule:shadda', 'rule:al_shamsiyya'),
  // short vowel -> madd: each long vowel needs its own short vowel
  prerequisite('sound:*:fatha', 'rule:madd_alif'),
  prerequisite('sound:*:damma', 'rule:madd_waw'),
  prerequisite('sound:*:kasra', 'rule:madd_ya'),
  prerequisite('sound:*:fatha', 'rule:madd_dagger'),
  // letter -> sound: a letter before its own sounds
  prerequisite('letter:$l', 'sound:$l:*'),
  // tanween after all three short vowels (review A15): each mark is a doubled short vowel
  ...SHORT_VOWEL_HARAKAT.flatMap((h) => TANWEEN_RULES.map((t) => prerequisite(h, t))),
  // the connecting hamza: al- first, its other words later (review A7)
  prerequisite('rule:hamzat_wasl', 'rule:hamzat_wasl_other'),
  // reading connected text (ADR 0002, CM-B32): word reading before phrase and
  // sentence reading, and a word in a phrase is written joined, so the joined
  // shapes come first too (ADR 0002 section 3). Which words a given phrase
  // needs is data, checked by decodability (CM-B34), not a link.
  prerequisite('word:*', 'read:phrase'),
  prerequisite('word:*', 'read:sentence'),
  prerequisite('joined:any', 'read:phrase'),
  prerequisite('joined:any', 'read:sentence'),

  // --- taxonomy: connected forms (N1, 2.4) ---------------------------------
  childOf('joined:ayn', 'joined:any'),
  childOf('joined:ghayn', 'joined:any'),
  childOf('joined:heh', 'joined:any'),
  childOf('joined:kaf', 'joined:any'),
  childOf('joined:yaa', 'joined:any'),

  // --- taxonomy: sounds under their haraka or rule (2.13) ------------------
  childOf('sound:*:fatha', 'haraka:fatha'),
  childOf('sound:*:kasra', 'haraka:kasra'),
  childOf('sound:*:damma', 'haraka:damma'),
  childOf('sound:*:sukoon', 'haraka:sukoon'),
  childOf('sound:*:fatha:madd', 'rule:madd_alif'),
  childOf('sound:*:damma:madd', 'rule:madd_waw'),
  childOf('sound:*:kasra:madd', 'rule:madd_ya'),

  // --- taxonomy: composite harakat under their part -------------------------
  childOf('haraka:fathatan', 'rule:tanween_fath'),
  childOf('haraka:dammatan', 'rule:tanween_damm'),
  childOf('haraka:kasratan', 'rule:tanween_kasr'),
  childOf('haraka:shadda_fatha', 'haraka:shadda'),
  childOf('haraka:shadda_damma', 'haraka:shadda'),
  childOf('haraka:shadda_kasra', 'haraka:shadda'),
  childOf('haraka:shadda_fathatan', 'haraka:shadda'),
  childOf('haraka:shadda_dammatan', 'haraka:shadda'),
  childOf('haraka:shadda_kasratan', 'haraka:shadda'),

  // --- taxonomy: stages (2.5 stage labels) ---------------------------------
  childOf('letter:*', 'stage:letters_isolated'),
  childOf('form:*:*', 'stage:letter_forms'),
  childOf('joined:any', 'stage:letter_forms'),
  childOf('rule:non_connector', 'stage:letter_forms'),
  childOf('rule:lam_alif', 'stage:letter_forms'),
  // ة: its shape with the letter shapes, its reading (t / h at a stop) with tanween (review A2)
  childOf('letter:ta_marbuta', 'stage:letter_forms'),
  childOf('haraka:fatha', 'stage:fatha'),
  childOf('haraka:kasra', 'stage:kasra'),
  childOf('haraka:damma', 'stage:damma'),
  childOf('haraka:sukoon', 'stage:sukoon'),
  childOf('rule:sukoon', 'stage:sukoon'),
  childOf('rule:qalqala', 'stage:sukoon'),
  childOf('haraka:shadda', 'stage:shadda'),
  childOf('rule:shadda', 'stage:shadda'),
  childOf('rule:madd_alif', 'stage:madd'),
  childOf('rule:madd_waw', 'stage:madd'),
  childOf('rule:madd_ya', 'stage:madd'),
  childOf('rule:madd_dagger', 'stage:madd'),
  childOf('rule:alif_maqsura', 'stage:madd'),
  childOf('rule:tanween_fath', 'stage:tanween'),
  childOf('rule:tanween_damm', 'stage:tanween'),
  childOf('rule:tanween_kasr', 'stage:tanween'),
  childOf('rule:seat_alif', 'stage:tanween'),
  childOf('rule:ta_marbuta', 'stage:tanween'),
  childOf('rule:al_shamsiyya', 'stage:al'),
  childOf('rule:al_qamariyya', 'stage:al'),
  childOf('rule:hamzat_wasl', 'stage:al'),
  childOf('rule:hamza_seat', 'stage:hamza'),
  childOf('rule:hamzat_wasl_other', 'stage:hamza'),
];

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * The links whose destination matches a concrete key, with the origin's bound
 * `$name`s filled in. Origins can still hold `*` (`sound:*:fatha` before
 * `rule:madd_alif`: the fatha sounds in general).
 */
export function linksInto(
  key: string,
  type: SkillLinkType,
  links: readonly SkillLink[] = SKILL_LINKS,
): string[] {
  const out: string[] = [];
  for (const link of links) {
    if (link.type !== type) continue;
    const bindings = matchKeyPattern(link.destination, key);
    if (bindings) out.push(substituteKeyPattern(link.origin, bindings));
  }
  return out;
}

/** The links whose origin matches a concrete key, destinations filled in. */
export function linksFrom(
  key: string,
  type: SkillLinkType,
  links: readonly SkillLink[] = SKILL_LINKS,
): string[] {
  const out: string[] = [];
  for (const link of links) {
    if (link.type !== type) continue;
    const bindings = matchKeyPattern(link.origin, key);
    if (bindings) out.push(substituteKeyPattern(link.destination, bindings));
  }
  return out;
}

/** The direct prerequisites of a concrete key, as key patterns. */
export function prerequisitesOf(key: string, links: readonly SkillLink[] = SKILL_LINKS): string[] {
  return linksInto(key, 'prerequisite', links);
}

/** True when a key pattern has no `*` or `$name` segment. */
function isConcretePattern(pattern: string): boolean {
  return pattern.split(':').every((s) => !isWildcard(s));
}

/**
 * The `child_of` parents of a concrete key. A link whose origin is exactly the
 * key takes the place of the pattern links that also match it.
 */
export function parentsOf(key: string, links: readonly SkillLink[] = SKILL_LINKS): string[] {
  const exact = links.filter((l) =>
    l.type === 'child_of' && l.origin === key && isConcretePattern(l.origin)
  );
  if (exact.length) return exact.map((l) => l.destination);
  return linksFrom(key, 'child_of', links);
}

/**
 * The stage labels a concrete key reaches through `child_of` links (every
 * ancestor of the form `stage:<label>`). A unit that belongs to a stage has
 * exactly one; words, families and concepts have none.
 */
export function stagesOf(key: string, links: readonly SkillLink[] = SKILL_LINKS): string[] {
  const stages: string[] = [];
  const seen: Record<string, true> = {};
  const queue = [key];
  while (queue.length) {
    const current = queue.shift() as string;
    if (seen[current]) continue;
    seen[current] = true;
    if (current.indexOf('stage:') === 0) {
      stages.push(current.slice('stage:'.length));
      continue;
    }
    for (const parent of parentsOf(current, links)) queue.push(parent);
  }
  return stages;
}

export interface ConcreteLink {
  origin: string;
  destination: string;
  type: SkillLinkType;
}

/** Every concrete pair a set of links produces over a set of concrete keys. */
export function expandLinks(
  keys: readonly string[],
  links: readonly SkillLink[] = SKILL_LINKS,
): ConcreteLink[] {
  const byNamespace: Record<string, string[]> = {};
  for (const key of keys) {
    const namespace = key.split(':')[0] ?? '';
    (byNamespace[namespace] = byNamespace[namespace] ?? []).push(key);
  }
  const out: ConcreteLink[] = [];
  for (const link of links) {
    const origins = byNamespace[link.origin.split(':')[0] ?? ''] ?? [];
    const destinations = byNamespace[link.destination.split(':')[0] ?? ''] ?? [];
    for (const origin of origins) {
      const bindings = matchKeyPattern(link.origin, origin);
      if (!bindings) continue;
      for (const destination of destinations) {
        if (destination === origin) continue;
        if (matchKeyPattern(link.destination, destination, bindings)) {
          out.push({ origin, destination, type: link.type });
        }
      }
    }
  }
  return out;
}

export interface SequenceViolation {
  origin: string;
  destination: string;
  originStage: string;
  destinationStage: string;
}

/**
 * The prerequisite pairs (over a set of concrete keys) whose origin's stage
 * comes after the destination's stage in a teaching order (the `stages` of a
 * `teaching_sequences.ts` sequence). A pair inside one stage is allowed. Keys
 * with no stage, or a stage the order does not list, are skipped; the tests
 * check separately that every staged key has exactly one stage.
 */
export function sequenceViolations(
  stages: readonly string[],
  keys: readonly string[],
  links: readonly SkillLink[] = SKILL_LINKS,
): SequenceViolation[] {
  const out: SequenceViolation[] = [];
  for (const l of expandLinks(keys, links)) {
    if (l.type !== 'prerequisite') continue;
    const originStage = stagesOf(l.origin, links)[0];
    const destinationStage = stagesOf(l.destination, links)[0];
    if (originStage === undefined || destinationStage === undefined) continue;
    const o = stages.indexOf(originStage);
    const d = stages.indexOf(destinationStage);
    if (o >= 0 && d >= 0 && o > d) {
      out.push({ origin: l.origin, destination: l.destination, originStage, destinationStage });
    }
  }
  return out;
}

/**
 * A cycle in the `prerequisite` links over a set of concrete keys, as the keys
 * along it (first key repeated at the end), or null when there is none.
 */
export function findPrerequisiteCycle(
  keys: readonly string[],
  links: readonly SkillLink[] = SKILL_LINKS,
): string[] | null {
  const next: Record<string, string[]> = {};
  for (const l of expandLinks(keys, links)) {
    if (l.type !== 'prerequisite') continue;
    (next[l.origin] = next[l.origin] ?? []).push(l.destination);
  }
  const state: Record<string, 1 | 2> = {};
  const path: string[] = [];
  const visit = (key: string): string[] | null => {
    if (state[key] === 2) return null;
    if (state[key] === 1) return path.slice(path.indexOf(key)).concat(key);
    state[key] = 1;
    path.push(key);
    for (const n of next[key] ?? []) {
      const cycle = visit(n);
      if (cycle) return cycle;
    }
    path.pop();
    state[key] = 2;
    return null;
  };
  for (const key of Object.keys(next)) {
    const cycle = visit(key);
    if (cycle) return cycle;
  }
  return null;
}
