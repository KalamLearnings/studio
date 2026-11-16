/**
 * The Words page's data access: the one seam between the page and the
 * backend. The page asks a `ConnectionsSource`; nothing else in
 * `components/connections/` fetches.
 *
 * `routesSource` reads the existing routes the concept's section 1 lists, and
 * that is the design (the owner dropped the one-request graph read):
 * `GET /words`, `GET /words/families`, `GET /words/concepts` (+ each
 * concept's detail, for its families and pictures), `GET /letters/list`, and
 * `GET /words/:id/usage` (CM-USAGE) for a spelling's lessons.
 *
 * Coming: `GET /content/usage?unit=word:|letter:|concept:` (B-1). When it
 * lands, answer `usage()` from it for every unit kind (letters return `null`
 * today, and their box says so).
 */

import type { WordUsageItem } from "../api/wordUsage";
import type { ConceptDetail, WordFamily } from "../types/wordFamilies";
import type { GraphInput, LetterRow, WordRow } from "./graph";
import { idOfKey, typeOfKey, type NodeKey } from "./keys";

export interface ConnectionsSource {
  /** Everything the page browses: search, the gaps, "All words" and the frame. */
  library(): Promise<GraphInput>;
  /** The lesson uses of one item; null when no route answers for that kind yet. */
  usage(unit: NodeKey): Promise<WordUsageItem[]> | null;
}

/** The reads the routes source needs; injected so a test or a preview can stand them in. */
export interface RoutesApi {
  listWords(): Promise<WordRow[]>;
  listFamilies(): Promise<WordFamily[]>;
  listConceptDetails(): Promise<ConceptDetail[]>;
  listLetters(): Promise<LetterRow[]>;
  wordUsage(wordId: string): Promise<WordUsageItem[]>;
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
      return typeOfKey(unit) === "word" ? api.wordUsage(idOfKey(unit)) : null;
    },
  };
}

/** What the page says while a unit kind has no usage route. */
export const USAGE_UNAVAILABLE = "Lessons for a letter show here once the backend's usage read (B-1) is live.";
