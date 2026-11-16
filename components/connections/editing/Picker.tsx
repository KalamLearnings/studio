"use client";

/**
 * The "+ Add" picker (CG-5): only the items a box takes, searchable with or
 * without harakat. A refused item stays in the list, greyed, with the reason
 * in plain words, so nothing is a silent no.
 */

import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Candidate } from "@/lib/connections/connect";
import type { Graph } from "@/lib/connections/graph";
import { typeOfKey } from "@/lib/connections/keys";
import { foldForSearch } from "@/lib/review/inbox";
import { cn } from "@/lib/utils";
import { Ar, KIND_COLOR, KindIcon, labelOf, Thumb } from "../parts";

const MAX = 60;

export function Picker({
  open,
  onOpenChange,
  title,
  description,
  graph,
  candidates,
  onPick,
  footer,
  busy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  graph: Graph;
  candidates: Candidate[];
  onPick: (c: Candidate) => void;
  /** Below the list: "Create a new meaning". */
  footer?: React.ReactNode;
  busy?: boolean;
}) {
  const [q, setQ] = React.useState("");
  React.useEffect(() => {
    if (open) setQ("");
  }, [open]);
  const shown = React.useMemo(() => {
    const f = foldForSearch(q.trim());
    const list = f
      ? candidates.filter((c) => {
          const L = labelOf(graph, c.key);
          return foldForSearch(`${L.ar ?? ""} ${L.en ?? ""} ${c.key}`).includes(f);
        })
      : candidates;
    return list.slice(0, MAX);
  }, [q, candidates, graph]);
  const allowed = candidates.filter((c) => !c.refusal).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search in Arabic (with or without harakat) or English..."
          aria-label="Search"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const first = shown.find((c) => !c.refusal);
              if (first && !busy) onPick(first);
            }
          }}
        />
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {candidates.length === 0
            ? "Nothing to add here."
            : `${allowed} can be added${candidates.length > allowed ? `, ${candidates.length - allowed} cannot (greyed, with the reason)` : ""}.`}
        </p>
        <ul className="-mx-1 grid max-h-[50vh] gap-1 overflow-y-auto px-1" aria-label="Candidates">
          {shown.map((c) => {
            const L = labelOf(graph, c.key);
            const type = typeOfKey(c.key);
            const refused = !!c.refusal;
            return (
              <li key={c.key}>
                <button
                  type="button"
                  aria-disabled={refused || busy}
                  onClick={() => !refused && !busy && onPick(c)}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-lg border px-2.5 py-1.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring",
                    refused ? "cursor-not-allowed opacity-60" : "hover:border-[var(--kc)] hover:bg-muted/50",
                  )}
                  style={{ ["--kc" as string]: KIND_COLOR[type] }}
                  aria-label={`${[L.ar, L.en].filter(Boolean).join(", ")}${refused ? `. Cannot be added: ${c.refusal}` : c.note ? `. ${c.note}` : ""}`}
                >
                  <KindIcon type={type} className="mt-2" />
                  {L.img && <Thumb url={L.img} alt="" size={36} />}
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-2">
                      {L.ar && <Ar className="text-[22px] leading-[1.6]">{L.ar}</Ar>}
                      {L.en && <span className="text-[13px]">{L.en}</span>}
                    </span>
                    {refused ? (
                      <span className="block text-xs text-muted-foreground">{c.refusal}</span>
                    ) : (
                      c.note && <span className="block text-xs text-muted-foreground">{c.note}</span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
          {candidates.length > shown.length && !q && (
            <li className="px-1 text-xs text-muted-foreground">Showing {shown.length} of {candidates.length}. Search to find the rest.</li>
          )}
        </ul>
        {footer && <div className="border-t pt-3">{footer}</div>}
      </DialogContent>
    </Dialog>
  );
}
