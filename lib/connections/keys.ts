/**
 * Node keys, the Words page URL state and the trail (CG-1). Pure.
 *
 * A node key is `<type>:<id>`: `word:<curriculum_words.id>`, `family:<slug>`,
 * `concept:<slug>`, `picture:<asset id>`, `letter:<letters.id>`,
 * `activity:<curriculum_activities.id>`. The URL carries
 * `?focus=<key>&view=all`.
 */

export const NODE_TYPES = ["word", "family", "concept", "picture", "letter", "activity"] as const;
export type NodeType = (typeof NODE_TYPES)[number];
export type NodeKey = `${NodeType}:${string}`;

export interface NodeRef {
  type: NodeType;
  id: string;
}

const isNodeType = (t: string): t is NodeType => (NODE_TYPES as readonly string[]).includes(t);

export const nodeKey = (type: NodeType, id: string): NodeKey => `${type}:${id}`;

/** `family:book` to `{ type: "family", id: "book" }`; null for anything else. */
export function parseNodeKey(raw: string | null | undefined): NodeRef | null {
  if (!raw) return null;
  const i = raw.indexOf(":");
  if (i <= 0) return null;
  const type = raw.slice(0, i);
  const id = raw.slice(i + 1).trim();
  if (!isNodeType(type) || !id) return null;
  return { type, id };
}

export const typeOfKey = (key: NodeKey): NodeType => key.slice(0, key.indexOf(":")) as NodeType;
export const idOfKey = (key: NodeKey): string => key.slice(key.indexOf(":") + 1);

// ---- URL state --------------------------------------------------------------------------

export type WordsView = "focus" | "all";

export interface WordsUrlState {
  focus: NodeKey | null;
  view: WordsView;
}

/**
 * Reads `?focus=<type>:<id>&view=all`. With no focus the page shows "All
 * words", whatever `view` says: there is nothing to put in the middle.
 */
export function parseWordsUrl(params: Pick<URLSearchParams, "get">): WordsUrlState {
  const ref = parseNodeKey(params.get("focus"));
  const focus = ref ? nodeKey(ref.type, ref.id) : null;
  const view: WordsView = !focus || params.get("view") === "all" ? "all" : "focus";
  return { focus, view };
}

/** The query string for a state (with its `?`, or "" when empty). The focus stays when "All words" is open. */
export function wordsUrlSearch(state: WordsUrlState): string {
  const p = new URLSearchParams();
  if (state.focus) p.set("focus", state.focus);
  if (state.view === "all" && state.focus) p.set("view", "all");
  const s = p.toString();
  return s ? `?${s}` : "";
}

// ---- the trail ---------------------------------------------------------------------------

/** How many places the breadcrumb keeps. */
export const TRAIL_MAX = 9;

/**
 * The breadcrumb after opening `key`: going to a place already on the trail
 * cuts the trail back to it (so the browser's Back shortens it too); a new
 * place is added at the end, dropping the oldest past `TRAIL_MAX`.
 */
export function nextTrail(trail: readonly NodeKey[], key: NodeKey): NodeKey[] {
  const i = trail.indexOf(key);
  if (i >= 0) return trail.slice(0, i + 1);
  const out = [...trail, key];
  return out.length > TRAIL_MAX ? out.slice(out.length - TRAIL_MAX) : out;
}

/** The place before `current` on the trail, for Backspace and Alt+Left; null at the start. */
export function previousOnTrail(trail: readonly NodeKey[], current: NodeKey | null): NodeKey | null {
  if (!current) return null;
  const i = trail.indexOf(current);
  return i > 0 ? trail[i - 1] : null;
}
