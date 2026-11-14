/**
 * Author overrides of a word's split (SB-S1, TECH-DESIGN 3.1, ADR 0078).
 *
 * The author may move unit boundaries: split a unit between two letters, or
 * merge it with the next one. The result is checked with the shared hard rules
 * (`checkBlendUnits`, in preview.ts), saved on the word with `override: true`
 * and sent to review. The server checks it again on save.
 *
 * The tags of an edited unit are a best guess for the reviewer: onset tags stay
 * with the first piece, coda tags with the last, madd with the piece that holds
 * the long vowel.
 */

import type { BlendUnitTag } from "@kalam/curriculum-schemas";
import type { BlendOverrideUnit } from "./config";

/** Tags that belong to a unit's start (its onset and vowel). */
const ONSET_TAGS = new Set<BlendUnitTag>(["shaddaSecond", "wasl", "sunLam"]);
/** Tags that go with the piece holding the long vowel. */
const MADD_TAGS = new Set<BlendUnitTag>(["madd", "madd:dagger"]);
/** Tags that belong to a unit's end (its coda). */
const CODA_TAGS = new Set<BlendUnitTag>(["shaddaFirst", "sukoon", "qalqala", "tanween", "seatAlif"]);

const MARK_RE = /[ً-ٰٟ]/;

/** A unit's text as letter clusters: each base letter with the marks after it. */
export function unitLetters(text: string): string[] {
  const out: string[] = [];
  for (const ch of Array.from(text)) {
    if (MARK_RE.test(ch) && out.length > 0) out[out.length - 1] += ch;
    else out.push(ch);
  }
  return out;
}

/** The splitter's units as an override base. */
export function toOverrideUnits(units: readonly { text: string; tags: readonly BlendUnitTag[] }[]): BlendOverrideUnit[] {
  return units.map((u) => ({ text: u.text, tags: [...u.tags] }));
}

/** True when two unit lists have the same boundaries (the tags are derived). */
export function sameUnits(a: readonly { text: string }[], b: readonly { text: string }[]): boolean {
  return a.length === b.length && a.every((u, i) => u.text === b[i]?.text);
}

const MADD_CARRIERS = "اىوي";

/** The madd tag a piece of a unit carries: a dagger alif, آ, or a carrier after its first letter. */
function maddTagOf(letters: readonly string[], original: readonly BlendUnitTag[]): BlendUnitTag[] {
  if (original.includes("madd:dagger") && letters.some((l) => l.includes("\u0670"))) return ["madd:dagger"];
  if (!original.includes("madd")) return [];
  const hasMadd = letters.some(
    (l, i) => l.startsWith("آ") || (i > 0 && MADD_CARRIERS.includes(l[0] ?? "") && !/[\u064B-\u0651]/.test(l)),
  );
  return hasMadd ? ["madd"] : [];
}

export function canSplitUnit(unit: { text: string }): boolean {
  return unitLetters(unit.text).length > 1;
}

/**
 * Split unit `index` after its `at`-th letter (1 .. letters - 1). Returns the
 * list unchanged when the split point is out of range.
 */
export function splitUnit(units: readonly BlendOverrideUnit[], index: number, at: number): BlendOverrideUnit[] {
  const unit = units[index];
  if (!unit) return [...units];
  const letters = unitLetters(unit.text);
  if (at < 1 || at >= letters.length) return [...units];
  const head = letters.slice(0, at);
  const tail = letters.slice(at);
  const keep = (t: BlendUnitTag) => !MADD_TAGS.has(t);
  const first: BlendOverrideUnit = {
    text: head.join(""),
    tags: [...unit.tags.filter((t) => keep(t) && !CODA_TAGS.has(t)), ...maddTagOf(head, unit.tags)],
  };
  const second: BlendOverrideUnit = {
    text: tail.join(""),
    tags: [...unit.tags.filter((t) => keep(t) && !ONSET_TAGS.has(t)), ...maddTagOf(tail, unit.tags)],
  };
  return [...units.slice(0, index), first, second, ...units.slice(index + 1)];
}

/** Merge unit `index` with the unit after it. */
export function mergeWithNext(units: readonly BlendOverrideUnit[], index: number): BlendOverrideUnit[] {
  const a = units[index];
  const b = units[index + 1];
  if (!a || !b) return [...units];
  // A shadda pair merged into one unit is no longer split across two.
  const pairMerged = a.tags.includes("shaddaFirst") && b.tags.includes("shaddaSecond");
  const tags: BlendUnitTag[] = [];
  for (const t of [...a.tags, ...b.tags]) {
    if (pairMerged && (t === "shaddaFirst" || t === "shaddaSecond")) continue;
    if (!tags.includes(t)) tags.push(t);
  }
  return [...units.slice(0, index), { text: a.text + b.text, tags }, ...units.slice(index + 2)];
}
