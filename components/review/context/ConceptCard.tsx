"use client";

/**
 * The Concept context card (CW-5): the concept the word's family names, with
 * its first picture. The backend has no family-to-concept read, so the
 * concept details are loaded once (as the family editor does) and shared by
 * every pane through the query cache. `c` opens the concept.
 */

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import type { ConceptDetail } from "@/lib/types/wordFamilies";
import { useLibraryApi } from "../library/api";
import { Ar, ContextCard, Kbd } from "../parts";

export const CONCEPT_DETAILS_KEY = ["concept-details"] as const;

export function useFamilyConcept(familyId: string | null) {
  const api = useLibraryApi();
  const query = useQuery({
    queryKey: CONCEPT_DETAILS_KEY,
    queryFn: api.loadConceptDetails,
    enabled: !!familyId,
    staleTime: 5 * 60_000,
  });
  const concept: ConceptDetail | null = familyId
    ? (query.data?.find((c) => c.families.some((f) => f.id === familyId)) ?? null)
    : null;
  return { concept, query };
}

export function ConceptCard({
  familyId,
  onOpen,
}: {
  familyId: string | null;
  onOpen: (slug: string | null) => void;
}) {
  const { concept, query } = useFamilyConcept(familyId);

  if (!familyId) {
    return (
      <ContextCard title="Concept and picture">
        <p className="text-[12.5px] text-muted-foreground">A word gets its picture through its family&apos;s concept.</p>
      </ContextCard>
    );
  }
  if (query.isPending) {
    return (
      <ContextCard title="Concept">
        <p className="text-[12.5px] text-muted-foreground">Loading...</p>
      </ContextCard>
    );
  }
  if (query.isError) {
    return (
      <ContextCard title="Concept">
        <p className="text-[12.5px] text-muted-foreground">
          Concepts could not be loaded.{" "}
          <button type="button" className="text-primary hover:underline" onClick={() => void query.refetch()}>
            Retry
          </button>
        </p>
      </ContextCard>
    );
  }
  if (!concept) {
    return (
      <ContextCard title="Concept and picture">
        <p className="mb-2 text-[12.5px] text-muted-foreground">A family gets its picture through a concept.</p>
        <button type="button" className="text-[12.5px] text-primary hover:underline" onClick={() => onOpen(null)}>
          Link a concept <Kbd>c</Kbd>
        </button>
      </ContextCard>
    );
  }
  const picture = concept.pictures[0];
  return (
    <ContextCard
      title="Concept"
      aside={
        <button type="button" className="text-[12.5px] normal-case tracking-normal text-primary hover:underline" onClick={() => onOpen(concept.slug)}>
          Edit <Kbd>c</Kbd>
        </button>
      }
    >
      <div className="flex items-center gap-2.5">
        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg border bg-background">
          {picture ? (
            // eslint-disable-next-line @next/next/no-img-element -- asset URLs come from storage, as on the concepts page
            <img src={picture.url} alt={concept.name.en} className="h-full w-full object-contain" />
          ) : (
            <span className="text-[11px] text-muted-foreground">No picture</span>
          )}
        </div>
        <div className="min-w-0 text-[12.5px]">
          <b className="font-semibold">{concept.name.en}</b> {concept.name.ar && <Ar>{concept.name.ar}</Ar>}
          <div className="font-mono text-xs text-muted-foreground">
            {concept.slug}
            {concept.kind ? ` · ${concept.kind}` : ""}
          </div>
          <div className="text-xs text-muted-foreground">
            {concept.pictures.length} {concept.pictures.length === 1 ? "picture" : "pictures"}
          </div>
        </div>
      </div>
    </ContextCard>
  );
}
