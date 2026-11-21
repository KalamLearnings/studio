/**
 * What the stretch_madd form tells the author about a word: how many madds the
 * text carries, and for the one madd, its letter, kind and default count. The
 * detection is the backend's own (`detectMadds`, a copy), so the form and the
 * save check never disagree. Pure.
 */

import { detectMadds, MADD_KINDS, wordLetterUnits, type MaddKind } from "@kalam/curriculum-schemas";

export const MADD_KIND_LABELS: Record<MaddKind, string> = {
  natural: "Natural (madd tabi'i)",
  muttasil: "Connected (madd muttasil): a hamza follows",
  lazim: "Required (madd lazim): a shadda or sukoon follows",
};

/** Counts an author may force; absent means the kind's default. */
export const MADD_COUNTS_OPTIONS = [2, 3, 4, 5, 6] as const;

export type MaddDescription =
  | { status: "empty" }
  | { status: "none" }
  | { status: "many"; count: number }
  | {
      status: "one";
      /** The madd letter as written (with its marks). */
      letter: string;
      /** 1-based position among the word's letters, first letter = 1. */
      position: number;
      kind: MaddKind;
      kindLabel: string;
      /** The kind's default beats. */
      defaultCounts: number;
    };

export function describeMadd(text: string | undefined): MaddDescription {
  const word = (text ?? "").trim();
  if (word.length === 0) return { status: "empty" };
  const found = detectMadds(word);
  if (found.length === 0) return { status: "none" };
  const [madd] = found;
  if (found.length > 1 || !madd) return { status: "many", count: found.length };
  const units = wordLetterUnits(word);
  return {
    status: "one",
    letter: units[madd.index] ?? "",
    position: madd.index + 1,
    kind: madd.kind,
    kindLabel: MADD_KIND_LABELS[madd.kind],
    defaultCounts: madd.counts,
  };
}

/** The beats the activity holds: the author's override, else the kind's default. */
export function effectiveCounts(description: MaddDescription, override: number | undefined): number | null {
  if (description.status !== "one") return null;
  return override ?? description.defaultCounts;
}

export { MADD_KINDS };
