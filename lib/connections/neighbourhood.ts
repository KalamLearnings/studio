/**
 * The neighbourhood of one item (CG-2): the boxes the focus frame draws
 * around it, each in a fixed place (TheBrain's plex, concept section 3). Pure.
 *
 * Every kind of connection has one place: the word's other forms above, the
 * readings on the left, meaning and pictures on the right, letters and lessons
 * below. Nothing moves by itself. A box that should hold something and does
 * not is `missing` (the amber ring).
 *
 * `accepts` says which kind of item a box takes with "+ Add" (CG-5); it is
 * set only on boxes made by hand, and nothing reads it until CG-5.
 */

import type { BookUnitUse } from "../api/contentUsage";
import type { WordUsageItem, WordUsageRole } from "../api/wordUsage";
import { CONNECTION_KINDS, THROUGH_FAMILY, THROUGH_MEANING, THROUGH_WORDS, type ConnectionKind } from "./kinds";
import type { Graph, WordNode } from "./graph";
import { asReadsRow, familyLabel } from "./graph";
import { idOfKey, nodeKey, typeOfKey, type NodeKey, type NodeType } from "./keys";
import { severalMeaningsInFamily, severalMeaningsOfWord, type SeveralMeanings } from "./meanings";
import { awaitsReadsAs, needsReading, vowelStatus } from "../words/family";

export type Area = "top" | "left" | "right" | "bottom" | "bl" | "br";
export const AREAS: readonly Area[] = ["top", "left", "right", "bl", "bottom", "br"];

/** A small mark on a chip. */
export type ItemFlag = "drill" | "no-reading" | "not-reviewed";

export interface BoxItem {
  key: NodeKey;
  /** The family's dictionary form (a star). */
  head?: boolean;
  /** A word to say how this item hangs on the focus ("read as", "reads as this", "the word"). */
  tag?: string;
  flags: ItemFlag[];
}

/** One lesson activity in an "Activities" box. */
export interface ActivityRow {
  activityId: string;
  type: string;
  curriculumId: string;
  /** "Curriculum › Topic › Node". */
  path: string;
  roles: WordUsageRole[];
  /** The spellings of the focus it uses (a family's box lists which form). */
  wordIds: string[];
}

/** One storybook in a "Books" box: its units (pages) that show the item. */
export interface BookRow {
  bookId: string;
  title: string;
  titleAr: string | null;
  /** How many of its units show it. */
  units: number;
  roles: string[];
  /** The spellings of the focus it shows (a family's box lists which form). */
  wordIds: string[];
}

/** Where a box's contents stand. Only "Activities" and "Books" load separately. */
export type BoxState = "ready" | "loading" | "error" | "unavailable";

export interface Box {
  /** Stable for a focus: `<area>:<kind>`. */
  id: string;
  area: Area;
  kind: ConnectionKind;
  title: string;
  /** The plain sentence under the heading. */
  explain: string;
  items: BoxItem[];
  /** Only on "Activities". */
  activities?: ActivityRow[];
  /** Only on "Books". */
  books?: BookRow[];
  /** Made by hand (a solid wire). False: worked out from elsewhere (a dashed wire and a lock). */
  editable: boolean;
  /** For a worked-out box: where it comes from and where to change it. */
  through?: string;
  empty: string;
  /** Should hold something and does not: the amber ring. */
  missing: boolean;
  /** Full-width rows instead of chips. */
  rows: boolean;
  /** The item a box's "open" button re-centres on. */
  open?: NodeKey;
  /** CG-5: the kind of item a drop or "+ Add" on this box takes. */
  accepts?: NodeType;
  state: BoxState;
  /** Shown instead of the items when the state is not ready. */
  stateText?: string;
}

export interface Neighbourhood {
  focus: NodeKey;
  boxes: Box[];
  /** Owner decision 5: one spelling, several words. Detected only; the split is CG-5. */
  meanings: SeveralMeanings[];
}

export type UsageState =
  | { status: "ready"; items: readonly WordUsageItem[]; books?: readonly BookUnitUse[] }
  | { status: "loading" }
  | { status: "error" }
  | { status: "unavailable"; reason: string };

/** The uses of one item; the page answers from its cache (`lib/connections/source.ts`). */
export type UsageLookup = (unit: NodeKey) => UsageState;

const flagsOf = (w: WordNode | undefined): ItemFlag[] => {
  if (!w) return [];
  if (w.isPseudo) return ["drill"];
  return awaitsReadsAs(asReadsRow(w)) ? ["no-reading"] : [];
};

const wordItem = (g: Graph, id: string, extra: Partial<BoxItem> = {}): BoxItem => ({
  key: nodeKey("word", id),
  flags: flagsOf(g.words.get(id)),
  ...extra,
});

function box(
  area: Area,
  kind: ConnectionKind,
  items: BoxItem[],
  opts: Partial<Omit<Box, "area" | "kind" | "items">> & { empty: string },
): Box {
  const K = CONNECTION_KINDS[kind];
  const editable = opts.editable ?? (K.editable && !opts.through);
  return {
    ...opts,
    id: `${area}:${kind}`,
    area,
    kind,
    title: opts.title ?? K.name,
    explain: opts.explain ?? K.explain,
    items,
    editable,
    missing: opts.missing ?? false,
    rows: opts.rows ?? false,
    state: opts.state ?? "ready",
    // Only a box made by hand takes a connection.
    accepts: editable ? opts.accepts : undefined,
  };
}

/** Folds usage rows into one row per activity, in the backend's order. */
export function activityRows(uses: ReadonlyArray<{ wordId: string; items: readonly WordUsageItem[] }>): ActivityRow[] {
  const rows = new Map<string, ActivityRow>();
  for (const { wordId, items } of uses) {
    for (const it of items) {
      let r = rows.get(it.activity_id);
      if (!r) {
        r = {
          activityId: it.activity_id,
          type: it.type,
          curriculumId: it.curriculum_id,
          path: [it.curriculum_title, it.topic_title, it.node_title].map((s) => (s ?? "").replace(/\s+/g, " ").trim()).filter(Boolean).join(" › "),
          roles: [],
          wordIds: [],
        };
        rows.set(it.activity_id, r);
      }
      if (!r.roles.includes(it.role)) r.roles.push(it.role);
      if (wordId && !r.wordIds.includes(wordId)) r.wordIds.push(wordId);
    }
  }
  return Array.from(rows.values());
}

/** Folds storybook units into one row per book, in the backend's order. */
export function bookRows(uses: ReadonlyArray<{ wordId: string; books: readonly BookUnitUse[] }>): BookRow[] {
  const rows = new Map<string, BookRow & { seen: Set<string> }>();
  for (const { wordId, books } of uses) {
    for (const b of books) {
      let r = rows.get(b.book_id);
      if (!r) {
        r = {
          bookId: b.book_id,
          title: (b.book_title ?? "").trim() || (b.book_title_ar ?? "").trim() || "Untitled book",
          titleAr: b.book_title_ar?.trim() || null,
          units: 0,
          roles: [],
          wordIds: [],
          seen: new Set(),
        };
        rows.set(b.book_id, r);
      }
      if (!r.seen.has(b.unit_id)) {
        r.seen.add(b.unit_id);
        r.units += 1;
      }
      if (!r.roles.includes(b.role)) r.roles.push(b.role);
      if (wordId && !r.wordIds.includes(wordId)) r.wordIds.push(wordId);
    }
  }
  return Array.from(rows.values()).map(({ seen: _seen, ...r }) => r);
}

export interface UsageEmpty {
  activities: string;
  books: string;
}

/**
 * The "Activities" and "Books" boxes for some units (a spelling, a family's
 * forms, a letter, a meaning): loading until every one has answered.
 */
function usageBoxes(
  areas: { activities: Area; books: Area },
  units: readonly NodeKey[],
  usage: UsageLookup,
  empty: UsageEmpty,
): Box[] {
  const states = units.map((unit) => ({ wordId: typeOfKey(unit) === "word" ? idOfKey(unit) : "", s: usage(unit) }));
  const make = (kind: "activities" | "books", extra: Partial<Box>) =>
    box(areas[kind], kind, [], { empty: empty[kind], rows: true, ...extra });
  const unavailable = states.find((x) => x.s.status === "unavailable");
  let common: Partial<Box> | null = null;
  if (unavailable && unavailable.s.status === "unavailable") common = { state: "unavailable", stateText: unavailable.s.reason };
  else if (states.some((x) => x.s.status === "error")) common = { state: "error", stateText: "Could not be loaded." };
  else if (states.some((x) => x.s.status === "loading")) common = { state: "loading", stateText: "Loading..." };
  if (common) return [make("activities", common), make("books", common)];
  const ready = states.map((x) => ({
    wordId: x.wordId,
    items: x.s.status === "ready" ? x.s.items : [],
    books: x.s.status === "ready" ? (x.s.books ?? []) : [],
  }));
  return [make("activities", { activities: activityRows(ready) }), make("books", { books: bookRows(ready) })];
}

function wordBoxes(g: Graph, id: string, usage: UsageLookup): Box[] {
  const w = g.words.get(id);
  if (!w) return [];
  const out: Box[] = [];
  const fam = w.familyId ? g.families.get(w.familyId) : undefined;

  // Above: the word it is a form of, and that word's other forms.
  const forms: BoxItem[] = [];
  if (w.familyId) {
    forms.push({ key: nodeKey("family", w.familyId), tag: "the word", flags: [] });
    for (const m of g.membersOf(w.familyId)) {
      if (m.id !== w.id) forms.push(wordItem(g, m.id, { head: m.id === fam?.headwordId }));
    }
  }
  out.push(
    box("top", "forms", forms, {
      empty: w.isPseudo
        ? "A drill spelling has no family."
        : "No family yet. This spelling is not grouped with the other forms of its word.",
      missing: !w.familyId && !w.isPseudo && !w.retired,
      open: w.familyId ? nodeKey("family", w.familyId) : undefined,
      accepts: "family",
    }),
  );

  // Left: how it is read, and the spellings read as it.
  const readers = g.readersOf(w.id);
  const needs = needsReading(asReadsRow(w));
  if (needs || w.readsAsId || readers.length || vowelStatus(w.arabic) === "full") {
    const items: BoxItem[] = [];
    if (w.readsAsId) items.push(wordItem(g, w.readsAsId, { tag: "read as" }));
    for (const r of readers) items.push(wordItem(g, r.id, { tag: "reads as this" }));
    out.push(
      box("left", "readings", items, {
        empty: needs ? "Not confirmed. The app has no reading for it." : "No other spelling is read as it.",
        missing: awaitsReadsAs(asReadsRow(w)),
        accepts: "word",
      }),
    );
  }

  // Right: the meaning and pictures, through the family.
  if (w.familyId) {
    const concepts = g.conceptsOfFamily(w.familyId);
    out.push(
      box(
        "right",
        "meaning",
        concepts.map((c) => ({ key: nodeKey("concept", c.slug), flags: [] })),
        { empty: `"${familyLabel(fam, w.familyId)}" names no meaning yet.`, through: THROUGH_FAMILY, open: nodeKey("family", w.familyId) },
      ),
    );
    const pics = uniqueBy(
      [...g.picturesOfFamily(w.familyId), ...concepts.flatMap((c) => g.picturesOfConcept(c.slug))],
      (p) => p.assetId,
    );
    out.push(
      box("right", "pictures", pics.map((p) => ({ key: nodeKey("picture", p.assetId), flags: [] })), {
        empty: concepts.length ? "Its meaning has no picture yet." : "Connect a meaning to the word to get its pictures.",
        through: THROUGH_FAMILY,
      }),
    );
  }

  // Below: letters (worked out), and the lessons that use it.
  out.push(
    box("bl", "letters", g.lettersOf(w).map((l) => ({ key: nodeKey("letter", l.id), flags: [] })), {
      empty: "None.",
    }),
  );
  out.push(
    ...usageBoxes({ activities: "bottom", books: "br" }, [nodeKey("word", w.id)], usage, {
      activities: "Not used in any activity.",
      books: "Not in any book.",
    }),
  );
  return out;
}

function familyBoxes(g: Graph, id: string, usage: UsageLookup): Box[] {
  const f = g.families.get(id);
  if (!f) return [];
  const concepts = g.conceptsOfFamily(id);
  const members = g.membersOf(id);
  const out: Box[] = [];
  out.push(
    box("top", "meaning", concepts.map((c) => ({ key: nodeKey("concept", c.slug), flags: [] })), {
      empty: "Names no meaning yet.",
      missing: concepts.length === 0,
      accepts: "concept",
    }),
  );
  out.push(
    box(
      "left",
      "forms",
      members.map((m) => wordItem(g, m.id, { head: m.id === f.headwordId, tag: m.readsAsId ? "read as another" : undefined })),
      { empty: "No spellings.", accepts: "word" },
    ),
  );
  const fromMeaning = uniqueBy(concepts.flatMap((c) => g.picturesOfConcept(c.slug)), (p) => p.assetId);
  const own = g.picturesOfFamily(id);
  out.push(
    box("right", "pictures", fromMeaning.map((p) => ({ key: nodeKey("picture", p.assetId), flags: [] })), {
      title: "Pictures",
      empty: concepts.length ? "Its meaning has no picture yet." : "Connect a meaning to get its pictures.",
      missing: concepts.length > 0 && fromMeaning.length === 0 && own.length === 0,
      through: THROUGH_MEANING,
    }),
  );
  if (own.length) {
    out.push(
      box("right", "ownPicture", own.map((p) => ({ key: nodeKey("picture", p.assetId), flags: [] })), {
        empty: "None.",
        accepts: "picture",
      }),
    );
  }
  out.push(
    ...usageBoxes({ activities: "bottom", books: "br" }, members.map((m) => nodeKey("word", m.id)), usage, {
      activities: "No spelling of this word is used in an activity yet.",
      books: "No spelling of this word is in a book yet.",
    }),
  );
  return out;
}

function conceptBoxes(g: Graph, slug: string, usage: UsageLookup): Box[] {
  const c = g.concepts.get(slug);
  if (!c) return [];
  const fams = g.familiesOfConcept(slug);
  const pics = g.picturesOfConcept(slug);
  const out: Box[] = [];
  out.push(
    box("left", "meaning", fams.map((f) => ({ key: nodeKey("family", f.id), flags: [] })), {
      title: "Words for it",
      empty: "No word names it yet.",
      missing: fams.length === 0,
      accepts: "family",
    }),
  );
  out.push(
    box("right", "pictures", pics.map((p) => ({ key: nodeKey("picture", p.assetId), flags: [] })), {
      empty: "No picture yet.",
      missing: pics.length === 0,
      accepts: "picture",
    }),
  );
  out.push(
    box(
      "bottom",
      "forms",
      fams.flatMap((f) => g.membersOf(f.id).map((m) => wordItem(g, m.id, { head: m.id === f.headwordId }))),
      { empty: "None yet.", through: THROUGH_WORDS },
    ),
  );
  out.push(
    ...usageBoxes({ activities: "bl", books: "br" }, [nodeKey("concept", slug)], usage, {
      activities: "No activity uses this meaning itself (its pictures).",
      books: "No book shows this meaning itself.",
    }),
  );
  return out;
}

function pictureBoxes(g: Graph, assetId: string): Box[] {
  if (!g.pictures.has(assetId)) return [];
  const concepts = g.conceptsOfPicture(assetId);
  const keptOn = g.familiesKeepingPicture(assetId);
  const out: Box[] = [];
  out.push(
    box("left", "pictures", concepts.map((c) => ({ key: nodeKey("concept", c.slug), flags: [] })), {
      title: "Meaning",
      empty: "Shows no meaning. It is not shown anywhere.",
      missing: concepts.length === 0,
      accepts: "concept",
    }),
  );
  if (keptOn.length) {
    out.push(
      box("right", "ownPicture", keptOn.map((f) => ({ key: nodeKey("family", f.id), flags: [] })), {
        empty: "None.",
        accepts: "family",
      }),
    );
  }
  const words = uniqueBy(concepts.flatMap((c) => g.familiesOfConcept(c.slug)), (f) => f.id);
  out.push(
    box("bottom", "forms", words.map((f) => ({ key: nodeKey("family", f.id), flags: [] })), {
      title: "Words that show it",
      empty: "None yet.",
      through: THROUGH_MEANING,
    }),
  );
  return out;
}

/** A letter: the spellings with it (worked out), and where the letter itself is used. */
function letterBoxes(g: Graph, letterId: string, usage: UsageLookup): Box[] {
  const l = g.letters.get(letterId);
  if (!l) return [];
  const words = Array.from(g.words.values())
    .filter((w) => !w.retired && g.lettersOf(w).some((x) => x.id === letterId))
    .sort((a, b) => b.usageCount - a.usageCount || a.id.localeCompare(b.id));
  return [
    box("bottom", "letters", words.map((w) => wordItem(g, w.id)), {
      title: "Spellings with this letter",
      explain: CONNECTION_KINDS.letters.explain,
      empty: "No spelling in the word bank has it.",
    }),
    ...usageBoxes({ activities: "br", books: "bl" }, [nodeKey("letter", letterId)], usage, {
      activities: "No activity uses this letter.",
      books: "No book shows this letter.",
    }),
  ];
}

function uniqueBy<T>(list: readonly T[], key: (t: T) => string): T[] {
  const seen = new Set<string>();
  return list.filter((x) => (seen.has(key(x)) ? false : (seen.add(key(x)), true)));
}

/** True when the key names something the graph holds (an activity is never a focus yet). */
export function existsInGraph(g: Graph, key: NodeKey): boolean {
  const id = idOfKey(key);
  switch (typeOfKey(key)) {
    case "word":
      return g.words.has(id);
    case "family":
      return g.families.has(id);
    case "concept":
      return g.concepts.has(id);
    case "picture":
      return g.pictures.has(id);
    case "letter":
      return g.letters.has(id);
    default:
      return false;
  }
}

/** The boxes around `focus`, and any several-meanings suggestion. Empty boxes when the focus is unknown. */
export function neighbourhood(g: Graph, focus: NodeKey, usage: UsageLookup): Neighbourhood {
  const id = idOfKey(focus);
  let boxes: Box[] = [];
  let meanings: SeveralMeanings[] = [];
  switch (typeOfKey(focus)) {
    case "word": {
      boxes = wordBoxes(g, id, usage);
      const m = severalMeaningsOfWord(g, id);
      meanings = m ? [m] : [];
      break;
    }
    case "family":
      boxes = familyBoxes(g, id, usage);
      meanings = severalMeaningsInFamily(g, id);
      break;
    case "concept":
      boxes = conceptBoxes(g, id, usage);
      break;
    case "picture":
      boxes = pictureBoxes(g, id);
      break;
    case "letter":
      boxes = letterBoxes(g, id, usage);
      break;
    default:
      boxes = [];
  }
  return { focus, boxes, meanings };
}

/** The spellings whose usage the focus needs (the page loads these). */
export function usageUnitsFor(g: Graph, focus: NodeKey): NodeKey[] {
  const id = idOfKey(focus);
  switch (typeOfKey(focus)) {
    case "word":
      return g.words.has(id) ? [focus] : [];
    case "family":
      return g.membersOf(id).map((m) => nodeKey("word", m.id));
    case "letter":
      return g.letters.has(id) ? [focus] : [];
    case "concept":
      return g.concepts.has(id) ? [focus] : [];
    default:
      return [];
  }
}
