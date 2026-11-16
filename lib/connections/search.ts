/**
 * Search (CG-4): one index over spellings, words, meanings, pictures and
 * letters. Arabic is folded with Review's `foldForSearch` (harakat, tatweel,
 * hamza seats, ة/ه, ى/ي), so with or without harakat finds the same. Pure.
 */

import { foldForSearch } from "../review/inbox";
import type { Graph } from "./graph";
import { familyLabel } from "./graph";
import { nodeKey, type NodeKey } from "./keys";

export interface SearchEntry {
  key: NodeKey;
  /** Folded text: everything a person might type for it. */
  text: string;
  /** The folded Arabic of the item, for the exact-match boost. */
  arabic: string | null;
  /** Ties sort by this: words and meanings first, then by use. */
  weight: number;
}

export function searchIndex(g: Graph): SearchEntry[] {
  const out: SearchEntry[] = [];
  const add = (key: NodeKey, parts: Array<string | null | undefined>, arabic: string | null, weight: number) =>
    out.push({ key, text: foldForSearch(parts.filter(Boolean).join(" ")), arabic: arabic ? foldForSearch(arabic) : null, weight });

  for (const w of Array.from(g.words.values())) {
    if (w.retired) continue;
    const fam = w.familyId ? g.families.get(w.familyId) : undefined;
    add(
      nodeKey("word", w.id),
      [w.arabic, w.english, w.transliteration, w.category, fam ? familyLabel(fam) : null, w.id],
      w.arabic,
      w.usageCount,
    );
  }
  for (const f of Array.from(g.families.values())) {
    const head = f.headwordId ? g.words.get(f.headwordId) : undefined;
    add(nodeKey("family", f.id), [f.id, f.gloss, head?.arabic], head?.arabic ?? null, 500);
  }
  for (const c of Array.from(g.concepts.values())) {
    add(nodeKey("concept", c.slug), [c.slug, c.name.en, c.name.ar, c.kind], c.name.ar ?? null, 400);
  }
  for (const p of Array.from(g.pictures.values())) {
    add(nodeKey("picture", p.assetId), [p.label, ...g.conceptsOfPicture(p.assetId).map((c) => c.name.en), p.url.split("/").pop()], null, 50);
  }
  for (const l of Array.from(g.letters.values())) {
    add(nodeKey("letter", l.id), [l.glyph, l.name, l.id], l.glyph, 20);
  }
  return out;
}

/**
 * The keys matching `query`, best first: an exact Arabic match first, then
 * by weight. Empty for an empty query.
 */
export function search(index: readonly SearchEntry[], query: string, limit = 30): NodeKey[] {
  const q = foldForSearch(query.trim());
  if (!q) return [];
  return index
    .filter((e) => e.text.includes(q))
    .map((e) => ({ key: e.key, score: (e.arabic === q ? 10_000 : 0) + (e.text.startsWith(q) ? 1_000 : 0) + e.weight }))
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key))
    .slice(0, limit)
    .map((x) => x.key);
}
