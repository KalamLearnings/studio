/**
 * Review's keyboard layer (CW-4): a key press becomes a command. Pure. The
 * workspace runs the commands it owns (moving, search, status, lenses, undo,
 * the sheet) and offers every other one to the open pane first; a pane that
 * does not handle a command lets it fall through (a digit then jumps to a
 * kind). Keys are off while typing in a field, except Escape and Enter.
 */

export type ReviewCommand =
  | { type: "next" }
  | { type: "prev" }
  | { type: "search" }
  | { type: "cycleStatus" }
  /** `0` to `9`: a pane picks a reason or a candidate with it; otherwise `0` is Everything and `1`-`8` a kind. */
  | { type: "digit"; n: number }
  | { type: "toggleSelect" }
  | { type: "approve" }
  | { type: "bulkApprove" }
  | { type: "reject" }
  | { type: "confirm" }
  | { type: "notReal" }
  | { type: "fixHarakat" }
  | { type: "undo" }
  | { type: "play" }
  | { type: "playServed" }
  | { type: "regenerate" }
  | { type: "openFamily" }
  | { type: "openConcept" }
  | { type: "openBuilder" }
  | { type: "nextDecision" }
  | { type: "prevDecision" }
  | { type: "help" }
  | { type: "escape" };

export type CommandType = ReviewCommand["type"];

export interface KeyInput {
  key: string;
  shiftKey?: boolean;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
}

export interface KeyContext {
  /** Focus is in an input, textarea, select or contenteditable. */
  typing: boolean;
}

const SINGLE: Record<string, ReviewCommand> = {
  j: { type: "next" },
  ArrowDown: { type: "next" },
  k: { type: "prev" },
  ArrowUp: { type: "prev" },
  "/": { type: "search" },
  t: { type: "cycleStatus" },
  x: { type: "toggleSelect" },
  a: { type: "approve" },
  A: { type: "bulkApprove" },
  r: { type: "reject" },
  p: { type: "notReal" },
  h: { type: "fixHarakat" },
  u: { type: "undo" },
  g: { type: "regenerate" },
  f: { type: "openFamily" },
  c: { type: "openConcept" },
  o: { type: "openBuilder" },
  "?": { type: "help" },
};

export function commandForKey(e: KeyInput, ctx: KeyContext): ReviewCommand | null {
  if (e.key === "Escape") return { type: "escape" };
  if (e.metaKey || e.ctrlKey || e.altKey) return null;
  if (e.key === "Enter") return { type: "confirm" };
  if (ctx.typing) return null;
  if (e.key === " ") return { type: e.shiftKey ? "playServed" : "play" };
  if (e.key === "Tab") return { type: e.shiftKey ? "prevDecision" : "nextDecision" };
  if (/^[0-9]$/.test(e.key)) return { type: "digit", n: Number(e.key) };
  return SINGLE[e.key] ?? null;
}

/** True when the element takes text (keys must not act there). */
export function isTypingTarget(el: { tagName?: string; isContentEditable?: boolean } | null | undefined): boolean {
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = (el.tagName ?? "").toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select";
}

/** A row of the shortcut sheet. `keys` are shown as separate key caps; "to" joins a range. */
export interface ShortcutRow {
  label: string;
  keys: string[];
}

export interface ShortcutGroup {
  title: string;
  rows: ShortcutRow[];
}

/** The keys every lens shares. Lenses add their own rows (see components/review/README.md). */
export const BASE_SHORTCUTS: ShortcutGroup[] = [
  {
    title: "Move",
    rows: [
      { label: "Next item", keys: ["j"] },
      { label: "Previous item", keys: ["k"] },
      { label: "Search", keys: ["/"] },
      { label: "Status: to decide, decided, all", keys: ["t"] },
      { label: "Jump to a kind", keys: ["1", "to", "8"] },
      { label: "Everything", keys: ["0"] },
      { label: "Back, cancel, close", keys: ["esc"] },
    ],
  },
  {
    title: "Decide",
    rows: [
      { label: "Approve, confirm", keys: ["a"] },
      { label: "Confirm the open field", keys: ["enter"] },
      { label: "Undo the last decision", keys: ["u"] },
    ],
  },
  {
    title: "Help",
    rows: [{ label: "This sheet", keys: ["?"] }],
  },
];

/** Merges lens rows into the base groups by title, without repeating a label. */
export function mergeShortcuts(base: readonly ShortcutGroup[], extra: readonly ShortcutGroup[]): ShortcutGroup[] {
  const out = base.map((g) => ({ title: g.title, rows: [...g.rows] }));
  for (const g of extra) {
    let target = out.find((o) => o.title === g.title);
    if (!target) {
      target = { title: g.title, rows: [] };
      // New groups go before Help.
      out.splice(Math.max(out.length - 1, 0), 0, target);
    }
    for (const row of g.rows) if (!target.rows.some((r) => r.label === row.label)) target.rows.push(row);
  }
  return out;
}
