/**
 * The Library lenses (CW-9): Families and Concepts as browse lists inside
 * Review, with gap filters (a family with no concept, a concept with no
 * picture...). Pure: rows, gaps, search and counts.
 *
 * Families come from `GET /words/families`, their spellings from `GET /words`
 * (each row carries `family_id`), and the family-to-concept links from the
 * concept details (the backend has no family-to-concept read). Until the
 * concepts load, a family's concept is unknown, not missing.
 */

import type { ConceptDetail, CuratedWord, WordFamily } from "../types/wordFamilies";
import { awaitsReadsAs } from "../words/family";
import { foldForSearch } from "./inbox";

/** What a library row needs from a `GET /words` row. */
export type LibraryWord = Pick<CuratedWord, "id" | "arabic" | "is_pseudo" | "family_id" | "reads_as_id" | "retired_at"> & {
  usage_count: number;
  reviewed_at?: string | null;
};

/** A family or a concept opened in the pane. */
export type LibraryRef = { type: "family"; id: string } | { type: "concept"; slug: string };

export const sameRef = (a: LibraryRef | null, b: LibraryRef | null): boolean =>
  !!a && !!b && a.type === b.type && (a.type === "family" ? a.id === (b as typeof a).id : a.slug === (b as typeof a).slug);

export const refKey = (r: LibraryRef): string => (r.type === "family" ? `family:${r.id}` : `concept:${r.slug}`);

// ---------------------------------------------------------------------------
// Families
// ---------------------------------------------------------------------------

export const FAMILY_GAPS = [
  { value: "all", label: "All families" },
  { value: "no-concept", label: "No concept" },
  { value: "no-headword", label: "No headword" },
  { value: "unreviewed", label: "Not reviewed" },
  { value: "readings", label: "Readings to confirm" },
] as const;
export type FamilyGap = (typeof FAMILY_GAPS)[number]["value"];

export interface FamilyRow {
  family: WordFamily;
  headword: string | null;
  /** Live spellings. */
  members: number;
  /** Live, real spellings nobody has approved. */
  unreviewed: number;
  /** Spellings that still need a reads-as. */
  readings: number;
  /** Linked concepts' slugs; null while the concepts are unknown. */
  concepts: string[] | null;
  usage: number;
}

export function familyRows(
  families: readonly WordFamily[],
  words: readonly LibraryWord[],
  concepts: readonly ConceptDetail[] | null,
): FamilyRow[] {
  const byFamily = new Map<string, LibraryWord[]>();
  const byId = new Map(words.map((w) => [w.id, w]));
  for (const w of words) {
    if (!w.family_id || w.retired_at) continue;
    const list = byFamily.get(w.family_id) ?? [];
    list.push(w);
    byFamily.set(w.family_id, list);
  }
  const conceptsOf = new Map<string, string[]>();
  for (const c of concepts ?? []) {
    for (const f of c.families) conceptsOf.set(f.id, [...(conceptsOf.get(f.id) ?? []), c.slug]);
  }
  return families.map((family) => {
    const members = byFamily.get(family.id) ?? [];
    return {
      family,
      headword: family.headword_id ? (byId.get(family.headword_id)?.arabic ?? null) : null,
      members: members.length,
      unreviewed: members.filter((w) => !w.is_pseudo && !w.reviewed_at).length,
      readings: members.filter((w) => awaitsReadsAs(w)).length,
      concepts: concepts ? (conceptsOf.get(family.id) ?? []) : null,
      usage: members.reduce((n, w) => n + (w.usage_count ?? 0), 0),
    };
  });
}

export function familyHasGap(row: FamilyRow, gap: FamilyGap): boolean {
  switch (gap) {
    case "all":
      return true;
    case "no-concept":
      return row.concepts !== null && row.concepts.length === 0;
    case "no-headword":
      return !row.family.headword_id;
    case "unreviewed":
      return row.unreviewed > 0;
    case "readings":
      return row.readings > 0;
  }
}

export function matchesFamily(row: FamilyRow, q: string): boolean {
  const query = foldForSearch(q.trim());
  if (!query) return true;
  return foldForSearch(`${row.family.id} ${row.family.gloss_en ?? ""} ${row.headword ?? ""} ${(row.concepts ?? []).join(" ")}`).includes(query);
}

/** Gloss order (the id when there is no gloss), as the old page listed them. */
export function visibleFamilies(rows: readonly FamilyRow[], gap: FamilyGap, q: string): FamilyRow[] {
  return rows
    .filter((r) => familyHasGap(r, gap) && matchesFamily(r, q))
    .sort((a, b) => (a.family.gloss_en ?? a.family.id).localeCompare(b.family.gloss_en ?? b.family.id) || a.family.id.localeCompare(b.family.id));
}

// ---------------------------------------------------------------------------
// Concepts
// ---------------------------------------------------------------------------

export const CONCEPT_GAPS = [
  { value: "all", label: "All concepts" },
  { value: "no-picture", label: "No picture" },
  { value: "picture-problem", label: "Picture problem" },
  { value: "no-family", label: "No family" },
] as const;
export type ConceptGap = (typeof CONCEPT_GAPS)[number]["value"];

export function conceptHasGap(c: ConceptDetail, gap: ConceptGap): boolean {
  switch (gap) {
    case "all":
      return true;
    case "no-picture":
      return c.pictures.length === 0;
    case "picture-problem":
      // Any picture the registry no longer serves as active (superseded, orphan, broken, quarantined, retired).
      return c.pictures.some((p) => p.status !== "active");
    case "no-family":
      return c.families.length === 0;
  }
}

export function matchesConcept(c: ConceptDetail, q: string): boolean {
  const query = foldForSearch(q.trim());
  if (!query) return true;
  return foldForSearch(`${c.slug} ${c.name.en} ${c.name.ar ?? ""} ${c.kind ?? ""} ${c.families.map((f) => `${f.id} ${f.gloss_en ?? ""}`).join(" ")}`).includes(query);
}

export function visibleConcepts(concepts: readonly ConceptDetail[], gap: ConceptGap, q: string): ConceptDetail[] {
  return concepts
    .filter((c) => conceptHasGap(c, gap) && matchesConcept(c, q))
    .sort((a, b) => a.name.en.localeCompare(b.name.en) || a.slug.localeCompare(b.slug));
}

// ---------------------------------------------------------------------------
// Counts and moving
// ---------------------------------------------------------------------------

export function familyGapCounts(rows: readonly FamilyRow[]): Record<FamilyGap, number> {
  return Object.fromEntries(FAMILY_GAPS.map((g) => [g.value, rows.filter((r) => familyHasGap(r, g.value)).length])) as Record<FamilyGap, number>;
}

export function conceptGapCounts(concepts: readonly ConceptDetail[]): Record<ConceptGap, number> {
  return Object.fromEntries(CONCEPT_GAPS.map((g) => [g.value, concepts.filter((c) => conceptHasGap(c, g.value)).length])) as Record<ConceptGap, number>;
}

/** `j` / `k` in a library list: the neighbour of the open one, clamped; the first when none is open. */
export function moveRef(list: readonly LibraryRef[], current: LibraryRef | null, delta: number): LibraryRef | null {
  if (list.length === 0) return null;
  const i = current ? list.findIndex((r) => sameRef(r, current)) : -1;
  if (i < 0) return list[0];
  return list[Math.max(0, Math.min(list.length - 1, i + delta))];
}
