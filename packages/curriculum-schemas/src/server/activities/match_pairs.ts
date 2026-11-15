/**
 * Match Pairs: the child draws lines from the items on the left to their
 * matches on the right (letter to letter form, letter to sound, word to
 * picture, any combination).
 *
 * Write (content model CM-B12, design 3.1): each side is a content item
 * without an id (`ContentRefWriteSchema`; ADR 0090 names it by its path
 * `pairs.<n>.left`): `kind` and one reference payload (a letter reference, a
 * library word, an image or audio asset, a numeral) and an optional authoring
 * `label`. Not sent by a save, because the server derives them for v1 (R2):
 * `type`, the glyph, word or URL copy `value`, `audioUrl`, the flat
 * `letterId` / `form` / `haraka`, and the target letter's clip
 * `targetLetterAudioUrl` (the letter owns its sound, as in
 * `audio_letter_match`). Optional `targetLetter` (what v2 asks for) and the
 * structured `prompt`.
 *
 * @example
 * ```
 * {
 *   pairs: [
 *     { left: { kind: 'letter', letter: { letterId: 'ba', form: 'isolated' } },
 *       right: { kind: 'letter', letter: { letterId: 'ba', form: 'medial' } } },
 *     { left: { kind: 'letter', letter: { letterId: 'ba', form: 'isolated', haraka: 'fatha' } },
 *       right: { kind: 'audio', audio: { assetId: 'f19c9c92-e369-472e-9888-fcc4cd89d2d2' } } },
 *   ],
 *   shuffleItems: true,
 * }
 * ```
 *
 * Read (every PROD shape, 21 rows, 83 pairs): `type` becomes `kind`; a letter
 * side's flat `letterId` / `form` / `haraka` (else its glyph `value`) a
 * letter reference; a word `value` a word item with the text as hint; an
 * image `value` an image item with the URL as hint; an audio side with an
 * `audioId` (an `audio_assets` id, kept by the asset registry, D8) an audio
 * asset reference, else its URL as hint until S5. `label` is kept.
 */

import { z } from 'zod';
import { BaseActivitySchema } from '../base.ts';
import {
  ConditionalAudioSchema,
  type ConfigRecord,
  ContentItemStoredSchema,
  ContentRefWriteSchema,
  filledString,
  isRecord,
  makeReadSchema,
  PromptStoredSchema,
  PromptWriteSchema,
  readContentText,
  readKindedItem,
  readLetterGlyph,
  readLetterRef,
  readPrompt,
  readTargetLetter,
  TargetLetterStoredSchema,
  TargetLetterWriteSchema,
  withoutKeys,
} from '../references.ts';

/** One side of a pair: a content item named by its path. */
export const MatchItemSchema = ContentRefWriteSchema;
export type MatchItem = z.infer<typeof MatchItemSchema>;

export const MatchPairSchema = z.object({
  left: MatchItemSchema.describe('Item displayed on the left side'),
  right: MatchItemSchema.describe('Item displayed on the right side'),
}).strict();

export type MatchPair = z.infer<typeof MatchPairSchema>;

export const MatchPairsConfigSchema = z.object({
  pairs: z.array(MatchPairSchema)
    .min(2, 'At least 2 pairs required')
    .max(4, 'Maximum 4 pairs allowed')
    .describe('The pairs to match (2-4 pairs)'),
  shuffleItems: z.boolean().optional()
    .describe('Whether to shuffle the right side items'),
  targetLetter: TargetLetterWriteSchema.optional()
    .describe('The letter the pairs practise'),
  prompt: PromptWriteSchema.optional()
    .describe('What the matching asks'),
  conditionalAudio: ConditionalAudioSchema.optional(),
}).strict();

export type MatchPairsConfig = z.infer<typeof MatchPairsConfigSchema>;

export const MatchPairsActivitySchema = BaseActivitySchema.extend({
  type: z.literal('match_pairs'),
  config: MatchPairsConfigSchema,
});

export type MatchPairsActivity = z.infer<typeof MatchPairsActivitySchema>;

// ============================================================================
// READ SCHEMA
// ============================================================================

/** One stored pair side as a content item. */
export function readMatchItem(item: unknown): unknown {
  if (!isRecord(item)) return item;
  if (item.kind !== undefined) return readKindedItem(item);
  const base: ConfigRecord = typeof item.label === 'string' && item.label
    ? { label: item.label }
    : {};
  const value = filledString(item.value);
  switch (item.type) {
    case 'letter': {
      if (typeof item.letterId === 'string') {
        return { ...base, kind: 'letter', letter: readLetterRef(item) };
      }
      const glyph = value ? readLetterGlyph(value) : null;
      return glyph ? { ...base, kind: 'letter', letter: glyph } : { ...base, type: item.type };
    }
    case 'word': {
      const text = value ? readContentText(value) : null;
      return text ? { ...base, ...text } : { ...base, type: item.type };
    }
    case 'image':
      return value
        ? { ...base, kind: 'image', image: { url: value } }
        : { ...base, type: item.type };
    case 'audio': {
      if (filledString(item.audioId)) {
        return { ...base, kind: 'audio', audio: { assetId: item.audioId } };
      }
      const url = filledString(item.audioUrl) ?? value;
      return url ? { ...base, kind: 'audio', audio: { url } } : { ...base, type: item.type };
    }
    default:
      return item;
  }
}

function readPair(pair: unknown): unknown {
  if (!isRecord(pair)) return pair;
  return { ...pair, left: readMatchItem(pair.left), right: readMatchItem(pair.right) };
}

function normalizeMatchPairs(config: ConfigRecord): ConfigRecord {
  const next = withoutKeys(config, ['targetLetterAudioUrl', 'targetLetterAudioId']);
  if (Array.isArray(config.pairs)) next.pairs = config.pairs.map(readPair);
  if (config.targetLetter !== undefined) next.targetLetter = readTargetLetter(config.targetLetter);
  if (config.prompt !== undefined) next.prompt = readPrompt(config.prompt);
  return next;
}

export const MatchPairsReadSchema = makeReadSchema(
  normalizeMatchPairs,
  z.object({
    pairs: z.array(
      z.object({ left: ContentItemStoredSchema, right: ContentItemStoredSchema }).passthrough(),
    ).min(1),
    targetLetter: TargetLetterStoredSchema.optional(),
    prompt: PromptStoredSchema.optional(),
  }).passthrough(),
);
