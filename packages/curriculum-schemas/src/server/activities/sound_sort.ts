/**
 * Sound Sort (content model CM-B35, ADR 0002; curriculum audit N3): the
 * child hears each word or picture and drags it into the basket of the sound
 * it has. Phonological awareness (`identify`), answered by `select`:
 *
 * - `sortBy: 'first_sound'`: each item goes to the basket of the sound it
 *   starts with (`pa:first_sound`); 2 or 3 baskets.
 * - `sortBy: 'contrast'`: two sounds English does not tell apart (ح and ه,
 *   ق and ك); each item goes to the basket of the sound it has
 *   (`listen:contrast:<a>:<b>`, the pair of the two baskets' letters in
 *   alphabetical order). Exactly 2 baskets, and no letter or word is shown
 *   on a basket: `listen:` tasks are heard, with no text (ADR 0002).
 *
 * The items are heard, not read: an item is a library word (the app plays its
 * take and shows its picture, never its text), a picture or a sound clip.
 * Visual sorts (dots, sun and moon letters, ة against ت) are not this type's
 * job yet; they need their own unit keys.
 *
 * v2 only: v1 never receives this type (`visibility.ts`).
 *
 * Write:
 * - `bins`: 2 or 3 baskets, each `{ id, letterId, label }`: the authored id
 *   (items name it), the sound it stands for (`letters.id`) and what the
 *   basket shows (a content item: a letter, a picture or a sound clip).
 * - `items`: 4 to 8 items, each a content item of kind `word`, `image` or
 *   `audio` with its authored `id` and the `binId` of its basket (the answer).
 *   Every basket gets at least one item.
 * - `playItemAudio`: the app plays each item's sound (default true).
 *
 * @example
 * ```
 * {
 *   sortBy: 'contrast',
 *   bins: [
 *     { id: 'b1', letterId: 'haa', label: { kind: 'audio', audio: { assetId: '…' } } },
 *     { id: 'b2', letterId: 'heh', label: { kind: 'audio', audio: { assetId: '…' } } },
 *   ],
 *   items: [
 *     { id: 'i1', kind: 'word', word: { wordId: 'w_hut' }, binId: 'b1' },
 *     …
 *   ],
 * }
 * ```
 *
 * Read: no legacy shape (new type); each item and label through
 * `readKindedItem`.
 */

import { z } from 'zod';
import { BaseActivitySchema } from '../base.ts';
import {
  AssetRefWriteSchema,
  ConditionalAudioSchema,
  type ConfigRecord,
  ContentItemStoredSchema,
  ContentRefWriteSchema,
  isRecord,
  makeReadSchema,
  readKindedItem,
  WordRefWriteSchema,
} from '../references.ts';

export const SOUND_SORT_BY = ['first_sound', 'contrast'] as const;
export type SoundSortBy = typeof SOUND_SORT_BY[number];

export const SOUND_SORT_MIN_BINS = 2;
export const SOUND_SORT_MAX_BINS = 3;
export const SOUND_SORT_MIN_ITEMS = 4;
export const SOUND_SORT_MAX_ITEMS = 8;

/** The kinds an item may be: heard words, pictures, sound clips (never shown as text). */
export const SOUND_SORT_ITEM_KINDS = ['word', 'image', 'audio'] as const;

const LETTER_ID = z.string().min(1).max(20).regex(
  /^[a-z_]+$/,
  'Letter ID must be lowercase letters and underscores',
);

export const SoundSortBinSchema = z
  .object({
    id: z.string().min(1),
    letterId: LETTER_ID.describe('The sound the basket stands for (letters.id)'),
    label: ContentRefWriteSchema.describe('What the basket shows'),
  })
  .strict();

export const SoundSortItemSchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum(SOUND_SORT_ITEM_KINDS),
    word: WordRefWriteSchema.optional(),
    image: AssetRefWriteSchema.optional(),
    audio: AssetRefWriteSchema.optional(),
    label: z.string().optional(),
    binId: z.string().min(1).describe('The id of the basket the item belongs in'),
  })
  .strict()
  .superRefine((item, ctx) => {
    for (const kind of SOUND_SORT_ITEM_KINDS) {
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
  });

export type SoundSortBin = z.infer<typeof SoundSortBinSchema>;
export type SoundSortItem = z.infer<typeof SoundSortItemSchema>;

export const SoundSortConfigSchema = z
  .object({
    sortBy: z.enum(SOUND_SORT_BY).describe('The sound feature the child sorts by'),
    bins: z.array(SoundSortBinSchema)
      .min(SOUND_SORT_MIN_BINS, `At least ${SOUND_SORT_MIN_BINS} baskets`)
      .max(SOUND_SORT_MAX_BINS, `At most ${SOUND_SORT_MAX_BINS} baskets`),
    items: z.array(SoundSortItemSchema)
      .min(SOUND_SORT_MIN_ITEMS, `At least ${SOUND_SORT_MIN_ITEMS} items`)
      .max(SOUND_SORT_MAX_ITEMS, `At most ${SOUND_SORT_MAX_ITEMS} items`),
    playItemAudio: z.boolean().optional()
      .describe("Play each item's sound (default true)"),
    conditionalAudio: ConditionalAudioSchema.optional(),
  })
  .strict()
  .superRefine((config, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
    const binIds = new Set<string>();
    const sounds = new Set<string>();
    config.bins.forEach((bin, n) => {
      if (binIds.has(bin.id)) issue(['bins', n, 'id'], `Basket id ${bin.id} is repeated`);
      if (sounds.has(bin.letterId)) {
        issue(['bins', n, 'letterId'], `Two baskets stand for the sound ${bin.letterId}`);
      }
      binIds.add(bin.id);
      sounds.add(bin.letterId);
      if (
        config.sortBy === 'contrast' && (bin.label.kind === 'letter' || bin.label.kind === 'word')
      ) {
        issue(['bins', n, 'label'], 'a listening contrast shows no letter or word on a basket');
      }
    });
    if (config.sortBy === 'contrast' && config.bins.length !== 2) {
      issue(['bins'], 'a listening contrast sorts into exactly 2 baskets');
    }
    const itemIds = new Set<string>();
    const filled = new Set<string>();
    config.items.forEach((item, n) => {
      if (itemIds.has(item.id)) issue(['items', n, 'id'], `Item id ${item.id} is repeated`);
      itemIds.add(item.id);
      if (!binIds.has(item.binId)) issue(['items', n, 'binId'], `No basket has id ${item.binId}`);
      filled.add(item.binId);
    });
    config.bins.forEach((bin, n) => {
      if (!filled.has(bin.id)) issue(['bins', n], `Basket ${bin.id} has no item`);
    });
  });

export const SoundSortActivitySchema = BaseActivitySchema.extend({
  type: z.literal('sound_sort'),
  config: SoundSortConfigSchema,
});

export type SoundSortConfig = z.infer<typeof SoundSortConfigSchema>;
export type SoundSortActivity = z.infer<typeof SoundSortActivitySchema>;

// ============================================================================
// READ SCHEMA
// ============================================================================

function normalizeSoundSort(config: ConfigRecord): ConfigRecord {
  const next: ConfigRecord = { ...config };
  if (Array.isArray(config.items)) {
    next.items = config.items.map((i) => isRecord(i) ? readKindedItem(i) : i);
  }
  if (Array.isArray(config.bins)) {
    next.bins = config.bins.map((b) =>
      isRecord(b) && isRecord(b.label) ? { ...b, label: readKindedItem(b.label) } : b
    );
  }
  return next;
}

export const SoundSortReadSchema = makeReadSchema(
  normalizeSoundSort,
  z.object({
    sortBy: z.string(),
    bins: z.array(
      z.object({ id: z.string().min(1), letterId: z.string().min(1) }).passthrough(),
    ).min(1),
    items: z.array(
      ContentItemStoredSchema.and(z.object({ binId: z.string().min(1) }).passthrough()),
    ).min(1),
  }).passthrough(),
);
