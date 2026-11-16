/**
 * One unvowelled spelling, several words (owner decision 5). جمل is read
 * جَمَل (camel) or جُمَل (sentences): two words, so two families. This module
 * only detects the case and words the suggestion; the split itself comes with
 * CG-5. Pure.
 *
 * Two fully vowelled spellings with the same letters are the same word when
 * they differ only on the last letter (the case ending or tanween: كِتَاب,
 * كِتَابُ, كِتَابٌ), and different words when any earlier letter differs.
 */

import type { Graph, WordNode } from "./graph";
import { skeleton, vowelStatus } from "../words/family";
import { isAuditMark, isBaseLetter } from "../words/review/arabicText";

/** The vowelling of every letter but the last, so case endings do not count. */
export function innerVowelling(arabic: string): string {
  const units: string[] = [];
  for (const ch of Array.from(arabic.normalize("NFC"))) {
    if (isBaseLetter(ch)) units.push("");
    else if (isAuditMark(ch) && units.length) units[units.length - 1] += ch;
  }
  return units
    .slice(0, -1)
    .map((m) => Array.from(m).sort().join(""))
    .join("|");
}

/** One meaning: the fully vowelled spellings that read the same, and the family they sit in. */
export interface MeaningGroup {
  /** The spellings, the most used first. */
  words: WordNode[];
  /** Their families (usually one, or none). */
  familyIds: string[];
}

export interface SeveralMeanings {
  /** The bare letters, e.g. جمل. */
  skeleton: string;
  meanings: MeaningGroup[];
  /** True when the words are not yet in a family each: two share one, or one has none. */
  needsSplit: boolean;
  /** The family that holds more than one meaning, when there is one. */
  mixedFamilyId: string | null;
}

const live = (w: WordNode) => !w.retired && !w.isPseudo;

function groupMeanings(candidates: readonly WordNode[]): MeaningGroup[] {
  const groups = new Map<string, WordNode[]>();
  for (const w of candidates) {
    const k = innerVowelling(w.arabic);
    groups.set(k, [...(groups.get(k) ?? []), w]);
  }
  return Array.from(groups.values()).map((ws) => {
    const words = [...ws].sort((a, b) => b.usageCount - a.usageCount || a.id.localeCompare(b.id));
    return { words, familyIds: Array.from(new Set(words.map((w) => w.familyId).filter((f): f is string => !!f))) };
  });
}

function judge(sk: string, meanings: MeaningGroup[]): SeveralMeanings | null {
  if (meanings.length < 2) return null;
  const owner = new Map<string, number>();
  let mixed: string | null = null;
  meanings.forEach((m, i) => {
    for (const f of m.familyIds) {
      if (owner.has(f) && owner.get(f) !== i) mixed ??= f;
      else owner.set(f, i);
    }
  });
  const needsSplit = !!mixed || meanings.some((m) => m.familyIds.length === 0);
  return { skeleton: sk, meanings, needsSplit, mixedFamilyId: mixed };
}

/** The fully vowelled, live, real spellings with the same letters as `word`. */
function vowelledWithLetters(graph: Graph, sk: string, exceptId?: string): WordNode[] {
  const out: WordNode[] = [];
  for (const w of Array.from(graph.words.values())) {
    if (w.id === exceptId || !live(w)) continue;
    if (vowelStatus(w.arabic) === "full" && skeleton(w.arabic) === sk) out.push(w);
  }
  return out;
}

/**
 * For a spelling without full harakat: the different words it can be read as,
 * when there are at least two. Null for a vowelled spelling, a drill, or one
 * reading.
 */
export function severalMeaningsOfWord(graph: Graph, wordId: string): SeveralMeanings | null {
  const w = graph.words.get(wordId);
  if (!w || !live(w) || vowelStatus(w.arabic) === "full") return null;
  const sk = skeleton(w.arabic);
  if (!sk) return null;
  return judge(sk, groupMeanings(vowelledWithLetters(graph, sk, w.id)));
}

/**
 * For a family: the letters under which it holds more than one word (جَمَل and
 * جُمَل in one family), counting the readings of its unvowelled members too.
 */
export function severalMeaningsInFamily(graph: Graph, familyId: string): SeveralMeanings[] {
  const members = graph.membersOf(familyId).filter(live);
  const skeletons = new Set(members.map((m) => skeleton(m.arabic)).filter(Boolean));
  const out: SeveralMeanings[] = [];
  for (const sk of Array.from(skeletons)) {
    const inFamily = members.filter((m) => skeleton(m.arabic) === sk && vowelStatus(m.arabic) === "full");
    const meanings = groupMeanings(inFamily);
    if (meanings.length >= 2) out.push({ skeleton: sk, meanings, needsSplit: true, mixedFamilyId: familyId });
  }
  return out;
}

/** Every unvowelled spelling with several words still to be split, the most used first (the gaps rail). */
export function wordsWithSeveralMeanings(graph: Graph): WordNode[] {
  const out: WordNode[] = [];
  for (const w of Array.from(graph.words.values())) {
    const s = severalMeaningsOfWord(graph, w.id);
    if (s?.needsSplit) out.push(w);
  }
  return out.sort((a, b) => b.usageCount - a.usageCount || a.id.localeCompare(b.id));
}

/** Families that hold more than one word. */
export function familiesWithSeveralMeanings(graph: Graph): string[] {
  return Array.from(graph.families.keys()).filter((f) => severalMeaningsInFamily(graph, f).length > 0);
}
