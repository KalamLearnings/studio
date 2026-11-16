"use client";

/**
 * "What's missing" (CG-6): one disclosure per kind of gap, with a count. An
 * item opens in the frame, where the empty box has the amber ring.
 */

import * as React from "react";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Graph } from "@/lib/connections/graph";
import type { Gap, GapId } from "@/lib/connections/gaps";
import { typeOfKey, type NodeKey } from "@/lib/connections/keys";
import { Ar, KIND_COLOR, labelOf } from "./parts";
import s from "./words.module.css";

const SHOW = 14;

export function GapsRail({
  graph,
  gaps,
  focus,
  onOpen,
}: {
  graph: Graph | null;
  gaps: Gap[];
  focus: NodeKey | null;
  onOpen: (key: NodeKey) => void;
}) {
  // The first list starts open on a wide screen; on a narrow one the rail sits above the frame, closed.
  const [open, setOpen] = React.useState<Set<GapId>>(() =>
    typeof window !== "undefined" && window.innerWidth >= 1180 ? new Set<GapId>(["no-family"]) : new Set<GapId>(),
  );
  const [all, setAll] = React.useState<Set<GapId>>(new Set());
  const toggle = (set: Set<GapId>, id: GapId) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  return (
    <aside className={s.rail} aria-labelledby="words-gaps-h">
      <h2 id="words-gaps-h" className="mx-1 mb-1 text-[13px] font-semibold">
        What&apos;s missing
      </h2>
      <p className="mx-1 mb-3 text-xs text-muted-foreground">Click one to open it. The empty box shows what to add.</p>
      {!graph && <p className="mx-1 text-xs text-muted-foreground">Loading...</p>}
      <div className={s.railList}>
        {graph &&
          gaps.map((g) => {
            const isOpen = open.has(g.id);
            const panelId = `gap-${g.id}`;
            const items = all.has(g.id) ? g.items : g.items.slice(0, SHOW);
            return (
              <div key={g.id} className="mb-2 rounded-[10px] border bg-card">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpen((o) => toggle(o, g.id))}
                  className="flex w-full items-center gap-2 rounded-[10px] px-2.5 py-2 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <ChevronRight aria-hidden="true" className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground motion-safe:transition-transform", isOpen && "rotate-90")} />
                  <span>{g.title}</span>
                  <span className={cn("ml-auto tabular-nums", g.items.length ? "font-semibold" : "text-success")}>
                    {g.items.length || <Check aria-label="none" className="h-4 w-4" />}
                  </span>
                </button>
                {isOpen && (
                  <div id={panelId}>
                    <p className="mx-3 mb-2 text-xs text-muted-foreground">{g.why}</p>
                    {g.items.length > 0 && (
                      <ul className="grid gap-0.5 px-1.5 pb-2">
                        {items.map((k) => {
                          const L = labelOf(graph, k);
                          const t = typeOfKey(k);
                          return (
                            <li key={k}>
                              <button
                                type="button"
                                onClick={() => onOpen(k)}
                                aria-current={k === focus ? "true" : undefined}
                                className={cn(
                                  "flex w-full items-center gap-2 rounded-md px-1.5 py-0.5 text-left hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring",
                                  k === focus && "bg-muted",
                                )}
                              >
                                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: KIND_COLOR[t] }} aria-hidden="true" />
                                {L.ar && <Ar className="text-[20px] leading-[1.6]">{L.ar}</Ar>}
                                <span className="truncate text-xs text-muted-foreground">{L.en}</span>
                              </button>
                            </li>
                          );
                        })}
                        {g.items.length > items.length && (
                          <li>
                            <button
                              type="button"
                              className="px-1.5 py-1 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                              style={{ color: "var(--k-word)" }}
                              onClick={() => setAll((a) => toggle(a, g.id))}
                            >
                              Show all {g.items.length}
                            </button>
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </aside>
  );
}
