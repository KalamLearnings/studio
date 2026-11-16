/**
 * "What's missing" (CG-6): the gaps rail, and the "All words" view. Pure.
 */

import type { ConceptNode, FamilyNode, Graph, PictureNode, WordNode } from "./graph";
import { asReadsRow, familyLabel } from "./graph";
import { nodeKey, type NodeKey } from "./keys";
import { familiesWithSeveralMeanings, wordsWithSeveralMeanings } from "./meanings";
import { awaitsReadsAs } from "../words/family";

export type GapId = "no-family" | "reading" | "no-meaning" | "no-picture" | "no-word" | "several-meanings";

export interface Gap {
  id: GapId;
  title: string;
  /** Why it matters, in one sentence. */
  why: string;
  items: NodeKey[];
}

const byUse = (a: WordNode, b: WordNode) => b.usageCount - a.usageCount || a.id.localeCompare(b.id);
const real = (w: WordNode) => !w.isPseudo && !w.retired;

export function gaps(g: Graph): Gap[] {
  const words = Array.from(g.words.values());
  const families = Array.from(g.families.values()).sort((a, b) => familyLabel(a).localeCompare(familyLabel(b)));
  const concepts = Array.from(g.concepts.values()).sort((a, b) => a.name.en.localeCompare(b.name.en));
  return [
    {
      id: "no-family",
      title: "Spellings with no family",
      why: "Real words that belong to no family get no meaning and no picture.",
      items: words.filter((w) => real(w) && !w.familyId).sort(byUse).map((w) => nodeKey("word", w.id)),
    },
    {
      id: "reading",
      title: "Readings to confirm",
      why: "A spelling without full harakat needs a fully vowelled reading to be played.",
      items: words.filter((w) => awaitsReadsAs(asReadsRow(w))).sort(byUse).map((w) => nodeKey("word", w.id)),
    },
    {
      id: "several-meanings",
      title: "Spellings with several meanings",
      why: "One spelling, different words (جمل: camel, sentences). Each word needs its own family.",
      items: [
        ...wordsWithSeveralMeanings(g).map((w) => nodeKey("word", w.id)),
        ...familiesWithSeveralMeanings(g).map((f) => nodeKey("family", f)),
      ],
    },
    {
      id: "no-meaning",
      title: "Words that name no meaning",
      why: "With no meaning, none of the word's spellings has a picture.",
      items: families.filter((f) => g.conceptsOfFamily(f.id).length === 0).map((f) => nodeKey("family", f.id)),
    },
    {
      id: "no-picture",
      title: "Meanings with no picture",
      why: "Nothing to show when a child taps the word.",
      items: concepts.filter((c) => g.picturesOfConcept(c.slug).length === 0).map((c) => nodeKey("concept", c.slug)),
    },
    {
      id: "no-word",
      title: "Meanings no word names",
      why: "A picture is ready but no word points at it.",
      items: concepts.filter((c) => g.familiesOfConcept(c.slug).length === 0).map((c) => nodeKey("concept", c.slug)),
    },
  ];
}

// ---- "All words" -------------------------------------------------------------------------

export type CardFlag = "no-meaning" | "no-picture" | "readings" | "several-meanings";

export interface FamilyCard {
  family: FamilyNode;
  headword: WordNode | null;
  picture: PictureNode | null;
  /** The other spellings; `readsAs` marks one read as another (↦). */
  others: Array<{ word: WordNode; readsAs: WordNode | null }>;
  flags: CardFlag[];
  /** Readings still to confirm. */
  readings: number;
}

export interface AllWords {
  families: FamilyCard[];
  /** Real spellings in no family, the most used first. */
  loose: WordNode[];
  /** Meanings no word names. */
  orphanMeanings: ConceptNode[];
  /** Drill spellings (no family by rule). */
  drills: WordNode[];
  counts: { families: number; spellings: number; meanings: number; pictures: number };
}

export function allWords(g: Graph): AllWords {
  const mixed = new Set(familiesWithSeveralMeanings(g));
  const families = Array.from(g.families.values())
    .sort((a, b) => familyLabel(a).localeCompare(familyLabel(b)))
    .map((family): FamilyCard => {
      const members = g.membersOf(family.id);
      const headword = family.headwordId ? (g.words.get(family.headwordId) ?? null) : null;
      const picture = g.pictureOfFamily(family.id);
      const readings = members.filter((w) => awaitsReadsAs(asReadsRow(w))).length;
      const flags: CardFlag[] = [];
      if (g.conceptsOfFamily(family.id).length === 0) flags.push("no-meaning");
      else if (!picture) flags.push("no-picture");
      if (readings) flags.push("readings");
      if (mixed.has(family.id)) flags.push("several-meanings");
      return {
        family,
        headword,
        picture,
        others: members
          .filter((w) => w.id !== family.headwordId)
          .map((word) => ({ word, readsAs: word.readsAsId ? (g.words.get(word.readsAsId) ?? null) : null })),
        flags,
        readings,
      };
    });
  const words = Array.from(g.words.values()).filter((w) => !w.retired);
  return {
    families,
    loose: words.filter((w) => !w.familyId && !w.isPseudo).sort(byUse),
    orphanMeanings: Array.from(g.concepts.values())
      .filter((c) => g.familiesOfConcept(c.slug).length === 0)
      .sort((a, b) => a.name.en.localeCompare(b.name.en)),
    drills: words.filter((w) => w.isPseudo).sort(byUse),
    counts: { families: g.families.size, spellings: words.length, meanings: g.concepts.size, pictures: g.pictures.size },
  };
}
