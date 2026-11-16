/**
 * The Review workspace's URL state (CW-1):
 * `/review?lens=spelling&status=todo&sort=usage&item=spelling:word_1&q=...`,
 * plus `family=<id>` and `concept=<slug>` for the in-pane library editors.
 * Defaults are left out of the URL, so `/review` is Everything, To decide,
 * Most used first (owner answers 11 and 12). Pure.
 */

import { isLens, type Lens, type SortKey, type StatusFilter } from "./inbox";

export interface ReviewUrlState {
  lens: Lens;
  status: StatusFilter;
  sort: SortKey;
  q: string;
  /** The selected item's key. */
  item: string | null;
  family: string | null;
  concept: string | null;
}

export const DEFAULT_URL_STATE: ReviewUrlState = {
  lens: "all",
  status: "todo",
  sort: "usage",
  q: "",
  item: null,
  family: null,
  concept: null,
};

const STATUSES: readonly StatusFilter[] = ["todo", "done", "all"];
const SORT_KEYS: readonly SortKey[] = ["usage", "oldest", "newest", "kind"];

type Params = Pick<URLSearchParams, "get">;

export function parseReviewUrl(params: Params): ReviewUrlState {
  const lens = params.get("lens") ?? "";
  const status = params.get("status") ?? "";
  const sort = params.get("sort") ?? "";
  return {
    lens: isLens(lens) ? lens : DEFAULT_URL_STATE.lens,
    status: (STATUSES as readonly string[]).includes(status) ? (status as StatusFilter) : DEFAULT_URL_STATE.status,
    sort: (SORT_KEYS as readonly string[]).includes(sort) ? (sort as SortKey) : DEFAULT_URL_STATE.sort,
    q: params.get("q") ?? "",
    item: params.get("item") || null,
    family: params.get("family") || null,
    concept: params.get("concept") || null,
  };
}

/** The query string for a state, defaults left out (`""` for the bare page). */
export function reviewUrlSearch(state: ReviewUrlState): string {
  const p = new URLSearchParams();
  if (state.lens !== DEFAULT_URL_STATE.lens) p.set("lens", state.lens);
  if (state.status !== DEFAULT_URL_STATE.status) p.set("status", state.status);
  if (state.sort !== DEFAULT_URL_STATE.sort) p.set("sort", state.sort);
  if (state.q) p.set("q", state.q);
  if (state.item) p.set("item", state.item);
  if (state.family) p.set("family", state.family);
  if (state.concept) p.set("concept", state.concept);
  const s = p.toString();
  return s ? `?${s}` : "";
}
