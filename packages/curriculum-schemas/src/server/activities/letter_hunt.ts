/**
 * Letter hunts: find the target letter among distractors in a scene (content
 * model CM-B7, design 5, "one shared `TargetWithDistractors` schema").
 *
 * Every hunt stores `targetLetter` (one reference or several: arity is
 * meaning) and `distractorLetters`, authored by Studio's shared
 * `TargetLetterWithDistractorsForm`. The 15 themed hunts below have no other
 * content; the six older hunts (`pop_balloons_with_letter`, `letter_rain`,
 * `catch_fish_with_letter`, `i_spy`, `audio_letter_match`,
 * `letter_discrimination`) build on the same base in their own files.
 *
 * Write schema: the base fields plus the type's own optional settings,
 * strict. Read schema: every element read as a reference, the legacy
 * `showArabicLabels` (piggy_bank) read as `showArabicLabel`, extra keys kept.
 */

import { z } from 'zod';
import {
  ConditionalAudioSchema,
  type ConfigRecord,
  LetterRefStoredSchema,
  LetterRefWriteSchema,
  makeReadSchema,
  readLetterList,
  readTargetLetter,
  TargetLetterStoredSchema,
  TargetLetterWriteSchema,
} from '../references.ts';

const LetterFormSchema = z.enum(['isolated', 'initial', 'medial', 'final']);

/** The fields every hunt shares: content plus the settings the Studio form writes. */
export const LETTER_HUNT_BASE_FIELDS = {
  targetLetter: TargetLetterWriteSchema,
  distractorLetters: z.array(LetterRefWriteSchema).optional(),
  targetCount: z.number().int().positive().optional(),
  totalItems: z.number().int().positive().optional(),
  duration: z.number().int().positive().optional(),
  letterPositions: z.array(LetterFormSchema).min(1).optional(),
  showArabicLabel: z.boolean().optional(),
  conditionalAudio: ConditionalAudioSchema.optional(),
} as const;

export type LetterHuntExtras = z.ZodRawShape;

/** A hunt's write schema: the base fields and the type's own settings, strict. */
export function makeLetterHuntWriteSchema<E extends LetterHuntExtras>(extras: E) {
  return z.object({ ...LETTER_HUNT_BASE_FIELDS, ...extras }).strict();
}

/** Keys a hunt read renames to the canonical key. */
const LEGACY_HUNT_KEYS: Readonly<Record<string, string>> = { showArabicLabels: 'showArabicLabel' };

/**
 * The hunt normaliser: `targetLetter` and `distractorLetters` read as
 * references, legacy keys renamed (the canonical key wins when both exist).
 * `before` runs first, for a type's own legacy keys.
 */
export function normalizeLetterHunt(
  config: ConfigRecord,
  before: (config: ConfigRecord) => ConfigRecord = (c) => c,
): ConfigRecord {
  const next: ConfigRecord = { ...before(config) };
  for (const [legacy, canonical] of Object.entries(LEGACY_HUNT_KEYS)) {
    if (legacy in next) {
      if (next[canonical] === undefined) next[canonical] = next[legacy];
      delete next[legacy];
    }
  }
  if ('targetLetter' in next) next.targetLetter = readTargetLetter(next.targetLetter);
  if ('distractorLetters' in next) next.distractorLetters = readLetterList(next.distractorLetters);
  return next;
}

/** The tolerant stored hunt: a readable target, readable distractors, any other keys. */
export const LetterHuntStoredSchema = z
  .object({
    targetLetter: TargetLetterStoredSchema,
    distractorLetters: z.array(LetterRefStoredSchema).optional(),
  })
  .passthrough();

/** A hunt's read schema (`before` maps the type's own legacy keys). */
export function makeLetterHuntReadSchema(before?: (config: ConfigRecord) => ConfigRecord) {
  return makeReadSchema((config) => normalizeLetterHunt(config, before), LetterHuntStoredSchema);
}

// ============================================================================
// THE 15 THEMED HUNTS
// ============================================================================

/** Optional per-type settings seen on PROD (design 5: per-type optional flags). */
const THEMED_HUNT_EXTRAS = {
  grid_tap: { theme: z.string().min(1).optional() },
  ice_cream_stacking: {},
  pick_from_tree: { fruitType: z.string().min(1).optional() },
  piggy_bank: {},
  pick_flowers: {},
  bear_honey: {},
  snowflakes: {},
  balance_scale: {},
  plant_seeds: {},
  deliver_envelope: {},
  tap_crescent_moons: {},
  feed_baby: { bottleColor: z.string().min(1).optional() },
  drag_to_animal_mouth: {},
  fly_on_flowers: {},
  feed_rabbit: {},
} as const;

export type ThemedLetterHuntType = keyof typeof THEMED_HUNT_EXTRAS;

export const THEMED_LETTER_HUNT_TYPES = Object.keys(THEMED_HUNT_EXTRAS) as ThemedLetterHuntType[];

/** The plain shared write schema (no per-type settings). */
export const TargetWithDistractorsConfigSchema = makeLetterHuntWriteSchema({});

export type TargetWithDistractorsConfig = z.infer<typeof TargetWithDistractorsConfigSchema>;

function themedHuntSchemas(): Record<ThemedLetterHuntType, z.ZodTypeAny> {
  const schemas: Partial<Record<ThemedLetterHuntType, z.ZodTypeAny>> = {};
  for (const type of THEMED_LETTER_HUNT_TYPES) {
    schemas[type] = makeLetterHuntWriteSchema(THEMED_HUNT_EXTRAS[type]);
  }
  return schemas as Record<ThemedLetterHuntType, z.ZodTypeAny>;
}

/** Write schema per themed hunt. */
export const THEMED_LETTER_HUNT_CONFIG_SCHEMAS: Readonly<
  Record<ThemedLetterHuntType, z.ZodTypeAny>
> = themedHuntSchemas();

/** The one read schema every themed hunt shares. */
export const ThemedLetterHuntReadSchema = makeLetterHuntReadSchema();
