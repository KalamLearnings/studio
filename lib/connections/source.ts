/**
 * The Words page's data access: the one seam between the page and the
 * backend. The page asks a `ConnectionsSource`; nothing else in
 * `components/connections/` fetches.
 *
 * `routesSource` reads the existing routes the concept's section 1 lists, and
 * that is the design (the owner dropped the one-request graph read):
 * `GET /words`, `GET /words/families`, `GET /words/concepts` (+ each
 * concept's detail, for its families and pictures), `GET /letters/list`, and
 * `GET /content/usage?unit=word:|letter:|concept:` (B-1) for where a
 * spelling, a letter or a meaning is used: its activities and its books.
 * A word (family) asks for each of its forms.
 */

import type { BookUnitUse, ContentUsage, ContentUsageUnit } from "../api/contentUsage";
import type { WordUsageItem } from "../api/wordUsage";
import type { ConceptDetail, WordFamily } from "../types/wordFamilies";
import type { GraphInput, LetterRow, WordRow } from "./graph";
import { idOfKey, typeOfKey, type NodeKey } from "./keys";

export interface ConnectionsSource {
  /** Everything the page browses: search, the gaps, "All words" and the frame. */
  library(): Promise<GraphInput>;
  /** Where one item is used; null when no route answers for that kind. */
  usage(unit: NodeKey): Promise<{ activities: WordUsageItem[]; books: BookUnitUse[] }> | null;
}

/** The reads the routes source needs; injected so a test or a preview can stand them in. */
export interface RoutesApi {
  listWords(): Promise<WordRow[]>;
  listFamilies(): Promise<WordFamily[]>;
  listConceptDetails(): Promise<ConceptDetail[]>;
  listLetters(): Promise<LetterRow[]>;
  contentUsage(unit: ContentUsageUnit): Promise<ContentUsage>;
}

export function routesSource(api: RoutesApi): ConnectionsSource {
  return {
    async library() {
      const [words, families, concepts, letters] = await Promise.all([
        api.listWords(),
        api.listFamilies(),
        // The concepts are the slow read (one detail each). A failure leaves the words usable.
        api.listConceptDetails().catch(() => [] as ConceptDetail[]),
        api.listLetters().catch(() => [] as LetterRow[]),
      ]);
      return { words, families, concepts, letters };
    },
    usage(unit) {
      const t = typeOfKey(unit);
      if (t !== "word" && t !== "letter" && t !== "concept") return null;
      return api
        .contentUsage(`${t}:${idOfKey(unit)}`)
        .then((u) => ({ activities: u.activities ?? [], books: u.book_units ?? [] }));
    },
  };
}

/** What the page says for a unit kind with no usage route. */
export const USAGE_UNAVAILABLE = "Where this is used is not recorded.";
