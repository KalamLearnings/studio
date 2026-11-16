/**
 * The content graph the Words page reads (CG-2): spellings, word families,
 * meanings (concepts), pictures and letters, with the links between them and
 * the indexes the neighbourhood, the gaps and "All words" need. Pure.
 *
 * Built from the rows today's routes return (`GET /words`, `/words/families`,
 * `/words/concepts/:c`, `/letters/list`); `lib/connections/source.ts` loads
 * them.
 */

import type { ConceptDetail, ConceptKind, CuratedWord, WordFamily } from "../types/wordFamilies";
import { skeleton } from "../words/family";

/** A `GET /words` row: the curated columns, plus what the old Words page showed. */
export type WordRow = Pick<
  CuratedWord,
  "id" | "arabic" | "english" | "is_pseudo" | "usage_count" | "family_id" | "reads_as_id" | "retired_at" | "reviewed_at"
> & {
  transliteration?: string | null;
  category?: string | null;
  audio_path?: string | null;
};

export interface LetterRow {
  id: string;
  letter: string;
  name_english: string;
}

export interface WordNode {
  id: string;
  arabic: string;
  english: string | null;
  transliteration: string | null;
  category: string | null;
  audioUrl: string | null;
  isPseudo: boolean;
  familyId: string | null;
  readsAsId: string | null;
  retired: boolean;
  reviewed: boolean;
  usageCount: number;
}

export interface FamilyNode {
  id: string;
  headwordId: string | null;
  gloss: string | null;
}

export interface ConceptNode {
  slug: string;
  /** uuid; the write routes take either. */
  id: string;
  name: { en: string; ar?: string };
  kind: ConceptKind | null;
}

export interface PictureNode {
  assetId: string;
  url: string;
  status: string;
  /** The asset label's text, when it has one. */
  label: string | null;
}

export interface LetterNode {
  id: string;
  glyph: string;
  name: string;
}

export interface GraphInput {
  words: readonly WordRow[];
  families: readonly WordFamily[];
  concepts: readonly ConceptDetail[];
  letters: readonly LetterRow[];
  /** Pictures kept on a family itself. No read route returns them yet, so this is usually absent. */
  familyPictures?: ReadonlyArray<{ familyId: string; picture: PictureNode }>;
}

export interface Graph {
  words: ReadonlyMap<string, WordNode>;
  families: ReadonlyMap<string, FamilyNode>;
  concepts: ReadonlyMap<string, ConceptNode>;
  pictures: ReadonlyMap<string, PictureNode>;
  letters: ReadonlyMap<string, LetterNode>;
  /** Live spellings of a family, the dictionary form first, then by use. */
  membersOf(familyId: string): WordNode[];
  /** Spellings that are read as `wordId`. */
  readersOf(wordId: string): WordNode[];
  conceptsOfFamily(familyId: string): ConceptNode[];
  familiesOfConcept(slug: string): FamilyNode[];
  picturesOfConcept(slug: string): PictureNode[];
  picturesOfFamily(familyId: string): PictureNode[];
  conceptsOfPicture(assetId: string): ConceptNode[];
  familiesKeepingPicture(assetId: string): FamilyNode[];
  /** The letters of a spelling, in order, each once. */
  lettersOf(word: Pick<WordNode, "arabic">): LetterNode[];
  /** The picture a family shows: its own first, else its meaning's. */
  pictureOfFamily(familyId: string): PictureNode | null;
}

const push = <K, V>(m: Map<K, V[]>, k: K, v: V) => {
  const list = m.get(k);
  if (list) list.push(v);
  else m.set(k, [v]);
};

export function wordNode(r: WordRow): WordNode {
  return {
    id: r.id,
    arabic: r.arabic.trim(),
    english: r.english ?? null,
    transliteration: r.transliteration ?? null,
    category: r.category ?? null,
    audioUrl: r.audio_path || null,
    isPseudo: r.is_pseudo === true,
    familyId: r.family_id ?? null,
    readsAsId: r.reads_as_id ?? null,
    retired: !!r.retired_at,
    reviewed: !!r.reviewed_at,
    usageCount: r.usage_count ?? 0,
  };
}

export function buildGraph(input: GraphInput): Graph {
  const words = new Map(input.words.map((r) => [r.id, wordNode(r)]));
  const families = new Map<string, FamilyNode>(
    input.families.map((f) => [f.id, { id: f.id, headwordId: f.headword_id, gloss: f.gloss_en }]),
  );
  const concepts = new Map<string, ConceptNode>();
  const pictures = new Map<string, PictureNode>();
  const conceptsByFamily = new Map<string, ConceptNode[]>();
  const familiesByConcept = new Map<string, FamilyNode[]>();
  const picsByConcept = new Map<string, PictureNode[]>();
  const conceptsByPic = new Map<string, ConceptNode[]>();
  const picsByFamily = new Map<string, PictureNode[]>();
  const familiesByPic = new Map<string, FamilyNode[]>();

  for (const c of input.concepts) {
    const node: ConceptNode = { slug: c.slug, id: c.id, name: c.name, kind: c.kind };
    concepts.set(c.slug, node);
    for (const f of c.families ?? []) {
      const fam = families.get(f.id) ?? { id: f.id, headwordId: f.headword_id, gloss: f.gloss_en };
      if (!families.has(f.id)) families.set(f.id, fam);
      push(conceptsByFamily, f.id, node);
      push(familiesByConcept, c.slug, fam);
    }
    for (const p of c.pictures ?? []) {
      const pic: PictureNode = pictures.get(p.assetId) ?? {
        assetId: p.assetId,
        url: p.url,
        status: p.status,
        label: p.label?.text ?? null,
      };
      pictures.set(p.assetId, pic);
      push(picsByConcept, c.slug, pic);
      push(conceptsByPic, p.assetId, node);
    }
  }
  for (const { familyId, picture } of input.familyPictures ?? []) {
    const pic = pictures.get(picture.assetId) ?? picture;
    pictures.set(pic.assetId, pic);
    push(picsByFamily, familyId, pic);
    const fam = families.get(familyId);
    if (fam) push(familiesByPic, pic.assetId, fam);
  }

  const membersByFamily = new Map<string, WordNode[]>();
  const readers = new Map<string, WordNode[]>();
  for (const w of Array.from(words.values())) {
    if (w.retired) continue;
    if (w.familyId) push(membersByFamily, w.familyId, w);
    if (w.readsAsId) push(readers, w.readsAsId, w);
  }
  for (const [fid, list] of Array.from(membersByFamily)) {
    const head = families.get(fid)?.headwordId;
    list.sort((a, b) => Number(b.id === head) - Number(a.id === head) || b.usageCount - a.usageCount || a.id.localeCompare(b.id));
  }

  const letters = new Map<string, LetterNode>();
  const byGlyph = new Map<string, LetterNode>();
  for (const l of input.letters) {
    const node = { id: l.id, glyph: l.letter, name: l.name_english };
    letters.set(l.id, node);
    if (!byGlyph.has(l.letter)) byGlyph.set(l.letter, node);
  }

  const pictureOfFamily = (fid: string): PictureNode | null => {
    const own = picsByFamily.get(fid);
    if (own?.length) return own[0];
    for (const c of conceptsByFamily.get(fid) ?? []) {
      const p = picsByConcept.get(c.slug);
      if (p?.length) return p[0];
    }
    return null;
  };

  return {
    words,
    families,
    concepts,
    pictures,
    letters,
    membersOf: (fid) => membersByFamily.get(fid) ?? [],
    readersOf: (wid) => readers.get(wid) ?? [],
    conceptsOfFamily: (fid) => conceptsByFamily.get(fid) ?? [],
    familiesOfConcept: (slug) => familiesByConcept.get(slug) ?? [],
    picturesOfConcept: (slug) => picsByConcept.get(slug) ?? [],
    picturesOfFamily: (fid) => picsByFamily.get(fid) ?? [],
    conceptsOfPicture: (id) => conceptsByPic.get(id) ?? [],
    familiesKeepingPicture: (id) => familiesByPic.get(id) ?? [],
    lettersOf: (w) => {
      const out: LetterNode[] = [];
      for (const ch of skeleton(w.arabic)) {
        const l = byGlyph.get(ch);
        if (l && !out.includes(l)) out.push(l);
      }
      return out;
    },
    pictureOfFamily,
  };
}

/** The family's name in English: its meaning, else its id. */
export const familyLabel = (f: Pick<FamilyNode, "id" | "gloss"> | undefined, fallback = ""): string =>
  f ? f.gloss || f.id : fallback;

/** A node in the row shape `lib/words/family.ts` reads (`needsReading`, `awaitsReadsAs`). */
export const asReadsRow = (w: WordNode) => ({
  id: w.id,
  arabic: w.arabic,
  is_pseudo: w.isPseudo,
  family_id: w.familyId,
  reads_as_id: w.readsAsId,
  retired_at: w.retired ? "retired" : null,
});
