/**
 * Teaching targets in Studio (content model CM-S8; CONTENT_MODEL_DESIGN.md
 * 2.11, 3.3). Pure helpers: which roles a scope declares, how a letter picker
 * selection or a rule becomes a unit key, which keys a save accepts, and how a
 * unit key reads in plain language. The vocabularies are the shared ones in
 * `@kalam/curriculum-schemas` (skill_graph, rules, teaching_sequences); the
 * backend checks the same rules on save (`INVALID_TEACHING_TARGETS`).
 */

import {
  HARAKA_META,
  RULE_META,
  UNIT_KEY_NAMESPACES,
  isHarakaType,
  isRuleId,
  isReservedUnitKey,
  isValidUnitKey,
  namespaceOf,
  type StageLabel,
} from '@kalam/curriculum-schemas';

export type TargetScopeType = 'curriculum' | 'topic';
export type TargetRole = 'focus' | 'review' | 'objective' | 'prerequisite';

/** The roles each scope declares (backend teaching-targets/targets.ts ROLES_BY_SCOPE). */
export const ROLES_BY_SCOPE: Readonly<Record<TargetScopeType, readonly TargetRole[]>> = {
  curriculum: ['objective', 'prerequisite'],
  topic: ['focus', 'review', 'prerequisite'],
};

export const MAX_TARGETS_PER_SCOPE = 64;

export const ROLE_LABELS: Record<TargetRole, { label: string; hint: string }> = {
  focus: { label: 'Focus', hint: 'What this topic teaches' },
  review: { label: 'Review', hint: 'What this topic revisits on purpose' },
  objective: { label: 'Objectives', hint: 'What a child can do after this level' },
  prerequisite: { label: 'Prerequisites', hint: 'What this assumes the child already knows' },
};

/** A target as a save sends it. */
export interface TargetInput {
  unit_key: string;
  skill?: string | null;
  role: TargetRole;
}

/** The declared keys of one scope, per role. */
export type TargetsByRole = Partial<Record<TargetRole, string[]>>;

/** The save body's `targets`: every role's keys in authored order, roles in scope order. */
export function toTargetInputs(scope: TargetScopeType, byRole: TargetsByRole): TargetInput[] {
  return ROLES_BY_SCOPE[scope].flatMap((role) =>
    (byRole[role] ?? []).map((unit_key) => ({ unit_key, role })),
  );
}

// ---------------------------------------------------------------------------
// From pickers to unit keys
// ---------------------------------------------------------------------------

/** The part of a letter picker reference the targets read. */
export interface PickedLetter {
  letterId: string;
  form?: string;
  haraka?: string | null;
  madd?: boolean;
}

const SOUND_VOWELS = new Set(['fatha', 'damma', 'kasra', 'sukoon']);

/**
 * The unit keys a letter picker reference declares: a letter with a short
 * vowel or sukoon is a sound (`sound:ba:fatha`, `:madd` when long); any other
 * mark adds the haraka (`haraka:shadda`) beside the letter or form; a form
 * other than isolated is a form (`form:ba:initial`); otherwise the letter.
 */
export function unitKeysOfLetter(ref: PickedLetter): string[] {
  const letter = ref.letterId;
  const haraka = ref.haraka ?? null;
  if (haraka && SOUND_VOWELS.has(haraka)) {
    const madd = ref.madd && haraka !== 'sukoon' ? ':madd' : '';
    return [`sound:${letter}:${haraka}${madd}`];
  }
  const base = ref.form && ref.form !== 'isolated' ? `form:${letter}:${ref.form}` : `letter:${letter}`;
  return haraka && haraka !== 'none' ? [base, `haraka:${haraka}`] : [base];
}

export function ruleUnitKey(ruleId: string): string {
  return `rule:${ruleId}`;
}

/**
 * Why a key cannot be declared, or null (mirrors the backend's
 * `unitKeyProblem`): not a unit key, a reserved strand, or a graph-only key.
 */
export function unitKeyProblem(key: string): string | null {
  if (!isValidUnitKey(key)) return `"${key}" is not a unit key`;
  const ns = namespaceOf(key);
  const spec = ns
    ? (UNIT_KEY_NAMESPACES[ns] as { reserved?: boolean; graphOnly?: boolean })
    : null;
  if (spec?.reserved || isReservedUnitKey(key)) return `"${key}" is in a strand that is not taught yet`;
  if (spec?.graphOnly) return `"${key}" is a stage; set the level's stage instead`;
  return null;
}

/** Add keys to a list, keeping order and dropping repeats. */
export function addKeys(list: readonly string[], keys: readonly string[]): string[] {
  const out = [...list];
  for (const k of keys) if (!out.includes(k)) out.push(k);
  return out;
}

// ---------------------------------------------------------------------------
// Plain language
// ---------------------------------------------------------------------------

/** How a letter reads in labels: its glyph and English name. */
export type LetterLookup = (letterId: string) => { char: string; name: string } | undefined;

const FORM_WORDS: Record<string, string> = {
  isolated: 'isolated',
  initial: 'initial',
  medial: 'middle',
  final: 'final',
};

function letterText(id: string, lookup?: LetterLookup): string {
  if (id === '*' || id.startsWith('$')) return 'any letter';
  const l = lookup?.(id);
  return l ? `${l.char} (${l.name})` : id;
}

function harakaText(id: string): string {
  if (id === '*' || id.startsWith('$')) return 'any mark';
  return isHarakaType(id) ? HARAKA_META[id].label.toLowerCase() : id.replace(/_/g, ' ');
}

export function ruleText(id: string): string {
  if (id === '*' || id.startsWith('$')) return 'any rule';
  return isRuleId(id) ? RULE_META[id].label : id.replace(/_/g, ' ');
}

/** A unit key (or key pattern) in plain language: `sound:ba:fatha` -> "ب (Ba) with fatha". */
export function describeUnitKey(key: string, lookup?: LetterLookup): string {
  const [ns, a = '', b = '', c] = key.split(':');
  switch (ns) {
    case 'letter':
      return letterText(a, lookup);
    case 'form':
      return `${letterText(a, lookup)}, ${FORM_WORDS[b] ?? b} form`;
    case 'sound':
      return `${letterText(a, lookup)} with ${harakaText(b)}${c === 'madd' ? ' (long)' : ''}`;
    case 'haraka':
      return `The ${harakaText(a)} mark`;
    case 'rule':
      return `Rule: ${ruleText(a)}`;
    case 'joined':
      return `${letterText(a, lookup)} joined to the next letter`;
    case 'word':
      return `Word ${a}`;
    case 'family':
      return `Word family ${a}`;
    case 'concept':
      return `Concept ${a.replace(/[_-]/g, ' ')}`;
    case 'stage':
      return `Stage: ${stageLabelText(a)}`;
    default:
      return key;
  }
}

const STAGE_TEXT: Record<StageLabel, string> = {
  letters_isolated: 'Letters on their own',
  letter_forms: 'Letter forms (joined letters)',
  fatha: 'Fatha',
  kasra: 'Kasra',
  damma: 'Damma',
  sukoon: 'Sukoon',
  shadda: 'Shadda',
  madd: 'Madd (long vowels)',
  tanween: 'Tanween',
  al: 'Al (the article)',
  hamza: 'Hamza',
};

/** A stage label in plain language. */
export function stageLabelText(stage: string): string {
  return (STAGE_TEXT as Record<string, string>)[stage] ?? stage.replace(/_/g, ' ');
}

/**
 * Split save errors (indexed into the `toTargetInputs` list) back to each
 * role's own positions, so the editor marks the right chip.
 */
export function issuesByRole(
  scope: TargetScopeType,
  byRole: TargetsByRole,
  byIndex: ReadonlyMap<number, string[]>,
): Partial<Record<TargetRole, Map<number, string[]>>> {
  const out: Partial<Record<TargetRole, Map<number, string[]>>> = {};
  let offset = 0;
  for (const role of ROLES_BY_SCOPE[scope]) {
    const count = (byRole[role] ?? []).length;
    const local = new Map<number, string[]>();
    for (let i = 0; i < count; i++) {
      const messages = byIndex.get(offset + i);
      if (messages) local.set(i, messages);
    }
    if (local.size) out[role] = local;
    offset += count;
  }
  return out;
}
