"use client";

/**
 * Review's library data (CW-9): the family list (shared with the inbox, same
 * query key), every concept with its families and pictures (shared with the
 * Concept card), and the rows and gap counts the Families and Concepts lenses
 * show. Spellings come from the inbox's `GET /words` rows.
 */

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CONCEPT_DETAILS_KEY } from "@/components/review/context/ConceptCard";
import { WORD_FAMILIES_KEY, type ReviewBank } from "@/lib/hooks/useReviewInbox";
import { familyRows, type FamilyRow, type LibraryWord } from "@/lib/review/library";
import type { ConceptDetail, WordFamily } from "@/lib/types/wordFamilies";
import { useLibraryApi } from "./api";

export const familyKey = (id: string) => ["word-family", id] as const;
export const conceptKey = (slug: string) => ["concept", slug] as const;

export interface ReviewLibrary {
  families: WordFamily[];
  familiesStatus: "loading" | "ready" | "error";
  /** Null until the concept details load. */
  concepts: ConceptDetail[] | null;
  conceptsStatus: "idle" | "loading" | "ready" | "error";
  familyRows: FamilyRow[];
  retryFamilies: () => void;
  retryConcepts: () => void;
  /** After a family change: the open family, the family list. */
  familyChanged: (id: string) => Promise<void>;
  /** After a link or a concept change: the concept details, the open concept. */
  conceptsChanged: (slug?: string) => Promise<void>;
}

export function useReviewLibrary(bank: ReviewBank, opts: { conceptsWanted: boolean }): ReviewLibrary {
  const api = useLibraryApi();
  const qc = useQueryClient();
  const familiesQuery = useQuery({ queryKey: WORD_FAMILIES_KEY, queryFn: api.listWordFamilies, staleTime: 5 * 60_000 });
  // A few dozen reads (the backend has no family-to-concept read): only once the library or a concept is wanted.
  const conceptsQuery = useQuery({
    queryKey: CONCEPT_DETAILS_KEY,
    queryFn: api.loadConceptDetails,
    enabled: opts.conceptsWanted,
    staleTime: 5 * 60_000,
  });

  const families = React.useMemo(() => familiesQuery.data ?? [], [familiesQuery.data]);
  const concepts = conceptsQuery.data ?? null;
  const rows = React.useMemo(
    () => familyRows(families, bank.words as unknown as LibraryWord[], concepts),
    [families, bank.words, concepts],
  );

  const familyChanged = React.useCallback(
    async (id: string) => {
      await Promise.all([qc.invalidateQueries({ queryKey: familyKey(id) }), qc.invalidateQueries({ queryKey: WORD_FAMILIES_KEY })]);
    },
    [qc],
  );
  const conceptsChanged = React.useCallback(
    async (slug?: string) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: CONCEPT_DETAILS_KEY }),
        slug ? qc.invalidateQueries({ queryKey: conceptKey(slug) }) : qc.invalidateQueries({ queryKey: ["concept"] }),
      ]);
    },
    [qc],
  );

  return {
    families,
    familiesStatus: familiesQuery.isError ? "error" : familiesQuery.isPending ? "loading" : "ready",
    concepts,
    conceptsStatus: conceptsQuery.isError ? "error" : conceptsQuery.data ? "ready" : opts.conceptsWanted ? "loading" : "idle",
    familyRows: rows,
    retryFamilies: () => void familiesQuery.refetch(),
    retryConcepts: () => void conceptsQuery.refetch(),
    familyChanged,
    conceptsChanged,
  };
}
