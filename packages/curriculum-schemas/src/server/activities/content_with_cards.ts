/**
 * Content with Cards: a row of cards showing forms or harakat of a letter
 * (exposure; `interactive` and `isCorrect` are false on every PROD row).
 *
 * Write (CM-B7): each card is a content item (`references.ts`,
 * CONTENT_ITEM_DESIGN.md): `kind` on the card and a reference payload. The
 * card's display `text` is a glyph copy the delivery derives for v1 from the
 * reference, so a save cannot send it; nor the container discriminator
 * `cardMode` (the kind lives on each card) or the copied `content` strings.
 * CM-B12: cards share the MCQ item schema (kinds letter, word, image, audio,
 * numeral) and may carry the structured `prompt`.
 * Read: a card with a `letter` reference becomes a letter item (its `text`
 * dropped); a card holding only text becomes a numeral (digits), a letter
 * (one glyph; tatweel for the form, marks for the haraka) or a word item with
 * the text as hint; an image string an image item with the URL as hint.
 */

import { z } from 'zod';
import { BaseActivitySchema } from '../base.ts';
import {
  ConditionalAudioSchema,
  type ConfigRecord,
  ContentItemStoredSchema,
  ContentItemWriteSchema,
  isEmptyLocalizedText,
  isRecord,
  LetterRefStoredSchema,
  LetterRefWriteSchema,
  makeReadSchema,
  PromptStoredSchema,
  PromptWriteSchema,
  readContentText,
  readKindedItem,
  readLetterRef,
  readPrompt,
  withoutKeys,
} from '../references.ts';

const ContentTypeSchema = z.enum(['letter', 'word', 'image']);

export const ContentWithCardsConfigSchema = z.object({
  cards: z.array(ContentItemWriteSchema).min(1)
    .describe('The cards, each a content item'),
  targetLetter: LetterRefWriteSchema.optional()
    .describe('The letter the cards present'),
  contentType: ContentTypeSchema.optional()
    .describe('What the top area shows'),
  interactive: z.boolean().optional()
    .describe('Whether cards are tappable (true) or display-only (false)'),
  prompt: PromptWriteSchema.optional()
    .describe('What the cards ask, when they are interactive'),
  randomizeCards: z.boolean().optional(),
  conditionalAudio: ConditionalAudioSchema.optional(),
}).strict();

/** One stored card as a content item. */
export function readCard(card: unknown): unknown {
  if (!isRecord(card)) return card;
  if (card.kind !== undefined) return readKindedItem(card);
  const base: ConfigRecord = { id: card.id };
  if (card.isCorrect !== undefined) base.isCorrect = card.isCorrect;
  if (card.letter !== undefined && card.letter !== null) {
    return { ...base, kind: 'letter', letter: readLetterRef(card.letter) };
  }
  const text = typeof card.text === 'string' ? readContentText(card.text) : null;
  if (text) return { ...base, ...text };
  if (typeof card.image === 'string' && card.image) {
    return { ...base, kind: 'image', image: { url: card.image } };
  }
  return card;
}

function normalizeContentWithCards(config: ConfigRecord): ConfigRecord {
  const next = withoutKeys(config, ['cardMode']);
  if (Array.isArray(config.cards)) next.cards = config.cards.map(readCard);
  if (config.targetLetter !== undefined) next.targetLetter = readLetterRef(config.targetLetter);
  if (config.prompt !== undefined) next.prompt = readPrompt(config.prompt);
  if (isEmptyLocalizedText(config.content)) delete next.content;
  return next;
}

export const ContentWithCardsReadSchema = makeReadSchema(
  normalizeContentWithCards,
  z.object({
    cards: z.array(ContentItemStoredSchema).min(1),
    targetLetter: LetterRefStoredSchema.optional(),
    prompt: PromptStoredSchema.optional(),
  }).passthrough(),
);

export const ContentWithCardsActivitySchema = BaseActivitySchema.extend({
  type: z.literal('content_with_cards'),
  config: ContentWithCardsConfigSchema,
});

export type ContentWithCardsConfig = z.infer<typeof ContentWithCardsConfigSchema>;
