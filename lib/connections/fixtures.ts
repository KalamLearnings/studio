/**
 * A small library for the connections tests and the local preview: real
 * PROD spellings from the concept's sample (design/concepts/content-graph),
 * with families and meanings as the CM-D2 / CM-C4 dry runs propose. Not used
 * by the page itself.
 */

import type { ConceptDetail, WordFamily } from "../types/wordFamilies";
import type { GraphInput, LetterRow, WordRow } from "./graph";

const w = (id: string, arabic: string, o: Partial<WordRow> = {}): WordRow => ({
  id,
  arabic,
  english: null,
  is_pseudo: false,
  usage_count: 0,
  family_id: null,
  reads_as_id: null,
  retired_at: null,
  reviewed_at: null,
  ...o,
});

const fam = (id: string, gloss: string, headword_id: string): WordFamily => ({
  id,
  gloss_en: gloss,
  headword_id,
  notes: null,
  created_at: null,
  updated_at: null,
});

const pic = (assetId: string, text: string) => ({
  assetId,
  url: `https://example.test/curriculum-images/assets/${assetId}.png`,
  status: "active" as const,
  label: { ownerType: null, ownerId: null, role: null, locale: null, text },
  link: { id: `l-${assetId}`, asset_id: assetId, sort_order: 0 },
});

const concept = (
  slug: string,
  en: string,
  kind: ConceptDetail["kind"],
  families: WordFamily[],
  pictures: ReturnType<typeof pic>[],
): ConceptDetail => ({
  id: `uuid-${slug}`,
  slug,
  name: { en },
  kind,
  metadata: {},
  created_at: null,
  updated_at: null,
  unitKey: `concept:${slug}`,
  families,
  pictures,
});

export const BOOK = fam("book", "book", "w-kitab");
export const BEAR = fam("bear", "bear", "w-dubb");
export const CAMEL = fam("camel", "camel", "w-jamal");
export const HOUSE = fam("house", "house", "w-bayt");

export const WORDS: WordRow[] = [
  w("w-kitab", "كِتَاب", { family_id: "book", usage_count: 3, reviewed_at: "2026-11-01", english: "book", transliteration: "kitab", audio_path: "https://example.test/kitab.mp3", category: "objects" }),
  w("w-kitabu", "كِتَابُ", { family_id: "book", usage_count: 1 }),
  w("w-ktb", "كتاب", { family_id: "book", reads_as_id: "w-kitab", usage_count: 7 }),
  w("w-dubb", "دُبّ", { family_id: "bear", usage_count: 1 }),
  w("w-db", "دب", { family_id: "bear", reads_as_id: "w-dubb", usage_count: 7 }),
  w("w-jamal", "جَمَلُ", { family_id: "camel", usage_count: 2 }),
  // A different word with the same letters, wrongly in the camel family.
  w("w-jumal", "جُمَلُ", { family_id: "camel" }),
  w("w-jml", "جمل", { usage_count: 2 }),
  w("w-bayt", "بَيْت", { family_id: "house", usage_count: 1 }),
  w("w-warda", "وردة", { usage_count: 5 }),
  w("w-ba-drill", "بَا", { is_pseudo: true }),
];

export const CONCEPTS: ConceptDetail[] = [
  concept("book", "Book", "object", [BOOK], [pic("pic-book", "book")]),
  concept("bear", "Bear", "animal", [BEAR], [pic("pic-bear", "bear")]),
  concept("camel", "Camel", "animal", [CAMEL], []),
  concept("cat", "Cat", "animal", [], [pic("pic-cat", "cat")]),
];

export const LETTERS: LetterRow[] = [
  { id: "kaf", letter: "ك", name_english: "Kaf" },
  { id: "ta", letter: "ت", name_english: "Ta" },
  { id: "alif", letter: "ا", name_english: "Alif" },
  { id: "ba", letter: "ب", name_english: "Ba" },
  { id: "dal", letter: "د", name_english: "Dal" },
  { id: "jeem", letter: "ج", name_english: "Jeem" },
  { id: "meem", letter: "م", name_english: "Meem" },
  { id: "lam", letter: "ل", name_english: "Lam" },
  { id: "yaa", letter: "ي", name_english: "Yaa" },
  { id: "waw", letter: "و", name_english: "Waw" },
  { id: "ra", letter: "ر", name_english: "Ra" },
  { id: "ta_marbuta", letter: "ة", name_english: "Ta marbuta" },
];

export const SAMPLE: GraphInput = {
  words: WORDS,
  families: [BOOK, BEAR, CAMEL, HOUSE],
  concepts: CONCEPTS,
  letters: LETTERS,
};
