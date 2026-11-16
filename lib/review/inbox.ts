/**
 * The Review inbox (CW-2): one list of content decisions drawn from several
 * sources. Pure: no React, no fetch, no storage.
 *
 * Each source has a normaliser in `lib/review/normalise/` that turns its rows
 * into `InboxItem`s. Everything here works on items only: what needs a
 * decision, the status pill, counts, search with harakat folding, the lens and
 * status filters, the sorts, the bulk-safe rule and where the selection goes
 * after a decision. The server stays the authority on every rule; these only
 * arrange what the page shows.
 */

import { isAuditMark, TATWEEL } from "../words/review/arabicText";

// ---------------------------------------------------------------------------
// Kinds and roles
// ---------------------------------------------------------------------------

/** Every kind of decision, in rail order. The order also fixes the number key (1 to 9). */
export const INBOX_KINDS = [
  "spelling",
  "reading",
  "blend",
  "draft",
  "request",
  "phrase",
  "recording",
  "letter",
  "link",
] as const;
export type InboxKind = (typeof INBOX_KINDS)[number];

/** Who may decide: any staff member, a curriculum lead, or a phrase reviewer (a lead is one too). */
export type Gate = "staff" | "lead" | "phrase";

export interface ReviewRoles {
  curriculumLead: boolean;
  phraseReviewer: boolean;
}

export interface KindMeta {
  /** Rail and select label. */
  label: string;
  /** One item of the kind. */
  one: string;
  gate: Gate;
  /** The number key that opens the kind (`1` to `8`). */
  key: string;
  /** The pill on an item that waits for a decision. */
  todoLabel: string;
}

export const KIND_META: Record<InboxKind, KindMeta> = {
  spelling: { label: "Spellings", one: "Spelling", gate: "staff", key: "1", todoLabel: "To review" },
  // A reading is a connection (`PUT /words/:id/reads-as`): a curriculum lead or phrase reviewer confirms it.
  reading: { label: "Readings", one: "Reading", gate: "phrase", key: "2", todoLabel: "To confirm" },
  blend: { label: "Blend splits", one: "Blend", gate: "staff", key: "3", todoLabel: "Needs review" },
  draft: { label: "AI drafts", one: "AI draft", gate: "lead", key: "4", todoLabel: "Waiting" },
  request: { label: "Word requests", one: "Word request", gate: "staff", key: "5", todoLabel: "Open" },
  phrase: { label: "Phrases", one: "Phrase", gate: "phrase", key: "6", todoLabel: "Pending" },
  recording: { label: "Recordings", one: "Recording", gate: "phrase", key: "7", todoLabel: "Take to hear" },
  // Anyone listens; flagging a file, and deciding a flagged one, is a phrase reviewer's (BE-3).
  letter: { label: "Letter sounds", one: "Letter sound", gate: "phrase", key: "8", todoLabel: "To decide" },
  // AI-proposed connections (`GET /words/proposals`); approving one is a connection write.
  link: { label: "Suggested links", one: "Suggested link", gate: "phrase", key: "9", todoLabel: "Suggested" },
};

export function canDecide(gate: Gate, roles: ReviewRoles): boolean {
  if (gate === "staff") return true;
  if (gate === "lead") return roles.curriculumLead;
  return roles.phraseReviewer || roles.curriculumLead;
}

/** "a curriculum lead", for the decision bar of a gated item. */
export const GATE_TEXT: Record<Exclude<Gate, "staff">, string> = {
  lead: "a curriculum lead",
  phrase: "a phrase reviewer or a curriculum lead",
};

/** The short rail tag for a kind your role cannot decide. */
export const GATE_TAG: Record<Exclude<Gate, "staff">, string> = { lead: "Lead", phrase: "Reviewer" };

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

/**
 * Where an item stands. `todo` and `failed` wait for a person; `listen` is a
 * listen-only item (a letter sound with no flag) that never counts as a decision.
 * A flagged letter sound is `todo`.
 */
export type ItemState =
  | "todo"
  | "failed"
  | "approved"
  | "rejected"
  | "noted_pseudo"
  | "noted_wrong"
  | "listen";

export interface InboxItem<K extends InboxKind = InboxKind, D = unknown> {
  /** Unique across sources: `<kind>:<source id>`. Also the `item` in the URL. */
  key: string;
  kind: K;
  /** The source row's id (word id, draft id, phrase key...). */
  id: string;
  /** What the list and the hero show large. */
  title: string;
  /** Arabic titles render RTL in the Arabic face; Latin ones (draft types, request text) do not. */
  titleScript: "ar" | "latin";
  state: ItemState;
  /** Overrides the kind's to-decide pill (a phrase approved as the other kind says "Confirm again"). */
  todoLabel?: string;
  /** The failed pill text ("Not voiceable" for a blend). */
  failedLabel?: string;
  /** One line of context under the title. */
  context: string;
  /** How many activities use it; the default sort. */
  usage: number;
  /** ISO time it started waiting, when the source knows. */
  waitingSince: string | null;
  decidedAt?: string | null;
  /** The deciding staff member's id, when the source knows. */
  decidedBy?: string | null;
  /** Extra search text: English, ids, node titles. The title is always searched. */
  searchText: string;
  /** May be approved together with others (CW-10). */
  bulkSafe: boolean;
  /** The word family the item belongs to, for the Family and Concept context cards. */
  familyId: string | null;
  /** The source's own order, the last tie-break of every sort (letter sounds: alphabet order). */
  order?: number;
  /** An automatic word check flags it (CM-AIPRE; spellings only). Advice: a person still decides. */
  checkFlagged?: boolean;
  data: D;
}

export function needsDecision(item: Pick<InboxItem, "state" | "kind">): boolean {
  // A letter sound waits only while it is flagged; a missing file is a library matter.
  if (item.kind === "letter") return item.state === "todo";
  return item.state === "todo" || item.state === "failed";
}

export function isBulkSafe(item: InboxItem): boolean {
  return item.bulkSafe && needsDecision(item);
}

export type PillTone = "todo" | "ok" | "no" | "info" | "neutral" | "gate";

export interface Pill {
  tone: PillTone;
  text: string;
}

/** The status pill of a row and of the hero. */
export function statusPill(item: InboxItem, roles: ReviewRoles): Pill {
  const meta = KIND_META[item.kind];
  switch (item.state) {
    case "listen":
      return { tone: "neutral", text: item.todoLabel ?? "Listen" };
    case "approved":
      return {
        tone: "ok",
        text: item.kind === "reading" ? "Confirmed" : item.kind === "request" ? "Fulfilled" : item.kind === "link" ? "Connected" : "Approved",
      };
    case "rejected":
      return { tone: "no", text: item.kind === "request" ? "Declined" : item.kind === "link" ? "Skipped" : "Rejected" };
    case "noted_pseudo":
      return { tone: "no", text: "Noted: not a word" };
    case "noted_wrong":
      return { tone: "no", text: "Noted: respell" };
    case "failed":
      return { tone: "no", text: item.failedLabel ?? "Failed" };
    case "todo":
      if (!canDecide(meta.gate, roles)) {
        return { tone: "gate", text: meta.gate === "lead" ? "Lead decides" : "Reviewer decides" };
      }
      return { tone: "todo", text: item.todoLabel ?? meta.todoLabel };
  }
}

// ---------------------------------------------------------------------------
// Counts
// ---------------------------------------------------------------------------

export interface InboxCounts {
  /** Items that wait for a decision, every kind. */
  all: number;
  /** Of those, the ones your roles can decide. */
  yours: number;
  /** Waiting items per kind; Letter sounds counts its files (the flagged ones also count as waiting). */
  byKind: Record<InboxKind, number>;
}

export function countInbox(items: readonly InboxItem[], roles: ReviewRoles): InboxCounts {
  const byKind = Object.fromEntries(INBOX_KINDS.map((k) => [k, 0])) as Record<InboxKind, number>;
  let all = 0;
  let yours = 0;
  for (const it of items) {
    if (it.kind === "letter") byKind.letter += 1;
    if (!needsDecision(it)) continue;
    if (it.kind !== "letter") byKind[it.kind] += 1;
    all += 1;
    if (canDecide(KIND_META[it.kind].gate, roles)) yours += 1;
  }
  return { all, yours, byKind };
}

/** The header line: "22 decisions waiting, 14 yours, 8 for another role". */
export function waitingSummary(counts: InboxCounts): string {
  if (counts.all === 0) return "Nothing waits for a decision";
  const head = `${counts.all} ${counts.all === 1 ? "decision" : "decisions"} waiting`;
  const other = counts.all - counts.yours;
  return other > 0 ? `${head}, ${counts.yours} yours, ${other} for another role` : head;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/** Letters a search treats as one: the hamza seats and wasla as bare alif, ta marbuta as ha, alif maqsura as ya. */
const SEARCH_FOLDS: Record<string, string> = { "أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ة": "ه", "ى": "ي" };

/**
 * Lowercase with harakat and tatweel removed and the look-alike letters folded
 * (hamza seats, ة/ه, ى/ي), so `كتاب` finds `كِتَاب`, `اسد` finds `أَسَد` and the
 * other way round. Review's search and the Words page (`lib/connections/search.ts`) share it.
 */
export function foldForSearch(s: string): string {
  return Array.from(s.normalize("NFC").toLowerCase())
    .filter((ch) => !isAuditMark(ch) && ch !== TATWEEL)
    .map((ch) => SEARCH_FOLDS[ch] ?? ch)
    .join("");
}

export function matchesSearch(item: InboxItem, query: string): boolean {
  const q = foldForSearch(query.trim());
  if (!q) return true;
  return foldForSearch(`${item.title} ${item.id} ${item.searchText}`).includes(q);
}

// ---------------------------------------------------------------------------
// Lenses, views, status
// ---------------------------------------------------------------------------

/** Saved views across kinds (the rail's Views group). */
export const INBOX_VIEWS = ["v-ai", "v-failed", "v-check", "v-mine"] as const;
export type InboxView = (typeof INBOX_VIEWS)[number];

export const VIEW_META: Record<InboxView, { label: string; kinds: readonly InboxKind[] | null }> = {
  "v-ai": { label: "From the AI", kinds: ["draft", "request", "blend", "link"] },
  "v-failed": { label: "Failed audio", kinds: ["blend", "recording", "letter"] },
  // Spellings an automatic word check flags (CM-AIPRE).
  "v-check": { label: "Flagged by check", kinds: ["spelling"] },
  // Any kind: what you decided.
  "v-mine": { label: "Decided by me", kinds: null },
};

/** The library lenses (Families, Concepts) are browse lists, not inbox items (CW-9). */
export const LIBRARY_LENSES = ["lib-families", "lib-concepts"] as const;
export type LibraryLens = (typeof LIBRARY_LENSES)[number];

/** What the rail picked: everything, one kind, a view, or a library list. */
export type Lens = "all" | InboxKind | InboxView | LibraryLens;

export function isLens(value: string): value is Lens {
  return (
    value === "all" ||
    (INBOX_KINDS as readonly string[]).includes(value) ||
    (INBOX_VIEWS as readonly string[]).includes(value) ||
    (LIBRARY_LENSES as readonly string[]).includes(value)
  );
}

export function isKindLens(lens: Lens): lens is InboxKind {
  return (INBOX_KINDS as readonly string[]).includes(lens);
}

export type StatusFilter = "todo" | "done" | "all";
export const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "todo", label: "To decide" },
  { value: "done", label: "Decided" },
  { value: "all", label: "All" },
];

/** `t` cycles To decide, Decided, All. */
export function nextStatus(s: StatusFilter): StatusFilter {
  return s === "todo" ? "done" : s === "done" ? "all" : "todo";
}

export interface LensContext {
  /** The signed-in staff member's id, for Decided by me. */
  userId: string | null;
  /** Items decided in this session (their source may not record who decided). */
  decidedHere: ReadonlySet<string>;
}

export function inLens(item: InboxItem, lens: Lens, status: StatusFilter, ctx: LensContext): boolean {
  switch (lens) {
    case "all":
      // Letter sounds stay out of the To decide list unless they are flagged.
      return item.kind !== "letter" || status !== "todo" || needsDecision(item);
    case "v-ai":
      return VIEW_META["v-ai"].kinds!.includes(item.kind);
    case "v-failed":
      return item.state === "failed" || (item.kind === "letter" && item.failedLabel !== undefined);
    case "v-check":
      return !!item.checkFlagged;
    case "v-mine":
      return ctx.decidedHere.has(item.key) || (!!ctx.userId && item.decidedBy === ctx.userId && !needsDecision(item));
    case "lib-families":
    case "lib-concepts":
      return false;
    default:
      return item.kind === lens;
  }
}

export function inStatus(item: InboxItem, status: StatusFilter): boolean {
  if (item.kind === "letter" || status === "all") return true;
  return status === "todo" ? needsDecision(item) : !needsDecision(item);
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

export type SortKey = "usage" | "check" | "oldest" | "newest" | "kind";
export const SORTS: { value: SortKey; label: string }[] = [
  { value: "usage", label: "Most used first" },
  { value: "check", label: "Flagged by check first" },
  { value: "oldest", label: "Waiting longest" },
  { value: "newest", label: "Newest" },
  { value: "kind", label: "By kind" },
];

const kindRank = (k: InboxKind) => INBOX_KINDS.indexOf(k);
const time = (iso: string | null) => (iso ? Date.parse(iso) || 0 : 0);

/** Oldest first; items with no time go last. */
function byWaiting(a: InboxItem, b: InboxItem): number {
  if (!a.waitingSince && !b.waitingSince) return 0;
  if (!a.waitingSince) return 1;
  if (!b.waitingSince) return -1;
  return time(a.waitingSince) - time(b.waitingSince);
}

export function sortItems(items: readonly InboxItem[], sort: SortKey): InboxItem[] {
  const primary: Record<SortKey, (a: InboxItem, b: InboxItem) => number> = {
    usage: (a, b) => b.usage - a.usage || byWaiting(a, b),
    // Flagged spellings first (CM-AIPRE), then most used.
    check: (a, b) => Number(!!b.checkFlagged) - Number(!!a.checkFlagged) || b.usage - a.usage || byWaiting(a, b),
    oldest: byWaiting,
    newest: (a, b) => {
      if (!a.waitingSince && !b.waitingSince) return 0;
      if (!a.waitingSince) return 1;
      if (!b.waitingSince) return -1;
      return time(b.waitingSince) - time(a.waitingSince);
    },
    kind: (a, b) => kindRank(a.kind) - kindRank(b.kind) || b.usage - a.usage,
  };
  return [...items].sort(
    (a, b) =>
      primary[sort](a, b) ||
      kindRank(a.kind) - kindRank(b.kind) ||
      (a.order ?? 0) - (b.order ?? 0) ||
      (a.key < b.key ? -1 : a.key > b.key ? 1 : 0),
  );
}

export interface InboxQuery {
  lens: Lens;
  status: StatusFilter;
  sort: SortKey;
  q: string;
}

/** The rows the list shows, in order. */
export function visibleItems(items: readonly InboxItem[], query: InboxQuery, ctx: LensContext): InboxItem[] {
  return sortItems(
    items.filter((it) => inLens(it, query.lens, query.status, ctx) && inStatus(it, query.status) && matchesSearch(it, query.q)),
    query.sort,
  );
}

/** Decided items under a lens, for the empty state ("N decided so far"). */
export function decidedCount(items: readonly InboxItem[], lens: Lens, ctx: LensContext): number {
  return items.filter((it) => it.kind !== "letter" && !needsDecision(it) && inLens(it, lens, "done", ctx)).length;
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

/**
 * Where the selection goes after deciding `decidedKey`: the next item below it
 * that still needs a decision, else the first one above it, else null.
 * `list` is the list as it was shown when the decision was made.
 */
export function nextAfterDecision(list: readonly InboxItem[], decidedKey: string): string | null {
  const i = list.findIndex((it) => it.key === decidedKey);
  const waiting = (it: InboxItem) => it.key !== decidedKey && needsDecision(it);
  const after = list.slice(i + 1).find(waiting);
  if (after) return after.key;
  const before = list.slice(0, Math.max(i, 0)).find(waiting);
  return before?.key ?? null;
}

/** `j` / `k`: the neighbour of `current` in `list`, clamped; the first row when nothing is selected. */
export function moveSelection(list: readonly InboxItem[], current: string | null, delta: number): string | null {
  if (list.length === 0) return null;
  const i = current ? list.findIndex((it) => it.key === current) : -1;
  if (i < 0) return list[0].key;
  return list[Math.max(0, Math.min(list.length - 1, i + delta))].key;
}

// ---------------------------------------------------------------------------
// Ages
// ---------------------------------------------------------------------------

/** "40 min", "3 h", "9 d"; empty when unknown. */
export function shortAge(iso: string | null | undefined, now: number): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const min = Math.max(0, Math.floor((now - t) / 60_000));
  if (min < 1) return "just now";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} d`;
}
