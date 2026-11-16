"use client";

/**
 * The Families and Concepts lenses' list column (CW-9): search, gap filters
 * with counts, New family / New concept, and the rows as a listbox. A row
 * opens its editor in the pane.
 */

import * as React from "react";
import { AlertTriangle, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CONCEPT_GAPS,
  FAMILY_GAPS,
  conceptGapCounts,
  familyGapCounts,
  sameRef,
  type ConceptGap,
  type FamilyGap,
  type FamilyRow,
  type LibraryRef,
} from "@/lib/review/library";
import { KIND_META, type InboxCounts, type InboxKind, type Lens } from "@/lib/review/inbox";
import type { ConceptDetail } from "@/lib/types/wordFamilies";
import { cn } from "@/lib/utils";
import { Ar, Kbd, SkeletonBar, StatusPill } from "../parts";
import styles from "../review.module.css";
import { useCanConnect } from "./access";

export const libRowId = (ref: LibraryRef) => `review-lib-${ref.type}-${(ref.type === "family" ? ref.id : ref.slug).replace(/[^A-Za-z0-9_-]/g, "_")}`;

export interface LibraryListProps {
  lens: "lib-families" | "lib-concepts";
  onLens: (lens: Lens) => void;
  kinds: readonly InboxKind[];
  counts: InboxCounts;
  q: string;
  onQ: (q: string) => void;
  familyGap: FamilyGap;
  onFamilyGap: (g: FamilyGap) => void;
  conceptGap: ConceptGap;
  onConceptGap: (g: ConceptGap) => void;
  /** Every family row (for the gap counts) and the ones shown. */
  allFamilies: FamilyRow[];
  families: FamilyRow[];
  /** Null while the concepts load. */
  allConcepts: ConceptDetail[] | null;
  concepts: ConceptDetail[];
  status: "loading" | "ready" | "error";
  /** The concepts are still loading, so "No concept" cannot be counted yet. */
  conceptsLoading: boolean;
  onRetry: () => void;
  open: LibraryRef | null;
  onOpen: (ref: LibraryRef) => void;
  onCreate: () => void;
  searchRef: React.RefObject<HTMLInputElement>;
  listboxRef: React.RefObject<HTMLDivElement>;
  hidden: boolean;
}

function GapChips<G extends string>({
  options,
  value,
  onChange,
  counts,
  pending,
}: {
  options: readonly { value: G; label: string }[];
  value: G;
  onChange: (g: G) => void;
  counts: Record<G, number> | null;
  /** Gaps whose count is not known yet. */
  pending?: readonly G[];
}) {
  return (
    <div role="group" aria-label="Gaps" className="flex flex-wrap gap-1">
      {options.map((o) => {
        const n = counts && !pending?.includes(o.value) ? counts[o.value] : null;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-[3px] text-xs text-muted-foreground hover:bg-muted",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              value === o.value && "border-primary/50 bg-primary/10 font-medium text-foreground",
            )}
          >
            {o.label}
            {n !== null && <span className="tabular-nums">{n}</span>}
          </button>
        );
      })}
    </div>
  );
}

function FamilyRowView({ row, selected, onOpen }: { row: FamilyRow; selected: boolean; onOpen: () => void }) {
  const f = row.family;
  return (
    <div
      id={libRowId({ type: "family", id: f.id })}
      role="option"
      aria-selected={selected}
      onClick={onOpen}
      className={cn(
        "relative grid cursor-pointer gap-1 border-b border-border/70 py-2.5 pe-3 ps-3.5 hover:bg-muted/50",
        selected && "bg-primary/10 before:absolute before:inset-y-0 before:start-0 before:w-[3px] before:bg-primary",
      )}
    >
      <div className="flex min-w-0 items-center justify-between gap-2.5">
        <span className="min-w-0 truncate text-sm font-medium">{f.gloss_en ?? f.id}</span>
        {row.headword && <Ar className={cn(styles.rowTitle, "min-w-0 max-w-[55%] text-[22px] leading-[1.6]")}>{row.headword}</Ar>}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-muted-foreground">
        <span className="font-mono">{f.id}</span>
        <span>
          {row.members} {row.members === 1 ? "spelling" : "spellings"}
        </span>
        {row.unreviewed > 0 && <StatusPill pill={{ tone: "todo", text: `${row.unreviewed} not reviewed` }} />}
        {row.readings > 0 && <StatusPill pill={{ tone: "todo", text: `${row.readings} reading${row.readings === 1 ? "" : "s"}?` }} />}
        {!f.headword_id && <StatusPill pill={{ tone: "neutral", text: "no headword" }} />}
        <span className="ms-auto whitespace-nowrap">
          {row.concepts === null ? "" : row.concepts.length ? `concept ${row.concepts.join(", ")}` : <StatusPill pill={{ tone: "neutral", text: "no concept" }} />}
        </span>
      </div>
    </div>
  );
}

function ConceptRowView({ concept, selected, onOpen }: { concept: ConceptDetail; selected: boolean; onOpen: () => void }) {
  const problems = concept.pictures.filter((p) => p.status !== "active").length;
  return (
    <div
      id={libRowId({ type: "concept", slug: concept.slug })}
      role="option"
      aria-selected={selected}
      onClick={onOpen}
      className={cn(
        "relative grid cursor-pointer gap-1 border-b border-border/70 py-2.5 pe-3 ps-3.5 hover:bg-muted/50",
        selected && "bg-primary/10 before:absolute before:inset-y-0 before:start-0 before:w-[3px] before:bg-primary",
      )}
    >
      <div className="flex min-w-0 items-center justify-between gap-2.5">
        <span className="min-w-0 truncate text-sm font-medium">{concept.name.en}</span>
        {concept.name.ar && <Ar className={cn(styles.rowTitle, "min-w-0 max-w-[55%] text-[22px] leading-[1.6]")}>{concept.name.ar}</Ar>}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-muted-foreground">
        <span className="font-mono">
          {concept.slug}
          {concept.kind ? ` · ${concept.kind}` : ""}
        </span>
        <span className="ms-auto flex flex-wrap items-center gap-1.5 whitespace-nowrap">
          {concept.pictures.length ? (
            <span>
              {concept.pictures.length} {concept.pictures.length === 1 ? "picture" : "pictures"}
            </span>
          ) : (
            <StatusPill pill={{ tone: "todo", text: "no picture" }} />
          )}
          {problems > 0 && <StatusPill pill={{ tone: "no", text: `${problems} not active` }} />}
          {concept.families.length ? (
            <span>
              {concept.families.length} {concept.families.length === 1 ? "family" : "families"}
            </span>
          ) : (
            <StatusPill pill={{ tone: "neutral", text: "no family" }} />
          )}
        </span>
      </div>
    </div>
  );
}

export function LibraryList(p: LibraryListProps) {
  const fam = p.lens === "lib-families";
  // New family is a connection write (`POST /words/families`); New concept is not.
  const canConnect = useCanConnect();
  const shown = fam ? p.families.length : p.concepts.length;
  const loading = p.status === "loading";
  const familyCounts = React.useMemo(() => familyGapCounts(p.allFamilies), [p.allFamilies]);
  const conceptCounts = React.useMemo(() => (p.allConcepts ? conceptGapCounts(p.allConcepts) : null), [p.allConcepts]);

  let body: React.ReactNode = null;
  if (loading && shown === 0) {
    body = Array.from({ length: 7 }, (_, i) => (
      <div key={i} className="grid gap-2 border-b border-border/70 p-3" aria-hidden="true">
        <SkeletonBar style={{ width: `${35 + ((i * 13) % 40)}%` }} />
        <SkeletonBar style={{ width: `${55 + ((i * 7) % 30)}%` }} />
      </div>
    ));
  } else if (shown === 0 && p.status === "ready") {
    body = (
      <div className="grid place-items-center gap-2 px-6 py-12 text-center text-muted-foreground">
        <h3 className="text-[15px] font-semibold text-foreground">
          {p.q ? <>No match for &ldquo;{p.q}&rdquo;</> : fam ? "No family here" : "No concept here"}
        </h3>
        <p className="max-w-[380px]">
          {p.q
            ? fam
              ? "Search looks at the id, the gloss, the headword (with or without harakat) and the concept."
              : "Search looks at the slug, the names, the kind and the linked families."
            : "Nothing has this gap. Pick another filter."}
        </p>
        {p.q && (
          <Button variant="outline" size="sm" onClick={() => p.onQ("")}>
            Clear search
          </Button>
        )}
      </div>
    );
  }

  return (
    <section
      aria-label={fam ? "Families" : "Concepts"}
      className={cn("flex min-h-0 min-w-0 flex-col overflow-hidden border-r bg-background", p.hidden && "max-[859px]:hidden")}
    >
      <div className="grid gap-2 border-b px-3 pb-2 pt-3">
        <div className="relative">
          <Search className="absolute start-2.5 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            ref={p.searchRef}
            type="search"
            value={p.q}
            onChange={(e) => p.onQ(e.target.value)}
            placeholder={fam ? "Search id, gloss or headword" : "Search slug or name"}
            aria-label="Search"
            autoComplete="off"
            dir="auto"
            className="h-9 w-full rounded-md border border-input bg-background pe-9 ps-8 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Kbd className="absolute end-2 top-1/2 -translate-y-1/2">/</Kbd>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <select
            aria-label="Kind"
            value={p.lens}
            onChange={(e) => p.onLens(e.target.value as Lens)}
            className="h-[30px] min-w-0 flex-1 rounded-md border bg-background px-1.5 text-xs min-[1100px]:hidden"
          >
            <option value="all">Everything{p.counts.all ? ` (${p.counts.all})` : ""}</option>
            {p.kinds.map((k) => (
              <option key={k} value={k}>
                {KIND_META[k].label}
                {p.counts.byKind[k] ? ` (${p.counts.byKind[k]})` : ""}
              </option>
            ))}
            <option value="lib-families">Families</option>
            <option value="lib-concepts">Concepts</option>
          </select>
          {(!fam || canConnect) && (
            <Button variant="outline" size="sm" className="ms-auto h-[30px] px-2.5 text-xs" onClick={p.onCreate}>
              <Plus className="me-1 h-3.5 w-3.5" aria-hidden="true" /> New {fam ? "family" : "concept"}
            </Button>
          )}
        </div>
        {fam ? (
          <GapChips
            options={FAMILY_GAPS}
            value={p.familyGap}
            onChange={p.onFamilyGap}
            counts={familyCounts}
            pending={p.conceptsLoading ? ["no-concept"] : undefined}
          />
        ) : (
          <GapChips options={CONCEPT_GAPS} value={p.conceptGap} onChange={p.onConceptGap} counts={conceptCounts} />
        )}
        <div className="flex flex-wrap justify-between gap-1 px-0.5 text-[11.5px] text-muted-foreground">
          <span>{loading && shown === 0 ? "Loading..." : `${shown} shown`}</span>
          <span aria-hidden="true">
            <Kbd>j</Kbd> <Kbd>k</Kbd> move · <Kbd>?</Kbd> keys
          </span>
        </div>
      </div>
      {p.status === "error" && (
        <div role="alert" className="mx-3 mt-2 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-2.5 py-2 text-xs">
          <AlertTriangle className="h-[15px] w-[15px] shrink-0" aria-hidden="true" />
          <span className="flex-1">{fam ? "Word families" : "Concepts"} could not be loaded.</span>
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={p.onRetry}>
            Retry
          </Button>
        </div>
      )}
      {shown > 0 ? (
        <div
          ref={p.listboxRef}
          role="listbox"
          aria-label={fam ? "Families" : "Concepts"}
          tabIndex={0}
          aria-activedescendant={
            p.open && (fam ? p.families.some((r) => sameRef({ type: "family", id: r.family.id }, p.open)) : p.concepts.some((c) => sameRef({ type: "concept", slug: c.slug }, p.open)))
              ? libRowId(p.open)
              : undefined
          }
          className="min-h-0 flex-1 overflow-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          {fam
            ? p.families.map((r) => {
                const ref: LibraryRef = { type: "family", id: r.family.id };
                return <FamilyRowView key={r.family.id} row={r} selected={sameRef(ref, p.open)} onOpen={() => p.onOpen(ref)} />;
              })
            : p.concepts.map((c) => {
                const ref: LibraryRef = { type: "concept", slug: c.slug };
                return <ConceptRowView key={c.slug} concept={c} selected={sameRef(ref, p.open)} onOpen={() => p.onOpen(ref)} />;
              })}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto" aria-busy={loading || undefined}>
          {body}
        </div>
      )}
    </section>
  );
}
