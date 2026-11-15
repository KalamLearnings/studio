/**
 * References inside activity configs, in two strengths (content model CM-B7,
 * CONTENT_MODEL_DESIGN.md 3.1 and 5).
 *
 * - **Write** schemas (`*WriteSchema`): what a save must send. Strict objects,
 *   references only, closed enums. Derived fields (every `text` and `url`
 *   hint, glyph copies) are rejected: the server writes them.
 * - **Read** helpers (`read*`): pure functions that map every legacy shape
 *   found on PROD to the canonical one (a glyph to a `LetterReference`,
 *   `haraka: 'none'` to no haraka, stray keys dropped). Each activity's read
 *   schema is built with `makeReadSchema` from a normaliser and a tolerant
 *   stored schema. The read schemas are deleted with Studio's
 *   `normalizeActivityConfig` shim (design 6, P8).
 *
 * Save validation is not on yet (CM-B8a turns it on, type by type).
 */

import { z } from 'zod';
import { HARAKA_IDS, harakaFromMarks, isHarakaType, stripHarakat, TATWEEL } from './harakat.ts';
import { isValidMadd, MADD_NEEDS_SHORT_VOWEL } from './madd.ts';
import { letterIdOfGlyph } from './letter-glyphs.ts';

// ============================================================================
// WRITE SCHEMAS
// ============================================================================

const LetterFormSchema = z.enum(['isolated', 'initial', 'medial', 'final']);

/**
 * A letter reference as a save must send it: `letterId`, `form`, an optional
 * haraka id (never `'none'`: no haraka is an absent field) and an optional
 * `madd` (D7). No glyph copy (`value`, `display`), no discriminator (`type`).
 */
export const LetterRefWriteSchema = z
  .object({
    letterId: z.string().min(1).max(20).regex(
      /^[a-z_]+$/,
      'Letter ID must be lowercase letters and underscores',
    ),
    form: LetterFormSchema,
    haraka: z.enum(HARAKA_IDS).optional(),
    madd: z.literal(true).optional(),
  })
  .strict()
  .superRefine((ref, ctx) => {
    if (!isValidMadd(ref)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['madd'],
        message: MADD_NEEDS_SHORT_VOWEL,
      });
    }
  });

export type LetterRefWrite = z.infer<typeof LetterRefWriteSchema>;

/**
 * A target letter: one reference or several. Arity is meaning (design 3.1
 * rule 3): an array lists forms or harakat of one letter (117 of 119 PROD
 * arrays) or several letters.
 */
export const TargetLetterWriteSchema = z.union([
  LetterRefWriteSchema,
  z.array(LetterRefWriteSchema).min(1, 'At least one target letter'),
]);

/**
 * A word in the library. `wordId` (`curriculum_words.id`) is authoritative;
 * the display `text` is a cached hint the server writes, so a save cannot
 * send it.
 */
export const WordRefWriteSchema = z.object({ wordId: z.string().min(1) }).strict();

/** An asset in the registry. `url` is a v1 hint the server writes. */
export const AssetRefWriteSchema = z.object({ assetId: z.string().min(1) }).strict();

/** What a content item is (design 3.1). `numeral` is new in CM-B12 (D17). */
export const CONTENT_KINDS = ['letter', 'word', 'image', 'audio', 'numeral'] as const;
export type ContentKind = typeof CONTENT_KINDS[number];

/**
 * A number shown as a numeral (D17): the 28 MCQ options that hold the digits
 * 0 to 4 on PROD. A whole number, never a word row.
 */
export const NumeralWriteSchema = z.number().int().nonnegative();

/** The payload fields of a content item, every one a reference (or a number). */
const CONTENT_PAYLOAD = {
  kind: z.enum(CONTENT_KINDS),
  letter: LetterRefWriteSchema.optional(),
  word: WordRefWriteSchema.optional(),
  image: AssetRefWriteSchema.optional(),
  audio: AssetRefWriteSchema.optional(),
  numeral: NumeralWriteSchema.optional(),
  label: z.string().optional(),
};

/** Exactly the payload of the item's `kind` is set. */
function checkOnePayload(item: Record<string, unknown>, ctx: z.RefinementCtx) {
  for (const kind of CONTENT_KINDS) {
    const set = item[kind] !== undefined;
    if (kind === item.kind && !set) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [kind],
        message: `a ${kind} item needs its ${kind}`,
      });
    }
    if (kind !== item.kind && set) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [kind],
        message: `only the ${item.kind} payload may be set`,
      });
    }
  }
}

/**
 * One content item of an answer set (CONTENT_ITEM_DESIGN.md, design 3.1): an
 * MCQ option or a card. `kind` on the item, exactly the matching payload set,
 * every payload a reference. `id` is the authored option id v1 reads (the
 * content index names items by path, ADR 0090). No display copy (`text`,
 * `value`, `image` string, `mode`): the server derives those for v1.
 */
export const ContentItemWriteSchema = z
  .object({
    id: z.string().min(1),
    ...CONTENT_PAYLOAD,
    isCorrect: z.boolean().optional(),
  })
  .strict()
  .superRefine(checkOnePayload);

export type ContentItemWrite = z.infer<typeof ContentItemWriteSchema>;

/**
 * A content item that is not an answer choice: a match pair side or a prompt
 * target. Same payload rules, no `id` (the item is named by its path, ADR
 * 0090) and no `isCorrect`.
 */
export const ContentRefWriteSchema = z
  .object(CONTENT_PAYLOAD)
  .strict()
  .superRefine(checkOnePayload);

export type ContentRefWrite = z.infer<typeof ContentRefWriteSchema>;

/**
 * What a choice asks (design 3.1, new in CM-B12): the skill kind of an MCQ,
 * match pairs or cards comes from it (`skills.ts` `kindFromPrompt`).
 */
export const PROMPT_KINDS = [
  'sound_to_symbol',
  'symbol_to_sound',
  'word_to_picture',
  'picture_to_word',
  'meaning',
  'form',
  'haraka',
  'count',
] as const;
export type PromptKind = typeof PROMPT_KINDS[number];

/**
 * The structured prompt: its `kind`, and `target`, what is asked about when
 * it is not the correct option (the word whose letters are asked, the letter
 * whose dots are counted). Replaces the stimulus copied into `question` and
 * `questionImage`.
 */
export const PromptWriteSchema = z
  .object({
    kind: z.enum(PROMPT_KINDS),
    target: ContentRefWriteSchema.optional(),
  })
  .strict();

export type PromptWrite = z.infer<typeof PromptWriteSchema>;

/**
 * Feedback audio rules (`conditionalAudio`), shared by every type. Not
 * content: it carries no letter, word or picture, so it is passed through
 * here and validated by its own owner.
 */
export const ConditionalAudioSchema = z.record(z.unknown());

// ============================================================================
// READ HELPERS (pure, legacy -> canonical)
// ============================================================================

export type ConfigRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is ConfigRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The canonical letter reference a read produces. */
export interface CanonicalLetterRef {
  letterId: string;
  form: 'isolated' | 'initial' | 'medial' | 'final';
  haraka?: z.infer<typeof LetterRefWriteSchema>['haraka'];
  madd?: true;
}

const FORMS = LetterFormSchema.options;

/**
 * A single-letter glyph string as a reference: harakat become `haraka`, a
 * tatweel before and/or after the letter gives the positional form (`ـبـ`
 * medial, `بـ` initial, `ـب` final). Null when the string is not exactly one
 * letter of `letters` (a word, a digit, Latin text, an empty string).
 */
export function readLetterGlyph(raw: string): CanonicalLetterRef | null {
  const text = raw.normalize('NFC').trim();
  if (!text) return null;
  const leading = text.startsWith(TATWEEL);
  const trailing = text.endsWith(TATWEEL) && text.length > 1;
  const bare = stripHarakat(text).split(TATWEEL).join('');
  if ([...bare].length !== 1) return null;
  const letterId = letterIdOfGlyph(bare);
  if (!letterId) return null;
  const form = leading && trailing
    ? 'medial'
    : trailing
    ? 'initial'
    : leading
    ? 'final'
    : 'isolated';
  const haraka = harakaFromMarks(text);
  return haraka ? { letterId, form, haraka } : { letterId, form };
}

/**
 * Any stored letter value as a canonical reference: a reference object
 * (stray keys such as `value`, `type`, `matchingForm` dropped; `haraka:
 * 'none'` and `madd: false` removed; a missing form read as `isolated`, the
 * form the v1 delivery uses) or a glyph string. Returns the value unchanged
 * when it cannot be read, so the stored schema reports it.
 */
export function readLetterRef(value: unknown): unknown {
  if (typeof value === 'string') return readLetterGlyph(value) ?? value;
  if (!isRecord(value) || typeof value.letterId !== 'string') return value;
  const form = typeof value.form === 'string' && (FORMS as readonly string[]).includes(value.form)
    ? value.form as CanonicalLetterRef['form']
    : value.form === undefined
    ? 'isolated'
    : value.form;
  const ref: ConfigRecord = { letterId: value.letterId, form };
  if (
    value.haraka !== undefined && value.haraka !== 'none' && value.haraka !== null &&
    value.haraka !== ''
  ) {
    ref.haraka = value.haraka;
  }
  if (value.madd === true) ref.madd = true;
  return ref;
}

/** A target letter: one value or an array, each element read as a reference. */
export function readTargetLetter(value: unknown): unknown {
  return Array.isArray(value) ? value.map(readLetterRef) : readLetterRef(value);
}

/** A list of letter values, each read as a reference. */
export function readLetterList(value: unknown): unknown {
  return Array.isArray(value) ? value.map(readLetterRef) : value;
}

/** A copy of the record without the given keys. */
export function withoutKeys(config: ConfigRecord, keys: readonly string[]): ConfigRecord {
  const next: ConfigRecord = { ...config };
  for (const key of keys) delete next[key];
  return next;
}

/** A copy of the record without keys whose value is `undefined`. */
export function compact(config: ConfigRecord): ConfigRecord {
  return Object.fromEntries(Object.entries(config).filter(([, v]) => v !== undefined));
}

/** True for a localized text whose every string is empty (`{ en: '', ar: '' }`). */
export function isEmptyLocalizedText(value: unknown): boolean {
  return isRecord(value) &&
    Object.values(value).every((v) => v === '' || v === null || v === undefined);
}

export const EMPTY_CONFIG_MESSAGE = 'Empty config: nothing to read';

/**
 * A read schema: the normaliser maps the stored config to the canonical shape
 * (pure, no I/O), the tolerant stored schema checks the result, and the
 * output is the normalised config itself (no defaults added, no keys
 * stripped). An empty config `{}` never reads: it has no content (design 5,
 * "empty configs rejected from day one").
 */
export function makeReadSchema(
  normalize: (config: ConfigRecord) => ConfigRecord,
  stored: z.ZodTypeAny,
): z.ZodType<ConfigRecord, z.ZodTypeDef, unknown> {
  return z.record(z.unknown()).transform((config, ctx) => {
    if (Object.keys(config).length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: EMPTY_CONFIG_MESSAGE });
      return z.NEVER;
    }
    const next = normalize(config);
    const result = stored.safeParse(next);
    if (!result.success) {
      for (const issue of result.error.issues) ctx.addIssue(issue);
      return z.NEVER;
    }
    return next;
  });
}

/** A tolerant stored letter reference: the canonical fields, any extra keys. */
export const LetterRefStoredSchema = z
  .object({
    letterId: z.string().min(1),
    form: LetterFormSchema,
    haraka: z.string().optional().refine(
      (h) => h === undefined || isHarakaType(h),
      'Unknown haraka id',
    ),
    madd: z.literal(true).optional(),
  })
  .passthrough();

export const TargetLetterStoredSchema = z.union([
  LetterRefStoredSchema,
  z.array(LetterRefStoredSchema).min(1, 'At least one target letter'),
]);

// ============================================================================
// CONTENT ITEMS: READ (CM-B12)
// ============================================================================

const ARABIC_INDIC_ZERO = 0x0660;
const EASTERN_ARABIC_INDIC_ZERO = 0x06f0;

/**
 * A string of digits (ASCII, Arabic-Indic or Eastern Arabic-Indic) as a
 * number; null for anything else. D17: the 28 PROD MCQ options holding `0` to
 * `4` read as numerals.
 */
export function readNumeral(raw: string): number | null {
  const text = raw.trim();
  if (!/^[0-9٠-٩۰-۹]{1,4}$/.test(text)) return null;
  let n = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    const digit = code >= EASTERN_ARABIC_INDIC_ZERO
      ? code - EASTERN_ARABIC_INDIC_ZERO
      : code >= ARABIC_INDIC_ZERO
      ? code - ARABIC_INDIC_ZERO
      : code - 48;
    n = n * 10 + digit;
  }
  return n;
}

/**
 * Authored text as the payload of a content item: digits are a numeral, one
 * letter glyph (tatweel for the form, marks for the haraka) a letter, any
 * other text a word with the text as its hint (S2/S3 resolves the `wordId`).
 * Null for blank text.
 */
export function readContentText(raw: string): ConfigRecord | null {
  if (!raw.trim()) return null;
  const numeral = readNumeral(raw);
  if (numeral !== null) return { kind: 'numeral', numeral };
  const letter = readLetterGlyph(raw);
  if (letter) return { kind: 'letter', letter };
  return { kind: 'word', word: { text: raw } };
}

/** The Arabic of a stored localized text (`{ ar }`) or plain string; '' when none. */
export function arabicText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (isRecord(value) && typeof value.ar === 'string') return value.ar;
  return '';
}

/** A non-blank string, else null. */
export function filledString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

/**
 * A stored item that already has `kind` (canonical, or written by a read):
 * its letter read as a canonical reference; everything else kept.
 */
export function readKindedItem(item: ConfigRecord): ConfigRecord {
  return item.letter !== undefined ? { ...item, letter: readLetterRef(item.letter) } : item;
}

/** A tolerant stored content item: a kind and its payload; hints and extra keys allowed. */
export const ContentItemStoredSchema = z.object({
  kind: z.enum(CONTENT_KINDS),
  letter: LetterRefStoredSchema.optional(),
  word: z.object({ wordId: z.string().optional(), text: z.string().optional() }).passthrough()
    .optional(),
  image: z.object({}).passthrough().optional(),
  audio: z.object({}).passthrough().optional(),
  numeral: z.number().optional(),
}).passthrough().refine(
  (item) => item[item.kind] !== undefined,
  (item) => ({ message: `A ${item.kind} item has no ${item.kind}`, path: [item.kind] }),
);

/** A tolerant stored prompt: a target item when present, any kind string. */
export const PromptStoredSchema = z.object({
  kind: z.string().optional(),
  target: ContentItemStoredSchema.optional(),
}).passthrough();

/** A stored prompt with its target item read like any kinded item. */
export function readPrompt(prompt: unknown): unknown {
  if (!isRecord(prompt) || !isRecord(prompt.target)) return prompt;
  return { ...prompt, target: readKindedItem(prompt.target) };
}
